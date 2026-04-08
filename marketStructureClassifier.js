// marketStructureClassifier.js
// Auto-classifies Polymarket markets into structural types for algorithm routing

/**
 * Market structure types
 */
export const MarketStructureType = {
  BINARY: 'BINARY',
  TIMING_BUCKET: 'TIMING_BUCKET',
  EXACT_RANGE: 'EXACT_RANGE',
  THRESHOLD_LADDER: 'THRESHOLD_LADDER',
  RANKING: 'RANKING',
  INDICATOR: 'INDICATOR',
  DEPENDENCY: 'DEPENDENCY',
  UNKNOWN: 'UNKNOWN',
};

/**
 * Classifies a market object into a structural type.
 * @param {Object} market - Market object with at least a title/question and outcomes
 * @returns {string} MarketStructureType
 */
export function classifyMarketStructure(market) {
  const title = (market.title || market.question || '').toLowerCase();
  const outcomes = market.outcomes || [];

  // Binary
  if (outcomes.length === 2 && outcomes.every(o => /yes|no/i.test(o.name))) {
    return MarketStructureType.BINARY;
  }

  // Timing bucket
  if (/by (jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|\d{4})|before \d{4}/i.test(title)) {
    return MarketStructureType.TIMING_BUCKET;
  }

  // Exact range
  if (/between|range|\d+\s*[-–]\s*\d+/.test(title)) {
    return MarketStructureType.EXACT_RANGE;
  }

  // Threshold ladder
  if (/above|reach|exceed/.test(title)) {
    return MarketStructureType.THRESHOLD_LADDER;
  }

  // Ranking
  if (/best|most|highest|winner/.test(title)) {
    return MarketStructureType.RANKING;
  }

  // Indicator
  if (/temperature|rainfall|inflation|gdp|interest rate/.test(title)) {
    return MarketStructureType.INDICATOR;
  }

  // Dependency (handled at event group level, not single market)
  // If market is part of a group with related events, can be flagged externally

  return MarketStructureType.UNKNOWN;
}

/**
 * Example batch classifier for a list of markets
 * @param {Array} markets
 * @returns {Array} Array of {market, structureType}
 */
export function classifyMarkets(markets) {
  return markets.map(market => ({
    market,
    structureType: classifyMarketStructure(market),
  }));
}
