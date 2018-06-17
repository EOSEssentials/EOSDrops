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
    while(config.symbol === '')
        config.symbol = await Prompter.prompt('What is the SYMBOL for this token?');

    // Filling `decimals` and `issuer`
    if(!await EOSTools.fillTokenStats(config)){
        console.error(`Could not find ${config.symbol} token on the eosio.token contract!`);
        process.exit();
    }

    while(config.ratio <= 0)
        config.ratio = await Prompter.prompt('What is the ratio to drop for this token? ( examples: 1, 2, 0.25 )');

    while(config.privateKey === '' || !EOSTools.validPrivateKey(config.privateKey))
        config.privateKey = await Prompter.prompt(`What is the private key for the issuer: '${config.issuer}'`);

    // Shutting off IO
    Prompter.donePrompting();

    const snapshot = await SnapshotTools.getCSV('snapshot_test.csv');
    const accountBalances = SnapshotTools.csvToJson(snapshot);

    accountBalances.map(bal => {
        const drop = getRatio(bal);
        console.log('dropping', drop, 'original', bal.amount)
    });

    console.log('json', accountBalances);
    process.exit();
};

run();

