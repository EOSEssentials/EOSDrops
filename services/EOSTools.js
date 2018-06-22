const Eos = require('eosjs');
const {format, ecc} = Eos.modules;
const pMap = require('p-map');



let httpEndpoint = null;
let chainId = null;
let logger = null;
let db = null;

exports.setLogger = _logger => logger = _logger;
exports.setDB = _db => db = _db;

exports.setNetwork = async network => {
    if(!network || !network.length) network = 'https://nodes.get-scatter.com';

    await Eos({httpEndpoint:network}).getInfo({}).catch(() => {
        logger.error(`Could not get_info from: ${network}`)
        process.exit();
    }).then(info => chainId = info.chain_id);

    httpEndpoint = network;
};

const lastAccount = () => db.get('lastAccountDropped').value();

const getEos = async privateKey => {
    logger.warn(chainId, httpEndpoint);
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
        code:config.tokenAccount,
        scope:config.symbol,
        table:'stat'
    }).then(x => {
        const token = x.rows[0];
        config.decimals = token.max_supply.split(' ')[0].split('.')[1].length;
        config.issuer = token.issuer;
        return true;
    }).catch(() => {
        logger.error(`ERROR: Could not get token info from account: '${config.tokenAccount}' for the symbol '${config.symbol}'`);
        process.exit();
    });
};

exports.validPrivateKey = (privateKey) => ecc.isValidPrivate(privateKey);


/***
 * Estimates the total amount of RAM needed for this airdrop
 * @param accountBalances
 * @param config
 * @returns {Promise.<[string,string]>}
 */
exports.estimateRAM = async (accountBalances, config) => {
    const parseAsset = asset => asset.split(' ')[0];
    const getRamInfo = async () => (await getEos()).getTableRows({
        json:true,
        code:'eosio',
        scope:'eosio',
        table:'rammarket'
    }).then(res => {
        const ramInfo = res.rows[0];
        const systemSymbol = ramInfo.quote.balance.split(' ')[1];
        return [parseAsset(ramInfo.quote.balance), parseAsset(ramInfo.base.balance), systemSymbol];
    });

    const fetchEOSPrice = async () => {
        return (await fetch('https://api.coinmarketcap.com/v1/ticker/eos/')
            .then(response => response.json()))[0].price_usd;
    };

    const totalKB = (accountBalances.map(tuple => `${tuple.account}${tuple.amount} ${config.symbol}`).join('').length / 1024).toFixed(8);
    const ramInfo = await getRamInfo();
    const pricePerKB = ((ramInfo[0] / ramInfo[1]).toFixed(8) * 1024).toFixed(4);
    const eosPrice = totalKB * pricePerKB;

    const dollarPrice = await fetchEOSPrice();

    return [totalKB, `${eosPrice} ${ramInfo[2]}`, `$${eosPrice*dollarPrice}`];
};


/***
 * Gets an account's SYMBOL token balance
 * @param eos
 * @param code
 * @param symbol
 * @param tuple
 * @returns {Promise.<TResult>}
 */
const getBalance = async (eos, code, symbol, tuple) => {
    return await eos.getTableRows({
        json:true,
        code,
        scope:format.encodeName(tuple.account, false),
        table:'accounts'
    }).then(res => {
        return {account:tuple.account, dropped:!!res.rows.filter(row => row.balance.split(' ')[1] === symbol).length};
    }).catch(err => {
        logger.warn(`ERROR: Failed to get tokens for ${tuple.account}. Considering this account already dropped and continuing. - `, err);
        return {account:tuple.account, dropped:true};
    })
};

/***
 * Starts dropping the tokens.
 * Batches out requests to 10 transactions per batch.
 * Then waits 510 milliseconds between batches to hit the next block.
 * @param accountBalances
 * @param config
 * @returns {Promise.<void>}
 */
exports.dropTokens = async (accountBalances, config) => {
    const eos = await getEos(config.privateKey);
    const contract = await eos.contract(config.tokenAccount);
    const auth = {authorization:[`${config.issuer}@active`]};
    const lastAccountDropped = lastAccount();
    const startingIndex = lastAccountDropped.length ? accountBalances.findIndex(e => e.account === lastAccountDropped) : 0;
    const accountsFrom = accountBalances.slice(startingIndex, accountBalances.length-1);

    if(startingIndex > 0)
        logger.warn(`Dropping to ${accountsFrom.length} accounts, already processed ${accountBalances.length - accountsFrom.length} accounts`);

    await recurseBatch(accountsFrom, eos, contract, auth, config);
};

const recurseBatch = async (accountBalances, eos, contract, auth, config) => {
    return new Promise(async (resolve) => {
        if(!accountBalances.length) return resolve(true);

        const batches = [];

        const getBatch = size => {
            const batch = [];
            while(batch.length < size && accountBalances.length) batch.push(accountBalances.shift());
            return batch;
        };

        const batchesCount = Math.round(config.batchSize / 10);
        const perBatch = Math.round(config.batchSize / batchesCount);

        while(batches.length < batchesCount && accountBalances.length)
            batches.push(getBatch(perBatch));

        await pMap(batches, batch => dropBatch(batch, eos, contract, auth, config));
        setTimeout(async() => await recurseBatch(accountBalances, eos, contract, auth, config), 150);
    })
};

const dropBatch = async (batch, eos, contract, auth, config, tries = 0) => {
    if(tries > 3){

        db.update('failed', tuples => tuples = tuples.concat(batch)).write();
        // process.exit();
    }

    const {symbol, tokenAccount, memo, batchSize} = config;


    let error = null;

    const filters = await pMap(batch, tuple => getBalance(eos, tokenAccount, symbol, tuple), {concurrency:batchSize < 20 ? batchSize : 20});
    batch = batch.filter(tuple => filters.find(filter => filter.account === tuple.account && !filter.dropped));

    if(!batch.length){
        logger.warn('no batch');
        return false;
    }

    const dropped = await contract.transaction(tr => batch.map(tuple =>
        tr.issue(tuple.account, `${tuple.amount} ${symbol}`, memo, auth)
    )).then(res => res.transaction_id)
      .catch(err  => { error = err; return false; });

    // Quits on failure to allow restarting from a specified account
    // instead of having to parse the snapshot for sent/unsent.
    if(!dropped){
        logger.error('\r\n-------------------------------------\r\n');
        logger.error('ERROR: Failed batch! - ', error)
        logger.error(batch.map(x => x.account).join(','));
        logger.error('You should restart the airdrop with the first account in the list above');
        logger.error('\r\n-------------------------------------\r\n');
        return await dropBatch(batch, eos, contract, auth, config, tries+1);
    }

    db.set('lastAccountDropped', batch[batch.length-1].account).write();
    db.update('success', tuples => tuples = tuples.concat(batch)).write();

    logger.warn(`${dropped} | ${batch.map(x => x.account).join(',')}`);
    return true;
};