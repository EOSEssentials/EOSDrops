const fs = require('fs');

/***
 * Pulls CSV from file system at a given path
 * @param pathToCSV
 * @returns {Promise}
 */
exports.getCSV = (pathToCSV) => {
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
exports.csvToJson = (csv) => {
    const arr = csv
        .replace(/["]/g, '')
        .replace(/\n/g,',')
        .split(',');

    let tupled = [];

    // Removing Ethereum and EOS keys
    arr.map(e => {
        if(e.indexOf('0x') !== 0 && e.indexOf('EOS') !== 0) tupled.push(e);
    });

    // Formatting to {account, amount}
    tupled = tupled.reduce((acc, e, i) => {
        if(i % 2 === 0) acc.push({account:e, amount:tupled[i+1]});
        return acc;
    }, []);

    return tupled;
};

