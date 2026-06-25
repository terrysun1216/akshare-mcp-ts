/**
 * 行情数据 MCP 工具: get_hist_data, get_realtime_data
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getHistData, getRealtimeData } from '../services/market-data.js';
import { INDICATOR_NAMES } from '../indicators/index.js';
import { IntervalEnum, AdjustEnum, HistSourceEnum, RealtimeSourceEnum } from '../types/index.js';

export function registerMarketDataTools(server: McpServer): void {
  // ── get_hist_data ──────────────────────────────────────────────
  server.registerTool(
    'get_hist_data',
    {
      description: "Get historical stock market data. 'eastmoney_direct' support all A,B,H shares",
      inputSchema: {
        symbol: z.string().describe("Stock symbol/ticker (e.g. '000001')"),
        interval: IntervalEnum.default('day').describe('Time interval'),
        interval_multiplier: z.number().int().min(1).default(1).describe('Interval multiplier'),
        start_date: z.string().default('1970-01-01').describe('Start date in YYYY-MM-DD format'),
        end_date: z.string().default('2030-12-31').describe('End date in YYYY-MM-DD format'),
        adjust: AdjustEnum.default('none').describe('Adjustment type'),
        source: HistSourceEnum.default('eastmoney').describe('Data source'),
        indicators_list: z.array(z.string()).nullable().default(null).describe('Technical indicators to add'),
        recent_n: z.number().int().min(1).nullable().default(100).describe('Number of most recent records to return'),
      },
    },
    async (args) => {
      try {
        const result = await getHistData({
          symbol: args.symbol,
          interval: args.interval,
          interval_multiplier: args.interval_multiplier,
          start_date: args.start_date,
          end_date: args.end_date,
          adjust: args.adjust,
          source: args.source,
          indicators_list: args.indicators_list as string[] | null,
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

  // ── get_realtime_data ──────────────────────────────────────────
  server.registerTool(
    'get_realtime_data',
    {
      description: "Get real-time stock market data. 'eastmoney_direct' support all A,B,H shares",
      inputSchema: {
        symbol: z.string().nullable().default(null).describe("Stock symbol/ticker (e.g. '000001')"),
        source: RealtimeSourceEnum.default('eastmoney_direct').describe('Data source'),
      },
    },
    async (args) => {
      try {
        const result = await getRealtimeData({
          symbol: args.symbol,
          source: args.source,
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
