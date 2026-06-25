/**
 * 分析类 MCP 工具: get_inner_trade_data
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getInsiderTrades } from '../services/insider.js';

export function registerAnalysisTools(server: McpServer): void {
  server.registerTool(
    'get_inner_trade_data',
    {
      description: 'Get company insider trading data.',
      inputSchema: {
        symbol: z.string().describe("Stock symbol/ticker (e.g. '000001')"),
      },
    },
    async (args) => {
      try {
        const result = await getInsiderTrades({ symbol: args.symbol });
        return {
          content: [{ type: 'text' as const, text: result || '[]' }],
        };
      } catch (err) {
        return {
          content: [{ type: 'text' as const, text: JSON.stringify({ error: err instanceof Error ? err.message : String(err) }) }],
          isError: true,
        };
      }
    },
  );
}
