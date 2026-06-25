/**
 * 新浪财经 — 基金持股 HTML 解析
 *
 * 端点: https://vip.stock.finance.sina.com.cn/corp/go.php/vCI_FundStockHolder/stockid/{stock}.phtml
 * HTML 中的关键元素: <table id="FundHoldSharesTable">
 */

import { config } from '../config.js';

// ============================================================================
// 类型
// ============================================================================

export interface FundHoldingRecord {
  fundName: string;
  fundCode: string;
  shares: number;
  freeSharesRatio: number;
  marketValue: number;
  reportDate: string;
  navRatio?: number;
}

// ============================================================================
// HTML 解析
// ============================================================================

function stripTags(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
}

export async function fetchFundHoldings(stock: string): Promise<FundHoldingRecord[]> {
  const url = `https://vip.stock.finance.sina.com.cn/corp/go.php/vCI_FundStockHolder/stockid/${stock}.phtml`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.httpTimeout);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Referer': 'https://vip.stock.finance.sina.com.cn/',
      },
    });

    if (!res.ok) {
      throw new Error(`新浪基金持股 HTTP ${res.status}`);
    }

    const buffer = await res.arrayBuffer();
    const html = new TextDecoder('gbk').decode(buffer);

    // 提取报告期（格式: 截止日期</strong>...<td>2026-06-23</td>）
    const dateBlock = html.match(/截止日期[\s\S]{0,100}?(\d{4}-\d{2}-\d{2})/);
    const reportDate = dateBlock ? dateBlock[1] : '';

    // 提取 #FundHoldSharesTable 表格
    const tableMatch = html.match(/<table[^>]*id="FundHoldSharesTable"[^>]*>([\s\S]*?)<\/table>/i);
    if (!tableMatch) {
      return [];
    }
    const tableHtml = tableMatch[1];

    // 提取所有行
    const rows = tableHtml.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi);
    if (!rows) return [];

    const results: FundHoldingRecord[] = [];

    for (const row of rows) {
      // 跳过表头（包含 th）和空行
      if (row.includes('<th') || row.includes('基金名称')) continue;

      // 提取每个 <td>...</td>
      const cells = row.match(/<td[^>]*>([\s\S]*?)<\/td>/gi);
      if (!cells || cells.length < 6) continue;

      const texts = cells.map(c => stripTags(c));

      // 验证是否为有效数据行（有数字的持股份额）
      const shares = parseInt(texts[2].replace(/[,\s]/g, ''), 10);
      if (isNaN(shares) || shares === 0) continue;

      results.push({
        fundName: texts[0],
        fundCode: texts[1],
        shares,
        freeSharesRatio: parseFloat(texts[3]) || 0,
        marketValue: parseFloat(texts[4].replace(/[,\s]/g, '')) || 0,
        reportDate,
        navRatio: texts[5] ? parseFloat(texts[5]) || undefined : undefined,
      });
    }

    return results;
  } catch (err) {
    throw new Error(`基金持股数据获取失败: ${err instanceof Error ? err.message : String(err)}`);
  } finally {
    clearTimeout(timer);
  }
}
