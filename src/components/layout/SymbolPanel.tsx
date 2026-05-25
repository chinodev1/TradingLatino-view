"use client";

import { useEffect, useState } from "react";
import { useChartStore } from "@/lib/store/chart-store";
import { useTranslation } from "@/lib/useTranslation";
import { fetchTicker24h, fetchKlines } from "@/lib/binance/rest";
import { getBinanceWS } from "@/lib/binance/ws";
import { ema, rsi } from "@/lib/indicators";
import { formatPrice, formatVolume } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Candle } from "@/lib/binance/types";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Stats {
  lastPrice: number;
  pctChange: number;
  highPrice: number;
  lowPrice: number;
  quoteVolume: number;
}

type TechScoreKey = "strongBuy" | "buy" | "neutral" | "sell" | "strongSell";

interface Tech {
  score: number; // -1 (strong sell) … +1 (strong buy)
  scoreKey: TechScoreKey;
  color: string;
  buy: number;
  sell: number;
  neutral: number;
}

// ─── Coin color map ────────────────────────────────────────────────────────────

const COIN_COLORS: Record<string, string> = {
  BTC: "#f7931a", ETH: "#627eea", SOL: "#9945ff", BNB: "#f3ba2f",
  XRP: "#00aae4", DOGE: "#c2a633", ADA: "#0033ad", AVAX: "#e84142",
  DOT: "#e6007a", MATIC: "#8247e5", LINK: "#2a5ada", UNI: "#ff007a",
  LTC: "#bfbbbb", ATOM: "#6f7390", SUI: "#4da2ff", APT: "#00c2c7",
  OP: "#ff0420", ARB: "#28a0f0", INJ: "#00b2c8", TIA: "#7b2fff",
};

function getCoinColor(symbol: string): string {
  const base = symbol.replace(/USDT$/, "").replace(/BTC$/, "").replace(/ETH$/, "");
  return COIN_COLORS[base] ?? "#2962ff";
}
function getBase(symbol: string): string {
  return symbol.replace(/USDT$/, "").replace(/BTC$/, "").replace(/ETH$/, "");
}

// ─── Technicals scoring ────────────────────────────────────────────────────────

function computeTechnicals(candles: Candle[]): Tech {
  const neutral: Tech = { score: 0, scoreKey: "neutral", color: "#787b86", buy: 0, sell: 0, neutral: 5 };
  if (candles.length < 55) return neutral;

  const ema20 = ema(candles, 20);
  const ema50 = ema(candles, 50);
  const rsiPts = rsi(candles, 14);

  const lastClose = candles.at(-1)!.close;
  const e20 = ema20.at(-1)?.value;
  const e50 = ema50.at(-1)?.value;
  const lastRsi = rsiPts.at(-1)?.value;

  let buy = 0, sell = 0, neu = 0;

  // RSI level
  if (lastRsi !== undefined) {
    if (lastRsi < 40) buy++;
    else if (lastRsi > 60) sell++;
    else neu++;
  }
  // RSI momentum (last 5 bars)
  if (rsiPts.length >= 5) {
    const delta = rsiPts.at(-1)!.value - rsiPts.at(-5)!.value;
    if (delta > 2) buy++;
    else if (delta < -2) sell++;
    else neu++;
  }
  // EMA cross
  if (e20 !== undefined && e50 !== undefined) {
    if (e20 > e50) buy++; else sell++;
  }
  // Price vs EMA20
  if (e20 !== undefined) {
    if (lastClose > e20) buy++; else sell++;
  }
  // Price vs EMA50
  if (e50 !== undefined) {
    if (lastClose > e50) buy++; else sell++;
  }

  const total = buy + sell + neu;
  const score = total > 0 ? (buy - sell) / total : 0;

  let scoreKey: TechScoreKey, color: string;
  if (score > 0.6)       { scoreKey = "strongBuy";  color = "#26a69a"; }
  else if (score > 0.2)  { scoreKey = "buy";        color = "#4db6ac"; }
  else if (score > -0.2) { scoreKey = "neutral";    color = "#787b86"; }
  else if (score > -0.6) { scoreKey = "sell";       color = "#ef5350"; }
  else                   { scoreKey = "strongSell"; color = "#c62828"; }

  return { score, scoreKey, color, buy, sell, neutral: neu };
}

// ─── Gauge SVG ─────────────────────────────────────────────────────────────────

