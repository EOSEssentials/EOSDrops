const fs = require('fs');
const readline = require('readline');
const Eos = require('eosjs');

const lineReader = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const prompt = question => {
    return new Promise((resolve) => {
        lineReader.question(`${question}: `, answer => {
            resolve(answer);
            lineReader.close();
        });
    })
};

let ratio = 1;
let decimals = 4;
let symbol = 'NONE';
let issuer = '';
let privateKey = '';

if(!ratio || ratio <= 0) {
    console.log('Ratio must be')
    process.exit();
}

/***
 * Pulls CSV from file system at a given path
 * @param pathToCSV
 * @returns {Promise}
 */
const getCSV = (pathToCSV) => {
    return new Promise((resolve, reject) => {
        const stream = fs.readFile(pathToCSV, 'utf8', (err,data) => {
            if(err) return reject(err);
            resolve(data);
        });
    })
};

/***
 * Converts a .csv snapshot into an array of JSON objects in the format {account, amount}
 * @param csv
 * @returns {Array}
 */
const csvToJson = (csv) => {
    // Formatting array ( removing parenthesis, carriage returns and new lines, and splitting by comma delimiter
    const arr = csv.replace(/["]/g, '').split('\r\n').join(',').split(',');

    let tupled = [];

    // Removing Ethereum and EOS keys
    arr.map((e,i) => { if(i % 2 === 1) tupled.push(e); });

    // Formatting to {account, amount}
    tupled = tupled.reduce((acc, e, i) => {
        if(i % 2 === 0) acc.push({account:e, amount:tupled[i+1]});
        return acc;
    }, []);

    return tupled;
};

/***
 * Multiplies by a ratio
 * @param tuple
 */
const getRatio = (tuple) => (tuple.amount * ratio).toFixed(decimals);

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
    }).catch(() => null);
};

const run = async () => {
    // symbol = await prompt('What is the SYMBOL for this token?');
    // ratio = await prompt('What is the ratio to drop for this token? ( examples: 1, 2, 0.25 )');

    symbol = 'SYS';
    const stats = await fillTokenStats();
    console.log('issuer', issuer);
    console.log('decimals', decimals);
    // const issuer =

    // privateKey = await prompt(`What is the private key for the issuer: '${}'`)
    const snapshot = await getCSV('snapshot_test.csv');
    const accountBalances = csvToJson(snapshot);

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

