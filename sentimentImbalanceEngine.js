// sentimentImbalanceEngine.js
// Detects sentiment imbalance (optimism/pessimism bias) in threshold ladders and similar markets
// Exports analyzeSentimentImbalance(events, options) => [{ marketTitle, ladder, message, type, details }]

/**
 * Analyze markets for sentiment imbalance (optimism/pessimism bias).
 * Looks for ladders where probabilities decline too slowly (optimism) or too quickly (pessimism).
 * @param {Array} events - Array of event objects from Polymarket API
 * @param {Object} [options] - Optional config (e.g., minSteps, minBias)
 * @returns {Array} Array of signal objects
 */
export function analyzeSentimentImbalance(events, options = {}) {
  const minSteps = options.minSteps || 3;
  const minBias = options.minBias || 0.10; // 10% average step bias
  const signals = [];

  for (const event of events) {
    if (!event.markets || event.markets.length < minSteps) continue;
    // Only consider threshold ladder or similar markets
    const ladderMarkets = event.markets.filter(m => /above|over|reach|hit|price|cap|FDV|\$/.test(m.question));
    if (ladderMarkets.length < minSteps) continue;
    // Sort by threshold value if possible (extract number from question)
    const sorted = ladderMarkets.slice().sort((a, b) => {
      const na = +(a.question.match(/\d+[\.,]?\d*/g) || [0])[0];
      const nb = +(b.question.match(/\d+[\.,]?\d*/g) || [0])[0];
      return na - nb;
    });
    const probs = sorted.map(m => {
      const prices = Array.isArray(m.outcomes) && m.outcomes[0] ? [m.outcomes[0].price] : JSON.parse(m.outcomePrices || '[0]');
      return prices[0] || 0;
    });
    if (probs.length < minSteps) continue;
    // Compute average step
    let totalStep = 0, steps = 0;
    for (let i = 1; i < probs.length; ++i) {
      totalStep += probs[i-1] - probs[i];
      steps++;
    }
    const avgStep = steps ? totalStep / steps : 0;
    // Optimism bias: steps are too small (probabilities decline slowly)
    if (avgStep < minBias) {
      signals.push({
        marketTitle: event.title || event.slug || 'Untitled',
        ladder: sorted.map(m => m.question),
        message: `Optimism bias: probabilities decline slowly across ladder (avg step ${(avgStep*100).toFixed(1)}%)`,
        type: 'optimism',
        details: { avgStep, probs }
      });
    }
    // Pessimism bias: steps are too large (probabilities drop off sharply)
    if (avgStep > 0.5) {
      signals.push({
        marketTitle: event.title || event.slug || 'Untitled',
        ladder: sorted.map(m => m.question),
        message: `Pessimism bias: probabilities drop off sharply across ladder (avg step ${(avgStep*100).toFixed(1)}%)`,
        type: 'pessimism',
        details: { avgStep, probs }
      });
    }
  }
  return signals;
}
