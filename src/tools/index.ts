/**
 * 统一注册所有 MCP 工具（12 个工具：9 个对齐 Python 版 + 3 个新增股东类工具）
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerUtilityTools } from './utility.js';
import { registerMarketDataTools } from './market-data.js';
import { registerFinancialTools } from './financial.js';
import { registerNewsTools } from './news.js';
import { registerAnalysisTools } from './analysis.js';
import { registerShareholderTools } from './shareholder.js';

export function registerAllTools(server: McpServer): void {
  registerUtilityTools(server);       // get_time_info
  registerMarketDataTools(server);    // get_hist_data, get_realtime_data
  registerFinancialTools(server);     // get_balance_sheet, get_income_statement, get_cash_flow, get_financial_metrics
  registerNewsTools(server);          // get_news_data
  registerAnalysisTools(server);      // get_inner_trade_data
  registerShareholderTools(server);   // get_top10_shareholders, get_top10_free_shareholders, get_fund_holdings
}
