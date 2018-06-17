const Eos = require('eosjs');
const SnapshotTools = require('./services/SnapshotTools');
const Prompter = require('./services/Prompter');


let ratio = 0;
let decimals = 4;
let symbol = '';
let issuer = '';
let privateKey = '';


/***
 * Multiplies by a ratio
 * @param tuple
 */
const getRatio = (tuple) => (tuple.amount * ratio).toFixed(decimals);

/***
 * Fetches the token stats and binds to scope
 * @returns {Promise.<T>}
 */
const fillTokenStats = async () => {
    const httpEndpoint = 'http://192.168.1.7:8888';
    const eos = Eos({httpEndpoint});
    return await eos.getTableRows({
        json:true,
        code:'eosio.token',
        scope:symbol,
        table:'stat'
    }).then(x => {
        const token = x.rows[0];
        decimals = token.max_supply.split(' ')[0].split('.')[1].length;
        issuer = token.issuer;

        if(ratio * 1000000000 > token.max_supply.split(' ')[0].split('.')[0])
            throw new Error('Your ratio * 1B tokens is greater than the tokens max supply');
        return true;
    }).catch(() => null);
};

const run = async () => {
    while(symbol === '')        symbol = await Prompter.prompt('What is the SYMBOL for this token?');

    if(!await fillTokenStats()){
        console.error(`Could not find ${symbol} token on the eosio.token contract!`);
        process.exit();
    }

    while(ratio <= 0)           ratio = await Prompter.prompt('What is the ratio to drop for this token? ( examples: 1, 2, 0.25 )');
    while(privateKey === '')    privateKey = await Prompter.prompt(`What is the private key for the issuer: '${issuer}'`);
    Prompter.donePrompting();

    const snapshot = await SnapshotTools.getCSV('snapshot_test.csv');
    const accountBalances = SnapshotTools.csvToJson(snapshot);

    /*
     let ratio = 1;
     let symbol = 'NONE';
     let privateKey = '';
     */

    accountBalances.map(bal => {
        const drop = getRatio(bal);
        console.log('dropping', drop, 'original', bal.amount)
    });

    console.log('json', accountBalances);
    process.exit();
};

run();

