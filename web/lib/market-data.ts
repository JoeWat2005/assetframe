import "server-only";

// Multi-provider market-data layer for the sellable /api/v1/data endpoints. Free, keyless
// providers with automatic FALLBACK: if one errors or rate-limits (429), the next is tried.
//   - Yahoo  : primary, keyless, ALL asset classes (stocks, ETFs, indices ^, FX =X, futures =F, crypto -USD)
//   - CoinGecko : fallback for crypto when Yahoo is unavailable (keyless, generous free tier)
// Adding a keyed provider (AlphaVantage / Twelve Data) later is just another entry in the
// provider list per method — set its API key in env and push it onto the array.

export type Quote = {
  symbol: string;
  price: number;
  change: number | null;
  changePct: number | null;
  currency: string | null;
  asOf: string; // ISO
  provider: string;
};
export type Candle = { t: string; o: number; h: number; l: number; c: number; v: number };
export type History = { symbol: string; interval: "1d" | "1h"; candles: Candle[]; provider: string };

const UA = { "User-Agent": "Mozilla/5.0 (compatible; AssetFrameData/1.0)" };
const round2 = (n: number) => Math.round(n * 100) / 100;

async function httpJson(url: string, headers?: Record<string, string>, timeoutMs = 8000): Promise<unknown> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(url, { headers: { ...UA, ...(headers || {}) }, signal: ctrl.signal, cache: "no-store" });
    if (!r.ok) {
      const e = new Error(`HTTP ${r.status}`) as Error & { status?: number };
      e.status = r.status;
      throw e;
    }
    return await r.json();
  } finally {
    clearTimeout(t);
  }
}

