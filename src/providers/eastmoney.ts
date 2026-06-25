/**
 * 东方财富 HTTP API Provider
 *
 * 所有端点均为公开接口，无需 API Key 或 Token。
 * 使用 Node.js 22+ 内置 fetch API，零额外 HTTP 依赖。
 */

import { config } from '../config.js';
import type {
  OHLCV,
  RealtimeRecord,
  BalanceSheetRecord,
  IncomeStatementRecord,
  CashFlowRecord,
  FinancialMetricsRecord,
} from '../types/index.js';

// ============================================================================
// SecID 映射
// ============================================================================

/**
 * 将股票代码转换为东方财富内部 secid 格式
 * 规则:
 *   SH → 1, SZ → 0, BJ → 0, HK → 116
 *   6位代码: 000/001/002/003/300 → 0, 600/601/603/605/688 → 1
 */
export function toSecid(symbol: string): string {
  const upper = symbol.toUpperCase();

  if (upper.startsWith('SH')) return `1.${upper.slice(2)}`;
  if (upper.startsWith('SZ')) return `0.${upper.slice(2)}`;
  if (upper.startsWith('BJ')) return `0.${upper.slice(2)}`;
  if (upper.startsWith('HK')) return `116.${upper.slice(2)}`;

  // 根据数字前缀推断市场
  const code = upper.padStart(6, '0');
  const prefix = code.slice(0, 3);
  if (['000', '001', '002', '003', '200', '300'].includes(prefix)) {
    return `0.${code}`;
  }
  if (prefix.startsWith('6') || prefix.startsWith('5') || prefix === '688') {
    return `1.${code}`;
  }
  // 港股: 5位数字
  if (/^\d{5}$/.test(code)) {
    return `116.${code}`;
  }

  // fallback: 尝试 SH
  return `1.${code}`;
}

// ============================================================================
// K线类型映射
// ============================================================================

export function toKlt(interval: string, multiplier: number): string {
  switch (interval) {
    case 'minute':
      if (multiplier === 1) return '1';
      if (multiplier === 5) return '5';
      if (multiplier === 15) return '15';
      if (multiplier === 30) return '30';
      if (multiplier === 60) return '60';
      throw new Error(`不支持的分钟倍数: ${multiplier}，支持 1/5/15/30/60`);
    case 'hour':
      return '60';
    case 'day':
      return '101';
    case 'week':
      return '102';
    case 'month':
    case 'year':
      return '103';
    default:
      return '101';
  }
}

// ============================================================================
// HTTP fetch 封装
// ============================================================================

async function fetchJson(url: string): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.httpTimeout);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
    });

    if (!res.ok) {
      throw new Error(`东方财富 API 返回 HTTP ${res.status}: ${res.statusText}`);
    }

    return await res.json();
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error(`东方财富 API 请求超时 (${config.httpTimeout}ms)`);
    }
    throw new Error(`东方财富 API 请求失败: ${err instanceof Error ? err.message : String(err)}`);
  } finally {
    clearTimeout(timer);
  }
}

// ============================================================================
// K线
// ============================================================================

interface EastMoneyKlineResponse {
  rc: number;
  msg?: string;
  data?: {
    klines?: string[];
  };
}

function parseKline(klineStr: string): OHLCV {
  const parts = klineStr.split(',');
  return {
    timestamp: parts[0],
    open: parseFloat(parts[1]),
    close: parseFloat(parts[2]),
    high: parseFloat(parts[3]),
    low: parseFloat(parts[4]),
    volume: parseInt(parts[5], 10),
    turnover: parseFloat(parts[6]),
    amplitude: parseFloat(parts[7]),
    change_pct: parseFloat(parts[8]),
    change: parseFloat(parts[9]),
    turnover_rate: parseFloat(parts[10]),
  };
}

export interface FetchKlineParams {
  symbol: string;
  interval: string;
  interval_multiplier: number;
  start_date: string;
  end_date: string;
  adjust: string;
}

