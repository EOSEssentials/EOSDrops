const readline = require('readline');

const lineReader = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

exports.prompt = question => {
    return new Promise((resolve) => {
        lineReader.question(`${question}: `, answer => {
            resolve(answer);
        });
    })
};

exports.donePrompting = () => lineReader.close();