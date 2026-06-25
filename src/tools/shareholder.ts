/**
 * 股东数据 MCP 工具: get_top10_shareholders, get_top10_free_shareholders, get_fund_holdings
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import {
  getTop10Shareholders,
  getTop10FreeShareholders,
  getFundHoldings,
} from '../services/shareholder.js';

const symbolParam = z.string().describe("Stock symbol/ticker (e.g. '600519')");

export function registerShareholderTools(server: McpServer): void {
  server.registerTool(
    'get_top10_shareholders',
    {
      description: '获取股票十大股东和十大流通股东数据，包括股东名称、持股数量、持股比例、变动情况',
      inputSchema: {
        symbol: symbolParam,
      },
    },
    async (args) => {
      try {
        const result = await getTop10Shareholders({ symbol: args.symbol });
        return { content: [{ type: 'text' as const, text: result || '[]' }] };
      } catch (err) {
        return {
          content: [{ type: 'text' as const, text: JSON.stringify({ error: err instanceof Error ? err.message : String(err) }) }],
          isError: true,
        };
      }
    },
  );

  server.registerTool(
    'get_top10_free_shareholders',
    {
      description: '获取股票十大流通股东数据（仅流通股），包括股东名称、股东类型、持股数量、占流通股比例',
      inputSchema: {
        symbol: symbolParam,
      },
    },
    async (args) => {
      try {
        const result = await getTop10FreeShareholders({ symbol: args.symbol });
        return { content: [{ type: 'text' as const, text: result || '[]' }] };
      } catch (err) {
        return {
          content: [{ type: 'text' as const, text: JSON.stringify({ error: err instanceof Error ? err.message : String(err) }) }],
          isError: true,
        };
      }
    },
  );

  server.registerTool(
    'get_fund_holdings',
    {
      description: '获取股票基金持股明细（全量，不限前10）。返回所有持有该股票的基金名称、代码、持仓数量、占流通股比例、持股市值',
      inputSchema: {
        symbol: symbolParam,
      },
    },
    async (args) => {
      try {
        const result = await getFundHoldings({ symbol: args.symbol });
        return { content: [{ type: 'text' as const, text: result || '[]' }] };
      } catch (err) {
        return {
          content: [{ type: 'text' as const, text: JSON.stringify({ error: err instanceof Error ? err.message : String(err) }) }],
          isError: true,
        };
      }
    },
  );
}
