#!/bin/bash

ACCOUNTS=(test test1 test2 test3 test4 test5)

create(){
        cleos system newaccount eosio $1 \
                EOS5AwwyqQTsrMTkBbGxkbJz9vMugi7d3zHBRiGvbWv1eU4dGYc4v EOS5AwwyqQTsrMTkBbGxkbJz9vMugi7d3zHBRiGvbWv1eU4dGYc4v \
                --stake-net "20.0000 SYS" \
                --stake-cpu "20.0000 SYS" \
                --buy-ram "100.0000 SYS" \
                -p eosio

}

for name in "${ACCOUNTS[@]}"
do
        create $name
done
