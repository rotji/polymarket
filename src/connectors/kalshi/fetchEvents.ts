// Fetch Kalshi events from public API, matching Polymarket pattern

import fetch from 'node-fetch';
import { normalizeKalshi } from '../../normalizers/normalizeKalshi.ts';

export async function fetchEvents() {
  const url = 'https://trading-api.kalshi.com/trade-api/v2/markets/list?status=active';
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Kalshi API error: ${res.status}`);
  const data = await res.json();
  // Normalize each Kalshi market to the universal format
  return (data.markets || []).map(normalizeKalshi);
}
