/**
 * 财务报表 MCP 工具: get_balance_sheet, get_income_statement, get_cash_flow, get_financial_metrics
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import {
  getBalanceSheet,
  getIncomeStatement,
  getCashFlow,
  getFinancialMetrics,
} from '../services/financial.js';

function makeHandler(fn: (params: { symbol: string; recent_n: number | null }) => Promise<string>) {
  return async (args: { symbol: string; recent_n: number | null }) => {
    try {
      const result = await fn(args);
      return {
        content: [{ type: 'text' as const, text: result || '[]' }],
      };
    } catch (err) {
      return {
        content: [{ type: 'text' as const, text: JSON.stringify({ error: err instanceof Error ? err.message : String(err) }) }],
        isError: true,
      };
    }
  };
}

const symbolParam = z.string().describe("Stock symbol/ticker (e.g. '000001')");
const recentNParam = z.number().int().min(1).nullable().default(10).describe('Number of most recent records to return');

export function registerFinancialTools(server: McpServer): void {
  server.registerTool(
    'get_balance_sheet',
    {
      description: 'Get company balance sheet data.',
      inputSchema: {
        symbol: symbolParam,
        recent_n: recentNParam,
      },
    },
    makeHandler(getBalanceSheet),
  );

  server.registerTool(
    'get_income_statement',
    {
      description: 'Get company income statement data.',
      inputSchema: {
        symbol: symbolParam,
        recent_n: recentNParam,
      },
    },
    makeHandler(getIncomeStatement),
  );

  server.registerTool(
    'get_cash_flow',
    {
      description: 'Get company cash flow statement data.',
      inputSchema: {
        symbol: z.string().describe("Stock symbol/ticker (e.g. '000001')"),
        source: z.enum(['sina']).default('sina').describe('Data source'),
        recent_n: recentNParam,
      },
    },
    makeHandler(getCashFlow),
  );

  server.registerTool(
    'get_financial_metrics',
    {
      description: 'Get key financial metrics from the three major financial statements.',
      inputSchema: {
        symbol: symbolParam,
        recent_n: recentNParam,
      },
    },
    makeHandler(getFinancialMetrics),
  );
}
