export interface Ticker {
  base: string;
  target: string;
  last: number;
  converted_volume: { usd: number };
  market: { name: string };
}

export function normalizeTraderJoeTickerToMarket(ticker: Ticker, idx: number) {
  const syntheticResolution = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
  return {
    id: `traderjoe_${ticker.base}_${ticker.target}_${idx}`,
    question: `${ticker.base}/${ticker.target} on TraderJoe`,
    title: `${ticker.base}/${ticker.target}`,
    outcomes: [
      { price: 1 },
      { price: ticker.last }
    ],
    volume: ticker.converted_volume.usd,
    tags: [ticker.market.name, 'traderjoe', 'dex', 'avalanche'],
    resolutionDate: syntheticResolution,
    endDate: syntheticResolution,
    endDateIso: syntheticResolution,
    endTime: syntheticResolution
  };
}
