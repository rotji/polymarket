// Fetch Kalshi events from public API, matching Polymarket pattern

import fetch from 'node-fetch';
import { normalizeKalshi } from '../../normalizers/normalizeKalshi.ts';

export async function fetchEvents() {
  const url = 'https://trading-api.kalshi.com/trade-api/v2/markets/list?status=active';
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Kalshi API error: ${res.status}`);
  const data = await res.json();
  // Normalize each Kalshi market to the universal format
  if (typeof data === 'object' && data !== null && 'markets' in data && Array.isArray((data as any).markets)) {
    return ((data as any).markets).map(normalizeKalshi);
  }
  return [];
}
