# AKShare MCP Server

<div align="center">

**纯 TypeScript 实现的中国 A 股市场数据 MCP 服务器**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D22-green)](https://nodejs.org/)
[![MCP](https://img.shields.io/badge/MCP-SDK%201.29-purple)](https://modelcontextprotocol.io/)

</div>

---

## 概述

**akshare-mcp** 是一个基于 [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) 的服务器，为 AI 助手（如 Claude Desktop、VS Code Copilot）提供中国 A 股市场金融数据访问能力。

**核心特点**：与 Python 版 [akshare-one-mcp](https://github.com/zwldarren/akshare-one-mcp) 功能兼容，但使用 **纯 TypeScript 实现，零 Python 依赖**。

### 与 Python 版的区别

| 维度 | Python 版 | TypeScript 版 |
|------|-----------|---------------|
| 语言 | Python 3.12+ | **TypeScript 5.x** |
| 运行时 | CPython | **Node.js 22+** |
| 数据源 | 通过 `akshare-one` 库 | **直接调用 HTTP API** |
| Python 依赖 | ❌ 必需 | ✅ 零依赖 |
| 技术指标 | pandas 计算 | **纯 TS 数学实现** |
| 部署 | Python + pip/uv | **单 Node.js 进程** |
| 镜像大小 | ~500MB | **~150MB** |
| MCP 工具数 | 9 | **12**（含股东/基金持股） |

---

## 功能特性

### 📊 市场数据（3 个工具）
- **历史 K 线** — 日/周/月/分钟级，支持前/后复权，多数据源
- **实时行情** — 最新价、涨跌幅、市值、PE/PB
- **34 种技术指标** — SMA/EMA/MACD/RSI/BOLL/ATR/CCI/ADX/MFI 等

### 💰 财务报表（4 个工具）
- **资产负债表** — 总资产、固定资产、货币资金、存货、负债
- **利润表** — 营业收入、营业成本、营业利润、净利润
- **现金流量表** — 经营/投资/筹资现金流
- **财务指标** — 三表合并关键指标

### 👥 股东数据（3 个工具）
- **十大股东** — 排名、持股数、持股比例、变动详情
- **十大流通股东** — 类型分类（基金/QFII/券商/保险）
- **基金持股** — **全量**（不限于前10），1000+ 条记录

### 📰 其他（2 个工具）
- **个股新闻** — 东方财富新闻搜索
- **内部交易** — 董监高增/减持记录
- **时间信息** — 当前时间 + 最近交易日

---

## 安装

### 前提条件

- [Node.js](https://nodejs.org/) >= 22
- （可选）[Bun](https://bun.sh/) 用于开发

### 通过 npm 安装

```bash
npm install -g akshare-mcp
```

### 从源码安装

```bash
git clone https://github.com/terrysun1216/akshare-mcp-ts.git
cd akshare-mcp-ts
npm install
npm run build
```

---

## 使用

### Claude Desktop 集成

在 Claude Desktop 配置文件中添加：

```json
{
  "mcpServers": {
    "akshare-mcp": {
      "command": "npx",
      "args": ["akshare-mcp"]
    }
  }
}
```

或在 VS Code Copilot 中：

```json
{
  "mcpServers": {
    "akshare-mcp": {
      "command": "npx",
      "args": ["tsx", "/path/to/akshare-mcp-ts/src/main.ts"]
    }
  }
}
```

### 命令行

```bash
# stdio 模式（默认，供 MCP 客户端使用）
akshare-mcp

# HTTP 模式（供远程/Web 客户端使用）
akshare-mcp --streamable-http --port 8081
```

### 示例对话

配置后，在 Claude 中可以这样对话：

> "帮我查看贵州茅台 600519 最近 30 天的日线走势和 MACD 指标"

> "贵州茅台最新的十大股东是谁？持股市值多少？"

> "对比一下 600519 和 000858 的 PE、ROE 等财务指标"

> "有哪些基金重仓持有了贵州茅台？"

---

## MCP 工具列表

| # | 工具名 | 描述 | 数据源 |
|---|--------|------|--------|
| 1 | `get_time_info` | 当前时间、时间戳、最近交易日 | 新浪 |
| 2 | `get_hist_data` | 历史 K 线数据 + 34种技术指标 | 东方财富/新浪 |
| 3 | `get_realtime_data` | 实时行情（价格/涨跌/市值/PE/PB） | 东方财富 |
| 4 | `get_news_data` | 个股新闻 | 东方财富 |
| 5 | `get_balance_sheet` | 资产负债表 | 东方财富 |
| 6 | `get_income_statement` | 利润表 | 东方财富 |
| 7 | `get_cash_flow` | 现金流量表 | 东方财富 |
| 8 | `get_financial_metrics` | 三大报表合并关键指标 | 东方财富 |
| 9 | `get_inner_trade_data` | 董监高内部交易 | 雪球 |
| 10 | `get_top10_shareholders` | 十大股东 + 十大流通股东 | 东方财富 F10 |
| 11 | `get_top10_free_shareholders` | 十大流通股东明细 | 东方财富 F10 |
| 12 | `get_fund_holdings` | 基金持股明细（全量） | 新浪财经 |

### 34 种技术指标

| 类别 | 指标 |
|------|------|
| 趋势 | SMA, EMA, MACD, APO, PPO, TRIX, ULTOSC |
| 动量 | RSI, CCI, ADX, DX, MFI, MOM, CMO, WILLR |
| 波动率 | BOLL, ATR, SAR |
| 成交量 | OBV, AD, ADOSC |
| 方向 | PLUS_DI, PLUS_DM, MINUS_DI, MINUS_DM |
| 变化率 | ROC, ROCP, ROCR, ROCR100 |
| 其他 | AROON, AROONOSC, BOP, STOCH, TSF |

---

## 架构

```
                  ┌─────────────────────────┐
                  │    MCP Client            │
                  │  (Claude Desktop / VS Code) │
                  └──────┬──────────────────┘
                         │ JSON-RPC (stdio / HTTP)
                  ┌──────┴──────────────────┐
                  │    MCP Server Layer      │
                  │  @modelcontextprotocol/   │
                  │  sdk + Hono + Zod        │
                  ├──────────────────────────┤
                  │    Service Layer         │
                  │  行情 / 财务 / 股东 / 新闻  │
                  ├──────────────────────────┤
       ┌──────────┼──────────┬──────────────┤
       │          │          │              │
  ┌────┴───┐ ┌───┴────┐ ┌───┴───┐ ┌───────┴──┐
  │东方财富 │ │ 新浪   │ │ 雪球  │ │ 指标引擎 │
  │ HTTP   │ │ HTTP   │ │ HTTP  │ │ 34 函数  │
  └────────┘ └────────┘ └───────┘ └──────────┘
```

**数据流向**：MCP Client → JSON-RPC → MCP Server → Service → HTTP Provider → 东方财富/新浪/雪球公开 API

**零 Python 依赖**：直接从 TypeScript 调用各数据源的公开 HTTP 接口，使用 Node.js 内置 `fetch` API。

---

## 技术栈

| 包 | 版本 | 用途 |
|----|------|------|
| `@modelcontextprotocol/sdk` | ^1.29 | MCP 协议实现 |
| `hono` | ^4.12 | HTTP 框架 |
| `zod` | ^4.4 | 参数校验 + 类型推导 |
| `typescript` | ^5.9 | 类型系统 |
| `vitest` | ^4.1 | 测试框架 |

**仅 3 个生产依赖**，与 [Lyna](https://github.com/terrysun1216/lyna) 项目使用完全相同的技术栈。

---

## 开发

```bash
# 安装依赖
npm install

# 开发运行（stdio 模式）
npm run dev

# 开发运行（HTTP 模式）
npm run dev:http

# 运行测试
npm test

# 编译
npm run build
```

### 项目结构

```
src/
├── main.ts              # CLI 入口
├── config.ts            # 全局配置
├── calendar.ts          # 交易日历
├── server/              # MCP Server (stdio + HTTP)
├── tools/               # 12 个 MCP 工具定义
├── services/            # 业务逻辑层
├── providers/           # HTTP API 层（东方财富/新浪/雪球/F10）
├── indicators/          # 34 个技术指标纯函数
└── types/               # Zod Schema + TS 类型
```

### 测试

全部 13 个 E2E 测试通过，使用真实数据验证：

```bash
npm test                    # 单元测试
npx tsx tests/e2e-all-tools.test.ts  # 端到端测试
```

---

## 许可证

MIT © Terry

---

## 致谢

- [AKShare](https://github.com/akfamily/akshare) — 底层数据源研究和参考
- [akshare-one-mcp](https://github.com/zwldarren/akshare-one-mcp) — Python 版 MCP 参考实现
- [Lyna](https://github.com/terrysun1216/lyna) — TypeScript MCP 架构参考
