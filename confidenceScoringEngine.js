// confidenceScoringEngine.js
// Assigns a confidence score to each TRADE or WATCHLIST signal based on structural strength, probability zone, liquidity, spread, and multi-engine confirmation.

/**
 * Computes a confidence score for a market signal.
 * @param {Object} signal - The signal object from the scanner (must include s3, execution, action, etc.)
 * @returns {number} Confidence score (0-100)
 */
export function computeConfidenceScore(signal) {
  let score = 0;

  // 1. Structural Score (0-40)
  if (signal.s3 && signal.s3.dds) {
    // DDS spike ratio
    const ratio = signal.s3.dds;
    if (ratio >= 5) score += 40;
    else if (ratio >= 4) score += 30;
    else if (ratio >= 3) score += 20;
    else if (ratio >= 2) score += 10;
  } else if (signal.s3 && signal.s3.kink) {
    // Threshold ladder kink
    score += 25;
  }

  // 2. Probability Zone Score (0-20)
  if (signal.s3 && signal.s3.spike && signal.s3.spike.yes >= 0.3 && signal.s3.spike.yes <= 0.6) {
    score += 20;
  } else if (signal.s3 && signal.s3.spike && (signal.s3.spike.yes >= 0.2 && signal.s3.spike.yes < 0.3)) {
    score += 10;
  } else if (signal.s3 && signal.s3.spike && (signal.s3.spike.yes > 0.6 && signal.s3.spike.yes <= 0.7)) {
    score += 10;
  } else if (signal.s3 && signal.s3.spike && (signal.s3.spike.yes < 0.2 || signal.s3.spike.yes > 0.8)) {
    score += 3;
  }

  // 3. Liquidity Score (0-15)
  const volume = signal.s3 && signal.s3.spike ? signal.s3.spike.volume : (signal.execution?.entryRaw ? signal.execution.entryRaw * 1000000 : 0);
  if (volume > 1000000) score += 15;
  else if (volume > 200000) score += 10;
  else if (volume > 50000) score += 5;
  else if (volume > 0) score += 1;

  // 4. Spread Score (0-10)
  // If spread info is available, use it; otherwise, skip
  if (signal.s3 && signal.s3.spike && typeof signal.s3.spike.spread === 'number') {
    const spread = signal.s3.spike.spread;
    if (spread < 0.02) score += 10;
    else if (spread < 0.05) score += 6;
    else if (spread < 0.1) score += 3;
  }

  // 5. Multi-Engine Confirmation Score (0-15)
  // If more than one engine detected a signal, boost score
  if (signal.s3 && signal.s3.multiEngine) {
    if (signal.s3.multiEngine === 2) score += 10;
    else if (signal.s3.multiEngine >= 3) score += 15;
    else score += 5;
  }

  // Clamp score to 100
  return Math.min(100, Math.round(score));
}

/**
 * Annotates a list of signals with confidence scores.
 * @param {Array} signals
 * @returns {Array} signals with .confidenceScore
 */
export function scoreSignals(signals) {
  return signals.map(signal => ({
    ...signal,
    confidenceScore: computeConfidenceScore(signal)
  }));
}
