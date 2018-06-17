const Eos = require('eosjs');
const {ecc} = Eos.modules;

/***
 * Fetches the token stats and binds to scope
 * @returns {Promise.<T>}
 */
exports.fillTokenStats = async config => {
    const httpEndpoint = 'http://192.168.1.7:8888';
    const eos = Eos({httpEndpoint});
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