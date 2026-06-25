/**
 * 时间服务
 */

import { getLastTradingDay } from '../calendar.js';

export interface TimeInfo {
  iso_format: string;
  timestamp: number;
  last_trading_day: string | null;
}

export async function getTimeInfo(): Promise<TimeInfo> {
  const localTime = new Date();
  const lastTradingDay = await getLastTradingDay(localTime);

  return {
    iso_format: localTime.toISOString(),
    timestamp: localTime.getTime(),
    last_trading_day: lastTradingDay,
  };
}
