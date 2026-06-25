/**
 * 技术指标注册表
 *
 * 每个指标映射到 (records, params) => number[] 函数。
 * 与 Python 版 akshare_one.indicators 接口一致。
 */

import type { OHLCV } from '../types/index.js';
import { calcSma } from './trend.js';
import { calcEma } from './trend.js';
import { calcMacd } from './trend.js';
import { calcApo } from './trend.js';
import { calcPpo } from './trend.js';
import { calcTrix } from './trend.js';
import { calcUltosc } from './trend.js';
import { calcRsi } from './momentum.js';
import { calcCci } from './momentum.js';
import { calcAdx } from './momentum.js';
import { calcDx } from './momentum.js';
import { calcMfi } from './momentum.js';
import { calcMom } from './momentum.js';
import { calcCmo } from './momentum.js';
import { calcWillr } from './momentum.js';
import { calcBoll } from './volatility.js';
import { calcAtr } from './volatility.js';
import { calcSar } from './volatility.js';
import { calcObv } from './volume.js';
import { calcAd } from './volume.js';
import { calcAdosc } from './volume.js';
import { calcAroonUp, calcAroonDown, calcAroonOsc } from './aroon.js';
import { calcBop } from './stats.js';
import { calcTsf } from './stats.js';
import { calcPlusDi, calcPlusDm, calcMinusDi, calcMinusDm } from './directional.js';
import { calcRoc, calcRocp, calcRocr, calcRocr100 } from './rate-of-change.js';

// ============================================================================
// 指标参数默认值
// ============================================================================

interface IndicatorParams {
  [key: string]: number;
}

interface IndicatorDef {
  name: string;
  func: (records: OHLCV[], params: IndicatorParams) => number[];
  defaultParams: IndicatorParams;
}

export const INDICATORS: Record<string, IndicatorDef> = {
  SMA: {
    name: 'SMA',
    func: (r, p) => calcSma(r, p.window ?? 20),
    defaultParams: { window: 20 },
  },
  EMA: {
    name: 'EMA',
    func: (r, p) => calcEma(r, p.window ?? 20),
    defaultParams: { window: 20 },
  },
  RSI: {
    name: 'RSI',
    func: (r, p) => calcRsi(r, p.window ?? 14),
    defaultParams: { window: 14 },
  },
  MACD: {
    name: 'MACD',
    func: (r, p) => {
      const result = calcMacd(r, p.fast ?? 12, p.slow ?? 26, p.signal ?? 9);
      // MACD 返回主线和柱状图，通常用 histogram
      return result.macd.map((v, i) =>
        isNaN(v) ? NaN : (isNaN(result.histogram[i]) ? 0 : result.histogram[i]),
      );
    },
    defaultParams: { fast: 12, slow: 26, signal: 9 },
  },
  BOLL: {
    name: 'BOLL',
    func: (r, p) => {
      const result = calcBoll(r, p.window ?? 20, p.std ?? 2);
      // 返回上轨
      return result.upper;
    },
    defaultParams: { window: 20, std: 2 },
  },
  STOCH: {
    name: 'STOCH',
    func: calcStoch,
    defaultParams: { window: 14, smooth_d: 3, smooth_k: 3 },
  },
  ATR: {
    name: 'ATR',
    func: (r, p) => calcAtr(r, p.window ?? 14),
    defaultParams: { window: 14 },
  },
  CCI: {
    name: 'CCI',
    func: (r, p) => calcCci(r, p.window ?? 14),
    defaultParams: { window: 14 },
  },
  ADX: {
    name: 'ADX',
    func: (r, p) => calcAdx(r, p.window ?? 14),
    defaultParams: { window: 14 },
  },
  WILLR: {
    name: 'WILLR',
    func: (r, p) => calcWillr(r, p.window ?? 14),
    defaultParams: { window: 14 },
  },
  AD: {
    name: 'AD',
    func: (r, _p) => calcAd(r),
    defaultParams: {},
  },
  ADOSC: {
    name: 'ADOSC',
    func: (r, p) => calcAdosc(r, p.fast_period ?? 3, p.slow_period ?? 10),
    defaultParams: { fast_period: 3, slow_period: 10 },
  },
  OBV: {
    name: 'OBV',
    func: (r, _p) => calcObv(r),
    defaultParams: {},
  },
  MOM: {
    name: 'MOM',
    func: (r, p) => calcMom(r, p.window ?? 10),
    defaultParams: { window: 10 },
  },
  SAR: {
    name: 'SAR',
    func: (r, p) => calcSar(r, p.acceleration ?? 0.02, p.maximum ?? 0.2),
    defaultParams: { acceleration: 0.02, maximum: 0.2 },
  },
  TSF: {
    name: 'TSF',
    func: (r, p) => calcTsf(r, p.window ?? 14),
    defaultParams: { window: 14 },
  },
  APO: {
    name: 'APO',
    func: (r, p) => calcApo(r, p.fast_period ?? 12, p.slow_period ?? 26, p.ma_type ?? 0),
    defaultParams: { fast_period: 12, slow_period: 26, ma_type: 0 },
  },
  AROON: {
    name: 'AROON',
    func: (r, p) => calcAroonUp(r, p.window ?? 14),
    defaultParams: { window: 14 },
  },
  AROONOSC: {
    name: 'AROONOSC',
    func: (r, p) => calcAroonOsc(r, p.window ?? 14),
    defaultParams: { window: 14 },
  },
  BOP: {
    name: 'BOP',
    func: (r, _p) => calcBop(r),
    defaultParams: {},
  },
  CMO: {
    name: 'CMO',
    func: (r, p) => calcCmo(r, p.window ?? 14),
    defaultParams: { window: 14 },
  },
  DX: {
    name: 'DX',
    func: (r, p) => calcDx(r, p.window ?? 14),
    defaultParams: { window: 14 },
  },
  MFI: {
    name: 'MFI',
    func: (r, p) => calcMfi(r, p.window ?? 14),
    defaultParams: { window: 14 },
  },
  MINUS_DI: {
    name: 'MINUS_DI',
    func: (r, p) => calcMinusDi(r, p.window ?? 14),
    defaultParams: { window: 14 },
  },
  MINUS_DM: {
    name: 'MINUS_DM',
    func: (r, p) => calcMinusDm(r, p.window ?? 14),
    defaultParams: { window: 14 },
  },
  PLUS_DI: {
    name: 'PLUS_DI',
    func: (r, p) => calcPlusDi(r, p.window ?? 14),
    defaultParams: { window: 14 },
  },
  PLUS_DM: {
    name: 'PLUS_DM',
    func: (r, p) => calcPlusDm(r, p.window ?? 14),
    defaultParams: { window: 14 },
  },
  PPO: {
    name: 'PPO',
    func: (r, p) => calcPpo(r, p.fast_period ?? 12, p.slow_period ?? 26, p.ma_type ?? 0),
    defaultParams: { fast_period: 12, slow_period: 26, ma_type: 0 },
  },
  ROC: {
    name: 'ROC',
    func: (r, p) => calcRoc(r, p.window ?? 10),
    defaultParams: { window: 10 },
  },
  ROCP: {
    name: 'ROCP',
    func: (r, p) => calcRocp(r, p.window ?? 10),
    defaultParams: { window: 10 },
  },
  ROCR: {
    name: 'ROCR',
    func: (r, p) => calcRocr(r, p.window ?? 10),
    defaultParams: { window: 10 },
  },
  ROCR100: {
    name: 'ROCR100',
    func: (r, p) => calcRocr100(r, p.window ?? 10),
    defaultParams: { window: 10 },
  },
  TRIX: {
    name: 'TRIX',
    func: (r, p) => calcTrix(r, p.window ?? 30),
    defaultParams: { window: 30 },
  },
  ULTOSC: {
    name: 'ULTOSC',
    func: (r, p) => calcUltosc(r, p.window1 ?? 7, p.window2 ?? 14, p.window3 ?? 28),
    defaultParams: { window1: 7, window2: 14, window3: 28 },
  },
};

