/**
 * 趋势类指标: SMA, EMA, MACD, APO, PPO, TRIX, ULTOSC
 */

import { sma, ema, closes, highs, lows } from './helpers.js';
import type { OHLCV } from '../types/index.js';

/** 简单移动平均 */
export function calcSma(records: OHLCV[], window: number = 20): number[] {
  return sma(closes(records), window);
}

/** 指数移动平均 */
export function calcEma(records: OHLCV[], window: number = 20): number[] {
  return ema(closes(records), window);
}

/** MACD: EMA(fast)-EMA(slow), Signal=EMA(MACD, signal), Histogram=MACD-Signal */
export function calcMacd(
  records: OHLCV[],
  fast: number = 12,
  slow: number = 26,
  signal: number = 9,
): { macd: number[]; signal: number[]; histogram: number[] } {
  const closeVals = closes(records);
  const emaFast = ema(closeVals, fast);
  const emaSlow = ema(closeVals, slow);

  // MACD line = fast - slow
  const macdLine = emaFast.map((v, i) => (isNaN(v) || isNaN(emaSlow[i]) ? NaN : v - emaSlow[i]));

  // Signal line = EMA of MACD line
  const validMacd = macdLine.filter(v => !isNaN(v));
  const signalEma = ema(validMacd, signal);

  // 找回原始索引
  const nanCount = macdLine.findIndex(v => !isNaN(v));
  const signalLine: number[] = new Array(macdLine.length).fill(NaN);
  for (let i = 0; i < signalEma.length; i++) {
    signalLine[nanCount + i] = signalEma[i];
  }

  const histogram = macdLine.map((v, i) =>
    isNaN(v) || isNaN(signalLine[i]) ? NaN : v - signalLine[i],
  );

  return { macd: macdLine, signal: signalLine, histogram };
}

/** APO = MA(fast) - MA(slow), maType: 0=SMA, 1=EMA */
export function calcApo(
  records: OHLCV[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  maType: number = 0,
): number[] {
  const closeVals = closes(records);
  const maFn = maType === 0 ? sma : ema;
  const maFast = maFn(closeVals, fastPeriod);
  const maSlow = maFn(closeVals, slowPeriod);
  return maFast.map((v, i) => (isNaN(v) || isNaN(maSlow[i]) ? NaN : v - maSlow[i]));
}

/** PPO = 100 * (MA(fast) - MA(slow)) / MA(slow) */
export function calcPpo(
  records: OHLCV[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  maType: number = 0,
): number[] {
  const closeVals = closes(records);
  const maFn = maType === 0 ? sma : ema;
  const maFast = maFn(closeVals, fastPeriod);
  const maSlow = maFn(closeVals, slowPeriod);
  return maFast.map((v, i) => {
    if (isNaN(v) || isNaN(maSlow[i]) || maSlow[i] === 0) return NaN;
    return 100 * (v - maSlow[i]) / maSlow[i];
  });
}

/** TRIX = 100 * (EMA3_t - EMA3_{t-1}) / EMA3_{t-1} */
export function calcTrix(records: OHLCV[], window: number = 30): number[] {
  const closeVals = closes(records);
  // 不跨级过滤 NaN — 每层 EMA 自然会延迟 window-1 个位置
  const ema1 = ema(closeVals, window);
  const ema2 = ema(ema1, window);
  const ema3 = ema(ema2, window);

  const result: number[] = new Array(closeVals.length).fill(NaN);
  for (let i = 1; i < ema3.length; i++) {
    if (isNaN(ema3[i]) || isNaN(ema3[i - 1])) continue;
    result[i] = ema3[i - 1] === 0 ? 0 : 100 * (ema3[i] - ema3[i - 1]) / ema3[i - 1];
  }
  return result;
}

/** ULTOSC = 100 * (4*Avg1 + 2*Avg2 + Avg3) / 7 */
export function calcUltosc(
  records: OHLCV[],
  window1: number = 7,
  window2: number = 14,
  window3: number = 28,
): number[] {
  const result: number[] = new Array(records.length).fill(NaN);
  const maxWindow = Math.max(window1, window2, window3);

  for (let i = maxWindow - 1; i < records.length; i++) {
    const avg = (w: number) => {
      let bpSum = 0;
      let trSum = 0;
      for (let j = i - w + 1; j <= i; j++) {
        const prevClose = j > 0 ? records[j - 1].close : records[j].close;
        const trueLow = Math.min(records[j].low, prevClose);
        const trueHigh = Math.max(records[j].high, prevClose);
        bpSum += records[j].close - trueLow;
        trSum += trueHigh - trueLow;
      }
      return trSum === 0 ? 0 : bpSum / trSum;
    };

    const avg1 = avg(window1);
    const avg2 = avg(window2);
    const avg3 = avg(window3);
    result[i] = 100 * (4 * avg1 + 2 * avg2 + avg3) / 7;
  }
  return result;
}
