// volatilityCompressionEngine.js
// Detects volatility compression (probability stagnation) in prediction markets

/**
 * Analyzes a market for volatility compression (prolonged low volatility in outcome probabilities).
 * @param {Object} market - Market object with outcomes and historical price data
 * @param {Object} [options] - Optional config (e.g., minStagnantDays, maxRange)
 * @returns {Object} { marketId, signals: [...] }
 */
export function analyzeVolatilityCompression(market, options = {}) {
  const signals = [];
  const minStagnantDays = options.minStagnantDays || 7; // Minimum days of stagnation
  const maxRange = options.maxRange || 0.04; // Max allowed range (e.g., 4%)

  if (!market || !market.outcomes || !Array.isArray(market.outcomes)) return { marketId: market?.id, signals };

  for (const outcome of market.outcomes) {
    // Assume outcome.history is an array of {date, price}
    if (!Array.isArray(outcome.history) || outcome.history.length < minStagnantDays) continue;
    // Check if price stayed within maxRange for minStagnantDays
    let stagnant = true;
    let min = outcome.history[0].price;
    let max = outcome.history[0].price;
    for (let i = 1; i < outcome.history.length; i++) {
      const p = outcome.history[i].price;
      if (p < min) min = p;
      if (p > max) max = p;
      if (max - min > maxRange) {
        stagnant = false;
        break;
      }
    }
    if (stagnant) {
      signals.push({
        outcome: outcome.name,
        min,
        max,
        days: outcome.history.length,
        message: `Volatility compression: ${outcome.name} probability stagnated in ${(min*100).toFixed(1)}%–${(max*100).toFixed(1)}% for ${outcome.history.length} days.`
      });
    }
  }

  return { marketId: market.id, signals };
}
