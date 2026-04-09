// Engine for detecting cross-market arbitrage probability violations
export function analyzeCrossMarketArb(events: any[], options: any = {}) {
  const signals = [];
  const minDiff = options.minDiff || 0.03;

  const ladders: any[] = [];
  for (const event of events) {
    if (!event.markets) continue;
    for (const m of event.markets) {
      const match = m.question.match(/\$?([0-9,.]+)[kmb]?/i);
      if (match) {
        let value = parseFloat(match[1].replace(/,/g, ""));
        if (/k/i.test(match[0])) value *= 1e3;
        if (/m/i.test(match[0])) value *= 1e6;
        if (/b/i.test(match[0])) value *= 1e9;
        ladders.push({
          eventId: event.id,
          marketId: m.id,
          question: m.question,
          value,
          price: Array.isArray(m.outcomes) && m.outcomes[0] ? m.outcomes[0].price : null,
          eventTitle: event.title || event.slug || "Untitled"
        });
      }
    }
  }

  const byTitle: Record<string, any[]> = {};
  for (const m of ladders) {
    const key = m.eventTitle.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    if (!byTitle[key]) byTitle[key] = [];
    byTitle[key].push(m);
  }

  for (const group of Object.values(byTitle)) {
    group.sort((a, b) => a.value - b.value);
    for (let i = 1; i < group.length; i++) {
      const prev = group[i - 1];
      const curr = group[i];
      if (prev.price == null || curr.price == null) continue;
      if (curr.price > prev.price + minDiff) {
        signals.push({
          marketA: prev,
          marketB: curr,
          message: `Cross-market arbitrage: ${curr.question} (${(curr.price * 100).toFixed(1)}%) > ${prev.question} (${(prev.price * 100).toFixed(1)}%)`
        });
      }
    }
  }

  return signals;
}
