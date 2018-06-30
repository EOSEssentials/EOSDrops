const fs = require('fs');
const winston = require('winston');
const SnapshotTools = require('./services/SnapshotTools');
const Prompter = require('./services/Prompter');
const EOSTools = require('./services/EOSTools');

let config = {};
let blacklist = {};
let capWhitelist = {};
let logger = null;
let db = null;

const setup = () => {
    // Setting configs
    config = require('./config.json');
    blacklist = require('./blacklist.json');
    capWhitelist = require('./capWhitelist.json')

    // Creating the logs directory
    if (!fs.existsSync('logs')) fs.mkdirSync('logs');
    if (!fs.existsSync('db')) fs.mkdirSync('db');

    const low = require('lowdb');
    const FileSync = require('lowdb/adapters/FileSync');
    const adapter = new FileSync('db/airdrop.json');
    const _db = low(adapter);

    _db.defaults({ failed: [], success:[], lastAccountDropped:'' }).write();

    const logFormat = winston.format.printf(info =>
        `${(new Date()).toLocaleString()} - ${info.message}`);

    const _logger = winston.createLogger({
        format: logFormat,
        transports: [
            new winston.transports.Console(),
            new winston.transports.File({
                filename: `logs/${+new Date()}_airdrop.log`,
                level: 'silly'
            })
        ]
    });

    logger = _logger;
    db = _db;
    EOSTools.setLogger(_logger);
    EOSTools.setDB(_db);
}

const filterLists = async (snapshot) => {
    // removes blacklisted addresses
    const filteredSnapshot = blacklist && blacklist.accounts && blacklist.accounts.length > 0 ?
        snapshot.filter(tuple => {
            if(blacklist.accounts.indexOf(tuple.account) < 0) {
                return true;
            } else {
                logger.warn(`Account ${tuple.account} was blacklisted - Amount: ${tuple.amount}`);
                return false;
            }
        }) : snapshot;

    if(filteredSnapshot.length != snapshot.length && await Prompter.prompt(
        `\r\nPress enter if you agree with above blacklist and want to continue`
    ) !== '') process.exit();

    // apply limit cap ignoring the white listed addresses
    if(config.limitCap && config.limitCap > 0) {

        logger.warn(`You are limitting token holders to receive a max airdrop corresponding to ${config.limitCap} EOS`);

        const cappedSnapshot = filteredSnapshot.map(tuple => {
            const isWhite = capWhitelist.accounts.indexOf(tuple.account) > 0;

            let amount = tuple.amount;
            if (!isWhite && amount > config.limitCap) {
                amount = config.limitCap;
                logger.warn(`Account ${tuple.account} was capped - it had ${tuple.amount} before being capped to ${amount}`);
            } else if (isWhite) {
                logger.warn(`Account ${tuple.account} is whitelist, therefore not capped - it has a total amount of ${tuple.amount}`);
            }

            return Object.assign({}, tuple, {amount})
        });

        if(filteredSnapshot.length != snapshot.length && await Prompter.prompt(
            `\r\nPress enter if you agree with above token airdrop cap`
        ) !== '') process.exit();

        return cappedSnapshot;

    } else {
        return filteredSnapshot;
    }

}


const run = async () => {
    const getRatio = (tuple) => (tuple.amount * config.ratio).toFixed(config.decimals);

    logger.warn(`Started EOSDrops at ${new Date().toLocaleString()}`);


    const asserter = (condition, msg) => {
        if(!condition){
            throw new Error(msg);
            process.exit();
        }
    };

    asserter(config.network !== '', 'Network must be a fully qualified URL ( example: http://domain.com:8888 )');
    asserter(config.tokenAccount !== '', 'Token account must not be empty');
    asserter(config.symbol !== '', 'Symbol must not be empty');
    asserter(config.privateKey !== '', 'Issuer\'s private key must not be empty');
    asserter(config.ratio > 0, 'Ratio can not be less than 0');
    asserter(config.batchSize > 0, 'Batch size must be greater than 0');

    await EOSTools.setNetwork(config.network);
    if (!await EOSTools.fillTokenStats(config)) {
        logger.error(`\r\nCould not find ${config.symbol} token on the eosio.token contract at ${config.tokenAccount}!`);
        process.exit();
    }

    const snapshot = await SnapshotTools.getCSV('snapshot.csv');
    const initialAccountBalances = SnapshotTools.csvToJson(snapshot);
    const accountBalances = await filterLists(initialAccountBalances);
    const ratioBalances = accountBalances.map(tuple => Object.assign(tuple, {amount:getRatio(tuple)}))
                          .filter(tuple => tuple.amount > 0);

    const ram = await EOSTools.estimateRAM(accountBalances, config);
    if(await Prompter.prompt(
            `\r\nThis airdrop will require that ${config.issuer} has an estimated minimum of ${ram[0]}KB of RAM, at the cost of ${ram[1]} at the current price of ${ram[2]}. \r\nPress enter to continue`
    ) !== '') process.exit();

    const total = (ratioBalances.reduce((acc, e) => acc += parseFloat(e.amount), 0)).toFixed(config.decimals);

    if(await Prompter.prompt(
        `\r\nYou are about to airdrop ${total} ${config.symbol} tokens on ${accountBalances.length} accounts. \r\nPress enter to continue`
    ) !== '') process.exit();

    logger.warn('\r\n\------------------------------------------------------------------\r\n');
    const lastAccountDropped = db.get('lastAccountDropped').value();
    logger.warn(`Starting to airdrop from account '${lastAccountDropped.length ? lastAccountDropped : ratioBalances[0].account}'`);
    logger.warn('\r\n\------------------------------------------------------------------\r\n');

    // Shutting off IO
    Prompter.donePrompting();

    await EOSTools.dropTokens(ratioBalances, config);

    logger.warn(`Finished EOSDrops at ${new Date().toLocaleString()}`);
    process.exit();
};


setup();
run();

