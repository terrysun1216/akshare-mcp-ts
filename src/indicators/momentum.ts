/**
 * 动量类指标: RSI, CCI, ADX, DX, MFI, MOM, CMO, WILLR
 */

import { wilderSmooth, closes, highs, lows } from './helpers.js';
import { calcAtr } from './volatility.js';
import { calcPlusDm, calcMinusDm } from './directional.js';
import type { OHLCV } from '../types/index.js';

/** RSI = 100 - 100/(1 + avgGain/avgLoss), Wilder 平滑 */
export function calcRsi(records: OHLCV[], window: number = 14): number[] {
  const closeVals = closes(records);
  const result: number[] = new Array(records.length).fill(NaN);
  if (records.length <= window) return result;

  const deltas = closeVals.slice(1).map((v, i) => v - closeVals[i]);
  const gains = deltas.map(d => (d > 0 ? d : 0));
  const losses = deltas.map(d => (d < 0 ? -d : 0));

  const avgGain = wilderSmooth(gains, window);
  const avgLoss = wilderSmooth(losses, window);

  for (let i = 0; i < avgGain.length; i++) {
    const idx = i + window;
    if (idx >= closeVals.length) break;
    if (avgLoss[i] === 0) {
      result[idx] = 100;
    } else {
      result[idx] = 100 - 100 / (1 + avgGain[i] / avgLoss[i]);
    }
  }
  return result.map(v => (isNaN(v) ? NaN : Math.max(0, Math.min(100, v))));
}

/** CCI = (TP - SMA(TP)) / (0.015 * mean_abs_dev) */
export function calcCci(records: OHLCV[], window: number = 14): number[] {
  const result: number[] = new Array(records.length).fill(NaN);

  for (let i = window - 1; i < records.length; i++) {
    const tpSlice: number[] = [];
    for (let j = i - window + 1; j <= i; j++) {
      tpSlice.push((records[j].high + records[j].low + records[j].close) / 3);
    }
    const tpMean = tpSlice.reduce((a, b) => a + b, 0) / tpSlice.length;
    const mad = tpSlice.reduce((sum, v) => sum + Math.abs(v - tpMean), 0) / tpSlice.length;
    const tp = (records[i].high + records[i].low + records[i].close) / 3;
    result[i] = mad === 0 ? 0 : (tp - tpMean) / (0.015 * mad);
  }
  return result;
}

/** ADX = WilderSmooth(DX), DX = 100 * |+DI - -DI| / (+DI + -DI) */
export function calcAdx(records: OHLCV[], window: number = 14): number[] {
  const pdm = calcPlusDm(records, window);
  const mdm = calcMinusDm(records, window);
  const atrVals = calcAtr(records, window);

  const dxVals: number[] = new Array(records.length).fill(NaN);
  for (let i = 0; i < records.length; i++) {
    if (isNaN(pdm[i]) || isNaN(mdm[i]) || isNaN(atrVals[i]) || atrVals[i] === 0) continue;
    const plusDi = 100 * pdm[i] / atrVals[i];
    const minusDi = 100 * mdm[i] / atrVals[i];
    const sum = plusDi + minusDi;
    dxVals[i] = sum === 0 ? 0 : 100 * Math.abs(plusDi - minusDi) / sum;
  }

  const validDx = dxVals.filter(v => !isNaN(v));
  const smoothDx = wilderSmooth(validDx, window);

  const result: number[] = new Array(records.length).fill(NaN);
  const startIdx = dxVals.findIndex(v => !isNaN(v));
  for (let i = 0; i < smoothDx.length; i++) {
    result[startIdx + i] = smoothDx[i];
  }
  return result;
}

/** DX = 100 * |+DI - -DI| / (+DI + -DI) */
export function calcDx(records: OHLCV[], window: number = 14): number[] {
  const pdm = calcPlusDm(records, window);
  const mdm = calcMinusDm(records, window);
  const atrVals = calcAtr(records, window);

  const result: number[] = new Array(records.length).fill(NaN);
  for (let i = 0; i < records.length; i++) {
    if (isNaN(pdm[i]) || isNaN(mdm[i]) || isNaN(atrVals[i]) || atrVals[i] === 0) continue;
    const plusDi = 100 * pdm[i] / atrVals[i];
    const minusDi = 100 * mdm[i] / atrVals[i];
    const sum = plusDi + minusDi;
    result[i] = sum === 0 ? 0 : 100 * Math.abs(plusDi - minusDi) / sum;
  }
  return result;
}

/** MFI: Money Flow Index */
export function calcMfi(records: OHLCV[], window: number = 14): number[] {
  const result: number[] = new Array(records.length).fill(NaN);
  const tp = records.map(r => (r.high + r.low + r.close) / 3);
  const mf = tp.map((v, i) => v * records[i].volume);

  for (let i = window; i < records.length; i++) {
    let posMf = 0;
    let negMf = 0;
    for (let j = i - window + 1; j <= i; j++) {
      if (tp[j] > tp[j - 1]) posMf += mf[j];
      else if (tp[j] < tp[j - 1]) negMf += mf[j];
    }
    result[i] = negMf === 0 ? 100 : 100 - 100 / (1 + posMf / negMf);
  }
  return result;
}

/** MOM = close_t - close_{t-window} */
export function calcMom(records: OHLCV[], window: number = 10): number[] {
  const closeVals = closes(records);
  const result: number[] = new Array(records.length).fill(NaN);
  for (let i = window; i < records.length; i++) {
    result[i] = closeVals[i] - closeVals[i - window];
  }
  return result;
}

/** CMO = 100 * (UpSum - DownSum) / (UpSum + DownSum) */
export function calcCmo(records: OHLCV[], window: number = 14): number[] {
  const closeVals = closes(records);
  const result: number[] = new Array(records.length).fill(NaN);

  for (let i = window; i < records.length; i++) {
    let upSum = 0;
    let downSum = 0;
    for (let j = i - window + 1; j <= i; j++) {
      const diff = closeVals[j] - closeVals[j - 1];
      if (diff > 0) upSum += diff;
      else downSum += -diff;
    }
    result[i] = (upSum + downSum) === 0 ? 0 : 100 * (upSum - downSum) / (upSum + downSum);
  }
  return result;
}

/** WILLR = -100 * (HH - close) / (HH - LL) */
export function calcWillr(records: OHLCV[], window: number = 14): number[] {
  const result: number[] = new Array(records.length).fill(NaN);
  const highVals = highs(records);
  const lowVals = lows(records);
  const closeVals = closes(records);

  for (let i = window - 1; i < records.length; i++) {
    const hh = Math.max(...highVals.slice(i - window + 1, i + 1));
    const ll = Math.min(...lowVals.slice(i - window + 1, i + 1));
    result[i] = (hh - ll) === 0 ? 0 : -100 * (hh - closeVals[i]) / (hh - ll);
  }
  return result;
}
