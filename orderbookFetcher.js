// orderbookFetcher.js
// Fetches orderbook data for a list of markets from the Polymarket API
// Exports: fetchOrderbooksForMarkets(markets) => Promise<orderbookMap>

import fetch from "node-fetch";

const GAMMA_API = "https://gamma-api.polymarket.com";

/**
 * Fetch orderbook for a single market by ID
 * @param {string} marketId
 * @returns {Promise<Object>} Orderbook data
 */
async function fetchOrderbook(marketId) {
  const url = `${GAMMA_API}/markets/${marketId}/orderbook`;
  const res = await fetch(url);
  if (!res.ok) return null;
  return res.json();
}

/**
 * Fetch orderbooks for all markets in the provided array
 * @param {Array} markets - Array of market objects (must have .id)
 * @returns {Promise<Object>} Map of marketId -> orderbook
 */

export async function fetchOrderbooksForMarkets(markets, concurrency = 5) {
  const orderbookMap = {};
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

  // Start N workers
  const workers = [];
  for (let i = 0; i < concurrency; ++i) {
    workers.push(worker());
  }
  await Promise.all(workers);
  return orderbookMap;
}
