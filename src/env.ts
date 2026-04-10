// Loads environment variables from .env
import dotenv from 'dotenv';
dotenv.config();

export const POLYMARKET_API = process.env.POLYMARKET_API || 'https://gamma-api.polymarket.com';
export const KALSHI_API = process.env.KALSHI_API || 'https://trading-api.kalshi.com';
export const MANIFOLD_API = process.env.MANIFOLD_API || 'https://api.manifold.markets';
export const STOCKS_API = process.env.STOCKS_API || 'https://api.example.com/stocks';
export const CURRENCIES_API = process.env.CURRENCIES_API || 'https://api.example.com/currencies';
export const BONDS_API = process.env.BONDS_API || 'https://api.example.com/bonds';
export const ORDERBOOK_THROTTLE = Number(process.env.ORDERBOOK_THROTTLE) || 5;
export const EVENT_LIMIT = Number(process.env.EVENT_LIMIT) || 200;
export const DEBUG = process.env.DEBUG === 'true';
