// Assigns a confidence score to each signal
export function computeConfidenceScore(signal: any): number {
  let score = 0;
  if (signal.s3 && signal.s3.dds) {
    const ratio = signal.s3.dds;
    if (ratio >= 5) score += 40;
    else if (ratio >= 4) score += 30;
    else if (ratio >= 3) score += 20;
    else if (ratio >= 2) score += 10;
  } else if (signal.s3 && signal.s3.kink) {
    score += 25;
  }
  if (signal.s3 && signal.s3.spike && signal.s3.spike.yes >= 0.3 && signal.s3.spike.yes <= 0.6) {
    score += 20;
  } else if (signal.s3 && signal.s3.spike && (signal.s3.spike.yes >= 0.2 && signal.s3.spike.yes < 0.3)) {
    score += 10;
  } else if (signal.s3 && signal.s3.spike && (signal.s3.spike.yes > 0.6 && signal.s3.spike.yes <= 0.7)) {
    score += 10;
  } else if (signal.s3 && signal.s3.spike && (signal.s3.spike.yes < 0.2 || signal.s3.spike.yes > 0.8)) {
    score += 3;
  }
  const volume = signal.s3 && signal.s3.spike ? signal.s3.spike.volume : (signal.execution?.entryRaw ? signal.execution.entryRaw * 1000000 : 0);
  if (volume > 1000000) score += 15;
  else if (volume > 200000) score += 10;
  else if (volume > 50000) score += 5;
  else if (volume > 0) score += 1;
  if (signal.s3 && signal.s3.spike && typeof signal.s3.spike.spread === 'number') {
    const spread = signal.s3.spike.spread;
    if (spread < 0.02) score += 10;
    else if (spread < 0.05) score += 6;
    else if (spread < 0.1) score += 3;
  }
  if (signal.s3 && signal.s3.multiEngine) {
    if (signal.s3.multiEngine === 2) score += 10;
    else if (signal.s3.multiEngine >= 3) score += 15;
    else score += 5;
  }
  return Math.min(100, Math.round(score));
}

export function scoreSignals(signals: any[]): any[] {
  return signals.map(signal => ({
    ...signal,
    confidenceScore: computeConfidenceScore(signal)
  }));
}
