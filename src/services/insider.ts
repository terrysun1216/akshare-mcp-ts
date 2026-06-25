/**
 * 内部交易服务
 */

import { fetchInsiderTrades } from '../providers/xueqiu.js';

export interface GetInsiderTradesParams {
  symbol: string;
}

export async function getInsiderTrades(params: GetInsiderTradesParams): Promise<string> {
  const records = await fetchInsiderTrades(params.symbol);
  return JSON.stringify(records);
}
