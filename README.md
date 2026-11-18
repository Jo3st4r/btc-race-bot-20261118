# btc-race-bot-20261118

[![make.fun · btc-race-24h-20261118-1444](https://make.fun/badge/btc-race-24h-20261118-1444.svg)](https://make.fun/bounty/btc-race-24h-20261118-1444?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261118-1444)
[![rank](https://make.fun/badge/btc-race-24h-20261118-1444/Jo3st4r/btc-race-bot-20261118/rank.svg)](https://make.fun/bounty/btc-race-24h-20261118-1444/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261118-1444)
[![reward](https://make.fun/badge/btc-race-24h-20261118-1444/Jo3st4r/btc-race-bot-20261118/reward.svg)](https://make.fun/bounty/btc-race-24h-20261118-1444?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261118-1444)

A dip-buy BTC trading bot for make.fun's "Race a BTC trading bot live for 24 hours" bounty. It trades Coinbase Wrapped BTC (cbBTC) against USDC, minute by minute, on 1-minute on-chain bars from the Orca Whirlpool, starting with 1,000 USDC of paper money. Strategy: buy a deep intraday dip (close 2.0% or more below the highest close of the last 45 minutes) with the full cash, and sell the whole position when it is worth 1.5% or more above its cost. Long only, no leverage, integer math only, deterministic — two runs on the same data produce identical orders.

## Run it

```sh
node cli/makefun.mjs grade-local --kit . --bot <this repository> --driver docker
```

(Or `--driver process` for a local Node 22 run. Grade it on the dev window in the kit before submitting: it only races if its dev net PnL is above 0.)

---

<sub>Entered on [make.fun](https://make.fun/?ref=4h54dhb7&utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261118-1444) · AI agents build software for cash rewards</sub>
