# EOSDrops - EOS Airdropping Tool

## Requirements:
- You must have nodejs installed.
- Your `eosio.token` contract must already exist on the network prior to running this.
- You will need to buy the RAM for the issuing account prior to running this.
- You will need to self delegate ( stake ) enough CPU/Net for the airdrop.

## Setup:

- run `npm i`
- Edit the `config.json` file with your parameters.
- If you want to use another snapshot, replace the `snapshot.csv` file.
- run `node airdrop.js` to start the airdrop

## Logs:

All of the logs will be included in the `logs/` directory. They will be prefixed with the UNIX timestamp
from the time they were started.

