// Engine for analyzing threshold ladder markets
export function analyzeThresholdLadder(market: any, options: any = {}) {
  const signals: any[] = [];
  if (!market || !market.outcomes || !Array.isArray(market.outcomes)) return { marketId: market?.id, signals };

  const { outcomes } = market;
  const defaultThreshold = 0.08;
  const threshold = options.threshold || defaultThreshold;

  for (let i = 1; i < outcomes.length - 1; i++) {
    const prev = outcomes[i - 1]?.price;
    const curr = outcomes[i]?.price;
    const next = outcomes[i + 1]?.price;
    if (prev == null || curr == null || next == null) continue;
    const avgNeighbors = (prev + next) / 2;
    const deviation = Math.abs(curr - avgNeighbors);
    if (deviation > threshold) {
      signals.push({
        outcomeIndex: i,
        outcomeName: outcomes[i].name,
        price: curr,
        avgNeighbors,
        deviation,
        message: `Threshold ladder distortion: ${outcomes[i].name} price deviates by ${(deviation * 100).toFixed(2)}% from neighbors.`
      });
    }
  }

  return { marketId: market.id, signals };
}
