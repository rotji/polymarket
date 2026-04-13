// Kalshi market/event fetcher
// This module fetches markets and events from Kalshi's public API

import fetch from 'node-fetch';
import { loadPrivateKeyFromFile, getKalshiAuthHeaders } from './kalshiAuth.ts';

export interface KalshiMarket {
  id: string;
  ticker: string;
  title: string;
  status: string;
  open_time: string;
  close_time: string;
  // Add more fields as needed
}

export async function fetchKalshiMarkets(): Promise<KalshiMarket[]> {
  const url = 'https://trading-api.kalshi.com/trade-api/v2/markets/list?status=active';
  const keyId = process.env.KALSHI_KEY_ID;
  const privateKeyPath = process.env.KALSHI_PRIVATE_KEY_PATH;
  if (!keyId) throw new Error('KALSHI_KEY_ID not set in .env');
  if (!privateKeyPath) throw new Error('KALSHI_PRIVATE_KEY_PATH not set in .env');
  const privateKeyPem = loadPrivateKeyFromFile(privateKeyPath);
  // Path for signing must not include query params
  const apiPath = '/trade-api/v2/markets/list';
  const headers = getKalshiAuthHeaders({
    keyId,
    privateKeyPem,
    method: 'GET',
    path: apiPath
  });
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`Kalshi API error: ${res.status}`);
  const data = await res.json();
  // Kalshi returns { markets: [...] }
  if (typeof data === 'object' && data !== null && 'markets' in data && Array.isArray((data as any).markets)) {
    return (data as any).markets as KalshiMarket[];
  }
  return [];
}