export async function fetchKline(params: FetchKlineParams): Promise<OHLCV[]> {
  const secid = toSecid(params.symbol);
  const klt = toKlt(params.interval, params.interval_multiplier);
  const fqt = (() => {
    switch (params.adjust) {
      case 'qfq': return '1';
      case 'hfq': return '2';
      default: return '0';
    }
  })();
  const beg = params.start_date.replace(/-/g, '');
  const end = params.end_date.replace(/-/g, '');

  const url = new URL('https://push2his.eastmoney.com/api/qt/stock/kline/get');
  url.searchParams.set('fields1', 'f1,f2,f3,f4,f5,f6');
  url.searchParams.set('fields2', 'f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61');
  url.searchParams.set('klt', klt);
  url.searchParams.set('fqt', fqt);
  url.searchParams.set('secid', secid);
  url.searchParams.set('beg', beg);
  url.searchParams.set('end', end);
  url.searchParams.set('lmt', '10000');

  const json = await fetchJson(url.toString()) as EastMoneyKlineResponse;

  if (json.rc !== 0) {
    throw new Error(`东方财富 K线 API 返回错误 (rc=${json.rc}): ${json.msg ?? '未知错误'}`);
  }

  return (json.data?.klines ?? []).map(parseKline);
}

// ============================================================================
// 实时行情
// ============================================================================

const REALTIME_FIELDS = [
  'f43', 'f44', 'f45', 'f46', 'f47', 'f48',
  'f50', 'f57', 'f58', 'f60', 'f116', 'f117',
  'f162', 'f167', 'f169', 'f170',
].join(',');

interface EastMoneyRealtimeResponse {
  rc: number;
  msg?: string;
  data?: {
    f43?: number;
    f44?: number;
    f45?: number;
    f46?: number;
    f47?: number;
    f48?: number;
    f50?: number;
    f57?: string;
    f58?: string;
    f60?: number;
    f116?: number;
    f117?: number;
    f162?: number;
    f167?: number;
    f169?: number;
    f170?: number;
  };
}

export async function fetchRealtimeQuote(symbol: string): Promise<RealtimeRecord> {
  const secid = toSecid(symbol);

  const url = new URL('https://push2.eastmoney.com/api/qt/stock/get');
  url.searchParams.set('invt', '2');
  url.searchParams.set('fltt', '2');
  url.searchParams.set('fields', REALTIME_FIELDS);
  url.searchParams.set('secid', secid);

  const json = await fetchJson(url.toString()) as EastMoneyRealtimeResponse;

  if (json.rc !== 0) {
    throw new Error(`东方财富实时行情 API 返回错误 (rc=${json.rc}): ${json.msg ?? '未知错误'}`);
  }

  const d = json.data;
  if (!d) throw new Error('东方财富实时行情 API 返回数据为空');

  return {
    symbol: d.f57 ?? symbol,
    name: d.f58 ?? '',
    price: d.f43 ?? 0,
    open: d.f46 ?? 0,
    high: d.f44 ?? 0,
    low: d.f45 ?? 0,
    volume: d.f47 ?? 0,
    turnover: d.f48 ?? 0,
    change: d.f169 ?? 0,
    change_pct: d.f60 ?? 0,
    turnover_rate: d.f170,
    total_market_cap: d.f116,
    circulating_market_cap: d.f117,
    pe_ttm: d.f162,
    pb: d.f167,
  };
}

// ============================================================================
// 财务报表
// ============================================================================

interface EastMoneyReportResponse {
  success: boolean;
  result?: {
    data?: Array<Record<string, unknown>>;
  };
  message?: string;
}

