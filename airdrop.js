const SnapshotTools = require('./services/SnapshotTools');
const Prompter = require('./services/Prompter');
const EOSTools = require('./services/EOSTools');

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

    console.log(`Started EOSDrops at ${new Date().toLocaleString()}`);

    let usingConfig = await Prompter.prompt(
        `\r\nDo you want to use the config.json file? \r\nEnter 'y' or press enter to set up using command line prompts`
    );
    usingConfig = usingConfig.toLowerCase() === 'y';

    if(usingConfig){
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
            console.error(`\r\nCould not find ${config.symbol} token on the eosio.token contract at ${config.tokenAccount}!`);
            process.exit();
        }
    } else {

        await EOSTools.setNetwork(
            await Prompter.prompt('\r\nWhat network do you want to use?\r\n( leave blank for https://nodes.get-scatter.com )')
        );

        while (config.tokenAccount === '')
            config.tokenAccount = await Prompter.prompt('\r\nWhat is the name of the account the eosio.token contract sits on?');

        while (config.symbol === '')
            config.symbol = await Prompter.prompt('\r\nWhat is the SYMBOL for this token?');

        // Filling `decimals` and `issuer`
        if (!await EOSTools.fillTokenStats(config)) {
            console.error(`\r\nCould not find ${config.symbol} token on the eosio.token contract at ${config.tokenAccount}!`);
            process.exit();
        }

        while (config.ratio <= 0)
            config.ratio = await Prompter.prompt('\r\nWhat is the ratio to drop for this token? ( examples: 1, 2, 0.25 )');

        while (config.privateKey === '' || !EOSTools.validPrivateKey(config.privateKey))
            config.privateKey = await Prompter.prompt(`\r\nWhat is the private key for the issuer: '${config.issuer}'`);

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

    if(!usingConfig) config.startFrom = await Prompter.prompt(
        `\r\nIf you want to start from a specific account enter it, otherwise press enter: `
    );

    console.warn('\r\n\------------------------------------------------------------------\r\n');
    console.warn(`Starting to airdrop from account '${config.startFrom ? config.startFrom : ratioBalances[0].account}'`);
    console.warn('\r\n\------------------------------------------------------------------\r\n');

    // Shutting off IO
    Prompter.donePrompting();

    await EOSTools.dropTokens(ratioBalances, config);

    console.log(`Finished EOSDrops at ${new Date().toLocaleString()}`);
    process.exit();
};

run();

