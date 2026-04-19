import { fetchMarkets } from './src/connectors/crypto/fetchMarkets';
import { fetchOrderbooks } from './src/connectors/crypto/fetchOrderbooks';
import { normalizeCrypto } from './src/normalizers/normalizeCrypto';

(async () => {
  try {
    // Fetch first market
    const markets = await fetchMarkets();
    const market = markets[0];
    // Fetch orderbook for that market
    const orderbooks = await fetchOrderbooks([market.id]);
    const orderbook = orderbooks[market.id];
    // Normalize
    const normalized = normalizeCrypto(market, orderbook);
    console.log('Normalized market:', normalized);
  } catch (err) {
    console.error('Error normalizing crypto market:', err);
  }
})();