function Gauge({ tech }: { tech: Tech }) {
  const cx = 75, cy = 68, r = 54;

  // Five equal segments across the 180° arc
  const segs = [
    { from: 180, to: 144, color: "#c62828" }, // Strong sell
    { from: 144, to: 108, color: "#ef5350" }, // Sell
    { from: 108, to:  72, color: "#4a4f5e" }, // Neutral
    { from:  72, to:  36, color: "#4db6ac" }, // Buy
    { from:  36, to:   0, color: "#26a69a" }, // Strong buy
  ];

  // arc from angle A to B (both in degrees, standard math convention).
  // sweep clockwise (sweep-flag=1) with small arc (large-arc-flag=0).
  function seg(fromDeg: number, toDeg: number) {
    const f = (fromDeg * Math.PI) / 180;
    const t = (toDeg * Math.PI) / 180;
    const x1 = (cx + r * Math.cos(f)).toFixed(2);
    const y1 = (cy - r * Math.sin(f)).toFixed(2);
    const x2 = (cx + r * Math.cos(t)).toFixed(2);
    const y2 = (cy - r * Math.sin(t)).toFixed(2);
    return `M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`;
  }

  // Full background arc (large-arc-flag=1 for exactly 180°, sweep-flag=1 → upper semicircle)
  const bg = `M ${cx - r} ${cy} A ${r} ${r} 0 1 1 ${cx + r} ${cy}`;

  // Needle: score -1 → angle 180°, 0 → 90°, +1 → 0°
  const angleDeg = 90 - tech.score * 90;
  const angleRad = (angleDeg * Math.PI) / 180;
  const nLen = 44;
  const nx = (cx + nLen * Math.cos(angleRad)).toFixed(1);
  const ny = (cy - nLen * Math.sin(angleRad)).toFixed(1);

  return (
    <svg width={150} height={82} viewBox="0 0 150 82" className="overflow-visible">
      {/* Background track */}
      <path d={bg} fill="none" stroke="#2a2e39" strokeWidth={10} />
      {/* Colored segments */}
      {segs.map((s, i) => (
        <path key={i} d={seg(s.from, s.to)} fill="none" stroke={s.color} strokeWidth={9} />
      ))}
      {/* Needle */}
      <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="white" strokeWidth={2} strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={4} fill="white" />
      {/* Corner labels */}
      <text x={2}   y={80} fontSize={8} fill="#787b86" textAnchor="start">S.sell</text>
      <text x={148} y={80} fontSize={8} fill="#787b86" textAnchor="end">S.buy</text>
      <text x={cx}  y={12} fontSize={8} fill="#787b86" textAnchor="middle">Neutral</text>
    </svg>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export function SymbolPanel() {
  const symbol = useChartStore((s) => s.symbol);
  const t = useTranslation();

  const [stats, setStats]   = useState<Stats | null>(null);
  const [perf7d, setPerf7d] = useState<number | null>(null);
  const [perf30d, setPerf30d] = useState<number | null>(null);
  const [tech, setTech]     = useState<Tech | null>(null);
  const [flash, setFlash]   = useState<"up" | "down" | null>(null);

  // WebSocket para precio live
  useEffect(() => {
    const ws = getBinanceWS();
    const unsub = ws.subscribeMiniTickers([symbol], (tick) => {
      setStats((prev) => {
        if (!prev) return prev;
        if (tick.close > prev.lastPrice) {
          setFlash("up");
          setTimeout(() => setFlash(null), 300);
        } else if (tick.close < prev.lastPrice) {
          setFlash("down");
          setTimeout(() => setFlash(null), 300);
        }
        return { ...prev, lastPrice: tick.close, pctChange: tick.pct };
      });
    });
    return () => unsub();
  }, [symbol]);

  useEffect(() => {
    let cancelled = false;
    setStats(null); setPerf7d(null); setPerf30d(null); setTech(null);

    const load = async () => {
      try {
        const [ticker, dailyCandles, hourlyCandles] = await Promise.all([
          fetchTicker24h(symbol),
          fetchKlines(symbol, "1d", 32),
          fetchKlines(symbol, "1h", 100),
        ]);
        if (cancelled) return;

        setStats({
          lastPrice: ticker.lastPrice,
          pctChange: ticker.priceChangePercent,
          highPrice: ticker.highPrice,
          lowPrice: ticker.lowPrice,
          quoteVolume: ticker.quoteVolume,
        });

        if (dailyCandles.length >= 8) {
          const prev = dailyCandles[dailyCandles.length - 8].close;
          const curr = dailyCandles.at(-1)!.close;
          setPerf7d(((curr - prev) / prev) * 100);
        }
        if (dailyCandles.length >= 31) {
          const prev = dailyCandles[dailyCandles.length - 31].close;
          const curr = dailyCandles.at(-1)!.close;
          setPerf30d(((curr - prev) / prev) * 100);
        }

        setTech(computeTechnicals(hourlyCandles));
      } catch (e) {
        console.error("[SymbolPanel]", e);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [symbol]);

  const base      = getBase(symbol);
  const coinColor = getCoinColor(symbol);

  return (
    <div className="flex flex-col">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2.5 border-t border-tv-border px-3 pt-3 pb-2">
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
          style={{ backgroundColor: coinColor }}
        >
          {base.slice(0, 2)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[13px] font-semibold text-tv-text">{symbol}</span>
            <span className="h-1.5 w-1.5 rounded-full bg-[#26a69a]" title="Market open" />
          </div>
          <div className="text-[10px] text-tv-text-muted">{t.symbolPanel.exchange}</div>
        </div>
      </div>

      {/* ── Price ──────────────────────────────────────────────────────────── */}
      <div className="px-3 pb-3">
        {stats ? (
          <div className="flex items-baseline gap-2">
            <span className={cn(
              "text-[20px] font-semibold tabular-nums transition-colors",
              flash === "up" && "text-[#26a69a]",
              flash === "down" && "text-[#ef5350]",
              !flash && "text-tv-text",
            )}>
              {formatPrice(stats.lastPrice)}
            </span>
            <span className={cn(
              "text-[12px] font-medium tabular-nums",
              stats.pctChange >= 0 ? "text-[#26a69a]" : "text-[#ef5350]"
            )}>
              {stats.pctChange >= 0 ? "+" : ""}{stats.pctChange.toFixed(2)}%
            </span>
          </div>
        ) : (
          <div className="h-7 w-36 animate-pulse rounded bg-tv-panel-hover" />
        )}
        <div className="mt-0.5 flex items-center gap-1 text-[10px] text-[#26a69a]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#26a69a]" />
          <span>{t.symbolPanel.marketOpen}</span>
        </div>
      </div>

      {/* ── Key stats ──────────────────────────────────────────────────────── */}
      <div className="border-t border-tv-border px-3 py-2.5">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-tv-text-muted">
          {t.symbolPanel.keyStats}
        </p>
        <div className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1.5">
          <StatRow label={t.symbolPanel.volumeUsdt} value={stats ? formatVolume(stats.quoteVolume) : "—"} />
          <StatRow label={t.symbolPanel.high24h}    value={stats ? formatPrice(stats.highPrice)    : "—"} />
          <StatRow label={t.symbolPanel.low24h}     value={stats ? formatPrice(stats.lowPrice)     : "—"} />
        </div>
      </div>

      {/* ── Performance ────────────────────────────────────────────────────── */}
      <div className="border-t border-tv-border px-3 py-2.5">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-tv-text-muted">
          {t.symbolPanel.performance}
        </p>
        <div className="flex gap-2">
          <PerfBox label="1D"  value={stats?.pctChange ?? null} />
          <PerfBox label="7D"  value={perf7d} />
          <PerfBox label="30D" value={perf30d} />
        </div>
      </div>

      {/* ── Technicals ─────────────────────────────────────────────────────── */}
      <div className="border-t border-tv-border px-3 py-2.5">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-tv-text-muted">
          {t.symbolPanel.technicals}
        </p>
        {tech ? (
          <div className="flex flex-col items-center pb-1">
            <Gauge tech={tech} />
            <p className="mt-1.5 text-[14px] font-bold" style={{ color: tech.color }}>
              {t.symbolPanel[tech.scoreKey]}
            </p>
            <div className="mt-1 flex gap-3 text-[10px]">
              <span><span className="font-semibold text-[#26a69a]">{tech.buy}</span>
                <span className="ml-0.5 text-tv-text-muted">{t.symbolPanel.buyLabel}</span></span>
              <span><span className="font-semibold text-tv-text-muted">{tech.neutral}</span>
                <span className="ml-0.5 text-tv-text-muted">{t.symbolPanel.neutralLabel}</span></span>
              <span><span className="font-semibold text-[#ef5350]">{tech.sell}</span>
                <span className="ml-0.5 text-tv-text-muted">{t.symbolPanel.sellLabel}</span></span>
            </div>
            <p className="mt-1.5 text-[9px] text-tv-text-dim">{t.symbolPanel.emaRsiLabel}</p>
          </div>
        ) : (
          <div className="flex h-28 items-center justify-center">
            <div className="h-20 w-24 animate-pulse rounded bg-tv-panel-hover" />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <>
      <span className="text-[11px] text-tv-text-muted">{label}</span>
      <span className="text-right text-[11px] tabular-nums text-tv-text">{value}</span>
    </>
  );
}

function PerfBox({ label, value }: { label: string; value: number | null }) {
  const up   = value !== null && value >= 0;
  const bg   = value === null ? "bg-tv-panel-hover" : up ? "bg-[#26a69a]/15" : "bg-[#ef5350]/15";
  const text = value === null ? "text-tv-text-muted" : up ? "text-[#26a69a]" : "text-[#ef5350]";

  return (
    <div className={cn("flex flex-1 flex-col items-center gap-0.5 rounded py-1.5 px-1", bg)}>
      <span className={cn("text-[12px] font-semibold tabular-nums", text)}>
        {value !== null ? `${value >= 0 ? "+" : ""}${value.toFixed(2)}%` : "—"}
      </span>
      <span className="text-[9px] text-tv-text-muted">{label}</span>
    </div>
  );
}
