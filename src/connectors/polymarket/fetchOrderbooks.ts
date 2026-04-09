// Fetches orderbook data for a list of markets from the Polymarket API
import fetch from 'node-fetch';

const GAMMA_API = 'https://gamma-api.polymarket.com';

async function fetchOrderbook(marketId: string): Promise<any | null> {
  const url = `${GAMMA_API}/markets/${marketId}/orderbook`;
  const res = await fetch(url);
  if (!res.ok) return null;
  return res.json();
}

export async function fetchOrderbooksForMarkets(markets: any[], concurrency = 5): Promise<Record<string, any>> {
  const orderbookMap: Record<string, any> = {};
  let completed = 0;
  const total = markets.length;
  const queue = markets.slice();

  async function worker() {
    while (queue.length > 0) {
      const m = queue.shift();
      if (!m || !m.id) continue;
      try {
        const ob = await fetchOrderbook(m.id);
        if (ob) orderbookMap[m.id] = ob;
      } catch {}
      completed++;
      if (completed % 10 === 0 || completed === total) {
        console.log(`[Orderbook fetch] ${completed}/${total} complete`);
      }
    }
  }

  const workers = [];
  for (let i = 0; i < concurrency; ++i) {
    workers.push(worker());
  }
  await Promise.all(workers);
  return orderbookMap;
}
