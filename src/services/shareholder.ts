/**
 * 股东数据服务
 */

import { fetchShareholderData } from '../providers/eastmoney-f10.js';
import { fetchFundHoldings } from '../providers/sina-fund.js';

export interface Top10Params {
  symbol: string;
}

export async function getTop10Shareholders(params: Top10Params): Promise<string> {
  const data = await fetchShareholderData(params.symbol);
  return JSON.stringify({
    report_date: data.reportDate,
    total_holders: data.totalHolders,
    top10: data.top10,
    top10_free: data.top10Free,
  });
}

export async function getTop10FreeShareholders(params: Top10Params): Promise<string> {
  const data = await fetchShareholderData(params.symbol);
  return JSON.stringify({
    report_date: data.reportDate,
    top10_free: data.top10Free,
  });
}

export async function getFundHoldings(params: Top10Params): Promise<string> {
  const records = await fetchFundHoldings(params.symbol);
  return JSON.stringify(records);
}
