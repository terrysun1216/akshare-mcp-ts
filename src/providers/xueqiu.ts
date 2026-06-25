/**
 * 雪球 API Provider
 *
 * 提供实时行情和内部交易数据。
 * 注意: 雪球 API 需要 Cookie 鉴权，公共接口可能限流。
 */

import { config } from '../config.js';
import type { InsiderTradeRecord } from '../types/index.js';

async function fetchJson(url: string, headers?: Record<string, string>): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.httpTimeout);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        ...headers,
      },
    });
    if (!res.ok) throw new Error(`雪球 API 返回 HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 将股票代码转为雪球格式
 */
export function toXueqiuSymbol(symbol: string): string {
  const upper = symbol.toUpperCase();
  if (upper.startsWith('SH')) return upper;
  if (upper.startsWith('SZ')) return upper;

  const code = upper.padStart(6, '0');
  if (code.startsWith('6') || code.startsWith('5') || code.startsWith('9')) {
    return `SH${code}`;
  }
  return `SZ${code}`;
}

/**
 * 获取内部交易数据
 * 使用雪球 API: stock_inner_trade_xq
 */
export async function fetchInsiderTrades(symbol?: string): Promise<InsiderTradeRecord[]> {
  // 雪球内部交易 API
  const url = 'https://stock.xueqiu.com/v5/stock/insider_deals/list.json';
  const params = new URLSearchParams({
    page: '1',
    size: '100',
  });
  if (symbol) {
    params.set('symbol', toXueqiuSymbol(symbol));
  }

  try {
    const json = await fetchJson(`${url}?${params.toString()}`, {
      'Referer': 'https://xueqiu.com/',
    }) as {
      data?: {
        items?: Array<{
          symbol?: string;
          stock_name?: string;
          insider_name?: string;
          title?: string;
          deal_date?: string;
          deal_shares?: number;
          deal_price?: number;
          shares_after?: number;
          relationship?: string;
        }>;
      };
    };

    const items = json.data?.items ?? [];
    return items.map(item => ({
      symbol: (item.symbol ?? symbol ?? '').replace(/^(SH|SZ)/, ''),
      issuer: item.stock_name,
      name: item.insider_name,
      title: item.title,
      transaction_date: item.deal_date ?? '',
      transaction_shares: item.deal_shares,
      transaction_price_per_share: item.deal_price,
      shares_owned_after_transaction: item.shares_after,
      relationship: item.relationship,
    }));
  } catch (err) {
    throw new Error(`雪球内部交易数据获取失败: ${err instanceof Error ? err.message : String(err)}`);
  }
}
