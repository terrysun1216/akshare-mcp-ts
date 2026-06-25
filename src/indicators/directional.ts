/**
 * 方向性指标: +DI, -DI, +DM, -DM
 */

import { wilderSmooth, rolling, highs, lows } from './helpers.js';
import { calcAtr } from './volatility.js';
import type { OHLCV } from '../types/index.js';

/** +DM: Δhigh if Δhigh > -Δlow and Δhigh > 0 else 0, smoothed by Wilder */
export function calcPlusDm(records: OHLCV[], window: number = 14): number[] {
  const dmVals: number[] = [NaN];
  for (let i = 1; i < records.length; i++) {
    const dHigh = records[i].high - records[i - 1].high;
    const dLow = records[i - 1].low - records[i].low;
    if (dHigh > dLow && dHigh > 0) {
      dmVals.push(dHigh);
    } else {
      dmVals.push(0);
    }
  }

  const validDm = dmVals.filter(v => !isNaN(v));
  const smooth = wilderSmooth(validDm, window);

  const result: number[] = new Array(records.length).fill(NaN);
  const startIdx = dmVals.findIndex(v => !isNaN(v));
  for (let i = 0; i < smooth.length; i++) {
    result[startIdx + i] = smooth[i];
  }
  return result;
}

/** -DM: -Δlow if -Δlow > Δhigh and -Δlow > 0 else 0, smoothed by Wilder */
export function calcMinusDm(records: OHLCV[], window: number = 14): number[] {
  const dmVals: number[] = [NaN];
  for (let i = 1; i < records.length; i++) {
    const dHigh = records[i].high - records[i - 1].high;
    const dLow = records[i - 1].low - records[i].low;
    if (dLow > dHigh && dLow > 0) {
      dmVals.push(dLow);
    } else {
      dmVals.push(0);
    }
  }

  const validDm = dmVals.filter(v => !isNaN(v));
  const smooth = wilderSmooth(validDm, window);

  const result: number[] = new Array(records.length).fill(NaN);
  const startIdx = dmVals.findIndex(v => !isNaN(v));
  for (let i = 0; i < smooth.length; i++) {
    result[startIdx + i] = smooth[i];
  }
  return result;
}

/** +DI = 100 * WilderSmooth(+DM) / ATR */
export function calcPlusDi(records: OHLCV[], window: number = 14): number[] {
  const pdm = calcPlusDm(records, window);
  const atrVals = calcAtr(records, window);
  const result: number[] = new Array(records.length).fill(NaN);
  for (let i = 0; i < records.length; i++) {
    if (isNaN(pdm[i]) || isNaN(atrVals[i]) || atrVals[i] === 0) continue;
    result[i] = 100 * pdm[i] / atrVals[i];
  }
  return result;
}

/** -DI = 100 * WilderSmooth(-DM) / ATR */
export function calcMinusDi(records: OHLCV[], window: number = 14): number[] {
  const mdm = calcMinusDm(records, window);
  const atrVals = calcAtr(records, window);
  const result: number[] = new Array(records.length).fill(NaN);
  for (let i = 0; i < records.length; i++) {
    if (isNaN(mdm[i]) || isNaN(atrVals[i]) || atrVals[i] === 0) continue;
    result[i] = 100 * mdm[i] / atrVals[i];
  }
  return result;
}
