import { useState, useEffect, useCallback, useRef } from 'react';
import { StockQuote } from '../types';
import { fetchQuotes, finnhubWS, hasApiKey } from '../lib/finnhub';

// Fallback prices used when API key is not configured
const FALLBACK_PRICES: Record<string, number> = {
  AAPL: 189.84, GOOGL: 175.12, MSFT: 420.55, META: 515.30, AMZN: 195.40,
  NVDA: 875.60, XOM: 118.45, CVX: 158.90, COP: 112.30, SLB: 47.80,
  BP: 34.20, OXY: 62.15, JPM: 198.40, BAC: 38.90, GS: 485.70,
  MS: 102.30, V: 278.50, MA: 472.80, WFC: 57.20, JNJ: 155.60,
  PFE: 27.80, UNH: 520.40, ABBV: 172.30, MRK: 128.90, LLY: 768.20,
  COIN: 245.80, MSTR: 1580.40, MARA: 18.60, RIOT: 10.25, CLSK: 14.80,
  TSLA: 245.60, NKE: 94.30, SBUX: 79.50, MCD: 295.40, DIS: 112.80,
  NFLX: 628.90, PLTR: 25.40, SOFI: 8.90, AFRM: 42.30, UPST: 27.80,
  HOOD: 21.45, SPY: 545.80, QQQ: 470.20, ARKK: 48.90, IWM: 205.60,
  SOXL: 38.70,
};

const priceCache: Record<string, { price: number; prevClose: number; volume: number; lastUpdate: number }> = {};
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

function prunePriceCache() {
  const cutoff = Date.now() - CACHE_TTL;
  for (const key of Object.keys(priceCache)) {
    if (priceCache[key].lastUpdate < cutoff) delete priceCache[key];
  }
}

function mockQuote(symbol: string): StockQuote {
  const base = FALLBACK_PRICES[symbol] ?? 100;
  const cached = priceCache[symbol];
  const now = Date.now();
  let price: number;
  if (cached && now - cached.lastUpdate < 4000) {
    price = cached.price;
  } else {
    const drift = (Math.random() - 0.49) * base * 0.003;
    price = cached ? Math.max(cached.price + drift, base * 0.8) : base * (1 + (Math.random() - 0.5) * 0.02);
    priceCache[symbol] = { price, prevClose: base, volume: Math.floor(Math.random() * 5e7) + 1e6, lastUpdate: now };
  }
  const change = parseFloat((price - base).toFixed(2));
  return {
    symbol,
    price: parseFloat(price.toFixed(2)),
    change,
    changePercent: parseFloat(((change / base) * 100).toFixed(2)),
    volume: priceCache[symbol]?.volume ?? 1e7,
  };
}

export function useMarketData(symbols: string[]) {
  const [quotes, setQuotes] = useState<Record<string, StockQuote>>({});
  const [loading, setLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);
  const symbolKey = symbols.join(',');
  const liveRef = useRef<Record<string, number>>({});

  // Load initial quotes from REST API
  const loadFromApi = useCallback(async () => {
    if (!hasApiKey()) {
      // No API key — use mock data
      const mock: Record<string, StockQuote> = {};
      symbols.forEach(s => { mock[s] = mockQuote(s); });
      setQuotes(mock);
      setLoading(false);
      return false;
    }

    try {
      const data = await fetchQuotes(symbols);
      if (Object.keys(data).length === 0) return false;

      const built: Record<string, StockQuote> = {};
      symbols.forEach(sym => {
        const q = data[sym];
        if (q && q.c > 0) {
          const vol = q.v && q.v > 0 ? q.v : priceCache[sym]?.volume ?? 1e7;
          priceCache[sym] = { price: q.c, prevClose: q.pc ?? q.c, volume: vol, lastUpdate: Date.now() };
          built[sym] = {
            symbol: sym,
            price: q.c,
            change: parseFloat(q.d.toFixed(2)),
            changePercent: parseFloat(q.dp.toFixed(2)),
            volume: vol,
            high52w: q.h,
            low52w: q.l,
          };
          liveRef.current[sym] = q.c;
        } else {
          built[sym] = mockQuote(sym);
        }
      });
      setQuotes(built);
      setLoading(false);
      setIsLive(true);
      return true;
    } catch {
      return false;
    }
  }, [symbolKey]);

  // Subscribe to WebSocket for real-time price updates
  useEffect(() => {
    if (!hasApiKey() || symbols.length === 0) {
      // Mock refresh every 4s when no API key
      const interval = setInterval(() => {
        const mock: Record<string, StockQuote> = {};
        symbols.forEach(s => { mock[s] = mockQuote(s); });
        setQuotes(mock);
      }, 4000);
      return () => clearInterval(interval);
    }

    // Initial REST fetch
    loadFromApi();

    // WebSocket subscriptions for live price ticks
    const handlers: Record<string, (p: number) => void> = {};
    symbols.forEach(sym => {
      const handler = (price: number) => {
        liveRef.current[sym] = price;
        setQuotes(prev => {
          const prevQ = prev[sym];
          if (!prevQ) return prev;
          const prevClose = prevQ.price - prevQ.change;
          const change = parseFloat((price - prevClose).toFixed(2));
          return {
            ...prev,
            [sym]: {
              ...prevQ,
              price: parseFloat(price.toFixed(2)),
              change,
              changePercent: parseFloat(((change / prevClose) * 100).toFixed(2)),
            },
          };
        });
      };
      handlers[sym] = handler;
      finnhubWS.subscribe(sym, handler);
    });

    // REST refresh every 30s as fallback
    const refreshInterval = setInterval(() => {
      prunePriceCache();
      loadFromApi();
    }, 30000);

    return () => {
      symbols.forEach(sym => finnhubWS.unsubscribe(sym, handlers[sym]));
      clearInterval(refreshInterval);
    };
  }, [symbolKey, loadFromApi]);

  return { quotes, loading, isLive };
}
