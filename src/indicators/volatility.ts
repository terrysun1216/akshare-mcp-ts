/**
 * 波动率类指标: BOLL, ATR, SAR
 */

import { sma, rollingStd, wilderSmooth, rollingMax, rollingMin, closes, highs, lows } from './helpers.js';
import type { OHLCV } from '../types/index.js';

/** BOLL: Middle=SMA(close), Upper=Middle+std*σ, Lower=Middle-std*σ */
export function calcBoll(
  records: OHLCV[],
  window: number = 20,
  std: number = 2,
): { upper: number[]; middle: number[]; lower: number[] } {
  const closeVals = closes(records);
  const middle = sma(closeVals, window);
  const stdVals = rollingStd(closeVals, window);

  const upper = middle.map((v, i) => (isNaN(v) || isNaN(stdVals[i]) ? NaN : v + std * stdVals[i]));
  const lower = middle.map((v, i) => (isNaN(v) || isNaN(stdVals[i]) ? NaN : v - std * stdVals[i]));

  return { upper, middle, lower };
}

/** ATR: WilderSmooth(TrueRange), TR = max(H-L, |H-C_prev|, |L-C_prev|) */
export function calcAtr(records: OHLCV[], window: number = 14): number[] {
  const trVals: number[] = [NaN];
  for (let i = 1; i < records.length; i++) {
    const h = records[i].high;
    const l = records[i].low;
    const cPrev = records[i - 1].close;
    trVals.push(Math.max(h - l, Math.abs(h - cPrev), Math.abs(l - cPrev)));
  }

  const validTr = trVals.filter(v => !isNaN(v));
  const atrVals = wilderSmooth(validTr, window);

  const result: number[] = new Array(records.length).fill(NaN);
  const startIdx = trVals.findIndex(v => !isNaN(v));
  for (let i = 0; i < atrVals.length; i++) {
    result[startIdx + i] = atrVals[i];
  }
  return result;
}

/** SAR: 抛物线转向，迭代算法 */
export function calcSar(
  records: OHLCV[],
  acceleration: number = 0.02,
  maximum: number = 0.2,
): number[] {
  const result: number[] = new Array(records.length).fill(NaN);
  if (records.length < 2) return result;

  // 初始趋势: 前两根 K 线确定
  let isUp = records[1].close >= records[0].close;
  let sar = isUp ? Math.min(records[0].low, records[1].low) : Math.max(records[0].high, records[1].high);
  let ep = isUp ? Math.max(records[0].high, records[1].high) : Math.min(records[0].low, records[1].low);
  let af = acceleration;

  result[0] = NaN;
  result[1] = sar;

  for (let i = 2; i < records.length; i++) {
    const prevSar = sar;

    // 计算新 SAR
    sar = isUp
      ? prevSar + af * (ep - prevSar)
      : prevSar - af * (prevSar - ep);

    // Uptrend SAR bounded below by prior two lows
    if (isUp) {
      const bound = Math.min(records[i - 1].low, records[i - 2].low);
      sar = Math.min(sar, bound);
    } else {
      const bound = Math.max(records[i - 1].high, records[i - 2].high);
      sar = Math.max(sar, bound);
    }

    // 检查翻转
    if (isUp && records[i].low < sar) {
      // 翻转为下跌
      isUp = false;
      sar = ep;
      ep = records[i].low;
      af = acceleration;
    } else if (!isUp && records[i].high > sar) {
      // 翻转为上涨
      isUp = true;
      sar = ep;
      ep = records[i].high;
      af = acceleration;
    } else {
      // 无翻转，更新 EP 和 AF
      if (isUp && records[i].high > ep) {
        ep = records[i].high;
        af = Math.min(af + acceleration, maximum);
      } else if (!isUp && records[i].low < ep) {
        ep = records[i].low;
        af = Math.min(af + acceleration, maximum);
      }
    }

    result[i] = sar;
  }
  return result;
}
