/**
 * 完整端到端测试: 全部 9 个 MCP 工具
 */
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';

interface SendResult { proc: any; stdout: any; send: (method: string, params?: Record<string, unknown>) => Promise<unknown>; stop: () => void }

function startServer(): Promise<SendResult> {
  return new Promise((resolve, reject) => {
    const proc = spawn('npx', ['tsx', 'src/main.ts'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: '/Users/sunpengcheng/Documents/AgentProjects/ahshare-mcp-ts',
    });

    const rl = createInterface({ input: proc.stdout });
    let requestId = 0;

    const send = (method: string, params?: Record<string, unknown>): Promise<unknown> => {
      const id = ++requestId;
      const line = JSON.stringify({ jsonrpc: '2.0', id, method, params: params ?? {} }) + '\n';
      proc.stdin.write(line);

      return new Promise((res, rej) => {
        const timeout = setTimeout(() => {
          rl.removeListener('line', handler);
          rej(new Error(`请求超时: ${method}`));
        }, 30000);

        const handler = (data: string) => {
          try {
            const resp = JSON.parse(data);
            if (resp.id === id) {
              clearTimeout(timeout);
              rl.removeListener('line', handler);
              if (resp.error) rej(new Error(JSON.stringify(resp.error)));
              else res(resp.result);
            }
          } catch {}
        };
        rl.on('line', handler);
      });
    };

    // 等待进程就绪
    setTimeout(async () => {
      try {
        await send('initialize', {
          protocolVersion: '2025-03-26',
          capabilities: {},
          clientInfo: { name: 'test', version: '1.0.0' },
        });
        proc.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n');
        await new Promise(r => setTimeout(r, 300));
        resolve({ proc, stdout: rl, send, stop: () => proc.kill() });
      } catch (err) {
        reject(err);
      }
    }, 2000);
  });
}

async function main() {
  console.log('启动 MCP Server...');
  const server = await startServer();

  const tests: Array<{ name: string; method: string; params: Record<string, unknown> }> = [
    { name: 'get_time_info', method: 'tools/call', params: { name: 'get_time_info', arguments: {} } },
    { name: 'get_hist_data', method: 'tools/call', params: { name: 'get_hist_data', arguments: { symbol: '600519', interval: 'day', recent_n: 3 } } },
    { name: 'get_hist_data+指标', method: 'tools/call', params: { name: 'get_hist_data', arguments: { symbol: '000001', interval: 'day', recent_n: 5, indicators_list: ['SMA', 'RSI', 'MACD'] } } },
    { name: 'get_realtime_data', method: 'tools/call', params: { name: 'get_realtime_data', arguments: { symbol: '600519' } } },
    { name: 'get_balance_sheet', method: 'tools/call', params: { name: 'get_balance_sheet', arguments: { symbol: '600519', recent_n: 2 } } },
    { name: 'get_income_statement', method: 'tools/call', params: { name: 'get_income_statement', arguments: { symbol: '600519', recent_n: 2 } } },
    { name: 'get_cash_flow', method: 'tools/call', params: { name: 'get_cash_flow', arguments: { symbol: '600519', recent_n: 2 } } },
    { name: 'get_financial_metrics', method: 'tools/call', params: { name: 'get_financial_metrics', arguments: { symbol: '600519', recent_n: 2 } } },
    { name: 'get_news_data', method: 'tools/call', params: { name: 'get_news_data', arguments: { symbol: '600519', recent_n: 2 } } },
    { name: 'get_inner_trade_data', method: 'tools/call', params: { name: 'get_inner_trade_data', arguments: { symbol: '600519' } } },
    { name: 'get_top10_shareholders', method: 'tools/call', params: { name: 'get_top10_shareholders', arguments: { symbol: '600519' } } },
    { name: 'get_top10_free_shareholders', method: 'tools/call', params: { name: 'get_top10_free_shareholders', arguments: { symbol: '600519' } } },
    { name: 'get_fund_holdings', method: 'tools/call', params: { name: 'get_fund_holdings', arguments: { symbol: '600519' } } },
  ];

  let pass = 0;
  let fail = 0;

  for (const test of tests) {
    try {
      const result = await server.send(test.method, test.params);
      const content = (result as any)?.content?.[0]?.text ?? JSON.stringify(result);
      const data = JSON.parse(content);
      const count = Array.isArray(data) ? data.length : (typeof data === 'object' ? Object.keys(data).length : 'N/A');
      console.log(`✅ ${test.name.padEnd(28)} → ${Array.isArray(data) ? count + '条' : 'OK'}`);
      pass++;
    } catch (err) {
      console.log(`❌ ${test.name.padEnd(28)} → ${err instanceof Error ? err.message : String(err)}`);
      fail++;
    }
  }

  server.stop();
  console.log(`\n=== 结果: ${pass} 通过 / ${tests.length} 总计 ===`);
  if (fail > 0) {
    console.log(`=== ${fail} 个失败 ===`);
    process.exitCode = 1;
  }
  setTimeout(() => process.exit(process.exitCode ?? 0), 500);
}

main().catch(err => { console.error(err); process.exit(1); });
