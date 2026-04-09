// Detects volatility compression (probability stagnation)
export function analyzeVolatilityCompression(market: any, options: any = {}) {
  const signals: any[] = [];
  const minStagnantDays = options.minStagnantDays || 7;
  const maxRange = options.maxRange || 0.04;

  if (!market || !market.outcomes || !Array.isArray(market.outcomes)) return { marketId: market?.id, signals };

  for (const outcome of market.outcomes) {
    if (!Array.isArray(outcome.history) || outcome.history.length < minStagnantDays) continue;
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
