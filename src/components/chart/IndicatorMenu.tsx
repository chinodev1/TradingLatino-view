"use client";

import { useState } from "react";
import { Activity, Check, Star } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useChartStore, type IndicatorKey, type IndicatorConfig } from "@/lib/store/chart-store";
import { useTranslation } from "@/lib/useTranslation";
import { cn } from "@/lib/utils";

interface Entry {
  key: IndicatorKey;
  label: (cfg: IndicatorConfig, volLabel: string) => string;
  groupKey: string;
}

const ENTRIES: Entry[] = [
  { key: "ema20",      groupKey: "Medias móviles", label: (c) => `EMA ${c.ema20}` },
  { key: "ema50",      groupKey: "Medias móviles", label: (c) => `EMA ${c.ema50}` },
  { key: "ema200",     groupKey: "Medias móviles", label: (c) => `EMA ${c.ema200}` },
  { key: "fourEma",    groupKey: "Medias móviles", label: (c) => `4EMA (${c.fourEma1}, ${c.fourEma2}, ${c.fourEma3}, ${c.fourEma4})` },
  { key: "volume",     groupKey: "Volumen",         label: (_c, v) => v },
  { key: "vrvp",       groupKey: "Volumen",         label: () => "Volume Profile (VRVP)" },
  { key: "rsi",        groupKey: "Osciladores",     label: (c) => `RSI (${c.rsi})` },
  { key: "macd",       groupKey: "Osciladores",     label: (c) => `MACD (${c.macdFast}, ${c.macdSlow}, ${c.macdSignal})` },
  { key: "adx",        groupKey: "Osciladores",     label: (c) => `DMI/ADX/KeyLevel (DI ${c.adxDiLen}, ADX ${c.adxLen}, KL ${c.adxKeyLevel})` },
  { key: "sqzMom",     groupKey: "Osciladores",     label: (c) => `Squeeze Momentum BB ${c.sqzBbLen}/${c.sqzKcLen}` },
  { key: "bb",         groupKey: "Overlays",        label: (c) => `Bollinger Bands (${c.bbPeriod}, ${c.bbMult})` },
  { key: "vwap",       groupKey: "Overlays",        label: () => "VWAP" },
  { key: "stochRsi",   groupKey: "Osciladores",     label: (c) => `Stochastic RSI (${c.stochRsiLen}, ${c.stochRsiPeriod})` },
  { key: "williamsR",  groupKey: "Osciladores",     label: (c) => `Williams %R (${c.williamsRPeriod})` },
  { key: "atr",        groupKey: "Osciladores",     label: (c) => `ATR (${c.atrPeriod})` },
  { key: "cci",        groupKey: "Osciladores",     label: (c) => `CCI (${c.cciPeriod})` },
  { key: "obv",        groupKey: "Osciladores",     label: () => "OBV" },
  { key: "mfi",        groupKey: "Osciladores",     label: (c) => `MFI (${c.mfiPeriod})` },
];

const ENTRY_MAP = Object.fromEntries(ENTRIES.map((e) => [e.key, e])) as Record<IndicatorKey, Entry>;

function IndicatorRow({
  entry,
  active,
  isFav,
  onToggle,
  onToggleFav,
  config,
  volLabel,
}: {
  entry: Entry;
  active: boolean;
  isFav: boolean;
  onToggle: () => void;
  onToggleFav: (e: React.MouseEvent) => void;
  config: IndicatorConfig;
  volLabel: string;
}) {
  return (
    <DropdownMenuItem
      closeOnClick={false}
      onClick={onToggle}
      className="flex items-center gap-2 text-xs"
    >
      <button
        onClick={onToggleFav}
        className={cn(
          "shrink-0 rounded p-0.5 transition-colors hover:bg-tv-panel-hover",
          isFav ? "text-yellow-400" : "text-tv-text-dim hover:text-yellow-400",
        )}
        aria-label="Favorito"
      >
        <Star className={cn("h-3 w-3", isFav && "fill-yellow-400")} />
      </button>
      <span className="flex-1">{entry.label(config, volLabel)}</span>
      {active && <Check className="h-3.5 w-3.5 shrink-0 text-tv-blue" />}
    </DropdownMenuItem>
  );
}

export function IndicatorMenu() {
  const indicators = useChartStore((s) => s.indicators);
  const config = useChartStore((s) => s.config);
  const toggle = useChartStore((s) => s.toggleIndicator);
  const favoriteIndicators = useChartStore((s) => s.favoriteIndicators);
  const toggleFavoriteIndicator = useChartStore((s) => s.toggleFavoriteIndicator);
  const t = useTranslation();
  const [search, setSearch] = useState("");

  const visibleEntries = search.trim()
    ? ENTRIES.filter((e) => e.label(config, t.indicatorLabels.volume).toLowerCase().includes(search.toLowerCase()))
    : ENTRIES;

  const groups = visibleEntries.reduce<Record<string, Entry[]>>((acc, i) => {
    (acc[i.groupKey] ||= []).push(i);
    return acc;
  }, {});

  const activeCount = Object.values(indicators).filter(Boolean).length;
  const favSet = new Set(favoriteIndicators);

  return (
    <DropdownMenu onOpenChange={(o) => { if (!o) setSearch(""); }}>
      <DropdownMenuTrigger className="flex items-center gap-1.5 rounded px-2.5 py-1.5 text-xs text-tv-text hover:bg-tv-panel-hover">
        <Activity className="h-3.5 w-3.5" />
        <span>{t.indicators}</span>
        {activeCount > 0 && (
          <span className="ml-1 rounded bg-tv-blue/20 px-1.5 py-0.5 text-[10px] font-semibold text-tv-blue">
            {activeCount}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72 bg-tv-panel">
        <div className="border-b border-tv-border p-2">
          <input
            autoFocus
            placeholder="Buscar indicador..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            className="w-full rounded bg-tv-bg px-2.5 py-1.5 text-xs text-tv-text placeholder:text-tv-text-muted outline-none"
          />
        </div>

        {/* Favoritos — only shown when at least one is starred */}
        {favoriteIndicators.length > 0 && (
          <>
            <DropdownMenuGroup>
              <DropdownMenuLabel className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-yellow-400">
                <Star className="h-3 w-3 fill-yellow-400" />
                Favoritos
              </DropdownMenuLabel>
              {favoriteIndicators.map((key) => {
                const entry = ENTRY_MAP[key];
                if (!entry) return null;
                return (
                  <IndicatorRow
                    key={key}
                    entry={entry}
                    active={indicators[key]}
                    isFav={true}
                    onToggle={() => toggle(key)}
                    onToggleFav={(e) => { e.stopPropagation(); toggleFavoriteIndicator(key); }}
                    config={config}
                    volLabel={t.indicatorLabels.volume}
                  />
                );
              })}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
          </>
        )}

        {/* All groups */}
        {Object.entries(groups).map(([groupKey, items], idx) => (
          <DropdownMenuGroup key={groupKey}>
            {idx > 0 && <DropdownMenuSeparator />}
            <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-tv-text-muted">
              {t.groups[groupKey as keyof typeof t.groups] ?? groupKey}
            </DropdownMenuLabel>
            {items.map((entry) => (
              <IndicatorRow
                key={entry.key}
                entry={entry}
                active={indicators[entry.key]}
                isFav={favSet.has(entry.key)}
                onToggle={() => toggle(entry.key)}
                onToggleFav={(e) => { e.stopPropagation(); toggleFavoriteIndicator(entry.key); }}
                config={config}
                volLabel={t.indicatorLabels.volume}
              />
            ))}
          </DropdownMenuGroup>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
