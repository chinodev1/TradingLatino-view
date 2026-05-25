"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useChartStore } from "@/lib/store/chart-store";
import type { Timeframe } from "@/lib/binance/types";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const QUICK: Timeframe[] = ["1m", "5m", "15m", "1h", "4h", "1d", "1w"];

const ALL: Timeframe[] = [
  "1m", "3m", "5m", "15m", "30m",
  "1h", "2h", "4h", "6h", "8h", "12h",
  "1d", "3d", "1w", "1M",
];

function tfLabel(t: Timeframe): string {
  if (t === "1d") return "D";
  if (t === "3d") return "3D";
  if (t === "1w") return "W";
  if (t === "1M") return "M";
  return t.toUpperCase();
}

export function TimeframeSelector() {
  const tf = useChartStore((s) => s.timeframe);
  const setTf = useChartStore((s) => s.setTimeframe);

  const activeInQuick = QUICK.includes(tf);

  return (
    <div className="flex items-center gap-0.5">
      {QUICK.map((t) => (
        <button
          key={t}
          onClick={() => setTf(t)}
          className={cn(
            "rounded px-2 py-1 text-xs font-medium transition-colors",
            tf === t
              ? "bg-tv-panel-hover text-tv-text"
              : "text-tv-text-muted hover:bg-tv-panel-hover hover:text-tv-text",
          )}
        >
          {tfLabel(t)}
        </button>
      ))}

      <DropdownMenu>
        <DropdownMenuTrigger
          className={cn(
            "flex items-center gap-0.5 rounded px-1.5 py-1 text-xs font-medium transition-colors",
            !activeInQuick
              ? "bg-tv-panel-hover text-tv-text"
              : "text-tv-text-muted hover:bg-tv-panel-hover hover:text-tv-text",
          )}
        >
          {!activeInQuick && (
            <span className="mr-0.5">{tfLabel(tf)}</span>
          )}
          <ChevronDown className="h-3 w-3" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-36 bg-tv-panel">
          {ALL.map((t) => (
            <DropdownMenuItem
              key={t}
              onClick={() => setTf(t)}
              className={cn(
                "flex items-center justify-between text-xs",
                tf === t && "text-tv-blue",
              )}
            >
              <span>{tfLabel(t)}</span>
              {tf === t && <span className="text-tv-blue">✓</span>}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
