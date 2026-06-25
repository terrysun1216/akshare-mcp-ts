/**
 * 工具类工具注册: get_time_info
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getTimeInfo } from '../services/time.js';

export function registerUtilityTools(server: McpServer): void {
  server.registerTool(
    'get_time_info',
    {
      description: 'Get current time with ISO format, timestamp, and the last trading day.',
    },
    async () => {
      const info = await getTimeInfo();
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(info) }],
      };
    },
  );
}
