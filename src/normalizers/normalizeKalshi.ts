// Normalize Kalshi raw data to universal market format
import type { NormalizedMarket } from '../types/market';

export function normalizeKalshi(raw: any): NormalizedMarket {
  return {
    source: 'kalshi',
    exchangeMarketId: raw.ticker || raw.id || '',
    eventGroupId: raw.event_ticker || '',
    title: raw.title || '',
    structureHint: raw.market_type || '',
    outcomes: [
      {
        yes_bid: raw.yes_bid || null,
        yes_ask: raw.yes_ask || null,
        no_bid: raw.no_bid || null,
        no_ask: raw.no_ask || null,
        last_price: raw.last_price || null,
      }
    ],
    volume: raw.volume || 0,
    spread: (raw.yes_ask && raw.yes_bid) ? Math.abs(raw.yes_ask - raw.yes_bid) : 0,
    resolutionDate: raw.expiration || raw.close_time || '',
  };
}
