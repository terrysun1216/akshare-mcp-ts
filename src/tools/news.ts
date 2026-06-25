/**
 * 新闻 MCP 工具: get_news_data
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getNewsData } from '../services/news.js';

export function registerNewsTools(server: McpServer): void {
  server.registerTool(
    'get_news_data',
    {
      description: 'Get stock-related news data.',
      inputSchema: {
        symbol: z.string().describe("Stock symbol/ticker (e.g. '000001')"),
        recent_n: z.number().int().min(1).nullable().default(10).describe('Number of most recent records to return'),
      },
    },
    async (args) => {
      try {
        const result = await getNewsData({
          symbol: args.symbol,
          recent_n: args.recent_n,
        });
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
