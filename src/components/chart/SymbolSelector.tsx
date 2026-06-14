"use client";

import { useEffect, useState, useMemo } from "react";
import { Search, ChevronDown } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { fetchExchangeSymbols, COIN_NAMES } from "@/lib/binance/rest";
import { useChartStore } from "@/lib/store/chart-store";
import type { SymbolInfo } from "@/lib/binance/types";
import { cn } from "@/lib/utils";

type QuoteFilter = "ALL" | "USDT" | "BTC" | "ETH";

export function SymbolSelector() {
  const symbol = useChartStore((s) => s.symbol);
  const setSymbol = useChartStore((s) => s.setSymbol);
  const setDataSource = useChartStore((s) => s.setDataSource);
  const addToWatchlist = useChartStore((s) => s.addToWatchlist);
  const open = useChartStore((s) => s.symbolDialogOpen);
  const setOpen = useChartStore((s) => s.setSymbolDialogOpen);

  const [query, setQuery] = useState("");
  const [quoteFilter, setQuoteFilter] = useState<QuoteFilter>("USDT");
  const [allSymbols, setAllSymbols] = useState<SymbolInfo[]>([]);

  useEffect(() => {
    if (open && allSymbols.length === 0) {
      fetchExchangeSymbols().then(setAllSymbols).catch(console.error);
    }
    if (!open) setQuery("");
  }, [open, allSymbols.length]);

  const filtered = useMemo(() => {
    const syms = quoteFilter === "ALL" ? allSymbols : allSymbols.filter((s) => s.quoteAsset === quoteFilter);
    const q = query.trim().toUpperCase();
    if (!q) return syms.slice(0, 100);
    return syms.filter((s) => {
      if (s.symbol.includes(q) || s.baseAsset.includes(q)) return true;
      const name = COIN_NAMES[s.baseAsset];
      return name ? name.toUpperCase().includes(q) : false;
    }).slice(0, 100);
  }, [query, allSymbols, quoteFilter]);

  function selectSymbol(sym: string) {
    setSymbol(sym);
    setDataSource("binance");
    addToWatchlist(sym);
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

        <div className="border-b border-tv-border p-3 space-y-2">
          <Input
            autoFocus
            placeholder="BTC, Bitcoin, Ethereum, Solana…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="bg-tv-bg"
          />
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
        </div>

        <ScrollArea className="h-[400px]">
          <div className="flex flex-col">
            {filtered.length === 0 && (
              <div className="p-4 text-center text-xs text-tv-text-muted">Sin resultados</div>
            )}
            {filtered.map((s) => {
              const coinName = COIN_NAMES[s.baseAsset];
              return (
                <button
                  key={s.symbol}
                  onClick={() => selectSymbol(s.symbol)}
                  className={cn("flex items-center justify-between border-b border-tv-border px-4 py-2.5 text-left text-xs hover:bg-tv-panel-hover",
                    s.symbol === symbol && "bg-tv-panel-hover")}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-semibold text-tv-text shrink-0">{s.baseAsset}</span>
                    {coinName && <span className="text-tv-text-muted truncate">{coinName}</span>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <span className="text-[10px] text-tv-text-dim">/{s.quoteAsset}</span>
                    <span className="text-[10px] text-tv-text-dim opacity-40">Binance</span>
                  </div>
                </button>
              );
            })}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
