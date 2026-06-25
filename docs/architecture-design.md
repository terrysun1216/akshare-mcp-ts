# AKShare MCP TypeScript 重构 — 总体设计

> 版本: 2.0.0 | 日期: 2026-06-25 | 状态: 待评审

---

## 目录

1. [项目概述与目标](#1-项目概述与目标)
2. [源项目深度逆向分析](#2-源项目深度逆向分析)
3. [技术栈选型](#3-技术栈选型)
4. [整体架构设计](#4-整体架构设计)
5. [模块设计](#5-模块设计)
6. [HTTP API 层设计](#6-http-api-层设计)
7. [技术指标层设计](#7-技术指标层设计)
8. [MCP 工具定义](#8-mcp-工具定义)
9. [传输层设计](#9-传输层设计)
10. [项目目录结构](#10-项目目录结构)
11. [依赖项](#11-依赖项)
12. [与 Lyna 技术栈对齐](#12-与-lyna-技术栈对齐)
13. [实施路线图](#13-实施路线图)

---

## 1. 项目概述与目标

### 1.1 背景

`akshare-one-mcp` 是一个基于 Python 的 MCP (Model Context Protocol) 服务器，为 AI 助手提供中国 A 股市场数据接口。经逆向分析，底层 `akshare-one` + `akshare` 本质是对东方财富、新浪、雪球等**公开 HTTP API** 的封装 + 基于 OHLCV 数据的**纯数学技术指标计算**。

### 1.2 重构目标

**零 Python 依赖**，将整个 `akshare-one-mcp` 完全重写为纯 TypeScript：

- 直接调用东方财富、新浪等公开 HTTP API
- 34 个技术指标全部用 TypeScript 实现
- 交易日历用 TypeScript 实现
- MCP Server 层使用 `@modelcontextprotocol/sdk`
- 与 Lyna 项目共享完全相同的技术栈

### 1.3 设计原则

| 原则 | 说明 |
|------|------|
| **零 Python 依赖** | 不依赖 Python 运行时，纯 Node.js |
| **功能对等** | 保持与 Python 版 100% MCP 工具兼容 |
| **快速失败** | 不创建 fallback，错误直接暴露 |
| **类型安全** | TypeScript strict mode，所有接口完整类型 |
| **可测试性** | 每层独立可测，HTTP 层可 mock |
| **与 Lyna 对齐** | 复用相同技术选型和代码模式 |

---

## 2. 源项目深度逆向分析

### 2.1 核心发现：akshare-one 本质是 HTTP API 封装

经过对 `akshare-one` 源码的完整逆向分析，该库**不含任何私有算法或本地数据**，所有功能分为两类：

| 类别 | 占比 | 实现方式 |
|------|------|----------|
| HTTP API 调用 + JSON 解析 | ~70% | `requests.get()` → JSON → DataFrame |
| 纯数学计算（技术指标） | ~30% | pandas rolling/ewm 运算 |

### 2.2 所有 HTTP 端点清单

经过源码逆向，以下是 `akshare-one` 调用的全部 HTTP 端点：

#### 2.2.1 东方财富 — 历史 K 线

```
GET https://push2his.eastmoney.com/api/qt/stock/kline/get
```

| 参数 | 示例值 | 说明 |
|------|--------|------|
| `fields1` | `f1,f2,f3,f4,f5,f6` | 固定 |
| `fields2` | `f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61` | 固定 |
| `klt` | `1`/`5`/`15`/`30`/`60`/`101`/`102`/`103` | K 线类型 |
| `fqt` | `0`/`1`/`2` | 复权(0=不复权,1=前复权,2=后复权) |
| `secid` | `1.600519` | 市场代码.股票代码 |
| `beg` | `20240101` | 开始日期 |
| `end` | `20241231` | 结束日期 |

**secid 规则**: `SH→1`, `SZ→0`, `BJ→0`, `HK→116`；6 位代码 000/001/002/003/300 开头 → `0`，600/601/603/605/688 开头 → `1`

**响应字段** (逗号分隔字符串): `timestamp,open,close,high,low,volume,turnover,amplitude,change_pct,change,turnover_rate`

#### 2.2.2 东方财富 — 实时行情

```
GET https://push2.eastmoney.com/api/qt/stock/get
```

| 参数 | 值 | 说明 |
|------|-----|------|
| `invt` | `2` | 固定 |
| `fltt` | `2` | 固定 |
| `fields` | `f43,f44,f45,f46,f47,f48,f49,f50,f51,f52,f55,f57,f58,f60,f116,f117,f162,f167,f168,f169,f170,f171,f173,f292,f530` | 固定字段列表 |
| `secid` | `1.600519` | 同 K 线的市场代码规则 |

**关键字段**: `f43`(最新价), `f44`(最高), `f45`(最低), `f46`(开盘), `f47`(成交量), `f48`(成交额), `f50`(量比), `f57`(代码), `f58`(名称), `f60`(涨跌幅), `f116`(总市值), `f117`(流通市值), `f162`(市盈率), `f167`(市净率), `f169`(涨跌额), `f170`(换手率)

**无鉴权**: 这些端点均为公开接口，无需 API Key、Token 或签名。

#### 2.2.3 东方财富 — 财务报表

```
GET https://datacenter-web.eastmoney.com/api/data/v1/get
```

| 参数 | 示例值 | 说明 |
|------|--------|------|
| `reportName` | `RPT_DMSK_FN_BALANCE` | 报表类型 |
| `filter` | `(SECURITY_CODE="600519")` | 过滤条件 |
| `pageNumber` | `1` | 页码 |
| `pageSize` | `1000` | 每页条数 |
| `sortColumns` | `REPORT_DATE` | 排序字段 |
| `sortTypes` | `-1` | 降序 |
| `columns` | `REPORT_DATE,TOTAL_ASSETS,...` | 返回字段 |

**三种 reportName**:
- `RPT_DMSK_FN_BALANCE` — 资产负债表
- `RPT_DMSK_FN_INCOME` — 利润表
- `RPT_DMSK_FN_CASHFLOW` — 现金流量表

#### 2.2.4 东方财富 — 个股新闻

```
GET https://search-api-web.eastmoney.com/search/jsonp
```

| 参数 | 说明 |
|------|------|
| `cb` | callback 函数名（JSONP） |
| `param` | JSON 字符串，含 `uid`(新闻代码), `size`, `pageIndex` 等 |

**注**: Python 版通过 `akshare.stock_news_em()` 间接调用，需要进一步确认完整参数。对等实现可直接调用东方财富搜索 API。

#### 2.2.5 新浪财经 — 历史 K 线

```
GET https://money.finance.sina.com.cn/quotes_service/api/json_v2.php/CN_MarketData.getKLineData
```

| 参数 | 示例值 | 说明 |
|------|--------|------|
| `symbol` | `sh600519` | 股票代码（前缀sh/sz/bj） |
| `scale` | `1`/`5`/`15`/`30`/`60`/`240` | K 线周期（240=日线） |
| `ma` | `no` | 不需要均线 |
| `datalen` | `1000` | 数据条数 |

#### 2.2.6 新浪财经 — 交易日历

```
GET https://vip.stock.finance.sina.com.cn/quotes_service/api/json_v2.php/Market_Center.getTradeDate
```

**注**: Python 版通过 `akshare.tool_trade_date_hist_sina()` 调用。返回中国 A 股交易日列表。

#### 2.2.7 雪球 — 内部交易

```
GET https://xueqiu.com/statuses/stock_insider_deals.json
```

**注**: Python 版通过 `akshare.stock_inner_trade_xq()` 调用，返回董监高内部交易数据。雪球 API 可能需要 Cookie/Token 鉴权。

#### 2.2.8 雪球 — 实时行情

```
GET https://stock.xueqiu.com/v5/stock/quote.json
```

**注**: 需带 Cookie 鉴权，Python 版通过 `akshare` 内置的 token 管理处理。

### 2.3 技术指标清单（34 个纯数学计算）

所有指标输入 OHLCV 数据（`timestamp, open, high, low, close, volume`），输出一个数值序列。零外部依赖，纯数学公式：

| # | 指标 | 核心公式 | 参数 |
|---|------|----------|------|
| 1 | SMA | Σclose / N | window=20 |
| 2 | EMA | α·close + (1-α)·EMA₋₁ | window=20 |
| 3 | RSI | 100 - 100/(1 + avgGain/avgLoss) | window=14 |
| 4 | MACD | EMA(fast) - EMA(slow), Signal, Hist | 12/26/9 |
| 5 | BOLL | SMA ± std × σ | 20, 2 |
| 6 | STOCH | %K = 100·(C-L)/(H-L), %D = SMA(%K) | 14/3/3 |
| 7 | ATR | WilderSmooth(TrueRange) | window=14 |
| 8 | CCI | (TP - SMA(TP)) / (0.015·MAD) | window=14 |
| 9 | ADX | WilderSmooth(DX), DX=100·|+DI - -DI|/(+DI + -DI) | window=14 |
| 10 | WILLR | -100·(HH-close)/(HH-LL) | window=14 |
| 11 | AD | Σ(MFM · volume), MFM=((C-L)-(H-C))/(H-L) | - |
| 12 | ADOSC | EMA(AD, fast) - EMA(AD, slow) | 3/10 |
| 13 | OBV | Σ(volume × sign(Δclose)) | - |
| 14 | MOM | closeₜ - closeₜ₋ₙ | window=10 |
| 15 | SAR | 迭代抛物线算法 | 0.02/0.2 |
| 16 | TSF | 线性回归预测 (y = a + b·x) | window=14 |
| 17 | APO | MA(fast) - MA(slow) | 12/26 |
| 18 | AROON | 100×(window - 距最高天数)/window | window=14 |
| 19 | AROONOSC | AroonUp - AroonDown | window=14 |
| 20 | BOP | (close - open)/(high - low) | - |
| 21 | CMO | 100×(UpSum - DownSum)/(UpSum + DownSum) | window=14 |
| 22 | DX | 100×|+DI - -DI|/(+DI + -DI) | window=14 |
| 23 | MFI | 100 - 100/(1 + posMF/negMF) | window=14 |
| 24 | MINUS_DI | 100 × WilderSmooth(-DM)/ATR | window=14 |
| 25 | MINUS_DM | WilderSmooth(-DM) | window=14 |
| 26 | PLUS_DI | 100 × WilderSmooth(+DM)/ATR | window=14 |
| 27 | PLUS_DM | WilderSmooth(+DM) | window=14 |
| 28 | PPO | 100×(MA_fast - MA_slow)/MA_slow | 12/26 |
| 29 | ROC | 100×(closeₜ - closeₜ₋ₙ)/closeₜ₋ₙ | window=10 |
| 30 | ROCP | (closeₜ - closeₜ₋ₙ)/closeₜ₋ₙ | window=10 |
| 31 | ROCR | closeₜ/closeₜ₋ₙ | window=10 |
| 32 | ROCR100 | 100×closeₜ/closeₜ₋ₙ | window=10 |
| 33 | TRIX | 100×ΔEMA3/EMA3₋₁ (三重EMA) | window=30 |
| 34 | ULTOSC | 100×(4A1+2A2+A3)/7 | 7/14/28 |

### 2.4 交易日历

Python 版通过 `akshare.tool_trade_date_hist_sina()` 获取新浪交易日历。TypeScript 版可以直接调用同一个新浪 API，返回 `List<string>`（YYYY-MM-DD 格式）。

---

## 3. 技术栈选型

| 层面 | Python 原版 | TypeScript 重构版 | 对齐 Lyna? |
|------|-------------|-------------------|-------------|
| 语言 | Python 3.12 | TypeScript 5.x (strict) | ✅ |
| 运行时 | CPython | Node.js 22+ / Bun (dev) | ✅ |
| 包管理 | uv | pnpm (推荐) 或 bun | ✅ |
| MCP SDK | FastMCP | `@modelcontextprotocol/sdk` | ✅ |
| HTTP 框架 | Starlette + uvicorn | Hono | ✅ |
| HTTP 客户端 | `requests` | 内置 `fetch` (Node 22) | ✅ |
| 校验 | Pydantic | Zod | ✅ |
| 类型检查 | mypy/pyright | TypeScript compiler | ✅ |
| Lint | ruff | ESLint + Prettier | - |
| 测试 | - | Vitest | ✅ |
| DataFrame | pandas | 原生 `Array<Record<string, unknown>>` | - |

### 3.1 为什么不需要 DataFrame 库

Python 版使用 pandas 主要为了：
1. **列重命名** → TypeScript 用 `Array.map()`
2. **resample/聚合** → TypeScript 用函数式 `groupBy` + `reduce`
3. **滚动窗口计算** → 技术指标自己实现（本身就是纯数学）
4. **JSON 序列化** → `JSON.stringify()`

**结论**: TypeScript 原生数组操作完全够用，不需要引入 DataFrame 库。

---

## 4. 整体架构设计

### 4.1 架构分层

```
┌──────────────────────────────────────────────────────────────┐
│                     Entry Layer                              │
│  ┌──────────────┐  ┌──────────────────────────────────┐     │
│  │  stdio mode   │  │  streamable-http mode (Hono)     │     │
│  │  (默认)       │  │  GET/POST /mcp                   │     │
│  └──────┬───────┘  └──────────────┬───────────────────┘     │
│         │                         │                          │
│         └───────────┬─────────────┘                          │
│                     │                                        │
├─────────────────────┼────────────────────────────────────────┤
│              MCP Server Layer                                │
│  ┌──────────────────┴──────────────────────────────────┐    │
│  │  McpServer (基于 @modelcontextprotocol/sdk)          │    │
│  │  - 注册 9 个 tool + Zod → JSON Schema               │    │
│  │  - Stdio / StreamableHTTP transport                 │    │
│  └──────────────────┬──────────────────────────────────┘    │
│                     │                                        │
├─────────────────────┼────────────────────────────────────────┤
│               Service Layer                                  │
│  ┌──────────────────┴──────────────────────────────────┐    │
│  │  MarketDataService / NewsService / FinancialService  │    │
│  │  - 参数校验 (Zod)                                    │    │
│  │  - 调用 Data Layer                                   │    │
│  │  - 调用 Indicators Layer（按需）                     │    │
│  │  - 格式化输出 JSON                                    │    │
│  └──────────────────┬──────────────────────────────────┘    │
│                     │                                        │
├─────────────────────┼────────────────────────────────────────┤
│               Data Layer                                     │
│  ┌──────────────────┴──────────────────────────────────┐    │
│  │  EastMoneyProvider / SinaProvider / XueQiuProvider   │    │
│  │  - 构造 HTTP 请求（URL, params, headers）            │    │
│  │  - 调用 fetch() → JSON                               │    │
│  │  - 解析响应 → 统一格式 Array<Record>                 │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Indicators Engine (34 functions)                    │    │
│  │  - 纯函数: (OHLCV[]) => Indicator[]                  │    │
│  │  - 零 I/O，纯数学计算                                 │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  TradingCalendar                                     │    │
│  │  - 获取交易日列表                                     │    │
│  │  - 查找最近交易日                                     │    │
│  └─────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────┘
```

### 4.2 数据流（以 get_hist_data + 技术指标为例）

```
1. MCP Client 调用 "get_hist_data" tool
       │
2. McpServer 接收 → Zod 校验参数
       │
3. MarketDataService.getHistData(args)
       │
4. EastMoneyProvider.fetchKline(symbol, klt, fqt, beg, end)
       │  GET https://push2his.eastmoney.com/api/qt/stock/kline/get?... 
       │  解析响应 → {timestamp, open, high, low, close, volume, ...}[]
       ▼
5. [可选] IndicatorsEngine.compute(data, ['SMA', 'MACD', 'RSI'])
       │  对每个指标调用纯函数计算 → 追加列到 data
       ▼
6. [可选] 截取 recent_n 条
       │
7. JSON.stringify(data) → 返回给 MCP Client
```

### 4.3 关键设计原则

1. **Data Layer 零状态** — 每个 Provider 函数是纯 async 函数，不保持连接池/会话
2. **Indicators 纯函数** — 输入数组，输出数组，易测试
3. **Cache 可选层** — 与 Python 版一致，对行情类数据做短期内存缓存（TTL 30s）
4. **统一返回格式** — 所有 MCP Tool 返回 `JSON.stringify(records)`，与 Python 版 `df.to_json(orient="records")` 完全等价

---

## 5. 模块设计

### 5.1 模块列表

| 模块 | 文件路径 | 职责 |
|------|----------|------|
| **入口** | `src/main.ts` | CLI 参数解析，启动 stdio/HTTP 模式 |
| **配置** | `src/config.ts` | 全局配置（端口、超时、缓存 TTL） |
| **MCP Server** | `src/server/mcp-server.ts` | 创建 McpServer，注册 9 个 tools |
| **传输层** | `src/server/stdio.ts` | stdio transport |
| | `src/server/http.ts` | Hono + StreamableHTTP transport + CORS |
| **工具注册** | `src/tools/*.ts` | 每个 tool: Zod schema + execute 函数 |
| **服务层** | `src/services/*.ts` | 业务编排: 数据获取 + 指标计算 + 格式化 |
| **数据提供者** | `src/providers/eastmoney.ts` | 东方财富 HTTP API（K线/实时/财务/新闻） |
| | `src/providers/sina.ts` | 新浪 HTTP API（K线/交易日历） |
| | `src/providers/xueqiu.ts` | 雪球 HTTP API（内部交易/实时行情） |
| **技术指标** | `src/indicators/*.ts` | 34 个指标的纯函数实现 |
| **交易日历** | `src/calendar.ts` | 交易日获取/查找 |
| **缓存** | `src/cache.ts` | 简单内存缓存（TTL + LRU） |
| **类型定义** | `src/types/*.ts` | Zod Schema + 推导 TS 类型 |

### 5.2 工具分类

```
src/tools/
├── index.ts              # 统一导出 registerAllTools()
├── market-data.ts        # get_hist_data, get_realtime_data
├── news.ts               # get_news_data
├── financial.ts          # get_balance_sheet, get_income_statement, get_cash_flow
├── analysis.ts           # get_inner_trade_data, get_financial_metrics
└── utility.ts            # get_time_info
```

### 5.3 技术指标模块

```
src/indicators/
├── index.ts              # 统一导出 + 指标名→函数 映射表
├── trend.ts              # SMA, EMA, MACD, APO, PPO, TRIX, ULTOSC
├── momentum.ts           # RSI, CCI, ADX, DX, MFI, MOM, CMO, WILLR
├── volatility.ts         # BOLL, ATR, SAR
├── volume.ts             # OBV, AD, ADOSC
├── aroon.ts              # AROON, AROONOSC
├── directional.ts        # PLUS_DI, PLUS_DM, MINUS_DI, MINUS_DM
├── rate-of-change.ts     # ROC, ROCP, ROCR, ROCR100
├── stats.ts              # BOP, TSF
└── helpers.ts            # SMA helper, EMA helper, WilderSmooth, rolling window
```

---

## 6. HTTP API 层设计

### 6.1 东方财富 Provider

```typescript
// src/providers/eastmoney.ts

export interface EastMoneyKlineParams {
  symbol: string;
  klt: string;      // "1"|"5"|"15"|"30"|"60"|"101"|"102"|"103"
  fqt: string;       // "0"|"1"|"2"
  beg: string;       // "20240101"
  end: string;       // "20241231"
}

export interface KlineRecord {
  timestamp: string;
  open: number;
  close: number;
  high: number;
  low: number;
  volume: number;
  turnover?: number;
  amplitude?: number;
  change_pct?: number;
  change?: number;
  turnover_rate?: number;
}

// 核心方法
export function toSecid(symbol: string): string;
export function toKlt(interval: string, multiplier: number): string;
export function toFqt(adjust: string): string;
export async function fetchKline(params: EastMoneyKlineParams): Promise<KlineRecord[]>;
export async function fetchRealtimeQuote(symbol: string): Promise<RealtimeRecord>;
export async function fetchFinancialReport(symbol: string, reportName: string, columns: string[]): Promise<Record<string, unknown>[]>;
```

**HTTP 实现**:
```typescript
// 使用 Node.js 22 内置 fetch（零额外依赖）
export async function fetchKline(params: EastMoneyKlineParams): Promise<KlineRecord[]> {
  const url = new URL('https://push2his.eastmoney.com/api/qt/stock/kline/get');
  url.searchParams.set('fields1', 'f1,f2,f3,f4,f5,f6');
  url.searchParams.set('fields2', 'f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61');
  url.searchParams.set('klt', params.klt);
  url.searchParams.set('fqt', params.fqt);
  url.searchParams.set('secid', toSecid(params.symbol));
  url.searchParams.set('beg', params.beg);
  url.searchParams.set('end', params.end);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`EastMoney API error: ${res.status}`);
  
  const json = await res.json();
  if (json.rc !== 0) throw new Error(`EastMoney API: ${json.msg}`);
  
  // json.data.klines 是逗号分隔字符串数组
  return (json.data?.klines ?? []).map(parseKline);
}
```

### 6.2 新浪 Provider

```typescript
// src/providers/sina.ts

export async function fetchKline(
  symbol: string,
  scale: string,    // "1"|"5"|"15"|"30"|"60"|"240"
  datalen: number,
  adjust: string,
): Promise<KlineRecord[]>;

export async function fetchTradeDates(): Promise<string[]>;
```

**符号转换**: `000001` → `sz000001`, `600519` → `sh600519`, 港股/B 股类似规则。

### 6.3 雪球 Provider

```typescript
// src/providers/xueqiu.ts

export async function fetchRealtimeQuote(symbol: string): Promise<RealtimeRecord>;
export async function fetchInsiderTrades(symbol?: string): Promise<InsiderTradeRecord[]>;
```

**注意**: 雪球 API 可能需要 Cookie/Token 鉴权，需携带模拟登录或从配置读取 token。

### 6.4 错误处理策略

```typescript
// 统一错误类型
export class ProviderError extends Error {
  constructor(
    message: string,
    public readonly provider: string,    // 'eastmoney' | 'sina' | 'xueqiu'
    public readonly code: 'NETWORK' | 'API_ERROR' | 'PARSE_ERROR' | 'TIMEOUT',
    public readonly retryable: boolean,
  ) {
    super(message);
  }
}
```

- 网络错误 → 重试 3 次（指数退避）
- API 业务错误（`rc !== 0`）→ 不重试，直接抛
- 超时 30s → 重试 1 次
- 解析错误 → 不重试，抛原始数据以便调试

---

## 7. 技术指标层设计

### 7.1 设计原则

- 每个指标是一个**纯函数**: `(records: OHLCV[]) => number[]`
- OHLCV 输入格式: `{ open: number; high: number; low: number; close: number; volume: number }[]`
- 返回值: 与输入**等长**的数值数组，前 window-1 个位置为 `NaN`
- 所有计算使用原生 TypeScript，零外部依赖
- 行为与 Python 版 `simple.py` 完全一致

### 7.2 辅助函数

```typescript
// src/indicators/helpers.ts

/** 简单移动平均 */
export function sma(values: number[], window: number): number[];

/** 指数移动平均 (α=2/(window+1), adjust=false) */
export function ema(values: number[], window: number): number[];

/** Wilder 平滑 (α=1/window) */
export function wilderSmooth(values: number[], window: number): number[];

/** 滚动窗口计算 */
export function rolling<T>(arr: T[], window: number, fn: (win: T[]) => number): number[];

/** 滚动最高/最低 */
export function rollingMax(arr: number[], window: number): number[];
export function rollingMin(arr: number[], window: number): number[];
```

### 7.3 示例：RSI 实现

```typescript
// src/indicators/momentum.ts

export function rsi(records: OHLCV[], window: number = 14): number[] {
  const closes = records.map(r => r.close);
  const result = new Array<number>(records.length).fill(NaN);
  
  // 计算价格变化
  const deltas: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    deltas.push(closes[i] - closes[i - 1]);
  }
  
  // 分离涨跌
  const gains = deltas.map(d => d > 0 ? d : 0);
  const losses = deltas.map(d => d < 0 ? -d : 0);
  
  // Wilder 平滑
  const avgGain = wilderSmooth(gains, window);
  const avgLoss = wilderSmooth(losses, window);
  
  for (let i = 0; i < avgGain.length; i++) {
    const idx = i + window; // 偏移 window 个位置
    if (avgLoss[i] === 0) {
      result[idx] = 100;
    } else {
      const rs = avgGain[i] / avgLoss[i];
      result[idx] = 100 - 100 / (1 + rs);
    }
  }
  
  return result;
}
```

### 7.4 指标注册表

```typescript
// src/indicators/index.ts

export const INDICATOR_REGISTRY: Record<string, (records: OHLCV[], params: Record<string, number>) => number[]> = {
  SMA: (r, p) => sma(r.map(x => x.close), p.window ?? 20),
  EMA: (r, p) => ema(r.map(x => x.close), p.window ?? 20),
  RSI: (r, p) => rsi(r, p.window ?? 14),
  MACD: (r, p) => macd(r, p.fast ?? 12, p.slow ?? 26, p.signal ?? 9),
  BOLL: (r, p) => boll(r, p.window ?? 20, p.std ?? 2),
  // ... 共 34 个
};
```

---

## 8. MCP 工具定义

### 8.1 保持 100% 兼容

全部 9 个工具与 Python 版**完全一致**：
- 工具名使用 `snake_case`
- 参数名、类型、默认值完全一致
- 返回值格式完全一致（JSON 字符串，`orient="records"` 等价格式）

### 8.2 工具注册模式（对齐 Lyna tool-bridge）

```typescript
// src/tools/market-data.ts
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { MarketDataService } from '../services/market-data.js';
import { INDICATOR_NAMES } from '../indicators/index.js';

export function registerMarketDataTools(server: McpServer, service: MarketDataService) {
  
  server.registerTool(
    'get_hist_data',
    {
      description: "Get historical stock market data. 'eastmoney_direct' support all A,B,H shares",
      inputSchema: {
        symbol: z.string().describe("Stock symbol/ticker (e.g. '000001')"),
        interval: z.enum(['minute', 'hour', 'day', 'week', 'month', 'year']).default('day'),
        interval_multiplier: z.number().int().min(1).default(1),
        start_date: z.string().default('1970-01-01'),
        end_date: z.string().default('2030-12-31'),
        adjust: z.enum(['none', 'qfq', 'hfq']).default('none'),
        source: z.enum(['eastmoney', 'eastmoney_direct', 'sina']).default('eastmoney'),
        indicators_list: z.array(z.enum(INDICATOR_NAMES)).nullable().default(null),
        recent_n: z.number().int().min(1).nullable().default(100),
      },
    },
    async (args) => {
      const result = await service.getHistData(args);
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result) || '[]' }],
      };
    },
  );
}
```

### 8.3 所有工具参数一览

| 工具 | 关键参数 | 数据源选项 |
|------|----------|------------|
| `get_hist_data` | symbol, interval, interval_multiplier, start_date, end_date, adjust, source, indicators_list, recent_n | eastmoney, eastmoney_direct, sina |
| `get_realtime_data` | symbol?, source | eastmoney, eastmoney_direct, xueqiu |
| `get_news_data` | symbol, recent_n? | eastmoney |
| `get_balance_sheet` | symbol, recent_n? | sina |
| `get_income_statement` | symbol, recent_n? | sina |
| `get_cash_flow` | symbol, source?, recent_n? | sina |
| `get_inner_trade_data` | symbol | xueqiu |
| `get_financial_metrics` | symbol, recent_n? | eastmoney_direct |
| `get_time_info` | 无 | 新浪交易日历 |

---

## 9. 传输层设计

### 9.1 stdio 模式

```typescript
// src/server/stdio.ts
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const transport = new StdioServerTransport();
await server.connect(transport);
```

### 9.2 streamable-http 模式（Hono）

```typescript
// src/server/http.ts
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';

export function createHttpApp(server: McpServer) {
  const app = new Hono();
  
  app.use('/mcp/*', cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    exposeHeaders: ['mcp-session-id', 'mcp-protocol-version'],
    maxAge: 86400,
  }));
  
  // 创建 transport 并挂载
  const transport = new StreamableHTTPServerTransport({
    endpoint: '/mcp',
  });
  
  app.mount('/mcp', transport.requestHandler);
  // ... 连接 server
}
```

### 9.3 CLI 接口

```bash
# stdio 模式（默认）
akshare-mcp

# HTTP 模式
akshare-mcp --streamable-http --host 0.0.0.0 --port 8081
```

---

## 10. 项目目录结构

```
akshare-mcp-ts/
├── CLAUDE.md                          # 项目规范（已有）
├── package.json                       # 项目配置
├── tsconfig.json                      # TypeScript strict 配置
├── .gitignore
├── README.md
├── Dockerfile                         # 纯 Node.js（无 Python！）
│
├── docs/
│   └── architecture-design.md         # 本文档
│
├── src/
│   ├── main.ts                        # CLI 入口
│   ├── config.ts                      # 全局配置
│   │
│   ├── server/
│   │   ├── mcp-server.ts              # MCP Server 创建 + tool 注册
│   │   ├── stdio.ts                   # stdio 模式启动
│   │   └── http.ts                    # streamable-http 模式（Hono + CORS）
│   │
│   ├── tools/                         # Tool 定义 + Zod Schema
│   │   ├── index.ts                   # registerAllTools(server, services)
│   │   ├── market-data.ts             # get_hist_data, get_realtime_data
│   │   ├── news.ts                    # get_news_data
│   │   ├── financial.ts               # get_balance_sheet, get_income_statement, get_cash_flow
│   │   ├── analysis.ts                # get_inner_trade_data, get_financial_metrics
│   │   └── utility.ts                 # get_time_info
│   │
│   ├── services/                      # 业务编排层
│   │   ├── market-data.ts
│   │   ├── news.ts
│   │   ├── financial.ts
│   │   ├── analysis.ts
│   │   └── time.ts
│   │
│   ├── providers/                     # HTTP API 层（零 Python 依赖！）
│   │   ├── eastmoney.ts               # 东方财富 K线/实时/财务
│   │   ├── sina.ts                    # 新浪 K线/交易日历
│   │   └── xueqiu.ts                  # 雪球 实时/内部交易
│   │
│   ├── indicators/                    # 34 个技术指标（纯 TypeScript 数学）
│   │   ├── index.ts                   # 注册表 + 统一导出
│   │   ├── helpers.ts                 # SMA, EMA, Wilder, rolling 等辅助
│   │   ├── trend.ts                   # 趋势类指标
│   │   ├── momentum.ts                # 动量类指标
│   │   ├── volatility.ts              # 波动率类指标
│   │   ├── volume.ts                  # 成交量类指标
│   │   ├── aroon.ts                   # Aroon 指标
│   │   ├── directional.ts             # 方向性指标
│   │   ├── rate-of-change.ts          # 变化率指标
│   │   └── stats.ts                   # 其他统计指标
│   │
│   ├── calendar.ts                    # 交易日历
│   ├── cache.ts                       # 内存缓存（TTL + LRU）
│   │
│   └── types/                         # Zod Schema + TS 类型
│       ├── index.ts
│       ├── kline.ts                   # KlineRecord, OHLCV
│       ├── realtime.ts                # RealtimeRecord
│       ├── financial.ts               # FinancialRecord
│       ├── news.ts                    # NewsRecord
│       └── insider.ts                 # InsiderTradeRecord
│
├── tests/                             # 测试（Vitest）
│   ├── unit/
│   │   ├── indicators/                # 每个指标的单元测试（与 Python 版对比）
│   │   ├── providers/                 # HTTP mock 测试
│   │   └── services/                  # 服务层测试
│   ├── integration/                   # 集成测试（真实 HTTP 请求）
│   └── screenshots/                   # 截图（按需）
│
└── scripts/
    └── build.ts                       # 构建脚本
```

**对比 Python 版的关键差异**:
- ❌ 无 `sidecar/bridge.py` — 不依赖 Python
- ❌ 无 `requirements.txt` — 不依赖 Python
- ✅ 新增 `providers/` — 直接 HTTP 调用
- ✅ 新增 `indicators/` — 纯 TS 数学计算
- ✅ Dockerfile 纯 Node.js，镜像体积大幅缩小

---

## 11. 依赖项

### 11.1 生产依赖（仅 3 个！）

| 包 | 版本 | 用途 |
|----|------|------|
| `@modelcontextprotocol/sdk` | `^1.x` (latest) | MCP Server + Transport |
| `hono` | `^4.x` (latest) | HTTP 框架（streamable-http 模式） |
| `zod` | `^3.x` (latest) | 运行时校验 + 类型推导 |

### 11.2 零额外 HTTP 依赖

Node.js 22+ 内置 `fetch` API，不需要 `axios`、`node-fetch` 等额外包。

### 11.3 开发依赖

| 包 | 版本 | 用途 |
|----|------|------|
| `typescript` | `^5.x` (latest) | TypeScript 编译器 |
| `@types/node` | `^22.x` (latest) | Node.js 类型 |
| `vitest` | `^4.x` (latest) | 测试框架 |
| `eslint` | `^9.x` (latest) | Lint |
| `prettier` | latest | 代码格式化 |
| `tsx` | latest | TypeScript 执行（开发/调试） |

### 11.4 对齐 Lyna

| 核心包 | Lyna 版本 | 本项目 | 一致？ |
|--------|-----------|--------|--------|
| `@modelcontextprotocol/sdk` | `^1.29.0` | latest | ✅ |
| `hono` | `^4.7.4` | latest | ✅ |
| `zod` | `^3.23.0` | latest | ✅ |
| `typescript` | `^5.9.3` | latest | ✅ |
| `vitest` | `^4.1.9` | latest | ✅ |

---

## 12. 与 Lyna 技术栈对齐

| 关注点 | Lyna Playwright MCP | AKShare MCP TS | 关系 |
|--------|---------------------|----------------|------|
| **MCP SDK** | `@modelcontextprotocol/sdk` | 同 | ✅ 完全相同 |
| **HTTP 框架** | Hono | Hono | ✅ 完全相同 |
| **校验** | Zod | Zod | ✅ 完全相同 |
| **传输类型** | stdio + streamableHttp + SSE | stdio + streamableHttp | ✅ 子集 |
| **Sidecar** | Node.js sidecar (Playwright) | **不需要** | 更简单 |
| **工具注册** | `McpToolBridge.buildTool()` | `server.registerTool()` | ✅ 同 SDK |
| **错误分类** | 5 类错误码 | 同 5 类 | ✅ 对齐 |
| **CORS** | `exposeHeaders: mcp-session-id, mcp-protocol-version` | 同 | ✅ 对齐 |
| **数据来源** | Playwright 浏览器 | 东方财富/新浪 HTTP API | 不同但模式一致 |

### 12.1 比 Lyna 更简单的地方

Lyna 的 MCP 系统是多租户 SaaS 架构，需要：
- `BridgeClientTransport`（跨网络 stdio 桥接）
- `McpManager`（用户级连接池、keep-alive、指数退避重连）
- Marketplace 权限管理

本项目是**独立 MCP Server**，不需要这些。只需要：
- stdio 模式：一个进程，一个 Server
- HTTP 模式：Hono + StreamableHTTP transport
- 无多租户、无桥接、无桌面端集成

---

## 13. 实施路线图

### Phase 1: 基础框架 + 1 个端到端工具（Day 1-3）

**目标**: 跑通全链路

- [ ] 项目初始化: `package.json`, `tsconfig.json` (strict), ESLint, Prettier
- [ ] MCP Server 骨架: stdio 模式可用
- [ ] `EastMoneyProvider.fetchKline()` — 第一个 HTTP API 调用
- [ ] `get_time_info` 工具 — 最简工具，验证 Zod → MCP Tool → HTTP → JSON 全链路
- [ ] `TradingCalendar` 实现（调新浪 API 或静态内置）

**验证标准**: `echo '{"method":"tools/call","params":{"name":"get_time_info"}}' | npx tsx src/main.ts` 正确返回 JSON

### Phase 2: 行情工具 + 技术指标引擎（Day 4-8）

**目标**: 最复杂的 `get_hist_data` 完全可用

- [ ] 东方财富 K 线 API 完整实现（所有 klt/fqt 组合 + secid 映射）
- [ ] 新浪 K 线 API（作为 source=sina 的备选）
- [ ] 辅助函数: `sma()`, `ema()`, `wilderSmooth()`, `rolling()`
- [ ] 第一批指标 (10 个): SMA, EMA, MACD, RSI, BOLL, ATR, CCI, WILLR, MOM, OBV
- [ ] 第二批指标 (12 个): ADX, STOCH, AD, ADOSC, SAR, APO, PPO, ROC, ROCP, ROCR, ROCR100, TSF
- [ ] 第三批指标 (12 个): AROON, AROONOSC, BOP, CMO, DX, MFI, MINUS_DI, MINUS_DM, PLUS_DI, PLUS_DM, TRIX, ULTOSC
- [ ] `get_realtime_data` (东方财富实时行情)
- [ ] `get_hist_data` 完整实现 + 单元测试
- [ ] 指标计算结果与 Python 版**交叉验证**

**验证标准**: 对同一股票、同一参数，TypeScript 版的指标输出与 Python 版误差 < 0.0001

### Phase 3: 财务 + 新闻工具（Day 9-11）

- [ ] 东方财富财务报表 API (`RPT_DMSK_FN_*`)
- [ ] `get_balance_sheet`, `get_income_statement`, `get_cash_flow`
- [ ] `get_financial_metrics` — 三表合并
- [ ] 雪球内部交易 API（含 Cookie 鉴权）
- [ ] `get_inner_trade_data`
- [ ] 东方财富新闻 API
- [ ] `get_news_data`
- [ ] 各工具的单元测试

### Phase 4: HTTP 模式 + 缓存 + 交付（Day 12-14）

- [ ] Hono + StreamableHTTP transport + CORS
- [ ] 内存缓存层（行情类数据 TTL 30s，财报类 TTL 1h）
- [ ] Dockerfile（纯 Node.js 22-slim）
- [ ] `README.md` + 使用文档
- [ ] npm 发布配置（`bin` 入口）
- [ ] 集成测试（真实网络请求，标记 `@integration`）

### Phase 5: 可选扩展（未来）

- [ ] 16 个数据函数中当前未暴露的 7 个（期货/期权/基本信息）
- [ ] 雪球实时行情（需要 token 管理）
- [ ] Redis 缓存替代内存缓存
- [ ] Prometheus metrics
- [ ] Lyna 插件市场注册（`mcp.json` + `meta.json`）

---

## 附录 A: 风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 东方财富 API 变更 | 数据中断 | 集成测试覆盖；支持新浪备选源 |
| 新浪 API 限流/关闭 | 部分功能不可用 | 多数据源切换；默认用东方财富直连 |
| 雪球 API 鉴权升级 | 内部交易数据不可用 | 实现 Cookie 自动刷新；降级提示 |
| 技术指标计算偏差 | 数据与 Python 版不一致 | 交叉验证测试，误差控制在 0.0001 |
| 34 个指标实现量大 | 开发周期延长 | 分三批交付；核心 10 个先行 |
| 交易日历 API 不可用 | `get_time_info` 失效 | 静态内置最近 5 年交易日历作为 fallback |

---

## 附录 B: 与 Python Sidecar 方案的对比

| 维度 | 纯 TypeScript（本文档） | Python Sidecar（已废弃） |
|------|------------------------|--------------------------|
| Python 依赖 | ❌ 零依赖 | ✅ 需要 Python 3.12+ |
| Node.js 依赖 | ✅ 仅需 Node.js 22+ | ✅ 需要 |
| 部署复杂度 | **低**（单运行时） | 高（双运行时） |
| Docker 镜像 | **node:22-slim (~150MB)** | node + python (~500MB+) |
| HTTP 请求 | 直接调用（更快） | 通过进程间通信（慢） |
| 技术指标 | TypeScript 实现 | 通过 sidecar 调 Python |
| 代码可维护性 | **高**（单一语言） | 中（跨语言调试） |
| 上游更新跟进 | 需手动跟进 | 自动受益（pip upgrade） |
| 开发工作量 | 中（~14 天） | 低（~7 天） |
| 长期总成本 | **低** | 高（双运行时维护） |

---

> **下一步**: 请评审此设计文档。确认无 P0 问题后，按 Phase 1 开始实施。
