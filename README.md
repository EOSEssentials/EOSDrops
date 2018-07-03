# EOSDrops - EOS Airdropping Tool

## Requirements:
- You must have nodejs installed.
- Your `eosio.token` contract must already exist on the network prior to running this.
- You will need to buy the RAM for the issuing account prior to running this.
- You will need to self delegate ( stake ) enough CPU/Net for the airdrop.

## Setup:

- run `npm i`
- Edit the `config.json` file with your parameters.
- Edit (add/remove) accounts that you want to blacklist from your airdrop
- If you want to use another snapshot, replace the `snapshot.csv` file.
- run `node airdrop.js` to start the airdrop

### Limitting Airdrop for Certain Accounts

If you want to limit the airdrop cap for whales, you can just set the `limitCap` parameter of `config.json` to greater than zero.

Example: You want to airdrop tokens but limit accounts that are greater than 250,000 EOS. So if you have an airdrop ratio of 2:1,
instead of a whale that has 2,000,000 EOS receive 4,000,000, he will be capped at 250,000 EOS and will receive 500,000 tokens
based in your 2:1 ratio.

Now, if you want to whitelist some of these addresses (let's say an exchange that has a lot of accounts), you can edit the
`capWhitelist.json` to have addresses that you want to ignore the airdrop cap limit.

## Logs:

All of the logs will be included in the `logs/` directory. They will be prefixed with the UNIX timestamp
from the time they were started.

