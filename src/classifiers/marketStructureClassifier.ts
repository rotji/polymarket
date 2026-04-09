// Auto-classifies markets into structural types for algorithm routing

export const MarketStructureType = {
  BINARY: 'BINARY',
  TIMING_BUCKET: 'TIMING_BUCKET',
  EXACT_RANGE: 'EXACT_RANGE',
  THRESHOLD_LADDER: 'THRESHOLD_LADDER',
  RANKING: 'RANKING',
  INDICATOR: 'INDICATOR',
  DEPENDENCY: 'DEPENDENCY',
  UNKNOWN: 'UNKNOWN',
} as const;

type MarketStructureTypeKey = keyof typeof MarketStructureType;

export function classifyMarketStructure(market: { title?: string; question?: string; outcomes?: any[] }): typeof MarketStructureType[keyof typeof MarketStructureType] {
  const title = (market.title || market.question || '').toLowerCase();
  const outcomes = market.outcomes || [];

  if (outcomes.length === 2 && outcomes.every(o => /yes|no/i.test(o.name))) {
    return MarketStructureType.BINARY;
  }
  if (/by (jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|\d{4})|before \d{4}/i.test(title)) {
    return MarketStructureType.TIMING_BUCKET;
  }
  if (/between|range|\d+\s*[-–]\s*\d+/.test(title)) {
    return MarketStructureType.EXACT_RANGE;
  }
  if (/above|reach|exceed/.test(title)) {
    return MarketStructureType.THRESHOLD_LADDER;
  }
  if (/best|most|highest|winner/.test(title)) {
    return MarketStructureType.RANKING;
  }
  if (/temperature|rainfall|inflation|gdp|interest rate/.test(title)) {
    return MarketStructureType.INDICATOR;
  }
  return MarketStructureType.UNKNOWN;
}

export function classifyMarkets(markets: any[]): { market: any; structureType: typeof MarketStructureType[keyof typeof MarketStructureType] }[] {
  return markets.map(market => ({
    market,
    structureType: classifyMarketStructure(market),
  }));
}
