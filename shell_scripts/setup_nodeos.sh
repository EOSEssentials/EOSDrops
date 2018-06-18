#!/bin/bash

PKEY=EOS6MRyAjQq8ud7hVNYcfnVPJqcVpscN5So8BhtHuGYqET5GDW5CV

cleos create account eosio eosio.ram $PKEY $PKEY -p eosio
cleos create account eosio eosio.ramfee $PKEY $PKEY -p eosio
cleos create account eosio eosio.stake $PKEY $PKEY -p eosio
cleos create account eosio eosio.token $PKEY $PKEY -p eosio

cleos set contract eosio.token ~/eos/build/contracts/eosio.token -p eosio.token
cleos push action eosio.token create '[ "eosio", "1000000000.0000 SYS"]' -p eosio.token
cleos push action eosio.token issue '[ "eosio", "1000000000.0000 SYS", "init" ]' -p eosio

cleos set contract eosio ~/eos/build/contracts/eosio.system -p eosio
cleos push action eosio setram '{"max_ram_size":"64599818083"}' -p eosio