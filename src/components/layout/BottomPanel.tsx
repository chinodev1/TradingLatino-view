"use client";

import { useEffect, useState } from "react";
import { useChartStore } from "@/lib/store/chart-store";
import { useTranslation } from "@/lib/useTranslation";
import { fetchTicker24h } from "@/lib/binance/rest";
import type { Ticker24h } from "@/lib/binance/types";
import { formatPrice, formatPct, formatVolume } from "@/lib/format";
import { cn } from "@/lib/utils";

export function BottomPanel() {
  const symbol = useChartStore((s) => s.symbol);
  const tr = useTranslation();
  const [ticker, setTicker] = useState<Ticker24h | null>(null);

  useEffect(() => {
    let cancelled = false;
    setTicker(null);
    const load = () => {
      fetchTicker24h(symbol)
        .then((x) => {
          if (!cancelled) setTicker(x);
        })
        .catch(console.error);
    };
    load();
    const id = setInterval(load, 5000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [symbol]);

  const upClass = (n: number) => (n >= 0 ? "text-tv-green" : "text-tv-red");

  return (
    <div className="flex h-9 items-center gap-0 border-t border-tv-border bg-tv-panel px-3 text-xs">
      <Stat label={tr.bottomPanel.symbol} value={symbol} />
      <Stat
        label={tr.bottomPanel.change24h}
        value={ticker ? formatPct(ticker.priceChangePercent) : "—"}
        valueClass={ticker ? upClass(ticker.priceChangePercent) : ""}
      />
      <Stat
        label={tr.bottomPanel.high24h}
        value={ticker ? formatPrice(ticker.highPrice) : "—"}
        valueClass="text-tv-green"
      />
      <Stat
        label={tr.bottomPanel.low24h}
        value={ticker ? formatPrice(ticker.lowPrice) : "—"}
        valueClass="text-tv-red"
      />
      <Stat
        label={tr.bottomPanel.vol24hBase}
        value={ticker ? formatVolume(ticker.volume) : "—"}
      />
      <Stat
        label={tr.bottomPanel.vol24hUsdt}
        value={ticker ? formatVolume(ticker.quoteVolume) : "—"}
      />
      <div className="ml-auto flex items-center gap-2 text-[10px] text-tv-text-dim">
        <span className="inline-flex h-1.5 w-1.5 animate-pulse rounded-full bg-tv-green" />
        <span>Binance · Live</span>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center gap-1.5 border-r border-tv-border px-3">
      <span className="text-tv-text-dim">{label}</span>
      <span className={cn("font-medium tabular-nums", valueClass ?? "text-tv-text")}>
        {value}
      </span>
    </div>
  );
}
