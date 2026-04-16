/**
 * Event-Centric Opportunity Engine
 *
 * Detects intra- and cross-exchange opportunities around major events.
 * Modular, scalable, and can be extended to more exchanges or event types.
 */

import type { CalendarEvent, EventGroup, Market } from './anticipationAlgorithm';

export interface EventCluster {
  event: CalendarEvent;
  exchange: string;
  markets: Market[];
}

export interface IntraExchangeOpportunity {
  type: 'INTRA_EXCHANGE_EVENT_OPPORTUNITY';
  exchange: string;
  event: string;
  details: string;
  markets: Market[];
}

export interface CrossExchangeOpportunity {
  type: 'CROSS_EXCHANGE_EVENT_OPPORTUNITY';
  event: string;
  exchanges: [string, string];
  details: string;
  marketsA: Market[];
  marketsB: Market[];
}

/**
 * Cluster markets by event for each exchange
 */
export function clusterMarketsByEvent(
  calendar: CalendarEvent[],
  exchangeMarkets: Record<string, Market[]>
): EventCluster[] {
  const clusters: EventCluster[] = [];
  for (const exchange in exchangeMarkets) {
    for (const event of calendar) {
      // Match by tags or event name in market title/tags
      const relatedMarkets = exchangeMarkets[exchange].filter(m => {
        const tags = (m.tags || []).map(t => t.toLowerCase());
        const title = (m.title || m.question || '').toLowerCase();
        return (
          (event.tags && event.tags.some(tag => tags.includes(tag))) ||
          (event.name && title.includes(event.name.toLowerCase()))
        );
      });
      if (relatedMarkets.length > 0) {
        clusters.push({ event, exchange, markets: relatedMarkets });
      }
    }
  }
  return clusters;
}

/**
 * Analyze intra-exchange opportunities for each event cluster
 */
export function analyzeIntraExchangeOpportunities(
  clusters: EventCluster[],
  options: { contradictionThreshold?: number } = {}
): IntraExchangeOpportunity[] {
  const results: IntraExchangeOpportunity[] = [];
  const contradictionThreshold = options.contradictionThreshold ?? 0.2;
  for (const cluster of clusters) {
    // Example: look for wide price spread or contradictory sentiment
    const yesPrices = cluster.markets.map(m => m.outcomes[0]?.price).filter(p => typeof p === 'number');
    const min = Math.min(...yesPrices);
    const max = Math.max(...yesPrices);
    if (max - min > contradictionThreshold) {
      results.push({
        type: 'INTRA_EXCHANGE_EVENT_OPPORTUNITY',
        exchange: cluster.exchange,
        event: cluster.event.name,
        details: `Wide price spread (${(min*100).toFixed(1)}% - ${(max*100).toFixed(1)}%) among related markets`,
        markets: cluster.markets
      });
    }
  }
  return results;
}

/**
 * Analyze cross-exchange opportunities for each event
 */
export function analyzeCrossExchangeEventOpportunities(
  clusters: EventCluster[],
  options: { divergenceThreshold?: number } = {}
): CrossExchangeOpportunity[] {
  const results: CrossExchangeOpportunity[] = [];
  const events = Array.from(new Set(clusters.map(c => c.event.name)));
  const divergenceThreshold = options.divergenceThreshold ?? 0.15;
  for (const eventName of events) {
    const eventClusters = clusters.filter(c => c.event.name === eventName);
    for (let i = 0; i < eventClusters.length; ++i) {
      for (let j = i + 1; j < eventClusters.length; ++j) {
        const a = eventClusters[i];
        const b = eventClusters[j];
        // Compare average YES price
        const avgA = average(a.markets.map(m => m.outcomes[0]?.price));
        const avgB = average(b.markets.map(m => m.outcomes[0]?.price));
        if (Math.abs(avgA - avgB) > divergenceThreshold) {
          results.push({
            type: 'CROSS_EXCHANGE_EVENT_OPPORTUNITY',
            event: eventName,
            exchanges: [a.exchange, b.exchange],
            details: `Divergence in average YES price: ${(avgA*100).toFixed(1)}% vs ${(avgB*100).toFixed(1)}%`,
            marketsA: a.markets,
            marketsB: b.markets
          });
        }
      }
    }
  }
  return results;
}

function average(arr: (number|undefined)[]): number {
  const nums = arr.filter((x): x is number => typeof x === 'number');
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}
