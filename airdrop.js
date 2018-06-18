const SnapshotTools = require('./services/SnapshotTools');
const Prompter = require('./services/Prompter');
const EOSTools = require('./services/EOSTools');

const config = {
    ratio:0,
    decimals:4,
    symbol:'',
    issuer:'',
    privateKey:''
};

/***
 * Multiplies by a ratio
 * @param tuple
 */
const getRatio = (tuple) => (tuple.amount * config.ratio).toFixed(config.decimals);



const run = async () => {
    // while(config.symbol === '')
    //     config.symbol = await Prompter.prompt('What is the SYMBOL for this token?');
    //
    // // Filling `decimals` and `issuer`
    // if(!await EOSTools.fillTokenStats(config)){
    //     console.error(`Could not find ${config.symbol} token on the eosio.token contract!`);
    //     process.exit();
    // }
    //
    // while(config.ratio <= 0)
    //     config.ratio = await Prompter.prompt('What is the ratio to drop for this token? ( examples: 1, 2, 0.25 )');
    //
    // while(config.privateKey === '' || !EOSTools.validPrivateKey(config.privateKey))
    //     config.privateKey = await Prompter.prompt(`What is the private key for the issuer: '${config.issuer}'`);

    config.symbol = 'SYS';
    await EOSTools.fillTokenStats(config);
    config.ratio = 0.1;
    config.privateKey = '5KQwrPbwdL6PhXujxW37FSSQZ1JiwsST4cqQzDeyXtP79zkvFD3';

    const snapshot = await SnapshotTools.getCSV('snapshot_test.csv');
    const accountBalances = SnapshotTools.csvToJson(snapshot);
    const ratioBalances = accountBalances.map(tuple => Object.assign(tuple, {amount:(tuple.amount * config.ratio).toFixed(config.decimals)}))
                          .filter(tuple => tuple.amount > 0);

    const total = (ratioBalances.reduce((acc, e) => acc += parseFloat(e.amount), 0)).toFixed(config.decimals);

    const confirm = await Prompter.prompt(
        `\r\nYou are about to airdrop ${total} ${config.symbol} tokens on ${accountBalances.length} accounts. \r\nPress enter to continue.`
    );

    //5KQwrPbwdL6PhXujxW37FSSQZ1JiwsST4cqQzDeyXtP79zkvFD3

    if(confirm !== '') process.exit();

    const startFrom = await Prompter.prompt(
        `\r\nIf you want to start from a specific account enter it, otherwise press enter: `
    );

    console.warn('\r\n\------------------------------------------------------------------\r\n');
    console.warn(`Starting to airdrop from account '${startFrom ? startFrom : ratioBalances[0].account}'`);
    console.warn('\r\n\------------------------------------------------------------------\r\n');

    // Shutting off IO
    Prompter.donePrompting();

    await EOSTools.dropTokens(ratioBalances, config);

    process.exit();
};

run();