// ============================================================================
// 指标名称列表（MCP 工具参数用）
// ============================================================================

export const INDICATOR_NAMES = Object.keys(INDICATORS) as string[];

// ============================================================================
// 便捷函数: 给数据追加指标列
// ============================================================================

export function computeIndicator(
  name: string,
  records: OHLCV[],
  params?: IndicatorParams,
): number[] {
  const def = INDICATORS[name];
  if (!def) throw new Error(`未知技术指标: ${name}`);
  return def.func(records, params ?? def.defaultParams);
}

export function computeIndicators(
  names: string[],
  records: OHLCV[],
): Record<string, number[]> {
  const result: Record<string, number[]> = {};
  for (const name of names) {
    result[name] = computeIndicator(name, records);
  }
  return result;
}

// ============================================================================
// STOCH 特殊处理（需要平滑K和D）
// ============================================================================

import { sma, rollingMax, rollingMin, highs, lows, closes } from './helpers.js';

function calcStoch(
  records: OHLCV[],
  params: IndicatorParams,
): number[] {
  const window = params.window ?? 14;
  const smoothK = params.smooth_k ?? 3;
  const smoothD = params.smooth_d ?? 3;

  const highVals = highs(records);
  const lowVals = lows(records);
  const closeVals = closes(records);

  // raw %K = 100 * (C - LL) / (HH - LL)
  const rawK: number[] = new Array(records.length).fill(NaN);
  for (let i = window - 1; i < records.length; i++) {
    const hh = Math.max(...highVals.slice(i - window + 1, i + 1));
    const ll = Math.min(...lowVals.slice(i - window + 1, i + 1));
    rawK[i] = (hh - ll) === 0 ? 0 : 100 * (closeVals[i] - ll) / (hh - ll);
  }

  // slow %K = SMA(rawK, smoothK)
  const validK = rawK.filter(v => !isNaN(v));
  const slowK = sma(validK, smoothK);

  // slow %D = SMA(slowK, smoothD)
  const validSlowK = slowK.filter(v => !isNaN(v));
  const slowD = sma(validSlowK, smoothD);

  // 用 slow %D 作为最终输出（与 Python 版 get_stoch 返回一致）
  const result: number[] = new Array(records.length).fill(NaN);
  const kStart = rawK.findIndex(v => !isNaN(v));
  const kOffset = kStart + smoothK - 1;
  const dOffset = kOffset + smoothD - 1;
  for (let i = 0; i < slowD.length; i++) {
    result[dOffset + i] = slowD[i];
  }
  return result;
}
