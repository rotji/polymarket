// Detects sentiment imbalance (optimism/pessimism bias)
export function analyzeSentimentImbalance(events: any[], options: any = {}) {
  const minSteps = options.minSteps || 3;
  const minBias = options.minBias || 0.10;
  const signals = [];

  for (const event of events) {
    if (!event.markets || event.markets.length < minSteps) continue;
    const ladderMarkets = event.markets.filter((m: any) => /above|over|reach|hit|price|cap|FDV|\$/.test(m.question));
    if (ladderMarkets.length < minSteps) continue;
    const sorted = ladderMarkets.slice().sort((a: any, b: any) => {
      const na = +(a.question.match(/\d+[\.,]?\d*/g) || [0])[0];
      const nb = +(b.question.match(/\d+[\.,]?\d*/g) || [0])[0];
      return na - nb;
    });
    const probs = sorted.map((m: any) => {
      const prices = Array.isArray(m.outcomes) && m.outcomes[0] ? [m.outcomes[0].price] : JSON.parse(m.outcomePrices || '[0]');
      return prices[0] || 0;
    });
    if (probs.length < minSteps) continue;
    let totalStep = 0, steps = 0;
    for (let i = 1; i < probs.length; ++i) {
      totalStep += probs[i-1] - probs[i];
      steps++;
    }
    const avgStep = steps ? totalStep / steps : 0;
    if (avgStep < minBias) {
      signals.push({
        marketTitle: event.title || event.slug || 'Untitled',
        ladder: sorted.map((m: any) => m.question),
        message: `Optimism bias: probabilities decline slowly across ladder (avg step ${(avgStep*100).toFixed(1)}%)`,
        type: 'optimism',
        details: { avgStep, probs }
      });
    }
    if (avgStep > 0.5) {
      signals.push({
        marketTitle: event.title || event.slug || 'Untitled',
        ladder: sorted.map((m: any) => m.question),
        message: `Pessimism bias: probabilities drop off sharply across ladder (avg step ${(avgStep*100).toFixed(1)}%)`,
        type: 'pessimism',
        details: { avgStep, probs }
      });
    }
  }
  return signals;
}
