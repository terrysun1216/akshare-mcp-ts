/**
 * streamable-http 模式启动（Hono + WebStandardStreamableHTTP transport + @hono/node-server）
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serve } from '@hono/node-server';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { config } from '../config.js';

export function startHttpServer(
  server: McpServer,
  host: string = config.defaultHost,
  port: number = config.defaultPort,
): { app: Hono; stop: () => void } {
  const app = new Hono();
  const mcpPath = '/mcp';

  // CORS：与 Lyna 一致
  app.use(`${mcpPath}/*`, cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    exposeHeaders: ['mcp-session-id', 'mcp-protocol-version'],
    maxAge: 86400,
  }));

  // 健康检查端点
  app.get('/health', (c) => c.json({ status: 'ok', name: 'akshare-mcp' }));

  // Web Standard Streamable HTTP transport（适用于 Hono/Cloudflare Workers/Bun 等）
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // stateless 模式
  });

  // 挂载 MCP 端点 — Hono 中直接转发到 transport
  app.all(mcpPath, async (c) => {
    const request = c.req.raw;
    return transport.handleRequest(request);
  });

  // 后台连接 server
  server.connect(transport).catch((err) => {
    console.error('MCP Server transport 连接失败:', err);
  });

  // 启动 HTTP 服务器
  const httpServer = serve(
    {
      fetch: app.fetch,
      hostname: host,
      port,
    },
    (info) => {
      console.log(`MCP Server 启动在 HTTP 模式: http://${host}:${info.port}`);
      console.log(`MCP 端点: http://${host}:${info.port}${mcpPath}`);
    },
  );

  return {
    app,
    stop: () => httpServer.close(),
  };
}
