import { fetchOrderbooks } from './src/connectors/crypto/fetchOrderbooks';

type Orderbook = {
  bids?: { price: number; qty: number }[];
  asks?: { price: number; qty: number }[];
  error?: string;
};

(async () => {
  try {
    // Example: Fetch orderbook for ETHBTC and BTCUSDT
    const symbols = ['ETHBTC', 'BTCUSDT'];
    const orderbooks: Record<string, Orderbook> = await fetchOrderbooks(symbols);
    for (const symbol of symbols) {
      console.log(`Orderbook for ${symbol}:`);
      if (orderbooks[symbol].error) {
        console.error('  Error:', orderbooks[symbol].error);
      } else {
        console.log('  Top 5 bids:', orderbooks[symbol].bids ? orderbooks[symbol].bids.slice(0, 5) : []);
        console.log('  Top 5 asks:', orderbooks[symbol].asks ? orderbooks[symbol].asks.slice(0, 5) : []);
      }
    }
  } catch (err) {
    console.error('Error fetching orderbooks:', err);
  }
})();
