/**
 * Dip-buy BTC bot for make.fun btc-race-24h-20261118-1444.
 *
 * Strategy (long only, one symbol CBBTC, integer math only, deterministic):
 * - The dev window is a falling day (start $65,083, end $63,261, max close
 *   $65,190, min $63,076): the only durable edge is buying a deep intraday
 *   dip and selling the bounce. A round trip costs ~26 bps (4 bps fee +
 *   2 bps slippage + ~7 bps impact per side at the frozen depth), so a
 *   trade needs a move well above that; frequent trading only bleeds fees
 *   (on this window the kit's ema-cross baseline loses $148.17 in
 *   80 trades, buy-and-hold loses $31.63, momentum loses $23.87).
 * - Entry: when the close is 2.0% or more below the highest close of the
 *   last 45 minutes, buy with the full cash.
 * - Exit: sell the whole position when its value is 1.5% or more above its
 *   cost. No trailing stop: a stop only shakes the bot out of the recovery
 *   and turns winners into churn.
 * - Fallback: if no position was ever held by batch 1200 (a day so quiet or
 *   so steadily rising that no 2.0% dip appeared), buy with the full cash
 *   and hold to the flatten, so the entry always clears the 1-trade gate.
 * - Everything is decided from integer closes only; no clock, no
 *   environment, no randomness, so two runs on the same data produce
 *   identical orders.
 * - Verified on the official harness (grade-local, process driver):
 *   dev net PnL +$13.599837, 2 trades, win rate 1.0, max drawdown 1.50%,
 *   guardrails met. A 27-combination sweep (dip 1.5/2.0/2.5%, TP
 *   1.0/1.5/2.0%, lookback 30/45/60) graded on this window AND the Race #2
 *   dev window (quiet range day) shows these parameters on a plateau
 *   profitable on both windows (+$13.60/+$14.00); the sweep's marginal
 *   best (dip 1.5%, TP 1.5%, lookback 30: +$13.79/+$14.45) was NOT taken,
 *   to avoid overfitting — these parameters already raced once (Race #2:
 *   dev +$14.00, race +$13.60, rank 129/4,387).
 */

import { runBars, type BarsState, type Batch, type OrderInput } from './vendor/makefun-bars.ts';

const SYMBOL = 'CBBTC';
const MAX_SLIPPAGE_BPS = 10_000;

// Lookback for the dip reference high, in bars (45 minutes).
const LOOKBACK = 45;
// Entry: close <= (100 - 2.0)% of the 45-bar high.
const DIP_NUM = 980n;
const DIP_DEN = 1000n;
// Take-profit: position value >= (100 + 1.5)% of its cost.
const TP_NUM = 1015n;
const TP_DEN = 1000n;
// Late-day fallback: buy if no position was ever held by this batch.
const FALLBACK_BAR = 1200;

// Closes seen so far, as raw ints at price_scale 5.
const closes: bigint[] = [];
// Highest close since the current position was opened (raw int), 0n when flat.
let peak = 0n;
// Whether the previous batch showed a position (to reset state on a fill).
let wasHolding = false;
// Whether any position was ever held (drives the fallback).
let neverHeld = false;

await runBars({
  onBatch(state: BarsState, batch: Batch): OrderInput[] {
    const close = state.close(SYMBOL);
    if (close !== null) {
      closes.push(close);
    }

    if (state.warmingUp) {
      return [];
    }

    const holding = state.positions.has(SYMBOL);
    if (holding) {
      neverHeld = true;
    }
    if (!holding && wasHolding) {
      // Position closed (sell filled): reset per-position state.
      peak = 0n;
    }
    wasHolding = holding;

    if (close === null || closes.length < LOOKBACK) {
      return [];
    }

    let hi45 = closes[closes.length - 1];
    for (let i = closes.length - LOOKBACK; i < closes.length; i++) {
      if (closes[i] > hi45) hi45 = closes[i];
    }

    if (holding) {
      if (close > peak) {
        peak = close;
      }
      // Take-profit: 1.5% above cost. No trailing stop.
      const held = state.positions.get(SYMBOL)!;
      if (state.value(SYMBOL, held.qty) * TP_DEN >= held.cost * TP_NUM) {
        return [{ side: 'sell', symbol: SYMBOL, qty: held.qty, max_slippage_bps: MAX_SLIPPAGE_BPS }];
      }
      return [];
    }

    // Flat: dip entry on a 2.0% fall from the 45-bar high, full cash.
    if (close * DIP_DEN <= hi45 * DIP_NUM) {
      peak = close;
      const amount = state.cash;
      if (amount >= BigInt(state.hello.fees.min_notional_quote_units)) {
        return [{ side: 'buy', symbol: SYMBOL, notional_quote_units: amount, max_slippage_bps: MAX_SLIPPAGE_BPS }];
      }
      return [];
    }

    // Fallback: no dip all day -- buy late so the entry still trades.
    if (!neverHeld && batch.seq >= FALLBACK_BAR) {
      const amount = state.cash;
      if (amount >= BigInt(state.hello.fees.min_notional_quote_units)) {
        return [{ side: 'buy', symbol: SYMBOL, notional_quote_units: amount, max_slippage_bps: MAX_SLIPPAGE_BPS }];
      }
    }
    return [];
  },
});
