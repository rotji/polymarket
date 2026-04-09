// Engine for detecting event dependency distortions
export function analyzeEventDependency(events: any[], options: any = {}) {
  const signals = [];
  const minDiff = options.minDiff || 0.10;

  const dependencyPairs = [
    {
      trigger: /ethereum etf approved/i,
      dependent: /ethereum (above|over|reach|hit|price)/i
    },
    {
      trigger: /bitcoin etf approved/i,
      dependent: /bitcoin (above|over|reach|hit|price)/i
    },
  ];

  for (const pair of dependencyPairs) {
    const triggers = [];
    const dependents = [];
    for (const event of events) {
      if (!event.markets) continue;
      for (const m of event.markets) {
        if (pair.trigger.test(m.question)) {
          triggers.push({ event, market: m });
        }
        if (pair.dependent.test(m.question)) {
          dependents.push({ event, market: m });
        }
      }
    }
    for (const t of triggers) {
      const tProb = Array.isArray(t.market.outcomes) && t.market.outcomes[0] ? t.market.outcomes[0].price : null;
      if (tProb == null) continue;
      for (const d of dependents) {
        const dProb = Array.isArray(d.market.outcomes) && d.market.outcomes[0] ? d.market.outcomes[0].price : null;
        if (dProb == null) continue;
        if (tProb > 0.6 && dProb < 0.5 && tProb - dProb > minDiff) {
          signals.push({
            eventA: t.event.title || t.event.slug || "Untitled",
            marketA: t.market.question,
            probA: tProb,
            eventB: d.event.title || d.event.slug || "Untitled",
            marketB: d.market.question,
            probB: dProb,
            message: `Event dependency distortion: ${t.market.question} (${(tProb * 100).toFixed(1)}%) >> ${d.market.question} (${(dProb * 100).toFixed(1)}%)`
          });
        }
      }
    }
  }

  return signals;
}
