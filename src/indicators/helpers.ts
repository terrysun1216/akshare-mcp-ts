/**
 * 技术指标辅助函数
 *
 * 所有函数为纯函数，零副作用，与 Python 版 simple.py 行为完全一致。
 */

import type { OHLCV } from '../types/index.js';

// ============================================================================
// 基本统计
// ============================================================================

/** 简单移动平均 SMA(n) = Σ/n，NaN 输入跳过 */
export function sma(values: number[], window: number): number[] {
  const result: number[] = new Array(values.length).fill(NaN);
  if (window <= 0 || values.length < window) return result;

  // 找第一个连续 window 个非 NaN 值的窗口
  const validStartIdx = findFirstValidWindow(values, window);
  if (validStartIdx < 0) return result;

  let sum = 0;
  for (let i = validStartIdx; i < validStartIdx + window; i++) {
    sum += values[i];
  }
  result[validStartIdx + window - 1] = sum / window;

  for (let i = validStartIdx + window; i < values.length; i++) {
    if (!isNaN(values[i]) && !isNaN(values[i - window])) {
      sum += values[i] - values[i - window];
      result[i] = sum / window;
    } else if (!isNaN(values[i])) {
      // 滑动窗口包含 NaN，重新计算窗口和
      sum = 0;
      let validCount = 0;
      for (let j = i - window + 1; j <= i; j++) {
        if (!isNaN(values[j])) {
          sum += values[j];
          validCount++;
        }
      }
      result[i] = validCount > 0 ? sum / validCount : NaN;
    }
  }
  return result;
}

/** 指数移动平均 EMA(n) = α·val + (1-α)·EMA₋₁, α=2/(n+1), adjust=false */
export function ema(values: number[], window: number): number[] {
  const result: number[] = new Array(values.length).fill(NaN);
  if (window <= 0 || values.length === 0) return result;

  const alpha = 2 / (window + 1);

  // 找第一个非 NaN 的 window 个有效值做 SMA 初始化
  const validStartIdx = findFirstValidWindow(values, window);
  if (validStartIdx < 0) return result; // 没有足够有效值

  let sum = 0;
  for (let i = validStartIdx; i < validStartIdx + window; i++) {
    sum += values[i];
  }
  result[validStartIdx + window - 1] = sum / window;
  let prevEma = sum / window;

  for (let i = validStartIdx + window; i < values.length; i++) {
    if (isNaN(values[i])) {
      result[i] = prevEma; // NaN 值: 保持前值
    } else {
      prevEma = alpha * values[i] + (1 - alpha) * prevEma;
      result[i] = prevEma;
    }
  }
  return result;
}

/** 找到第一个连续 window 个非 NaN 值的起始索引，-1 表示不存在 */
function findFirstValidWindow(values: number[], window: number): number {
  let count = 0;
  for (let i = 0; i < values.length; i++) {
    if (!isNaN(values[i])) {
      count++;
      if (count >= window) return i - window + 1;
    } else {
      count = 0;
    }
  }
  return -1;
}

/** Wilder 平滑: α = 1/window，NaN 输入跳过 */
export function wilderSmooth(values: number[], window: number): number[] {
  const result: number[] = new Array(values.length).fill(NaN);
  if (window <= 0 || values.length === 0) return result;

  const alpha = 1 / window;

  const validStartIdx = findFirstValidWindow(values, window);
  if (validStartIdx < 0) return result;

  let sum = 0;
  for (let i = validStartIdx; i < validStartIdx + window; i++) {
    sum += values[i];
  }
  let prev = sum / window;
  result[validStartIdx + window - 1] = prev;

  for (let i = validStartIdx + window; i < values.length; i++) {
    if (isNaN(values[i])) {
      result[i] = prev;
    } else {
      prev = alpha * values[i] + (1 - alpha) * prev;
      result[i] = prev;
    }
  }
  return result;
}

/** 滚动窗口: 对每个长度为 window 的窗口应用 fn */
export function rolling<T>(arr: T[], window: number, fn: (win: T[]) => number): number[] {
  const result: number[] = new Array(arr.length).fill(NaN);
  for (let i = window - 1; i < arr.length; i++) {
    result[i] = fn(arr.slice(i - window + 1, i + 1));
  }
  return result;
}

/** 滚动最高 */
export function rollingMax(arr: number[], window: number): number[] {
  return rolling(arr, window, (win) => Math.max(...win));
}

/** 滚动最低 */
export function rollingMin(arr: number[], window: number): number[] {
  return rolling(arr, window, (win) => Math.min(...win));
}

/** 滚动标准差（总体标准差, ddof=0，与 pandas 默认一致） */
export function rollingStd(arr: number[], window: number): number[] {
  return rolling(arr, window, (win) => {
    const mean = win.reduce((a, b) => a + b, 0) / win.length;
    const variance = win.reduce((sum, v) => sum + (v - mean) ** 2, 0) / win.length;
    return Math.sqrt(variance);
  });
}

/** 滚动求和 */
export function rollingSum(arr: number[], window: number): number[] {
  const result: number[] = new Array(arr.length).fill(NaN);
  if (window <= 0 || arr.length < window) return result;

  let sum = 0;
  for (let i = 0; i < window; i++) sum += arr[i];
  result[window - 1] = sum;

  for (let i = window; i < arr.length; i++) {
    sum += arr[i] - arr[i - window];
    result[i] = sum;
  }
  return result;
}

// ============================================================================
// 提取 OHLCV 列
// ============================================================================

export function closes(records: OHLCV[]): number[] {
  return records.map(r => r.close);
}
export function highs(records: OHLCV[]): number[] {
  return records.map(r => r.high);
}
export function lows(records: OHLCV[]): number[] {
  return records.map(r => r.low);
}
export function opens(records: OHLCV[]): number[] {
  return records.map(r => r.open);
}
export function volumes(records: OHLCV[]): number[] {
  return records.map(r => r.volume);
}
