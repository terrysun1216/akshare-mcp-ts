/**
 * 新闻服务
 */

import { fetchStockNews } from '../providers/eastmoney-news.js';

export interface GetNewsParams {
  symbol: string;
  recent_n: number | null;
}

export async function getNewsData(params: GetNewsParams): Promise<string> {
  let records = await fetchStockNews(params.symbol);
  if (params.recent_n !== null && params.recent_n > 0) {
    records = records.slice(-params.recent_n);
  }
  return JSON.stringify(records);
}
