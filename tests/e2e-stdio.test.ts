/**
 * 端到端测试: 通过 stdio 与 MCP Server 交互
 */

import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';

async function sendMcpRequest(proc: any, method: string, params?: Record<string, unknown>): Promise<unknown> {
  const request = {
    jsonrpc: '2.0',
    id: Date.now(),
    method,
    params: params ?? {},
  };

  const line = JSON.stringify(request) + '\n';
  proc.stdin.write(line);

  // 等待响应
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('请求超时')), 15000);

    const onLine = (data: string) => {
      try {
        const response = JSON.parse(data);
        if (response.id === request.id || response.id === null) {
          clearTimeout(timeout);
          proc.stdout.removeListener('line', onLine);
          if (response.error) {
            reject(new Error(JSON.stringify(response.error)));
          } else {
            resolve(response.result);
          }
        }
      } catch {
        // 非 JSON 行（如日志），跳过
      }
    };

    proc.stdout.on('line', onLine);
    proc.on('close', (code: number) => {
      clearTimeout(timeout);
      reject(new Error(`进程退出: ${code}`));
    });
  });
}

async function main() {
  console.log('启动 MCP Server (stdio 模式)...\n');

  const proc = spawn('npx', ['tsx', 'src/main.ts'], {
    stdio: ['pipe', 'pipe', 'pipe'],
    cwd: '/Users/sunpengcheng/Documents/AgentProjects/ahshare-mcp-ts',
  });

  // 按行读取 stdout
  const rl = createInterface({ input: proc.stdout });
  const lines: string[] = [];
  proc.stdout = {
    on: (event: string, handler: (...args: any[]) => void) => {
      if (event === 'line') {
        rl.on('line', handler);
      }
      return proc.stdout;
    },
    removeListener: (event: string, handler: (...args: any[]) => void) => {
      if (event === 'line') {
        rl.removeListener('line', handler);
      }
    },
  } as any;

  // 日志输出
  rl.on('line', (line: string) => {
    try {
      JSON.parse(line); // JSON 行不打印
    } catch {
      console.log('[Server]', line);
    }
  });

  // 等待进程启动
  await new Promise(resolve => setTimeout(resolve, 2000));

  try {
    // 1. Initialize
    console.log('1. 发送 initialize 请求...');
    const initResult = await sendMcpRequest(proc, 'initialize', {
      protocolVersion: '2025-03-26',
      capabilities: {},
      clientInfo: { name: 'test-client', version: '1.0.0' },
    });
    console.log('   ✅ Initialize:', JSON.stringify(initResult).slice(0, 200));

    // 发送 initialized 通知
    proc.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n');
    await new Promise(resolve => setTimeout(resolve, 500));

    // 2. List tools
    console.log('\n2. 发送 tools/list 请求...');
    const toolsResult = await sendMcpRequest(proc, 'tools/list');
    console.log('   ✅ Tools:', JSON.stringify(toolsResult).slice(0, 300));

    // 3. Call get_time_info
    console.log('\n3. 发送 tools/call get_time_info 请求...');
    const callResult = await sendMcpRequest(proc, 'tools/call', {
      name: 'get_time_info',
      arguments: {},
    });
    console.log('   ✅ get_time_info:', JSON.stringify(callResult, null, 2));

    console.log('\n🎉 端到端测试通过！');

  } catch (err) {
    console.error('❌ 测试失败:', err instanceof Error ? err.message : String(err));
    process.exitCode = 1;
  } finally {
    proc.kill();
    setTimeout(() => process.exit(process.exitCode ?? 0), 1000);
  }
}

main();
