import { fetchMarkets } from './src/connectors/crypto/fetchMarkets';

(async () => {
  try {
    const markets = await fetchMarkets();
    console.log('Fetched markets:', markets.slice(0, 5)); // Show first 5 for brevity
  } catch (err) {
    console.error('Error fetching markets:', err);
  }
})();
