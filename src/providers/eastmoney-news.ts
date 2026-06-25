/**
 * 东方财富新闻 API
 *
 * 与 akshare stock_news_em() 使用相同的接口。
 */

import { config } from '../config.js';
import type { NewsRecord } from '../types/index.js';

interface CmsArticle {
  code: string;
  title: string;
  content: string;
  date: string;
  mediaName: string;
}

interface NewsApiResponse {
  result?: {
    cmsArticleWebOld?: CmsArticle[];
  };
}

function cleanText(text: string): string {
  return text
    .replace(/<em>/g, '')
    .replace(/<\/em>/g, '')
    .replace(/<em>/g, '')
    .replace(/<\/em>/g, '')
    .replace(/　/g, '')
    .replace(/\r\n/g, ' ')
    .trim();
}

/**
 * 获取东方财富个股新闻
 * 使用与 akshare stock_news_em() 完全相同的接口
 */
export async function fetchStockNews(symbol: string): Promise<NewsRecord[]> {
  const innerParam = {
    uid: '',
    keyword: symbol,
    type: ['cmsArticleWebOld'],
    client: 'web',
    clientType: 'web',
    clientVersion: 'curr',
    param: {
      cmsArticleWebOld: {
        searchScope: 'default',
        sort: 'default',
        pageIndex: 1,
        pageSize: 30,
        preTag: '<em>',
        postTag: '</em>',
      },
    },
  };

  const url = new URL('https://search-api-web.eastmoney.com/search/jsonp');
  url.searchParams.set('cb', 'jQuery_test');
  url.searchParams.set('param', JSON.stringify(innerParam));
  url.searchParams.set('_', String(Date.now()));

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.httpTimeout);

  try {
    const res = await fetch(url.toString(), {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Referer': `https://so.eastmoney.com/news/s?keyword=${symbol}`,
      },
    });

    if (!res.ok) {
      throw new Error(`东方财富新闻 API HTTP ${res.status}`);
    }

    const text = await res.text();

    // 剥离 JSONP 回调包装: jQuery_test({...});
    const jsonStart = text.indexOf('(');
    const jsonEnd = text.lastIndexOf(')');
    if (jsonStart < 0 || jsonEnd < 0) {
      return [];
    }

    const json = JSON.parse(text.slice(jsonStart + 1, jsonEnd)) as NewsApiResponse;
    const articles = json.result?.cmsArticleWebOld ?? [];

    return articles.map(item => ({
      keyword: symbol,
      title: cleanText(item.title ?? ''),
      content: cleanText(item.content ?? ''),
      publish_time: item.date ?? '',
      source: item.mediaName ?? '东方财富',
      url: `https://finance.eastmoney.com/a/${item.code}.html`,
    }));
  } catch (err) {
    throw new Error(`新闻获取失败: ${err instanceof Error ? err.message : String(err)}`);
  } finally {
    clearTimeout(timer);
  }
}
