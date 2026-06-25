/**
 * 东方财富 F10 股东数据 Provider
 *
 * 端点: https://emweb.securities.eastmoney.com/PC_HSF10/ShareholderResearch/PageAjax
 */

import { config } from '../config.js';

// ============================================================================
// 类型
// ============================================================================

export interface Top10Holder {
  /** 排名 */
  rank: number;
  /** 股东名称 */
  name: string;
  /** 股份类型 */
  sharesType: string;
  /** 持股数量 */
  holdNum: number;
  /** 持股比例(%) */
  holdNumRatio: number;
  /** 持股变动描述 */
  changeDesc: string;
  /** 持股变动比例 */
  changeRatio: number | null;
}

export interface Top10FreeHolder {
  /** 排名 */
  rank: number;
  /** 股东名称 */
  name: string;
  /** 股东类型 */
  holderType: string;
  /** 股份类型 */
  sharesType: string;
  /** 持股数量 */
  holdNum: number;
  /** 占流通股比例(%) */
  freeHoldRatio: number;
  /** 持股变动描述 */
  changeDesc: string;
  /** 持股变动比例 */
  changeRatio: number | null;
}

export interface ShareholderData {
  /** 报告期 */
  reportDate: string;
  /** 十大股东 */
  top10: Top10Holder[];
  /** 十大流通股东 */
  top10Free: Top10FreeHolder[];
  /** 股东总人数 */
  totalHolders: number | null;
}

// ============================================================================
// F10 API 响应类型
// ============================================================================

interface F10RawHolder {
  HOLDER_RANK: number;
  HOLDER_NAME: string;
  SHARES_TYPE: string;
  HOLD_NUM: number;
  HOLD_NUM_RATIO: number;
  HOLD_NUM_CHANGE: string;
  CHANGE_RATIO: number | null;
  END_DATE?: string;
}

interface F10RawFreeHolder {
  HOLDER_RANK: number;
  HOLDER_NAME: string;
  HOLDER_TYPE: string;
  SHARES_TYPE: string;
  HOLD_NUM: number;
  FREE_HOLDNUM_RATIO: number;
  HOLD_NUM_CHANGE: string;
  CHANGE_RATIO: number | null;
}

interface F10Response {
  sdgd?: F10RawHolder[];
  sdltgd?: F10RawFreeHolder[];
  gdrs?: Array<{ HOLDER_TOTAL_NUM?: number }>;
  sdgd_date?: string;
}

// ============================================================================
// 代码格式
// ============================================================================

function toF10Code(symbol: string): string {
  const upper = symbol.toUpperCase();
  if (upper.startsWith('SH') || upper.startsWith('SZ') || upper.startsWith('BJ')) {
    return upper;
  }
  const code = upper.padStart(6, '0');
  if (code.startsWith('6') || code.startsWith('5') || code.startsWith('9')) {
    return `SH${code}`;
  }
  return `SZ${code}`;
}

// ============================================================================
// Public API
// ============================================================================

export async function fetchShareholderData(symbol: string): Promise<ShareholderData> {
  const code = toF10Code(symbol);

  const url = `https://emweb.securities.eastmoney.com/PC_HSF10/ShareholderResearch/PageAjax?code=${code}&clientType=web`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.httpTimeout);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Referer': 'https://emweb.securities.eastmoney.com/',
      },
    });

    if (!res.ok) {
      throw new Error(`东方财富 F10 API HTTP ${res.status}`);
    }

    const json = (await res.json()) as F10Response;

    // sdgd_date 是数组 [{END_DATE, IS_REPORTDATE}]
    const dateArr = json.sdgd_date;
    const reportDate = Array.isArray(dateArr) && dateArr.length > 0
      ? (dateArr[0].END_DATE ?? '')
      : (typeof dateArr === 'string' ? dateArr : '');

    const top10: Top10Holder[] = (json.sdgd ?? []).map((item) => ({
      rank: item.HOLDER_RANK,
      name: item.HOLDER_NAME,
      sharesType: item.SHARES_TYPE,
      holdNum: item.HOLD_NUM,
      holdNumRatio: item.HOLD_NUM_RATIO,
      changeDesc: item.HOLD_NUM_CHANGE,
      changeRatio: item.CHANGE_RATIO,
    }));

    const top10Free: Top10FreeHolder[] = (json.sdltgd ?? []).map((item) => ({
      rank: item.HOLDER_RANK,
      name: item.HOLDER_NAME,
      holderType: item.HOLDER_TYPE,
      sharesType: item.SHARES_TYPE,
      holdNum: item.HOLD_NUM,
      freeHoldRatio: item.FREE_HOLDNUM_RATIO,
      changeDesc: item.HOLD_NUM_CHANGE,
      changeRatio: item.CHANGE_RATIO,
    }));

    const totalHolders = json.gdrs?.[0]?.HOLDER_TOTAL_NUM ?? null;

    return {
      reportDate,
      top10,
      top10Free,
      totalHolders,
    };
  } catch (err) {
    throw new Error(`十大股东数据获取失败: ${err instanceof Error ? err.message : String(err)}`);
  } finally {
    clearTimeout(timer);
  }
}
