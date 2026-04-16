// Engine for detecting cross-exchange arbitrage opportunities
// This engine compares normalized markets across different exchanges for price discrepancies.

export interface CrossExchangeArbSignal {
  exchangeA: string;
  exchangeB: string;
  marketA: any;
  marketB: any;
  priceA: number;
  priceB: number;
  diff: number;
  message: string;
}

export function analyzeCrossExchangeArb(
  allExchangesMarkets: Record<string, any[]>,
  options: { minDiff?: number } = {}
): CrossExchangeArbSignal[] {
  const minDiff = options.minDiff ?? 0.05; // 5% default threshold
  const signals: CrossExchangeArbSignal[] = [];
  const exchanges = Object.keys(allExchangesMarkets);

  // Compare every pair of exchanges
  for (let i = 0; i < exchanges.length; i++) {
    for (let j = i + 1; j < exchanges.length; j++) {
      const exA = exchanges[i];
      const exB = exchanges[j];
      const marketsA = allExchangesMarkets[exA];
      const marketsB = allExchangesMarkets[exB];

      // Naive: match markets by identical question text (can be improved)
      for (const marketA of marketsA) {
        for (const marketB of marketsB) {
          if (
            marketA.question &&
            marketB.question &&
            marketA.question.trim().toLowerCase() === marketB.question.trim().toLowerCase()
          ) {
            const priceA = marketA.price ?? marketA.probability;
            const priceB = marketB.price ?? marketB.probability;
            if (
              typeof priceA === 'number' &&
              typeof priceB === 'number' &&
              Math.abs(priceA - priceB) >= minDiff
            ) {
              signals.push({
                exchangeA: exA,
                exchangeB: exB,
                marketA,
                marketB,
                priceA,
                priceB,
                diff: priceA - priceB,
                message: `Cross-exchange arbitrage: ${marketA.question} (${exA}: ${(priceA * 100).toFixed(1)}% vs ${exB}: ${(priceB * 100).toFixed(1)}%)`
              });
            }
          }
        }
      }
    }
  }
  return signals;
}
