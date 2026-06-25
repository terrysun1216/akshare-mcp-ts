/**
 * 测试新增的三个股东类 MCP 工具
 */
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';

async function startServer(): Promise<{ send: (method: string, params?: any) => Promise<any>; stop: () => void }> {
  const proc = spawn('npx', ['tsx', 'src/main.ts'], {
    stdio: ['pipe', 'pipe', 'pipe'],
    cwd: '/Users/sunpengcheng/Documents/AgentProjects/akshare-mcp-ts',
  });

  const rl = createInterface({ input: proc.stdout });
  let id = 0;

  const send = (method: string, params?: any): Promise<any> => {
    const rid = ++id;
    proc.stdin.write(JSON.stringify({ jsonrpc: '2.0', id: rid, method, params: params ?? {} }) + '\n');
    return new Promise((res, rej) => {
      const t = setTimeout(() => { rl.removeListener('line', h); rej(new Error('timeout')); }, 30000);
      const h = (d: string) => {
        try {
          const r = JSON.parse(d);
          if (r.id === rid) { clearTimeout(t); rl.removeListener('line', h); r.error ? rej(new Error(JSON.stringify(r.error))) : res(r.result); }
        } catch {}
      };
      rl.on('line', h);
    });
  };

  await new Promise(r => setTimeout(r, 1500));
  await send('initialize', { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 't', version: '1' } });
  proc.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n');
  await new Promise(r => setTimeout(r, 300));

  return { send, stop: () => proc.kill() };
}

async function main() {
  console.log('=== 测试三个新股东类工具 ===\n');
  const server = await startServer();

  const tests = [
    'get_top10_shareholders',
    'get_top10_free_shareholders',
    'get_fund_holdings',
  ];

  for (const name of tests) {
    try {
      const result = await server.send('tools/call', { name, arguments: { symbol: '600519' } });
      const text = result.content?.[0]?.text ?? JSON.stringify(result);
      const data = JSON.parse(text);

      if (Array.isArray(data)) {
        console.log(`✅ ${name.padEnd(32)} → ${data.length} 条`);
        if (data.length > 0) {
          console.log(`   首条: ${JSON.stringify(data[0]).slice(0, 180)}`);
        }
      } else if (data.top10) {
        console.log(`✅ ${name.padEnd(32)} → 十大股东${data.top10.length}位 + 十大流通${data.top10_free?.length ?? 0}位`);
        if (data.top10.length > 0) {
          console.log(`   第1大: ${data.top10[0].name} (${data.top10[0].holdNumRatio}%)`);
        }
      } else {
        console.log(`✅ ${name.padEnd(32)} → ${JSON.stringify(data).slice(0, 150)}`);
      }
    } catch (err) {
      console.log(`❌ ${name} → ${err instanceof Error ? err.message.slice(0, 100) : String(err)}`);
    }
  }

  server.stop();
  console.log('\n=== 测试完成 ===');
  setTimeout(() => process.exit(0), 500);
}

main().catch(err => { console.error(err); process.exit(1); });
