/**
 * 财务数据服务: 三张报表 + 关键指标
 */

import { fetchBalanceSheet, fetchIncomeStatement, fetchCashFlow, fetchFinancialMetrics } from '../providers/eastmoney.js';

export interface GetStatementParams {
  symbol: string;
  recent_n: number | null;
}

export async function getBalanceSheet(params: GetStatementParams): Promise<string> {
  let records = await fetchBalanceSheet(params.symbol);
  if (params.recent_n !== null && params.recent_n > 0) {
    records = records.slice(0, params.recent_n);
  }
  return JSON.stringify(records);
}

export async function getIncomeStatement(params: GetStatementParams): Promise<string> {
  let records = await fetchIncomeStatement(params.symbol);
  if (params.recent_n !== null && params.recent_n > 0) {
    records = records.slice(0, params.recent_n);
  }
  return JSON.stringify(records);
}

export async function getCashFlow(params: GetStatementParams): Promise<string> {
  let records = await fetchCashFlow(params.symbol);
  if (params.recent_n !== null && params.recent_n > 0) {
    records = records.slice(0, params.recent_n);
  }
  return JSON.stringify(records);
}

export interface GetFinancialMetricsParams {
  symbol: string;
  recent_n: number | null;
}

export async function getFinancialMetrics(params: GetFinancialMetricsParams): Promise<string> {
  let records = await fetchFinancialMetrics(params.symbol);
  if (params.recent_n !== null && params.recent_n > 0) {
    records = records.slice(0, params.recent_n);
  }
  return JSON.stringify(records);
}
