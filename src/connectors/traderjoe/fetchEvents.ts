import { normalizeTraderJoeTickerToMarket } from '../../normalizers/normalizeTraderJoe';
import fetch from 'node-fetch';

export async function fetchTraderJoeEvents(): Promise<any[]> {
  const url = 'https://api.coingecko.com/api/v3/exchanges/traderjoe/tickers';
  const res = await fetch(url);
  const data = await res.json();
  if (!data.tickers) return [];
  return data.tickers.slice(0, 50).map((ticker: any, idx: number) => {
    const market = normalizeTraderJoeTickerToMarket(ticker, idx);
    const syntheticResolution = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
    return {
      id: `traderjoe_event_${idx}`,
      title: `${ticker.base}/${ticker.target} on TraderJoe`,
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
      tags: ['traderjoe', 'dex', 'avalanche', ticker.base.toLowerCase(), ticker.target.toLowerCase()]
    };
  });
}
