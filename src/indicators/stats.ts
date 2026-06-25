/**
 * 其他统计指标: BOP, TSF
 */

import { rolling, closes, opens, highs, lows } from './helpers.js';
import type { OHLCV } from '../types/index.js';

/** BOP = (close - open) / (high - low) */
export function calcBop(records: OHLCV[]): number[] {
  return records.map(r => {
    const range = r.high - r.low;
    return range === 0 ? 0 : (r.close - r.open) / range;
  });
}

/** TSF: Time Series Forecast, 线性回归预测下一个值 */
export function calcTsf(records: OHLCV[], window: number = 14): number[] {
  const closeVals = closes(records);
  const result: number[] = new Array(records.length).fill(NaN);

  for (let i = window - 1; i < records.length; i++) {
    const xs: number[] = [];
    const ys: number[] = [];
    for (let j = i - window + 1; j <= i; j++) {
      xs.push(j - (i - window + 1) + 1); // 1..window
      ys.push(closeVals[j]);
    }

    const n = xs.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    for (let k = 0; k < n; k++) {
      sumX += xs[k];
      sumY += ys[k];
      sumXY += xs[k] * ys[k];
      sumXX += xs[k] * xs[k];
    }

    const denom = n * sumXX - sumX * sumX;
    if (denom === 0) {
      result[i] = NaN;
      continue;
    }

    const b = (n * sumXY - sumX * sumY) / denom;
    const a = (sumY - b * sumX) / n;
    // 预测第 n+1 个点（即 x=n）
    result[i] = a + b * n;
  }
  return result;
}
