/**
 * 行情数据服务: 历史 K 线 + 实时行情
 */

import { fetchKline } from '../providers/eastmoney.js';
import { fetchDailyKline } from '../providers/sina.js';
import { fetchRealtimeQuote } from '../providers/eastmoney.js';
import { computeIndicator } from '../indicators/index.js';
import type { OHLCV } from '../types/index.js';

// ============================================================================
// get_hist_data
// ============================================================================

export interface GetHistDataParams {
  symbol: string;
  interval: string;
  interval_multiplier: number;
  start_date: string;
  end_date: string;
  adjust: string;
  source: string;
  indicators_list: string[] | null;
  recent_n: number | null;
}

export async function getHistData(params: GetHistDataParams): Promise<string> {
  let records: OHLCV[];

  if (params.source === 'sina') {
    // 新浪仅支持日线
    if (params.interval !== 'day') {
      throw new Error('新浪数据源仅支持日线 (day) 周期');
    }
    records = await fetchDailyKline(
      params.symbol,
      params.start_date,
      params.end_date,
      params.adjust,
    );
  } else {
    // eastmoney / eastmoney_direct
    records = await fetchKline({
      symbol: params.symbol,
      interval: params.interval,
      interval_multiplier: params.interval_multiplier,
      start_date: params.start_date,
      end_date: params.end_date,
      adjust: params.adjust,
    });
  }

  // 计算技术指标
  if (params.indicators_list && params.indicators_list.length > 0) {
    for (const indicatorName of params.indicators_list) {
      try {
        const values = computeIndicator(indicatorName, records);
        (records as unknown as Array<Record<string, unknown>>).forEach((r, i) => {
          r[indicatorName] = values[i];
        });
      } catch {
        // 忽略单个指标计算失败
      }
    }
  }

  // 截取最近 N 条
  if (params.recent_n !== null && params.recent_n > 0) {
    records = records.slice(-params.recent_n);
  }

  return JSON.stringify(records);
}

// ============================================================================
// get_realtime_data
// ============================================================================

export interface GetRealtimeDataParams {
  symbol: string | null;
  source: string;
}

export async function getRealtimeData(params: GetRealtimeDataParams): Promise<string> {
  if (params.source === 'xueqiu') {
    throw new Error('雪球实时行情暂不支持，请使用 eastmoney 或 eastmoney_direct');
  }

  if (!params.symbol) {
    throw new Error('东方财富实时行情需要指定 symbol');
  }

  const record = await fetchRealtimeQuote(params.symbol);
  return JSON.stringify([record]);
}