// Try each provider in order; return the first success, else throw the last error.
async function withFallback<T>(providers: Array<{ name: string; fn: () => Promise<T> }>): Promise<T> {
  let lastErr: unknown;
  for (const p of providers) {
    try {
      return await p.fn();
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr ?? new Error("no providers available");
}

// ----------------------------------------------------------------- Yahoo (keyless, all classes)
function yahooUrl(symbol: string, range: string, interval: string) {
  return `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}`;
}

type YMeta = { regularMarketPrice?: number; chartPreviousClose?: number; previousClose?: number; currency?: string; symbol?: string; regularMarketTime?: number };
type YResult = { meta?: YMeta; timestamp?: number[]; indicators?: { quote?: Array<{ open?: (number | null)[]; high?: (number | null)[]; low?: (number | null)[]; close?: (number | null)[]; volume?: (number | null)[] }> } };

async function yahooQuote(symbol: string): Promise<Quote> {
  const d = (await httpJson(yahooUrl(symbol, "1d", "1d"))) as { chart?: { result?: YResult[] } };
  const m = d?.chart?.result?.[0]?.meta;
  if (!m || typeof m.regularMarketPrice !== "number") throw new Error("yahoo: no price");
  const price = m.regularMarketPrice;
  const prev = typeof m.chartPreviousClose === "number" ? m.chartPreviousClose
    : typeof m.previousClose === "number" ? m.previousClose : null;
  const change = prev != null ? round2(price - prev) : null;
  return {
    symbol: m.symbol ?? symbol,
    price,
    change,
    changePct: prev ? round2(((price - prev) / prev) * 100) : null,
    currency: m.currency ?? null,
    asOf: new Date((m.regularMarketTime ?? Math.floor(Date.now() / 1000)) * 1000).toISOString(),
    provider: "yahoo",
  };
}

async function yahooHistory(symbol: string, days: number, interval: "1d" | "1h"): Promise<History> {
  const range = days <= 1 ? "1d" : days <= 5 ? "5d" : days <= 30 ? "1mo" : days <= 90 ? "3mo"
    : days <= 180 ? "6mo" : days <= 365 ? "1y" : days <= 730 ? "2y" : "5y";
  const d = (await httpJson(yahooUrl(symbol, range, interval === "1h" ? "60m" : "1d"))) as { chart?: { result?: YResult[] } };
  const res = d?.chart?.result?.[0];
  const ts = res?.timestamp ?? [];
  const q = res?.indicators?.quote?.[0] ?? {};
  const candles: Candle[] = [];
  for (let i = 0; i < ts.length; i++) {
    const o = q.open?.[i], h = q.high?.[i], l = q.low?.[i], c = q.close?.[i];
    if (o == null || h == null || l == null || c == null) continue;
    candles.push({ t: new Date(ts[i] * 1000).toISOString(), o, h, l, c, v: q.volume?.[i] ?? 0 });
  }
  if (!candles.length) throw new Error("yahoo: no candles");
  return { symbol: res?.meta?.symbol ?? symbol, interval, candles, provider: "yahoo" };
}

// ----------------------------------------------------------------- CoinGecko (crypto fallback)
const CG_IDS: Record<string, string> = {
  BTC: "bitcoin", ETH: "ethereum", SOL: "solana", XRP: "ripple", ADA: "cardano", DOGE: "dogecoin",
  BNB: "binancecoin", LTC: "litecoin", DOT: "polkadot", AVAX: "avalanche-2", LINK: "chainlink",
  MATIC: "matic-network", TRX: "tron", BCH: "bitcoin-cash", XLM: "stellar", ATOM: "cosmos",
};
function cgId(symbol: string): string | null {
  const base = symbol.toUpperCase().replace(/-USD$|USD$|=X$|-USDT$/i, "");
  return CG_IDS[base] ?? null;
}
function cgKey() {
  return process.env.COINGECKO_API_KEY || "";
}
function cgHeaders(): Record<string, string> {
  const k = cgKey();
  return k ? { "x-cg-demo-api-key": k } : {};
}

async function coingeckoQuote(symbol: string): Promise<Quote> {
  const id = cgId(symbol);
  if (!id) throw new Error("coingecko: symbol not mapped");
  const d = (await httpJson(
    `https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd&include_24hr_change=true&include_last_updated_at=true`,
    cgHeaders()
  )) as Record<string, { usd?: number; usd_24h_change?: number; last_updated_at?: number }>;
  const row = d?.[id];
  if (!row || typeof row.usd !== "number") throw new Error("coingecko: no price");
  return {
    symbol,
    price: row.usd,
    change: null,
    changePct: typeof row.usd_24h_change === "number" ? round2(row.usd_24h_change) : null,
    currency: "USD",
    asOf: new Date((row.last_updated_at ?? Math.floor(Date.now() / 1000)) * 1000).toISOString(),
    provider: "coingecko",
  };
}

async function coingeckoHistory(symbol: string, days: number): Promise<History> {
  const id = cgId(symbol);
  if (!id) throw new Error("coingecko: symbol not mapped");
  // /ohlc buckets: 1,7,14,30,90,180,365. Snap up to the nearest supported bucket.
  const bucket = [1, 7, 14, 30, 90, 180, 365].find((b) => b >= days) ?? 365;
  const rows = (await httpJson(
    `https://api.coingecko.com/api/v3/coins/${id}/ohlc?vs_currency=usd&days=${bucket}`,
    cgHeaders()
  )) as number[][];
  if (!Array.isArray(rows) || !rows.length) throw new Error("coingecko: no candles");
  const candles: Candle[] = rows.map(([ms, o, h, l, c]) => ({ t: new Date(ms).toISOString(), o, h, l, c, v: 0 }));
  return { symbol, interval: "1d", candles, provider: "coingecko" };
}

// ----------------------------------------------------------------- public API
export async function getQuote(symbol: string): Promise<Quote> {
  const providers = [{ name: "yahoo", fn: () => yahooQuote(symbol) }];
  if (cgId(symbol)) providers.push({ name: "coingecko", fn: () => coingeckoQuote(symbol) });
  return withFallback(providers);
}

export async function getHistory(symbol: string, opts: { days: number; interval: "1d" | "1h" }): Promise<History> {
  const providers = [{ name: "yahoo", fn: () => yahooHistory(symbol, opts.days, opts.interval) }];
  // CoinGecko only serves daily OHLC, so it's a fallback for daily crypto history.
  if (opts.interval === "1d" && cgId(symbol)) providers.push({ name: "coingecko", fn: () => coingeckoHistory(symbol, opts.days) });
  return withFallback(providers);
}
