"use client";

import { CandlestickChart, AreaChart, BarChart2, LineChart, Undo2, Zap, ChevronDown } from "lucide-react";
import { SymbolSelector } from "@/components/chart/SymbolSelector";
import { TimeframeSelector } from "@/components/chart/TimeframeSelector";
import { IndicatorMenu } from "@/components/chart/IndicatorMenu";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useChartStore, type ChartType } from "@/lib/store/chart-store";
import { useTranslation } from "@/lib/useTranslation";
import { cn } from "@/lib/utils";

const CHART_TYPE_KEYS: { key: ChartType; Icon: typeof CandlestickChart }[] = [
  { key: "candlestick", Icon: CandlestickChart },
  { key: "bar",         Icon: BarChart2 },
  { key: "line",        Icon: LineChart },
  { key: "area",        Icon: AreaChart },
];

export function Header() {
  const chartType = useChartStore((s) => s.chartType);
  const setChartType = useChartStore((s) => s.setChartType);
  const undo = useChartStore((s) => s.undo);
  const undoStack = useChartStore((s) => s.undoStack);
  const language = useChartStore((s) => s.language);
  const setLanguage = useChartStore((s) => s.setLanguage);
  const t = useTranslation();

  const CHART_TYPES = CHART_TYPE_KEYS.map(({ key, Icon }) => ({
    key, Icon, label: t.chartTypes[key],
  }));

  return (
    <header className="flex h-12 items-center justify-between border-b border-tv-border bg-tv-panel px-3">
      <div className="flex items-center gap-1">
        <div className="flex items-center gap-2 pr-2">
          <div className="flex h-7 w-7 items-center justify-center rounded bg-tv-blue/20">
            <Zap className="h-4 w-4 text-tv-blue" />
          </div>
          <span className="text-sm font-semibold text-tv-text">
            TradingLatino
          </span>
        </div>
        <Separator orientation="vertical" className="h-6 bg-tv-border" />
        <SymbolSelector />
        <Separator orientation="vertical" className="h-6 bg-tv-border" />
        <TimeframeSelector />
        <Separator orientation="vertical" className="mx-1 h-6 bg-tv-border" />

        {/* Chart type selector — dropdown */}
        {(() => {
          const active = CHART_TYPES.find((t) => t.key === chartType) ?? CHART_TYPES[0];
          return (
            <DropdownMenu>
              <Tooltip>
                {/* render as <span> so it doesn't create a <button> around the DropdownMenuTrigger <button> */}
                <TooltipTrigger render={<span />}>
                  <DropdownMenuTrigger className="flex h-7 items-center gap-1 rounded px-1.5 text-tv-text-muted transition-colors hover:bg-tv-panel-hover hover:text-tv-text data-[state=open]:bg-tv-panel-hover data-[state=open]:text-tv-text">
                    <active.Icon className="h-3.5 w-3.5" />
                    <ChevronDown className="h-2.5 w-2.5" />
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">{active.label}</TooltipContent>
              </Tooltip>
              <DropdownMenuContent align="start" className="w-44 bg-tv-panel">
                {CHART_TYPES.map(({ key, Icon, label }) => (
                  <DropdownMenuItem
                    key={key}
                    onClick={() => setChartType(key)}
                    className={cn(
                      "flex items-center gap-2.5 text-xs",
                      chartType === key ? "text-tv-blue" : "text-tv-text",
                    )}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    <span className="flex-1">{label}</span>
                    {chartType === key && <span className="text-tv-blue">✓</span>}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        })()}

        <Separator orientation="vertical" className="mx-1 h-6 bg-tv-border" />
        <IndicatorMenu />
        <Separator orientation="vertical" className="mx-1 h-6 bg-tv-border" />

        {/* Undo */}
        <Tooltip>
          <TooltipTrigger
            onClick={undo}
            disabled={undoStack.length === 0}
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded transition-colors",
              undoStack.length > 0
                ? "text-tv-text-muted hover:bg-tv-panel-hover hover:text-tv-text"
                : "cursor-not-allowed text-tv-text-dim opacity-30",
            )}
          >
            <Undo2 className="h-3.5 w-3.5" />
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">{t.undo}</TooltipContent>
        </Tooltip>
      </div>

      <div className="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger
            onClick={() => setLanguage(language === "es" ? "en" : "es")}
            className="flex h-7 items-center justify-center rounded px-2 text-[11px] font-semibold text-tv-text-muted transition-colors hover:bg-tv-panel-hover hover:text-tv-text"
          >
            {t.langButton}
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">{t.langLabel}</TooltipContent>
        </Tooltip>
      </div>
    </header>
  );
}