const REPORT_COLUMNS: Record<string, Record<string, string>> = {
  RPT_DMSK_FN_BALANCE: {
    REPORT_DATE: 'report_date',
    TOTAL_ASSETS: 'total_assets',
    FIXED_ASSET: 'fixed_assets_net',
    MONETARYFUNDS: 'cash_and_equivalents',
    ACCOUNTS_RECE: 'accounts_receivable',
    INVENTORY: 'inventory',
    TOTAL_LIABILITIES: 'total_liabilities',
    ACCOUNTS_PAYABLE: 'trade_and_non_trade_payables',
    ADVANCE_RECEIVABLES: 'deferred_revenue',
    TOTAL_EQUITY: 'shareholders_equity',
  },
  RPT_DMSK_FN_INCOME: {
    REPORT_DATE: 'report_date',
    TOTAL_OPERATE_INCOME: 'revenue',
    TOTAL_OPERATE_COST: 'total_operating_costs',
    OPERATE_PROFIT: 'operating_profit',
    PARENT_NETPROFIT: 'net_income_common_stock',
  },
  RPT_DMSK_FN_CASHFLOW: {
    REPORT_DATE: 'report_date',
    NETCASH_OPERATE: 'net_cash_flow_from_operations',
    NETCASH_INVEST: 'net_cash_flow_from_investing',
    NETCASH_FINANCE: 'net_cash_flow_from_financing',
    CCE_ADD: 'change_in_cash_and_equivalents',
  },
};

function renameColumns(data: Array<Record<string, unknown>>, mapping: Record<string, string>): Array<Record<string, unknown>> {
  return data.map(row => {
    const newRow: Record<string, unknown> = {};
    for (const [oldKey, newKey] of Object.entries(mapping)) {
      if (oldKey in row) {
        newRow[newKey] = row[oldKey];
      }
    }
    return newRow;
  });
}

async function fetchReport(
  symbol: string,
  reportName: string,
): Promise<Array<Record<string, unknown>>> {
  const mapping = REPORT_COLUMNS[reportName];
  if (!mapping) throw new Error(`未知报表类型: ${reportName}`);

  const url = new URL('https://datacenter-web.eastmoney.com/api/data/v1/get');
  url.searchParams.set('reportName', reportName);
  url.searchParams.set('filter', `(SECURITY_CODE="${symbol}")`);
  url.searchParams.set('pageNumber', '1');
  url.searchParams.set('pageSize', '1000');
  url.searchParams.set('sortColumns', 'REPORT_DATE');
  url.searchParams.set('sortTypes', '-1');
  url.searchParams.set('columns', Object.keys(mapping).join(','));

  const json = await fetchJson(url.toString()) as EastMoneyReportResponse;

  if (!json.success) {
    throw new Error(`东方财富报表 API 返回错误: ${json.message ?? '未知错误'}`);
  }

  return renameColumns(json.result?.data ?? [], mapping);
}

export async function fetchBalanceSheet(symbol: string): Promise<BalanceSheetRecord[]> {
  return fetchReport(symbol, 'RPT_DMSK_FN_BALANCE') as unknown as BalanceSheetRecord[];
}

export async function fetchIncomeStatement(symbol: string): Promise<IncomeStatementRecord[]> {
  return fetchReport(symbol, 'RPT_DMSK_FN_INCOME') as unknown as IncomeStatementRecord[];
}

export async function fetchCashFlow(symbol: string): Promise<CashFlowRecord[]> {
  return fetchReport(symbol, 'RPT_DMSK_FN_CASHFLOW') as unknown as CashFlowRecord[];
}

/**
 * 获取三大报表合并后的关键财务指标
 */
export async function fetchFinancialMetrics(symbol: string): Promise<FinancialMetricsRecord[]> {
  const [bs, income, cf] = await Promise.all([
    fetchBalanceSheet(symbol),
    fetchIncomeStatement(symbol),
    fetchCashFlow(symbol),
  ]);

  const merged = new Map<string, FinancialMetricsRecord>();

  for (const row of bs) {
    merged.set(row.report_date, row as unknown as FinancialMetricsRecord);
  }
  for (const row of income) {
    const existing = merged.get(row.report_date);
    if (existing) {
      Object.assign(existing, row);
    } else {
      merged.set(row.report_date, row as unknown as FinancialMetricsRecord);
    }
  }
  for (const row of cf) {
    const existing = merged.get(row.report_date);
    if (existing) {
      Object.assign(existing, row);
    } else {
      merged.set(row.report_date, row as unknown as FinancialMetricsRecord);
    }
  }

  return Array.from(merged.values())
    .sort((a, b) => b.report_date.localeCompare(a.report_date));
}
