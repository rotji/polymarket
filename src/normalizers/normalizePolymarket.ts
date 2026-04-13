// Normalize Polymarket raw data to universal market format
import type { NormalizedMarket } from '../types/market';

export function normalizePolymarket(raw: any): NormalizedMarket {
  // TODO: Implement normalization logic
  return {
    source: 'polymarket',
    exchangeMarketId: raw.id,
    eventGroupId: raw.eventGroupId || '',
    title: raw.title,
    structureHint: '',
    outcomes: raw.outcomes || [],
    volume: raw.volume || 0,
    spread: raw.spread || 0,
    resolutionDate: raw.resolutionDate || '',
  };
}
