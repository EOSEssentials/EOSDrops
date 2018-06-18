const Eos = require('eosjs');

const eos = Eos({httpEndpoint:'http://nodes.get-scatter.com', chainId:'aca376f206b8fc25a6ed44dbdc66547c36c6c33e3a119ffbeaef943642f0e906'});

const parseAsset = asset => asset.split(' ')[0];

const getRamInfo = async () => await eos.getTableRows({
    json:true,
    code:'eosio',
    scope:'eosio',
    table:'rammarket'
}).then(res => {
    const ramInfo = res.rows[0];
    return [parseAsset(ramInfo.quote.balance), parseAsset(ramInfo.base.balance)];
});

const getRamPrice = async () => {
    const ramInfo = await getRamInfo();
    return ((ramInfo[0] / ramInfo[1]).toFixed(8) * 1024).toFixed(4);
}

const run = async () => {
    const price = await getRamPrice();
    console.log('ram', price);
};

run();