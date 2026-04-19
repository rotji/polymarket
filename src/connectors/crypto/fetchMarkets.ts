// Fetches crypto market listings from major exchanges

import fetch from 'node-fetch';

// Fetches crypto market listings from Binance
export async function fetchMarkets() {
  const url = 'https://api.binance.com/api/v3/exchangeInfo';
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch Binance markets');
  const data = await res.json() as any;
  // Map Binance symbols to a normalized format
  return data.symbols.map((s: any) => ({
    id: s.symbol,
    base: s.baseAsset,
    quote: s.quoteAsset,
    status: s.status,
    type: s.contractType || 'SPOT',
    filters: s.filters,
  }));
}
