/**
 * MCP Server 创建 + 工具注册
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerAllTools } from '../tools/index.js';

const SERVER_NAME = 'akshare-mcp';
const SERVER_VERSION = '1.0.0';

export function createMcpServer(): McpServer {
  const server = new McpServer(
    {
      name: SERVER_NAME,
      version: SERVER_VERSION,
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  registerAllTools(server);

  return server;
}
