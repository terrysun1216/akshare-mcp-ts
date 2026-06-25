import { z } from 'zod';

// ============================================================================
// OHLCV — 统一的价格数据结构
// ============================================================================

export interface OHLCV {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  turnover?: number;
  amplitude?: number;
  change_pct?: number;
  change?: number;
  turnover_rate?: number;
}

// ============================================================================
// 实时行情
// ============================================================================

export interface RealtimeRecord {
  symbol: string;
  name: string;
  price: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  turnover: number;
  change: number;
  change_pct: number;
  turnover_rate?: number;
  total_market_cap?: number;
  circulating_market_cap?: number;
  pe_ttm?: number;
  pb?: number;
}

// ============================================================================
// 财务数据
// ============================================================================

export interface BalanceSheetRecord {
  report_date: string;
  total_assets?: number;
  fixed_assets_net?: number;
  cash_and_equivalents?: number;
  accounts_receivable?: number;
  inventory?: number;
  total_liabilities?: number;
  trade_and_non_trade_payables?: number;
  deferred_revenue?: number;
  shareholders_equity?: number;
}

export interface IncomeStatementRecord {
  report_date: string;
  revenue?: number;
  total_operating_costs?: number;
  operating_profit?: number;
  net_income_common_stock?: number;
}

export interface CashFlowRecord {
  report_date: string;
  net_cash_flow_from_operations?: number;
  net_cash_flow_from_investing?: number;
  net_cash_flow_from_financing?: number;
  change_in_cash_and_equivalents?: number;
}

export interface FinancialMetricsRecord {
  report_date: string;
  total_assets?: number;
  shareholders_equity?: number;
  revenue?: number;
  operating_profit?: number;
  net_income_common_stock?: number;
  net_cash_flow_from_operations?: number;
}

// ============================================================================
// 新闻
// ============================================================================

export interface NewsRecord {
  keyword: string;
  title: string;
  content: string;
  publish_time: string;
  source: string;
  url: string;
}

// ============================================================================
// 内部交易
// ============================================================================

export interface InsiderTradeRecord {
  symbol: string;
  issuer?: string;
  name?: string;
  title?: string;
  transaction_date: string;
  transaction_shares?: number;
  transaction_price_per_share?: number;
  shares_owned_after_transaction?: number;
  transaction_value?: number;
  shares_owned_before_transaction?: number;
  is_board_director?: boolean;
  relationship?: string;
}

// ============================================================================
// Zod Schema 定义（运行时校验 + JSON Schema 生成）
// ============================================================================

export const INDICATOR_NAMES = [
  'SMA', 'EMA', 'RSI', 'MACD', 'BOLL', 'STOCH', 'ATR', 'CCI',
  'ADX', 'WILLR', 'AD', 'ADOSC', 'OBV', 'MOM', 'SAR', 'TSF',
  'APO', 'AROON', 'AROONOSC', 'BOP', 'CMO', 'DX', 'MFI',
  'MINUS_DI', 'MINUS_DM', 'PLUS_DI', 'PLUS_DM',
  'PPO', 'ROC', 'ROCP', 'ROCR', 'ROCR100', 'TRIX', 'ULTOSC',
] as const;

export const IntervalEnum = z.enum(['minute', 'hour', 'day', 'week', 'month', 'year']);
export const AdjustEnum = z.enum(['none', 'qfq', 'hfq']);
export const HistSourceEnum = z.enum(['eastmoney', 'eastmoney_direct', 'sina']);
export const RealtimeSourceEnum = z.enum(['xueqiu', 'eastmoney', 'eastmoney_direct']);
export const IndicatorEnum = z.enum(INDICATOR_NAMES);
