const Eos = require('eosjs');
const {ecc} = Eos.modules;

const getEos = async privateKey => {
    const httpEndpoint = 'http://192.168.1.7:8888';
    const chainId = (await Eos({httpEndpoint}).getInfo({})).chainId;
    return privateKey
        ? Eos({httpEndpoint, keyProvider:privateKey, chainId})
        : Eos({httpEndpoint, chainId});
}

/***
 * Fetches the token stats and binds to scope
 * @returns {Promise.<T>}
 */
exports.fillTokenStats = async config => {
    const eos = await getEos();
    return await eos.getTableRows({
        json:true,
        code:'eosio.token',
        scope:config.symbol,
        table:'stat'
    }).then(x => {
        const token = x.rows[0];
        config.decimals = token.max_supply.split(' ')[0].split('.')[1].length;
        config.issuer = token.issuer;
        return true;
    }).catch(() => false);
};

exports.validPrivateKey = (privateKey) => ecc.isValidPrivate(privateKey);

const dropBatch = async (batch, eos, auth, symbol) => {
    const dropped = await eos.transaction(tr => batch.map(tuple =>
        tr.issue(tuple.account, `${tuple.amount} ${symbol}`, '', auth)
    )).then(res => res.transaction_id)
      .catch(() => false);

    // Quits on failure to allow restarting from a specified account
    // instead of having to parse the snapshot for sent/unsent.
    if(!dropped){
        console.error('\r\n-------------------------------------\r\n');
        console.error('ERROR: Failed batch!')
        console.error(batch.map(x => x.account).join(','));
        console.warn('You should restart the airdrop with the first account in the list above');
        console.error('\r\n-------------------------------------\r\n');
        process.exit();
    }

    console.log(`Dropped to: ${batch.map(x => x.account).join(',')}`);
    return true;
};

exports.dropTokens = async (accountBalances, config) => {
    const eos = await getEos(config.privateKey);
    const auth = {authorization:[`${config.issuer}@active`]};
    await dropBatch(accountBalances, eos, auth, config.symbol);
};