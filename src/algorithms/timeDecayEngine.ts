// Engine for detecting time decay mispricing
export function analyzeTimeDecay(market: any, options: any = {}) {
  const signals: any[] = [];
  if (!market || !market.outcomes || !Array.isArray(market.outcomes)) return { marketId: market?.id, signals };

  const timeOutcomes = market.outcomes
    .map((o: any, i: number) => {
      const dateMatch = o.name.match(/(\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.? \d{4}|\d{4})/i);
      return {
        index: i,
        name: o.name,
        price: o.price,
        date: dateMatch ? new Date(dateMatch[0]) : null
      };
    })
    .filter((o: any) => o.date && typeof o.price === 'number');

  if (timeOutcomes.length < 2) return { marketId: market.id, signals };

  timeOutcomes.sort((a: any, b: any) => a.date - b.date);

  for (let i = 1; i < timeOutcomes.length; i++) {
    if (timeOutcomes[i].price > timeOutcomes[i - 1].price + 0.03) {
      signals.push({
        from: timeOutcomes[i - 1],
        to: timeOutcomes[i],
        message: `Time decay violation: Probability increases from ${timeOutcomes[i - 1].name} (${(timeOutcomes[i - 1].price * 100).toFixed(1)}%) to ${timeOutcomes[i].name} (${(timeOutcomes[i].price * 100).toFixed(1)}%)`
      });
    }
  }

  return { marketId: market.id, signals };
}
