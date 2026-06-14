import type { Candle, SymbolInfo, Ticker24h, Timeframe, UnifiedSymbolInfo, SymbolSource } from "./types";

const BASE = "https://api.binance.com/api/v3";

export async function fetchKlines(
  symbol: string,
  interval: Timeframe,
  limit = 1000,
): Promise<Candle[]> {
  const url = `${BASE}/klines?symbol=${symbol.toUpperCase()}&interval=${interval}&limit=${limit}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`klines ${res.status}`);
  const data = (await res.json()) as unknown[][];
  return data.map((k) => ({
    time: Math.floor((k[0] as number) / 1000),
    open: parseFloat(k[1] as string),
    high: parseFloat(k[2] as string),
    low: parseFloat(k[3] as string),
    close: parseFloat(k[4] as string),
    volume: parseFloat(k[5] as string),
    isFinal: true,
  }));
}

export async function fetchTicker24h(symbol: string): Promise<Ticker24h> {
  const url = `${BASE}/ticker/24hr?symbol=${symbol.toUpperCase()}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`ticker ${res.status}`);
  const t = await res.json();
  return {
    symbol: t.symbol,
    lastPrice: parseFloat(t.lastPrice),
    priceChange: parseFloat(t.priceChange),
    priceChangePercent: parseFloat(t.priceChangePercent),
    highPrice: parseFloat(t.highPrice),
    lowPrice: parseFloat(t.lowPrice),
    volume: parseFloat(t.volume),
    quoteVolume: parseFloat(t.quoteVolume),
  };
}

export async function fetchTickers24h(symbols: string[]): Promise<Ticker24h[]> {
  const arr = JSON.stringify(symbols.map((s) => s.toUpperCase()));
  const url = `${BASE}/ticker/24hr?symbols=${encodeURIComponent(arr)}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`tickers ${res.status}`);
  const data = await res.json();
  return data.map((t: Record<string, string>) => ({
    symbol: t.symbol,
    lastPrice: parseFloat(t.lastPrice),
    priceChange: parseFloat(t.priceChange),
    priceChangePercent: parseFloat(t.priceChangePercent),
    highPrice: parseFloat(t.highPrice),
    lowPrice: parseFloat(t.lowPrice),
    volume: parseFloat(t.volume),
    quoteVolume: parseFloat(t.quoteVolume),
  }));
}

const MAJOR_QUOTES = new Set(["USDT", "BTC", "ETH", "BNB", "USDC", "FDUSD", "EUR", "TUSD", "BUSD"]);

let cachedSymbols: SymbolInfo[] | null = null;
export async function fetchExchangeSymbols(): Promise<SymbolInfo[]> {
  if (cachedSymbols) return cachedSymbols;
  const res = await fetch(`${BASE}/exchangeInfo`, { cache: "force-cache" });
  if (!res.ok) throw new Error(`exchangeInfo ${res.status}`);
  const data = await res.json();
  cachedSymbols = data.symbols
    .filter((s: { status: string; quoteAsset: string }) =>
      s.status === "TRADING" && MAJOR_QUOTES.has(s.quoteAsset),
    )
    .map((s: { symbol: string; baseAsset: string; quoteAsset: string; status: string }) => ({
      symbol: s.symbol,
      baseAsset: s.baseAsset,
      quoteAsset: s.quoteAsset,
      status: s.status,
    }));
  return cachedSymbols!;
}

export async function searchYahooFinance(query: string): Promise<UnifiedSymbolInfo[]> {
  try {
    const url = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=15&newsCount=0&listsCount=0`;
    const res = await fetch(url, { headers: { "Accept": "application/json" } });
    if (!res.ok) return [];
    const data = await res.json();
    const quotes = (data.quotes ?? []) as Array<{
      symbol: string;
      shortname?: string;
      longname?: string;
      exchDisp?: string;
      typeDisp?: string;
      quoteType?: string;
    }>;
    return quotes
      .filter((q) => q.quoteType === "EQUITY" || q.quoteType === "ETF" || q.quoteType === "INDEX")
      .map((q) => ({
        symbol: q.symbol,
        baseAsset: q.symbol,
        quoteAsset: "USD",
        name: q.shortname || q.longname || q.symbol,
        source: "yahoo" as SymbolSource,
        exchange: q.exchDisp || q.typeDisp || "Stock",
      }));
  } catch {
    return [];
  }
}

export async function fetchYahooKlines(symbol: string, interval: Timeframe, limit = 500): Promise<Candle[]> {
  const yahooInterval = toYahooInterval(interval);
  const yahooRange = toYahooRange(interval, limit);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${yahooRange}&interval=${yahooInterval}&includePrePost=false`;
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`yahoo chart ${res.status}`);
    const data = await res.json();
    const result = data?.chart?.result?.[0];
    if (!result) throw new Error("No data");
    const timestamps: number[] = result.timestamp ?? [];
    const q = result.indicators?.quote?.[0] ?? {};
    const opens: (number | null)[] = q.open ?? [];
    const highs: (number | null)[] = q.high ?? [];
    const lows: (number | null)[] = q.low ?? [];
    const closes: (number | null)[] = q.close ?? [];
    const volumes: (number | null)[] = q.volume ?? [];
    const candles: Candle[] = [];
    for (let i = 0; i < timestamps.length; i++) {
      const o = opens[i], h = highs[i], l = lows[i], c = closes[i], v = volumes[i];
      if (o == null || h == null || l == null || c == null) continue;
      candles.push({
        time: timestamps[i],
        open: o, high: h, low: l, close: c,
        volume: v ?? 0,
        isFinal: true,
      });
    }
    return candles;
  } catch (e) {
    console.error("Yahoo Finance fetch failed:", e);
    throw e;
  }
}

function toYahooInterval(tf: Timeframe): string {
  const map: Record<Timeframe, string> = {
    "1m": "1m", "3m": "2m", "5m": "5m", "15m": "15m", "30m": "30m",
    "1h": "60m", "2h": "60m", "4h": "60m", "6h": "60m", "8h": "60m", "12h": "60m",
    "1d": "1d", "3d": "1d", "1w": "1wk", "1M": "1mo",
  };
  return map[tf] ?? "1d";
}

function toYahooRange(tf: Timeframe, _limit: number): string {
  const map: Record<Timeframe, string> = {
    "1m": "1d", "3m": "5d", "5m": "5d", "15m": "1mo", "30m": "3mo",
    "1h": "6mo", "2h": "1y", "4h": "2y", "6h": "2y", "8h": "2y", "12h": "2y",
    "1d": "10y", "3d": "10y", "1w": "max", "1M": "max",
  };
  return map[tf] ?? "2y";
}
