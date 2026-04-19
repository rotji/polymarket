// Fetches orderbook data for crypto markets

import fetch from 'node-fetch';

// Fetches orderbook data for given Binance market symbols

export async function fetchOrderbooks(marketIds: string[]) {
  const results: Record<string, { bids?: { price: number; qty: number }[]; asks?: { price: number; qty: number }[]; error?: string }> = {};
  for (const symbol of marketIds) {
    const url = `https://api.binance.com/api/v3/depth?symbol=${symbol}&limit=20`;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Failed to fetch orderbook for ${symbol}`);
      const data = await res.json() as any;
      results[symbol] = {
        bids: data.bids.map(([price, qty]: [string, string]) => ({ price: parseFloat(price), qty: parseFloat(qty) })),
        asks: data.asks.map(([price, qty]: [string, string]) => ({ price: parseFloat(price), qty: parseFloat(qty) })),
      };
    } catch (err) {
      results[symbol] = { error: (err as Error).message };
    }
  }
  return results;
}
