// Normalizes raw crypto market/orderbook data to platform format

// Normalizes Binance market and orderbook data to platform format
export function normalizeCrypto(market: any, orderbook: any) {
  return {
    id: market.id,
    base: market.base,
    quote: market.quote,
    status: market.status,
    type: market.type,
    bids: orderbook && orderbook.bids ? orderbook.bids.map((b: any) => ({ price: b.price, qty: b.qty })) : [],
    asks: orderbook && orderbook.asks ? orderbook.asks.map((a: any) => ({ price: a.price, qty: a.qty })) : [],
    // Add more normalized fields as needed
  };
}
