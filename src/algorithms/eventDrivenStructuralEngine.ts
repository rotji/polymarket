// Algorithm 9: Event-Driven Structural Trading
// Detects structural distortions that appear right after major news or data releases
// Usage: analyzeEventDrivenStructural(events, options)

/**
 * Detects structural inconsistencies that appear after a news event or data release.
 * @param events Array of normalized event objects (with markets, prices, timestamps)
 * @param options { eventTimestamp?: number, windowMinutes?: number, debug?: boolean }
 * @returns Array of detected distortions with context
 */
export function analyzeEventDrivenStructural(events: any[], options: any = {}) {
  const results: any[] = [];
  const eventTimestamp = options.eventTimestamp || null; // Unix ms
  const windowMinutes = options.windowMinutes || 60; // How long after event to scan
  const debug = options.debug || false;

  if (!eventTimestamp) {
    if (debug) console.warn('No eventTimestamp provided to event-driven algorithm.');
    return [];
  }

  // Only consider markets updated after the event
  const windowStart = eventTimestamp;
  const windowEnd = eventTimestamp + windowMinutes * 60 * 1000;

  for (const event of events) {
    if (!event.markets) continue;
    for (const market of event.markets) {
      // Assume market.lastUpdated is a Unix ms timestamp
      if (!market.lastUpdated || market.lastUpdated < windowStart || market.lastUpdated > windowEnd) continue;
      // Check for structural inconsistencies (reuse existing logic or simple checks)
      // Example: For binary, P(YES) + P(NO) != 1
      if (market.outcomes && market.outcomes.length === 2) {
        const yes = parseFloat(market.outcomes[0].price);
        const no = parseFloat(market.outcomes[1].price);
        if (Math.abs(yes + no - 1) > 0.05) {
          results.push({
            type: 'BINARY_INCONSISTENCY',
            event: event.title || event.id,
            market: market.question || market.id,
            yes, no,
            lastUpdated: market.lastUpdated,
            message: `Binary market sum mismatch after event: YES+NO=${(yes+no).toFixed(2)}`
          });
        }
      }
      // Add more structure checks as needed (ladder, bucket, etc.)
      // ...
    }
  }

  if (debug && results.length === 0) {
    console.log('No event-driven structural distortions detected in window.');
  }

  return results;
}
