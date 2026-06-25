/**
 * AKShare MCP Server — 入口
 *
 * 支持两种运行模式:
 *   stdio (默认):     akshare-mcp
 *   streamable-http:  akshare-mcp --streamable-http [--host 0.0.0.0] [--port 8081]
 */

import { createMcpServer } from './server/mcp-server.js';
import { startStdio } from './server/stdio.js';
import { startHttpServer } from './server/http.js';
import { config } from './config.js';

function parseArgs(): { streamableHttp: boolean; host: string; port: number } {
  const args = process.argv.slice(2);
  let streamableHttp = false;
  let host = config.defaultHost;
  let port = config.defaultPort;

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--streamable-http':
        streamableHttp = true;
        break;
      case '--host':
        if (args[i + 1]) host = args[++i];
        break;
      case '--port':
        if (args[i + 1]) port = parseInt(args[++i], 10);
        break;
      case '--help':
      case '-h':
        console.log(`AKShare MCP Server v1.0.0

用法:
  akshare-mcp                          默认 stdio 模式
  akshare-mcp --streamable-http        HTTP 模式
  akshare-mcp --streamable-http --host 0.0.0.0 --port 8081

选项:
  --streamable-http   启用 HTTP 模式（默认: stdio 模式）
  --host <host>       HTTP 监听地址（默认: 0.0.0.0）
  --port <port>       HTTP 监听端口（默认: 8081）
  --help, -h          显示帮助信息`);
        process.exit(0);
    }
  }

  return { streamableHttp, host, port };
}

async function main(): Promise<void> {
  const { streamableHttp, host, port } = parseArgs();
  const server = createMcpServer();

  if (streamableHttp) {
    console.log('MCP Server 启动在 HTTP 模式...');
    startHttpServer(server, host, port);

    // 优雅关闭
    process.on('SIGINT', () => process.exit(0));
    process.on('SIGTERM', () => process.exit(0));
  } else {
    console.error('MCP Server 启动在 stdio 模式...');
    await startStdio(server);
  }
}

main().catch((err) => {
  console.error('MCP Server 启动失败:', err);
  process.exit(1);
});
