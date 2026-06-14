"use client";

import { useEffect, useState, useMemo } from "react";
import { Search, ChevronDown, TrendingUp, Bitcoin } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { fetchExchangeSymbols, searchYahooFinance, COIN_NAMES } from "@/lib/binance/rest";
import { useChartStore } from "@/lib/store/chart-store";
import type { SymbolInfo } from "@/lib/binance/types";
import type { UnifiedSymbolInfo } from "@/lib/binance/types";
import { cn } from "@/lib/utils";

type Tab = "crypto" | "stocks";
type QuoteFilter = "ALL" | "USDT" | "BTC" | "ETH";

export function SymbolSelector() {
  const symbol = useChartStore((s) => s.symbol);
  const setSymbol = useChartStore((s) => s.setSymbol);
  const setDataSource = useChartStore((s) => s.setDataSource);
  const addToWatchlist = useChartStore((s) => s.addToWatchlist);
  const open = useChartStore((s) => s.symbolDialogOpen);
  const setOpen = useChartStore((s) => s.setSymbolDialogOpen);

  const [tab, setTab] = useState<Tab>("crypto");
  const [query, setQuery] = useState("");
  const [quoteFilter, setQuoteFilter] = useState<QuoteFilter>("USDT");
  const [allCryptoSymbols, setAllCryptoSymbols] = useState<SymbolInfo[]>([]);
  const [stockResults, setStockResults] = useState<UnifiedSymbolInfo[]>([]);
  const [stockLoading, setStockLoading] = useState(false);

  useEffect(() => {
    if (open && allCryptoSymbols.length === 0) {
      fetchExchangeSymbols().then(setAllCryptoSymbols).catch(console.error);
    }
    if (!open) { setQuery(""); setStockResults([]); }
  }, [open, allCryptoSymbols.length]);

  // Live Yahoo/proxy search for stocks
  useEffect(() => {
    if (tab !== "stocks" || !query.trim()) { setStockResults([]); return; }
    const timer = setTimeout(async () => {
      setStockLoading(true);
      try {
        const results = await searchYahooFinance(query);
        setStockResults(results);
      } catch {
        setStockResults([]);
      } finally {
        setStockLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query, tab]);

  const filteredCrypto = useMemo(() => {
    const syms = quoteFilter === "ALL" ? allCryptoSymbols : allCryptoSymbols.filter((s) => s.quoteAsset === quoteFilter);
    const q = query.trim().toUpperCase();
    if (!q) return syms.slice(0, 100);
    return syms.filter((s) => {
      if (s.symbol.includes(q) || s.baseAsset.includes(q)) return true;
      const name = COIN_NAMES[s.baseAsset];
      return name ? name.toUpperCase().includes(q) : false;
    }).slice(0, 100);
  }, [query, allCryptoSymbols, quoteFilter]);

  function selectSymbol(sym: string, source: "binance" | "yahoo") {
    setSymbol(sym);
    setDataSource(source);
    if (source === "binance") addToWatchlist(sym);
    setOpen(false);
    setQuery("");
  }

  const QUOTE_FILTERS: QuoteFilter[] = ["ALL", "USDT", "BTC", "ETH"];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="group flex items-center gap-2 rounded px-3 py-1.5 text-sm font-semibold hover:bg-tv-panel-hover">
        <Search className="h-3.5 w-3.5 text-tv-text-muted group-hover:text-tv-text" />
        <span className="tabular-nums">{symbol}</span>
        <ChevronDown className="h-3.5 w-3.5 text-tv-text-muted" />
      </DialogTrigger>
      <DialogContent className="max-w-md gap-0 bg-tv-panel p-0">
        <DialogHeader className="border-b border-tv-border px-4 py-3">
          <DialogTitle className="text-sm font-medium">Buscar símbolo</DialogTitle>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex border-b border-tv-border">
          <button
            onClick={() => { setTab("crypto"); setQuery(""); }}
            className={cn("flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors",
              tab === "crypto" ? "border-b-2 border-tv-blue text-tv-blue" : "text-tv-text-muted hover:text-tv-text")}
          >
            <Bitcoin className="h-3.5 w-3.5" /> Crypto
          </button>
          <button
            onClick={() => { setTab("stocks"); setQuery(""); setStockResults([]); }}
            className={cn("flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors",
              tab === "stocks" ? "border-b-2 border-tv-blue text-tv-blue" : "text-tv-text-muted hover:text-tv-text")}
          >
            <TrendingUp className="h-3.5 w-3.5" /> Acciones
          </button>
        </div>

        {/* Search input */}
        <div className={cn("border-b border-tv-border p-3 space-y-2")}>
          <Input
            autoFocus
            placeholder={tab === "crypto" ? "BTC, Bitcoin, Ethereum, Solana…" : "AAPL, Tesla, Apple…"}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="bg-tv-bg"
          />
          {/* Quote filter — only for crypto tab */}
          {tab === "crypto" && (
            <div className="flex gap-1">
              {QUOTE_FILTERS.map((f) => (
                <button
                  key={f}
                  onClick={() => setQuoteFilter(f)}
                  className={cn("rounded px-2 py-0.5 text-[10px] font-semibold transition-colors",
                    quoteFilter === f ? "bg-tv-blue/20 text-tv-blue" : "text-tv-text-muted hover:bg-tv-panel-hover")}
                >
                  {f === "ALL" ? "Todos" : f}
                </button>
              ))}
            </div>
          )}
          {tab === "stocks" && !query.trim() && (
            <p className="text-[10px] text-tv-text-muted">Buscá acciones, ETFs e índices (ej: AAPL, SPY, Tesla)</p>
          )}
        </div>

        <ScrollArea className="h-[360px]">
          <div className="flex flex-col">
            {/* Crypto results */}
            {tab === "crypto" && filteredCrypto.length === 0 && (
              <div className="p-4 text-center text-xs text-tv-text-muted">Sin resultados</div>
            )}
            {tab === "crypto" && filteredCrypto.map((s) => {
              const coinName = COIN_NAMES[s.baseAsset];
              return (
                <button
                  key={s.symbol}
                  onClick={() => selectSymbol(s.symbol, "binance")}
                  className={cn("flex items-center justify-between border-b border-tv-border px-4 py-2 text-left text-xs hover:bg-tv-panel-hover",
                    s.symbol === symbol && "bg-tv-panel-hover")}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-semibold text-tv-text shrink-0">{s.baseAsset}</span>
                    {coinName && <span className="text-tv-text-muted truncate">{coinName}</span>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <span className="text-[10px] text-tv-text-dim">/{s.quoteAsset}</span>
                    <span className="text-[10px] text-tv-text-dim opacity-50">Binance</span>
                  </div>
                </button>
              );
            })}

            {/* Stocks results */}
            {tab === "stocks" && !query.trim() && (
              <div className="p-4 text-center text-xs text-tv-text-muted">
                Escribí el nombre o ticker de una acción para buscar
              </div>
            )}
            {tab === "stocks" && stockLoading && (
              <div className="p-4 text-center text-xs text-tv-text-muted">Buscando…</div>
            )}
            {tab === "stocks" && !stockLoading && query.trim() && stockResults.length === 0 && (
              <div className="p-4 text-center text-xs text-tv-text-muted">
                Sin resultados — probá con otro nombre o ticker
              </div>
            )}
            {tab === "stocks" && stockResults.map((s) => (
              <button
                key={s.symbol}
                onClick={() => selectSymbol(s.symbol, "yahoo")}
                className={cn("flex items-center justify-between border-b border-tv-border px-4 py-2 text-left text-xs hover:bg-tv-panel-hover",
                  s.symbol === symbol && "bg-tv-panel-hover")}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="font-semibold text-tv-text shrink-0">{s.symbol}</span>
                  {s.name && <span className="text-tv-text-muted truncate">{s.name}</span>}
                </div>
                <span className="text-[10px] shrink-0 rounded bg-tv-panel-hover px-1.5 py-0.5 text-tv-text-muted ml-2">
                  {s.exchange || "Stock"}
                </span>
              </button>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
