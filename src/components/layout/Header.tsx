"use client";

import { CandlestickChart, AreaChart, BarChart2, LineChart, Undo2, Zap, ChevronDown, ZoomOut, Camera, Bell } from "lucide-react";
import { SymbolSelector } from "@/components/chart/SymbolSelector";
import { TimeframeSelector } from "@/components/chart/TimeframeSelector";
import { IndicatorMenu } from "@/components/chart/IndicatorMenu";
import { PriceAlertsPanel } from "@/components/chart/PriceAlertsPanel";
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
  { key: "heikinashi", Icon: CandlestickChart },
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
  const logScale = useChartStore((s) => s.logScale);
  const setLogScale = useChartStore((s) => s.setLogScale);
  const triggerResetView = useChartStore((s) => s.triggerResetView);
  const triggerScreenshot = useChartStore((s) => s.triggerScreenshot);
  const alerts = useChartStore((s) => s.alerts);
  const setAlertsOpen = useChartStore((s) => s.setAlertsOpen);
  const symbol = useChartStore((s) => s.symbol);
  const t = useTranslation();

  const activeAlertCount = alerts.filter((a) => a.symbol === symbol && !a.triggered).length;

  const CHART_TYPES = CHART_TYPE_KEYS.map(({ key, Icon }) => ({
    key, Icon, label: key === "heikinashi" ? "Heikin Ashi" : t.chartTypes[key as keyof typeof t.chartTypes],
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
        <Separator orientation="vertical" className="mx-1 h-6 bg-tv-border hidden sm:block" />

        {/* Undo */}
        <Tooltip>
          <TooltipTrigger
            onClick={undo}
            disabled={undoStack.length === 0}
            className={cn(
              "hidden sm:flex h-7 w-7 items-center justify-center rounded transition-colors",
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
            onClick={() => triggerResetView?.()}
            className="hidden sm:flex h-7 w-7 items-center justify-center rounded text-tv-text-muted transition-colors hover:bg-tv-panel-hover hover:text-tv-text"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">Reset View (Alt+R)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger
            onClick={() => triggerScreenshot?.()}
            className="hidden sm:flex h-7 w-7 items-center justify-center rounded text-tv-text-muted transition-colors hover:bg-tv-panel-hover hover:text-tv-text"
          >
            <Camera className="h-3.5 w-3.5" />
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">Screenshot</TooltipContent>
        </Tooltip>

        <div className="relative hidden sm:flex">
          <Tooltip>
            <TooltipTrigger
              onClick={() => setAlertsOpen(true)}
              className="h-7 w-7 items-center justify-center rounded text-tv-text-muted transition-colors hover:bg-tv-panel-hover hover:text-tv-text flex"
            >
              <Bell className="h-3.5 w-3.5" />
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">Alertas de precio</TooltipContent>
          </Tooltip>
          {activeAlertCount > 0 && (
            <span className="pointer-events-none absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-tv-red text-[9px] font-bold text-white">
              {activeAlertCount}
            </span>
          )}
        </div>

        <Tooltip>
          <TooltipTrigger
            onClick={() => setLogScale(!logScale)}
            className={cn(
              "hidden sm:flex h-7 items-center justify-center rounded px-2 text-[11px] font-semibold transition-colors",
              logScale ? "bg-tv-blue/20 text-tv-blue" : "text-tv-text-muted hover:bg-tv-panel-hover hover:text-tv-text",
            )}
          >
            {logScale ? "Log" : "Lin"}
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">Toggle Log/Linear Scale</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger
            onClick={() => setLanguage(language === "es" ? "en" : "es")}
            className="hidden sm:flex h-7 items-center justify-center rounded px-2 text-[11px] font-semibold text-tv-text-muted transition-colors hover:bg-tv-panel-hover hover:text-tv-text"
          >
            {t.langButton}
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">{t.langLabel}</TooltipContent>
        </Tooltip>
      </div>
      <PriceAlertsPanel />
    </header>
  );
}
