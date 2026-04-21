import { normalizeQuickSwapTickerToMarket } from '../../normalizers/normalizeQuickSwap';
import fetch from 'node-fetch';

export async function fetchQuickSwapEvents(): Promise<any[]> {
  const url = 'https://api.coingecko.com/api/v3/exchanges/quickswap/tickers';
  const res = await fetch(url);
  const data = await res.json();
  if (!data.tickers) return [];
  return data.tickers.slice(0, 50).map((ticker: any, idx: number) => {
    const market = normalizeQuickSwapTickerToMarket(ticker, idx);
    const syntheticResolution = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
    return {
      id: `quickswap_event_${idx}`,
      title: `${ticker.base}/${ticker.target} on QuickSwap`,
      markets: [
        {
          ...market,
          outcomePrices: JSON.stringify([1, ticker.last]),
          resolutionDate: market.resolutionDate || syntheticResolution,
          endDate: market.endDate || syntheticResolution,
          endDateIso: market.endDateIso || syntheticResolution,
          endTime: market.endTime || syntheticResolution
        }
      ],
      tags: ['quickswap', 'dex', 'polygon', ticker.base.toLowerCase(), ticker.target.toLowerCase()]
    };
  });
}
