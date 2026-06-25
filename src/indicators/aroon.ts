/**
 * Aroon 指标: AroonUp, AroonDown, AroonOsc
 */

import { closes, highs, lows } from './helpers.js';
import type { OHLCV } from '../types/index.js';

/** AroonUp = 100 * (window - periods_since_highest_high) / window */
export function calcAroonUp(records: OHLCV[], window: number = 14): number[] {
  const result: number[] = new Array(records.length).fill(NaN);
  const highVals = highs(records);

  for (let i = window; i < records.length; i++) {
    let maxIdx = i;
    let maxVal = highVals[i];
    for (let j = i - window; j <= i; j++) {
      if (highVals[j] > maxVal) {
        maxVal = highVals[j];
        maxIdx = j;
      }
    }
    result[i] = 100 * (window - (i - maxIdx)) / window;
  }
  return result;
}

/** AroonDown = 100 * (window - periods_since_lowest_low) / window */
export function calcAroonDown(records: OHLCV[], window: number = 14): number[] {
  const result: number[] = new Array(records.length).fill(NaN);
  const lowVals = lows(records);

  for (let i = window; i < records.length; i++) {
    let minIdx = i;
    let minVal = lowVals[i];
    for (let j = i - window; j <= i; j++) {
      if (lowVals[j] < minVal) {
        minVal = lowVals[j];
        minIdx = j;
      }
    }
    result[i] = 100 * (window - (i - minIdx)) / window;
  }
  return result;
}

/** AroonOsc = AroonUp - AroonDown */
export function calcAroonOsc(records: OHLCV[], window: number = 14): number[] {
  const up = calcAroonUp(records, window);
  const down = calcAroonDown(records, window);
  return up.map((v, i) => (isNaN(v) || isNaN(down[i]) ? NaN : v - down[i]));
}
