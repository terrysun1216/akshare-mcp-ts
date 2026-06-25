/** 全局配置 */
export const config = {
  /** HTTP 默认超时 (ms) */
  httpTimeout: 30000,
  /** 行情数据缓存 TTL (ms) */
  quoteCacheTTL: 30_000,
  /** 财务数据缓存 TTL (ms) */
  financialCacheTTL: 3600_000,
  /** HTTP 模式默认端口 */
  defaultPort: 8081,
  /** HTTP 模式默认 host */
  defaultHost: '0.0.0.0',
};
