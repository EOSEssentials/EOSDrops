#!/bin/bash

cleos system newaccount eosio testissuer \
                EOS5AwwyqQTsrMTkBbGxkbJz9vMugi7d3zHBRiGvbWv1eU4dGYc4v EOS5AwwyqQTsrMTkBbGxkbJz9vMugi7d3zHBRiGvbWv1eU4dGYc4v \
                --stake-net "200.0000 SYS" \
                --stake-cpu "200.0000 SYS" \
                --buy-ram "10000.0000 SYS" \
                -p eosio

cleos push action eosio.token create '[ "testissuer", "1000000000.0000 TEST"]' -p eosio.token
