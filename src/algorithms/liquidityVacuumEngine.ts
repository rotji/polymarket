// Detects liquidity vacuum distortions
export function analyzeLiquidityVacuum(markets: any[]) {
  const signals = [];
  for (const market of markets) {
    if (!market.outcomes || market.outcomes.length < 2) continue;
    for (let i = 0; i < market.outcomes.length; i++) {
      const o = market.outcomes[i];
      if (o.priceChangeAbs && o.priceChangeAbs > 0.15 && o.volume < 500) {
        signals.push({
          marketId: market.id,
          marketTitle: market.title,
          outcome: o.title,
          price: o.price,
          priceChangeAbs: o.priceChangeAbs,
          volume: o.volume,
          reason: 'Liquidity vacuum: sharp price move with low volume',
        });
      }
      if (o.bestAsk && o.bestBid && (o.bestAsk - o.bestBid) > 0.10) {
        signals.push({
          marketId: market.id,
          marketTitle: market.title,
          outcome: o.title,
          price: o.price,
          bestBid: o.bestBid,
          bestAsk: o.bestAsk,
          reason: 'Liquidity vacuum: large orderbook gap',
        });
      }
    }
  }
  return signals;
}
