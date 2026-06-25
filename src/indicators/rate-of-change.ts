/**
 * 变化率指标: ROC, ROCP, ROCR, ROCR100
 */

import { closes } from './helpers.js';
import type { OHLCV } from '../types/index.js';

/** ROC = 100 * (close_t - close_{t-window}) / close_{t-window} */
export function calcRoc(records: OHLCV[], window: number = 10): number[] {
  const closeVals = closes(records);
  const result: number[] = new Array(records.length).fill(NaN);
  for (let i = window; i < records.length; i++) {
    result[i] = closeVals[i - window] === 0 ? 0 : 100 * (closeVals[i] - closeVals[i - window]) / closeVals[i - window];
  }
  return result;
}

/** ROCP = (close_t - close_{t-window}) / close_{t-window} (无百分比缩放) */
export function calcRocp(records: OHLCV[], window: number = 10): number[] {
  const closeVals = closes(records);
  const result: number[] = new Array(records.length).fill(NaN);
  for (let i = window; i < records.length; i++) {
    result[i] = closeVals[i - window] === 0 ? 0 : (closeVals[i] - closeVals[i - window]) / closeVals[i - window];
  }
  return result;
}

/** ROCR = close_t / close_{t-window} */
export function calcRocr(records: OHLCV[], window: number = 10): number[] {
  const closeVals = closes(records);
  const result: number[] = new Array(records.length).fill(NaN);
  for (let i = window; i < records.length; i++) {
    result[i] = closeVals[i - window] === 0 ? NaN : closeVals[i] / closeVals[i - window];
  }
  return result;
}

/** ROCR100 = 100 * close_t / close_{t-window} */
export function calcRocr100(records: OHLCV[], window: number = 10): number[] {
  const closeVals = closes(records);
  const result: number[] = new Array(records.length).fill(NaN);
  for (let i = window; i < records.length; i++) {
    result[i] = closeVals[i - window] === 0 ? NaN : 100 * closeVals[i] / closeVals[i - window];
  }
  return result;
}
