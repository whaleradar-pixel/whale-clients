const API_KEY = import.meta.env.VITE_FINNHUB_API_KEY || '';
const BASE_URL = 'https://finnhub.io/api/v1';

export interface FinnhubQuote {
  c: number;  // current price
  d: number;  // change
  dp: number; // change percent
  h: number;  // high
  l: number;  // low
  o: number;  // open
  pc: number; // prev close
  v?: number;
}

export interface FinnhubProfile {
  name: string;
  ticker: string;
  exchange: string;
  marketCapitalization: number;
  shareOutstanding: number;
}

export async function fetchQuote(symbol: string): Promise<FinnhubQuote | null> {
  if (!API_KEY) return null;
  try {
    const res = await fetch(`${BASE_URL}/quote?symbol=${symbol}&token=${API_KEY}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function fetchQuotes(symbols: string[]): Promise<Record<string, FinnhubQuote>> {
  if (!API_KEY) return {};
  const results: Record<string, FinnhubQuote> = {};
  const chunks: string[][] = [];
  for (let i = 0; i < symbols.length; i += 10) chunks.push(symbols.slice(i, i + 10));
  for (const chunk of chunks) {
    await Promise.all(chunk.map(async (sym) => {
      const q = await fetchQuote(sym);
      if (q && q.c > 0) results[sym] = q;
    }));
    if (chunks.length > 1) await new Promise(r => setTimeout(r, 200));
  }
  return results;
}

const RECONNECT_DELAYS = [2000, 5000, 10000, 30000]; // exponential backoff steps

export class FinnhubWebSocket {
  private ws: WebSocket | null = null;
  private subscribers = new Map<string, Set<(price: number) => void>>();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private connected = false;
  private destroyed = false;
  private reconnectAttempt = 0;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private lastPong = Date.now();

  constructor(private apiKey: string) {}

  private connect() {
    if (!this.apiKey || this.destroyed) return;

    // Clear any existing reconnect timer
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    try {
      this.ws = new WebSocket(`wss://ws.finnhub.io?token=${this.apiKey}`);

      this.ws.onopen = () => {
        this.connected = true;
        this.reconnectAttempt = 0;
        this.lastPong = Date.now();

        // Re-subscribe all active symbols
        this.subscribers.forEach((_, symbol) => {
          this.ws?.send(JSON.stringify({ type: 'subscribe', symbol }));
        });

        // Start ping/health check every 30s
        this.startPing();
      };

      this.ws.onmessage = (e) => {
        this.lastPong = Date.now();
        try {
          const data = JSON.parse(e.data);
          if (data.type === 'trade' && data.data) {
            data.data.forEach((trade: { s: string; p: number }) => {
              const cbs = this.subscribers.get(trade.s);
              if (cbs) cbs.forEach(cb => cb(trade.p));
            });
          }
        } catch { /* ignore parse errors */ }
      };

      this.ws.onclose = () => {
        this.connected = false;
        this.stopPing();
        this.scheduleReconnect();
      };

      this.ws.onerror = () => {
        // onclose fires right after onerror, so no need to reconnect here
        this.ws?.close();
      };
    } catch {
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.destroyed || this.subscribers.size === 0) return;
    const delay = RECONNECT_DELAYS[Math.min(this.reconnectAttempt, RECONNECT_DELAYS.length - 1)];
    this.reconnectAttempt++;
    this.reconnectTimer = setTimeout(() => this.connect(), delay);
  }

  private startPing() {
    this.stopPing();
    // Check every 30s that we're still receiving messages — if stale for 60s, reconnect
    this.pingTimer = setInterval(() => {
      if (Date.now() - this.lastPong > 60_000) {
        this.ws?.close();
      }
    }, 30_000);
  }

  private stopPing() {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  subscribe(symbol: string, callback: (price: number) => void) {
    if (!this.subscribers.has(symbol)) {
      this.subscribers.set(symbol, new Set());
      if (this.connected) {
        this.ws?.send(JSON.stringify({ type: 'subscribe', symbol }));
      }
    }
    this.subscribers.get(symbol)!.add(callback);

    // Connect if not already connected or connecting
    if (!this.ws || this.ws.readyState === WebSocket.CLOSED || this.ws.readyState === WebSocket.CLOSING) {
      this.connect();
    }
  }

  unsubscribe(symbol: string, callback: (price: number) => void) {
    const cbs = this.subscribers.get(symbol);
    if (!cbs) return;
    cbs.delete(callback);
    if (cbs.size === 0) {
      this.subscribers.delete(symbol);
      if (this.connected) {
        this.ws?.send(JSON.stringify({ type: 'unsubscribe', symbol }));
      }
    }
    // If no more subscribers, close connection cleanly
    if (this.subscribers.size === 0) {
      this.stopPing();
      if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
      this.ws?.close();
    }
  }

  destroy() {
    this.destroyed = true;
    this.stopPing();
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close();
  }
}

export const finnhubWS = new FinnhubWebSocket(API_KEY);

export function hasApiKey(): boolean {
  return !!API_KEY && API_KEY.length > 10;
}
