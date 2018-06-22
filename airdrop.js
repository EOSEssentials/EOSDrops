const fs = require('fs');
const winston = require('winston');
const SnapshotTools = require('./services/SnapshotTools');
const Prompter = require('./services/Prompter');
const EOSTools = require('./services/EOSTools');

// Creating the logs directory
if (!fs.existsSync('logs')) fs.mkdirSync('logs');

const logFormat = winston.format.printf(info => {
    return `${(new Date()).toLocaleString()} - ${info.message}`;
});

const logger = winston.createLogger({
    format: logFormat,
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({
            filename: `logs/${+new Date()}_airdrop.log`,
            level: 'silly'
        })
    ]
});

EOSTools.setLogger(logger);

let config = {
    tokenAccount:'',
    ratio:0,
    decimals:4,
    symbol:'',
    issuer:'',
    privateKey:'',
    startFrom:'',
};

/***
 * Multiplies by a ratio
 * @param tuple
 */
const getRatio = (tuple) => (tuple.amount * config.ratio).toFixed(config.decimals);

/*
 Private Key: 5JShgqJSPsTDPPweJumazy1QdaKunEZ9mbCiq5svjphPTwzG7q5
 Public Key: EOS72yeq1R1sbccSCoaQwPkFPjS38LXvZ9WiSJ5qKgheEKwD8vz2M
 */

const run = async () => {

    logger.warn(`Started EOSDrops at ${new Date().toLocaleString()}`);

    config = Object.assign(config, require('./config.json'));

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

    await EOSTools.setNetwork(config.network);
    if (!await EOSTools.fillTokenStats(config)) {
        logger.error(`\r\nCould not find ${config.symbol} token on the eosio.token contract at ${config.tokenAccount}!`);
        process.exit();
    }

    const snapshot = await SnapshotTools.getCSV('snapshot.csv');
    const accountBalances = SnapshotTools.csvToJson(snapshot);
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
    logger.warn(`Starting to airdrop from account '${config.startFrom ? config.startFrom : ratioBalances[0].account}'`);
    logger.warn('\r\n\------------------------------------------------------------------\r\n');

    // Shutting off IO
    Prompter.donePrompting();

    await EOSTools.dropTokens(ratioBalances, config);

    logger.warn(`Finished EOSDrops at ${new Date().toLocaleString()}`);
    process.exit();
};

run();

