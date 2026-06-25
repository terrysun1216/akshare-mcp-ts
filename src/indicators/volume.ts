/**
 * 成交量类指标: OBV, AD, ADOSC
 */

import { ema, closes, highs, lows, volumes } from './helpers.js';
import type { OHLCV } from '../types/index.js';

/** OBV: On-Balance Volume, 累加 signed volume */
export function calcObv(records: OHLCV[]): number[] {
  const result: number[] = [0];
  const closeVals = closes(records);

  for (let i = 1; i < records.length; i++) {
    if (closeVals[i] > closeVals[i - 1]) {
      result.push(result[i - 1] + records[i].volume);
    } else if (closeVals[i] < closeVals[i - 1]) {
      result.push(result[i - 1] - records[i].volume);
    } else {
      result.push(result[i - 1]);
    }
  }
  // 第一个值设为 NaN（与 Python 版一致）
  result[0] = NaN;
  return result;
}

/** AD: Accumulation/Distribution Line, 累加 MFV */
export function calcAd(records: OHLCV[]): number[] {
  const result: number[] = [NaN];
  const closeVals = closes(records);
  const highVals = highs(records);
  const lowVals = lows(records);
  const volumeVals = volumes(records);

  let ad = 0;
  for (let i = 0; i < records.length; i++) {
    const h = highVals[i];
    const l = lowVals[i];
    const c = closeVals[i];
    const v = volumeVals[i];

    const mfm = (h - l) === 0 ? 0 : ((c - l) - (h - c)) / (h - l);
    ad += mfm * v;
    result[i] = ad;
  }
  return result;
}

/** ADOSC: Chaikin A/D Oscillator = EMA(AD, fast) - EMA(AD, slow) */
export function calcAdosc(
  records: OHLCV[],
  fastPeriod: number = 3,
  slowPeriod: number = 10,
): number[] {
  const adVals = calcAd(records);
  const validAd = adVals.filter(v => !isNaN(v));

  const emaFast = ema(validAd, fastPeriod);
  const emaSlow = ema(validAd, slowPeriod);

  const result: number[] = new Array(records.length).fill(NaN);
  const nanCount = adVals.findIndex(v => !isNaN(v));
  for (let i = 0; i < emaFast.length; i++) {
    const idx = nanCount + i;
    if (idx >= records.length) break;
    if (isNaN(emaFast[i]) || isNaN(emaSlow[i])) continue;
    result[idx] = emaFast[i] - emaSlow[i];
  }
  return result;
}
