/**
 * 新浪财经 HTTP API Provider
 *
 * 提供历史 K 线和交易日历数据。
 */

import { config } from '../config.js';
import type { OHLCV } from '../types/index.js';

// ============================================================================
// 符号转换
// ============================================================================

/**
 * 将股票代码转换为新浪格式（带 sh/sz/bj 前缀）
 */
export function toSinaSymbol(symbol: string): string {
  const upper = symbol.toUpperCase();

  // 已有前缀直接返回小写
  if (upper.startsWith('SH')) return `sh${upper.slice(2)}`;
  if (upper.startsWith('SZ')) return `sz${upper.slice(2)}`;
  if (upper.startsWith('BJ')) return `bj${upper.slice(2)}`;

  const code = upper.padStart(6, '0');
  const prefix = code.slice(0, 3);

  if (['000', '001', '002', '003', '200', '300'].includes(prefix)) return `sz${code}`;
  if (prefix.startsWith('6') || prefix.startsWith('5') || prefix === '688') return `sh${code}`;
  if (['900'].includes(prefix)) return `sh${code}`;

  return `sh${code}`;
}

// ============================================================================
// HTTP fetch
// ============================================================================

async function fetchJson(url: string): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.httpTimeout);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Referer': 'https://finance.sina.com.cn/',
      },
    });

    if (!res.ok) {
      throw new Error(`新浪 API 返回 HTTP ${res.status}: ${res.statusText}`);
    }

    return await res.json();
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error(`新浪 API 请求超时 (${config.httpTimeout}ms)`);
    }
    throw new Error(`新浪 API 请求失败: ${err instanceof Error ? err.message : String(err)}`);
  } finally {
    clearTimeout(timer);
  }
}

// ============================================================================
// K线
// ============================================================================

interface SinaKlineRaw {
  day: string;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
}

function toScale(interval: string): string {
  switch (interval) {
    case 'minute': return '1';
    case 'hour': return '60';
    case 'day': return '240';
    default: return '240';
  }
}

/**
 * 从新浪获取历史 K 线数据（日线及以上）
 */
export async function fetchDailyKline(
  symbol: string,
  startDate: string,
  endDate: string,
  adjust: string,
): Promise<OHLCV[]> {
  const sinaSymbol = toSinaSymbol(symbol);
  const start = startDate.replace(/-/g, '');
  const end = endDate.replace(/-/g, '');
  const adjParam = adjust === 'none' ? '' : adjust;

  // 用新浪 data API (JSONP 接口)
  const url = new URL('https://money.finance.sina.com.cn/quotes_service/api/json_v2.php/CN_MarketData.getKLineData');
  url.searchParams.set('symbol', sinaSymbol);
  url.searchParams.set('scale', '240');
  url.searchParams.set('ma', 'no');
  url.searchParams.set('datalen', '5000');

  const rawData = await fetchJson(url.toString()) as SinaKlineRaw[];

  return rawData.map(item => ({
    timestamp: item.day,
    open: parseFloat(item.open),
    high: parseFloat(item.high),
    low: parseFloat(item.low),
    close: parseFloat(item.close),
    volume: parseInt(item.volume, 10),
  }));
}

// ============================================================================
// 交易日历
// ============================================================================

interface SinaTradeDateRaw {
  trade_date: string;
}

/**
 * 从新浪获取交易日历
 */
export async function fetchTradeDates(): Promise<string[]> {
  const url = 'https://vip.stock.finance.sina.com.cn/quotes_service/api/json_v2.php/Market_Center.getTradeDate';

  try {
    const rawData = await fetchJson(url.toString()) as { trade_date: string }[];
    return rawData.map(d => d.trade_date).sort();
  } catch {
    // 新浪交易日历接口可能不可用，返回空数组让调用方处理
    return [];
  }
}
