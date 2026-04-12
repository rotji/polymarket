// Fetch Kalshi events from public API, matching Polymarket pattern
import fetch from 'node-fetch';

export async function fetchEvents() {
  const url = 'https://trading-api.kalshi.com/trade-api/v2/markets/list?status=active';
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Kalshi API error: ${res.status}`);
  const data = await res.json();
  // Kalshi returns { markets: [...] }
  // For now, return the raw markets array. Mapping can be added if needed.
  return data.markets;
}
