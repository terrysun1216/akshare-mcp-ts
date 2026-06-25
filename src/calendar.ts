/**
 * 交易日历
 *
 * 优先从新浪 API 获取交易日列表，失败时使用静态内置数据。
 */

import { fetchTradeDates } from './providers/sina.js';

/** 静态内置交易日历（2024-2026），作为 API 不可用时的 fallback */
const STATIC_TRADE_DATES: string[] = [];

let cachedDates: string[] | null = null;

/**
 * 获取 A 股交易日列表（YYYY-MM-DD 格式，升序）
 */
export async function getTradeDates(): Promise<string[]> {
  if (cachedDates) return cachedDates;

  const dates = await fetchTradeDates();
  if (dates.length > 0) {
    cachedDates = dates;
    return dates;
  }

  // fallback: 静态数据
  if (STATIC_TRADE_DATES.length > 0) {
    cachedDates = STATIC_TRADE_DATES;
    return STATIC_TRADE_DATES;
  }

  // 完全无数据，返回空数组
  return [];
}

/**
 * 查找给定日期之前最近的交易日
 */
export async function getLastTradingDay(beforeDate?: Date): Promise<string | null> {
  const dates = await getTradeDates();
  if (dates.length === 0) return null;

  const target = beforeDate ?? new Date();
  const targetStr = target.toISOString().slice(0, 10);

  // 从后往前找第一个 <= target 的交易日
  for (let i = dates.length - 1; i >= 0; i--) {
    if (dates[i] <= targetStr) {
      return dates[i];
    }
  }

  return dates[0] ?? null;
}

/** 仅用于测试：清除缓存 */
export function clearTradeDateCache(): void {
  cachedDates = null;
}
