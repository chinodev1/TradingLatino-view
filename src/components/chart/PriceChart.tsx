"use client";

import { useEffect, useRef, useState } from "react";
import {
  createChart,
  CandlestickSeries,
  BarSeries,
  LineSeries,
  AreaSeries,
  HistogramSeries,
  CrosshairMode,
  type IChartApi,
  type ISeriesApi,
  type IPriceLine,
  type UTCTimestamp,
} from "lightweight-charts";
import { fetchKlines } from "@/lib/binance/rest";
import { getBinanceWS } from "@/lib/binance/ws";
import { ema, rsi, macd, adxDmi, squeezeMomentum } from "@/lib/indicators";
import type { SqzPoint } from "@/lib/indicators";
import type { Candle, Timeframe } from "@/lib/binance/types";
import {
  INDICATOR_COLORS,
  FOUR_EMA_COLORS,
  useChartStore,
  type IndicatorKey,
  type ChartType,
  type TrendLine,
  type DashLine,
  type VLine,
  type RectZone,
  type CursorMode,
} from "@/lib/store/chart-store";
import { formatPrice, formatVolume } from "@/lib/format";
import { IndicatorPill } from "./IndicatorPill";
import { MeasureOverlay } from "./MeasureOverlay";
import { VolumeProfile } from "./VolumeProfile";
import { useTranslation } from "@/lib/useTranslation";

interface MeasurePoint {
  time: number;
  price: number;
}
interface MeasureState {
  phase: "idle" | "placing" | "done";
  a: MeasurePoint | null;
  b: MeasurePoint | null;
}
const INITIAL_MEASURE: MeasureState = { phase: "idle", a: null, b: null };

function timeframeToSeconds(tf: Timeframe): number {
  const map: Record<Timeframe, number> = {
    "1m": 60, "3m": 180, "5m": 300, "15m": 900, "30m": 1800,
    "1h": 3600, "2h": 7200, "4h": 14400, "6h": 21600, "8h": 28800, "12h": 43200,
    "1d": 86400, "3d": 259200, "1w": 604800, "1M": 2592000,
  };
  return map[tf] ?? 0;
}

function formatCountdown(secs: number): string {
  if (secs <= 0) return "00:00";
  const d = Math.floor(secs / 86400);
  const h = Math.floor((secs % 86400) / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  if (d > 0) return `${d}d ${pad(h)}:${pad(m)}:${pad(s)}`;
  if (h > 0) return `${pad(h)}:${pad(m)}:${pad(s)}`;
  return `${pad(m)}:${pad(s)}`;
}

function durationLabel(aTime: number, bTime: number): string {
  const diff = Math.abs(bTime - aTime);
  const days = Math.floor(diff / 86400);
  const hours = Math.floor((diff % 86400) / 3600);
  const minutes = Math.floor((diff % 3600) / 60);
  if (days > 0) return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
  if (hours > 0) return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  return `${minutes}m`;
}

interface Props {
  symbol: string;
  timeframe: Timeframe;
}

const TV_COLORS = {
  bg: "#131722",
  panel: "#1e222d",
  border: "#2a2e39",
  text: "#d1d4dc",
  textMuted: "#787b86",
  green: "#26a69a",
  red: "#ef5350",
  blue: "#2962ff",
  yellow: "#ffb74d",
  purple: "#ab47bc",
  grid: "#1e222d",
};

interface HoverInfo {
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
  time: number;
  pct: number;
}

interface LastValues {
  ema20?: number;
  ema50?: number;
  ema200?: number;
  rsi?: number;
  macd?: number;
  macdSignal?: number;
  macdHist?: number;
  volume?: number;
  fourEma1?: number;
  fourEma2?: number;
  fourEma3?: number;
  fourEma4?: number;
  adxVal?: number;
  plusDI?: number;
  minusDI?: number;
  sqzMom?: number;
}

interface PaneOffset {
  top: number;
  height: number;
}

export function PriceChart({ symbol, timeframe }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const ema20Ref = useRef<ISeriesApi<"Line"> | null>(null);
  const ema50Ref = useRef<ISeriesApi<"Line"> | null>(null);
  const ema200Ref = useRef<ISeriesApi<"Line"> | null>(null);
  const rsiRef = useRef<ISeriesApi<"Line"> | null>(null);
  const rsi30Ref = useRef<ISeriesApi<"Line"> | null>(null);
  const rsi70Ref = useRef<ISeriesApi<"Line"> | null>(null);
  const macdRef = useRef<ISeriesApi<"Line"> | null>(null);
  const macdSignalRef = useRef<ISeriesApi<"Line"> | null>(null);
  const macdHistRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  // 4EMA
  const fourEma1Ref = useRef<ISeriesApi<"Line"> | null>(null);
  const fourEma2Ref = useRef<ISeriesApi<"Line"> | null>(null);
  const fourEma3Ref = useRef<ISeriesApi<"Line"> | null>(null);
  const fourEma4Ref = useRef<ISeriesApi<"Line"> | null>(null);
  // ADX / DMI
  const adxSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const plusDIRef = useRef<ISeriesApi<"Line"> | null>(null);
  const minusDIRef = useRef<ISeriesApi<"Line"> | null>(null);
  const adxKeyLevelRef = useRef<IPriceLine | null>(null);
  // Squeeze Momentum
  const sqzMomRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const sqzDataRef = useRef<SqzPoint[]>([]);

  const candlesRef = useRef<Candle[]>([]);

  const indicators = useChartStore((s) => s.indicators);
  const hidden = useChartStore((s) => s.hidden);
  const config = useChartStore((s) => s.config);
  const chartType = useChartStore((s) => s.chartType);
  const tool = useChartStore((s) => s.tool);
  const cursorMode = useChartStore((s) => s.cursorMode);
  const priceLines = useChartStore((s) => s.priceLines);
  const trendLines = useChartStore((s) => s.trendLines);
  const dashLines = useChartStore((s) => s.dashLines);
  const vLines = useChartStore((s) => s.vLines);
  const rectZones = useChartStore((s) => s.rectZones);
  const arrowLines = useChartStore((s) => s.arrowLines);
  const brushStrokes = useChartStore((s) => s.brushStrokes);
  const textLabels = useChartStore((s) => s.textLabels);
  const addPriceLine = useChartStore((s) => s.addPriceLine);
  const addTrendLine = useChartStore((s) => s.addTrendLine);
  const addDashLine = useChartStore((s) => s.addDashLine);
  const addVLine = useChartStore((s) => s.addVLine);
  const addRectZone = useChartStore((s) => s.addRectZone);
  const addArrowLine = useChartStore((s) => s.addArrowLine);
  const addBrushStroke = useChartStore((s) => s.addBrushStroke);
  const addTextLabel = useChartStore((s) => s.addTextLabel);
  const removeRectZone = useChartStore((s) => s.removeRectZone);
  const removeArrowLine = useChartStore((s) => s.removeArrowLine);
  const removeBrushStroke = useChartStore((s) => s.removeBrushStroke);
  const removeTextLabel = useChartStore((s) => s.removeTextLabel);
  const removeTrendLine = useChartStore((s) => s.removeTrendLine);
  const removeDashLine = useChartStore((s) => s.removeDashLine);
  const removeVLine = useChartStore((s) => s.removeVLine);
  const updatePriceLine = useChartStore((s) => s.updatePriceLine);
  const updateVLine = useChartStore((s) => s.updateVLine);
  const updateTrendLine = useChartStore((s) => s.updateTrendLine);
  const updateDashLine = useChartStore((s) => s.updateDashLine);
  const updateRectZone = useChartStore((s) => s.updateRectZone);
  const updateArrowLine = useChartStore((s) => s.updateArrowLine);
  const updateTextLabel = useChartStore((s) => s.updateTextLabel);
  const removeIndicator = useChartStore((s) => s.removeIndicator);
  const toggleHidden = useChartStore((s) => s.toggleHidden);
  const setSettingsTarget = useChartStore((s) => s.setSettingsTarget);

  const [isPanning, setIsPanning] = useState(false);
  const [countdown, setCountdown] = useState("");
  const [isNearDrawing, setIsNearDrawing] = useState(false);

  // Muestra las últimas ~150 velas con un pequeño margen a la derecha, como TradingView
  function resetView() {
    const chart = chartRef.current;
    const candles = candlesRef.current;
    if (!chart || !candles.length) return;
    const total = candles.length;
    const barsToShow = 150;
    const rightPadding = 8;
    chart.timeScale().setVisibleLogicalRange({
      from: total - barsToShow,
      to: total - 1 + rightPadding,
    });
  }
  const t = useTranslation();

  const measureClearToken = useChartStore((s) => s.measureClearToken);

  // Cache of the last crosshair position (populated by subscribeCrosshairMove).
  // Used as a reliable fallback when coordinateToPrice / xToTime fail in deep right-offset area.
  const lastCursorRef = useRef<{ time: number; price: number } | null>(null);

  // Native mouse Y relative to the chart container — used by dashline preview to get
  // correct cross-pane coordinates (param.point.y from LWC is pane-relative, not container-relative)
  const lastMouseYInContainerRef = useRef(0);

  const toolRef = useRef(tool);
  toolRef.current = tool;
  const cursorModeRef = useRef<CursorMode>(cursorMode);
  cursorModeRef.current = cursorMode;
  const addPriceLineRef = useRef(addPriceLine);
  addPriceLineRef.current = addPriceLine;
  const addTrendLineRef = useRef(addTrendLine);
  addTrendLineRef.current = addTrendLine;
  const addDashLineRef = useRef(addDashLine);
  addDashLineRef.current = addDashLine;
  const addVLineRef = useRef(addVLine);
  addVLineRef.current = addVLine;
  const symbolRef = useRef(symbol);
  symbolRef.current = symbol;
  const configRef = useRef(config);
  configRef.current = config;
  const chartTypeRef = useRef<ChartType>(chartType);
  chartTypeRef.current = chartType;

  const [hover, setHover] = useState<HoverInfo | null>(null);
  const [lastPrice, setLastPrice] = useState<{ value: number; pct: number } | null>(null);
  const [lastValues, setLastValues] = useState<LastValues>({});
  const [paneOffsets, setPaneOffsets] = useState<PaneOffset[]>([]);
  const [measure, setMeasure] = useState<MeasureState>(INITIAL_MEASURE);
  const [renderTick, setRenderTick] = useState(0);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; price: number | null } | null>(null);
  const measureRef = useRef(measure);
  measureRef.current = measure;

  // Reset measure overlay when the trash-can button calls clearDrawings
  useEffect(() => {
    setMeasure(INITIAL_MEASURE);
  }, [measureClearToken]);

  // Rectangle tool
  interface DrawPoint2 { time: number; price: number }
  const [rectPhase, setRectPhase] = useState<"idle" | "placing">("idle");
  const [rectA, setRectA] = useState<DrawPoint2 | null>(null);
  const [rectPreviewB, setRectPreviewB] = useState<DrawPoint2 | null>(null);
  const rectPhaseRef = useRef(rectPhase); rectPhaseRef.current = rectPhase;
  const rectARef = useRef(rectA); rectARef.current = rectA;

  // Arrow tool
  const [arrowPhase, setArrowPhase] = useState<"idle" | "placing">("idle");
  const [arrowA, setArrowA] = useState<DrawPoint2 | null>(null);
  const [arrowPreviewB, setArrowPreviewB] = useState<DrawPoint2 | null>(null);
  const arrowPhaseRef = useRef(arrowPhase); arrowPhaseRef.current = arrowPhase;
  const arrowARef = useRef(arrowA); arrowARef.current = arrowA;

  // Brush tool
  const isBrushingRef = useRef(false);
  const currentBrushRef = useRef<Array<{ time: number; price: number }>>([]);
  const [brushDraftPoints, setBrushDraftPoints] = useState<Array<{ time: number; price: number }>>([]);
  const brushTickRef = useRef(0);

  // Text tool
  const [textDraft, setTextDraft] = useState<{ x: number; y: number; time: number; price: number } | null>(null);
  const [textInput, setTextInput] = useState("");

  // Refs for new store actions
  const addRectZoneRef = useRef(addRectZone); addRectZoneRef.current = addRectZone;
  const addArrowLineRef = useRef(addArrowLine); addArrowLineRef.current = addArrowLine;
  const addBrushStrokeRef = useRef(addBrushStroke); addBrushStrokeRef.current = addBrushStroke;
  const addTextLabelRef = useRef(addTextLabel); addTextLabelRef.current = addTextLabel;
  const removeRectZoneRef = useRef(removeRectZone); removeRectZoneRef.current = removeRectZone;
  const removeArrowLineRef = useRef(removeArrowLine); removeArrowLineRef.current = removeArrowLine;
  const removeBrushStrokeRef = useRef(removeBrushStroke); removeBrushStrokeRef.current = removeBrushStroke;
  const removeTextLabelRef = useRef(removeTextLabel); removeTextLabelRef.current = removeTextLabel;
  const removeTrendLineRef = useRef(removeTrendLine); removeTrendLineRef.current = removeTrendLine;
  const removeDashLineRef = useRef(removeDashLine); removeDashLineRef.current = removeDashLine;
  const removeVLineRef = useRef(removeVLine); removeVLineRef.current = removeVLine;
  const updatePriceLineRef = useRef(updatePriceLine); updatePriceLineRef.current = updatePriceLine;
  const updateVLineRef = useRef(updateVLine); updateVLineRef.current = updateVLine;
  const updateTrendLineRef = useRef(updateTrendLine); updateTrendLineRef.current = updateTrendLine;
  const updateDashLineRef = useRef(updateDashLine); updateDashLineRef.current = updateDashLine;
  const updateRectZoneRef = useRef(updateRectZone); updateRectZoneRef.current = updateRectZone;
  const updateArrowLineRef = useRef(updateArrowLine); updateArrowLineRef.current = updateArrowLine;
  const updateTextLabelRef = useRef(updateTextLabel); updateTextLabelRef.current = updateTextLabel;

  // Drag-to-move state
  type DragState =
    | { kind: "priceline"; id: string; startPx: { x: number; y: number } }
    | { kind: "vline"; id: string; startPx: { x: number; y: number } }
    | { kind: "trendline" | "arrowline" | "rectzone" | "textlabel" | "measure"; id: string; startPx: { x: number; y: number }; startTime: number; startPrice: number; origA: { time: number; price: number }; origB: { time: number; price: number } }
    | { kind: "dashline"; id: string; startPx: { x: number; y: number }; startTime: number; startYFrac: number; origA: { time: number; yFraction: number }; origB: { time: number; yFraction: number } };
  const drawingDragRef = useRef<DragState | null>(null);

  // Trendline drawing state
  interface DrawPoint { time: number; price: number }
  const [trendlinePhase, setTrendlinePhase] = useState<"idle" | "placing">("idle");
  const [trendlineA, setTrendlineA] = useState<DrawPoint | null>(null);
  const [trendlinePreviewB, setTrendlinePreviewB] = useState<DrawPoint | null>(null);
  const trendlinePhaseRef = useRef(trendlinePhase);
  trendlinePhaseRef.current = trendlinePhase;
  const trendlineARef = useRef(trendlineA);
  trendlineARef.current = trendlineA;

  // Dashline drawing state — uses yFraction (not price) so it works across any pane
  interface DashPoint { time: number; yFraction: number }
  const [dashlinePhase, setDashlinePhase] = useState<"idle" | "placing">("idle");
  const [dashlineA, setDashlineA] = useState<DashPoint | null>(null);
  const [dashlinePreviewB, setDashlinePreviewB] = useState<DashPoint | null>(null);
  const dashlinePhaseRef = useRef(dashlinePhase);
  dashlinePhaseRef.current = dashlinePhase;
  const dashlineARef = useRef(dashlineA);
  dashlineARef.current = dashlineA;

  // Alt series (bar / line / area)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const altSeriesRef = useRef<ISeriesApi<any> | null>(null);

  function recomputePaneOffsets() {
    if (!chartRef.current) return;
    const panes = chartRef.current.panes();
    let top = 0;
    const offsets: PaneOffset[] = panes.map((p) => {
      const h = p.getHeight();
      const o = { top, height: h };
      top += h;
      return o;
    });
    setPaneOffsets(offsets);
  }

  // Extrapolate time from pixel x — works everywhere including empty right-offset area
  function xToTime(x: number): number | null {
    const chart = chartRef.current;
    const candles = candlesRef.current;
    if (!chart || candles.length === 0) return null;
    const logical = chart.timeScale().coordinateToLogical(x);
    if (logical !== null) {
      const idx = Math.round(logical);
      if (idx >= 0 && idx < candles.length) return candles[idx].time;
      if (idx < 0) return candles[0].time;
      if (candles.length < 2) return candles[candles.length - 1].time;
      const last = candles[candles.length - 1];
      return last.time + (idx - (candles.length - 1)) * (last.time - candles[candles.length - 2].time);
    }
    // coordinateToLogical returned null (can happen in the right-offset area in some LWC versions)
    // Fall back to pixel-distance extrapolation from the last two known bar positions
    if (candles.length < 2) return null;
    const last = candles[candles.length - 1];
    const prev = candles[candles.length - 2];
    const lastX = chart.timeScale().timeToCoordinate(last.time as UTCTimestamp);
    const prevX = chart.timeScale().timeToCoordinate(prev.time as UTCTimestamp);
    if (lastX === null || prevX === null || lastX === prevX) return null;
    const barsFromLast = (x - lastX) / (lastX - prevX);
    return last.time + Math.round(barsFromLast) * (last.time - prev.time);
  }

  // Reverse of xToTime: pixel X → LWC coordinate, with extrapolation for future/right-offset area
  function timeToX(time: number): number | null {
    const chart = chartRef.current;
    const candles = candlesRef.current;
    if (!chart || candles.length < 2) return null;
    const ts = chart.timeScale();
    const x = ts.timeToCoordinate(time as UTCTimestamp);
    if (x !== null) return x;
    // Extrapolate for future times beyond the last candle
    const last = candles.at(-1)!;
    const prev = candles.at(-2)!;
    const lastX = ts.timeToCoordinate(last.time as UTCTimestamp);
    const prevX = ts.timeToCoordinate(prev.time as UTCTimestamp);
    if (lastX === null || prevX === null || lastX === prevX) return null;
    const barInterval = last.time - prev.time;
    if (!barInterval) return null;
    const pixPerBar = lastX - prevX;
    return lastX + ((time - last.time) / barInterval) * pixPerBar;
  }

  // Reverse of coordinateToPrice: price → pixel Y, with extrapolation when price is out of visible range
  function priceToY(price: number): number | null {
    const series = candleSeriesRef.current;
    if (!series) return null;
    const y = series.priceToCoordinate(price) as number | null;
    if (y !== null) return y;
    // Calibrate using the hi/lo of recent candles that ARE in range
    const candles = candlesRef.current;
    if (candles.length < 2) return null;
    const recent = candles.slice(-100);
    const hi = Math.max(...recent.map((c) => c.high));
    const lo = Math.min(...recent.map((c) => c.low));
    if (hi === lo) return null;
    const hiY = series.priceToCoordinate(hi) as number | null;
    const loY = series.priceToCoordinate(lo) as number | null;
    if (hiY === null || loY === null || hiY === loY) return null;
    return hiY + (price - hi) * (loY - hiY) / (lo - hi);
  }

  // ─── Create chart once ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { color: TV_COLORS.bg },
        textColor: TV_COLORS.text,
        fontFamily: "var(--font-sans), Inter, system-ui, sans-serif",
        fontSize: 11,
        panes: { separatorColor: TV_COLORS.border, separatorHoverColor: TV_COLORS.border },
      },
      grid: {
        vertLines: { color: TV_COLORS.grid },
        horzLines: { color: TV_COLORS.grid },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: TV_COLORS.textMuted, width: 1, style: 3, labelBackgroundColor: TV_COLORS.panel },
        horzLine: { color: TV_COLORS.textMuted, width: 1, style: 3, labelBackgroundColor: TV_COLORS.panel },
      },
      rightPriceScale: {
        borderColor: TV_COLORS.border,
        textColor: TV_COLORS.textMuted,
      },
      timeScale: {
        borderColor: TV_COLORS.border,
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 12,
        barSpacing: 8,
      },
      autoSize: true,
    });

    candleSeriesRef.current = chart.addSeries(CandlestickSeries, {
      upColor: TV_COLORS.green,
      downColor: TV_COLORS.red,
      borderUpColor: TV_COLORS.green,
      borderDownColor: TV_COLORS.red,
      wickUpColor: TV_COLORS.green,
      wickDownColor: TV_COLORS.red,
      priceLineColor: TV_COLORS.textMuted,
      priceLineStyle: 2,
    });

    ema20Ref.current = chart.addSeries(LineSeries, {
      color: INDICATOR_COLORS.ema20,
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
    });
    ema50Ref.current = chart.addSeries(LineSeries, {
      color: INDICATOR_COLORS.ema50,
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
    });
    ema200Ref.current = chart.addSeries(LineSeries, {
      color: INDICATOR_COLORS.ema200,
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    chartRef.current = chart;

    chart.subscribeCrosshairMove((param) => {
      // Always cache cursor position — used as fallback in click handlers
      if (param.point && candleSeriesRef.current) {
        const cp = candleSeriesRef.current.coordinateToPrice(param.point.y) as number | null;
        const ct = param.time ? Number(param.time) : xToTime(param.point.x);
        if (cp !== null && isFinite(cp) && ct !== null) {
          lastCursorRef.current = { time: ct, price: cp };
        }
      }

      if (toolRef.current === "measure" && measureRef.current.phase === "placing" && param.point && candleSeriesRef.current) {
        const price = candleSeriesRef.current.coordinateToPrice(param.point.y);
        const time = param.time ? Number(param.time) : xToTime(param.point.x);
        if (price !== null && isFinite(price) && time !== null) {
          setMeasure((prev) => prev.phase === "placing" ? { ...prev, b: { time, price } } : prev);
        }
      }

      if (toolRef.current === "trendline" && trendlinePhaseRef.current === "placing" && param.point && candleSeriesRef.current) {
        const price = candleSeriesRef.current.coordinateToPrice(param.point.y);
        const time = param.time ? Number(param.time) : xToTime(param.point.x);
        if (price !== null && isFinite(price) && time !== null) {
          setTrendlinePreviewB({ time, price });
        }
      }

      // Dashline preview is updated in native onMove instead (param.point.y is pane-relative
      // which is wrong when the cursor is in a sub-pane like Squeeze Momentum)

      // Rectangle in-progress preview (works in empty area too)
      if (toolRef.current === "rectangle" && rectPhaseRef.current === "placing" && param.point && candleSeriesRef.current) {
        const p = candleSeriesRef.current.coordinateToPrice(param.point.y);
        const t = param.time ? Number(param.time) : xToTime(param.point.x);
        if (p !== null && isFinite(p) && t !== null) setRectPreviewB({ time: t, price: p });
      }

      // Arrow in-progress preview (works in empty area too)
      if (toolRef.current === "arrow" && arrowPhaseRef.current === "placing" && param.point && candleSeriesRef.current) {
        const p = candleSeriesRef.current.coordinateToPrice(param.point.y);
        const t = param.time ? Number(param.time) : xToTime(param.point.x);
        if (p !== null && isFinite(p) && t !== null) setArrowPreviewB({ time: t, price: p });
      }

      // Hover-near-drawing detection for grab cursor (cursor mode only)
      if (toolRef.current === "cursor" && param.point && candleSeriesRef.current) {
        const px = param.point.x, py = param.point.y;
        const THRESH = 10;
        const store = useChartStore.getState();
        const sym = symbolRef.current;
        let near = false;
        for (const pl of store.priceLines.filter((p) => p.symbol === sym)) {
          const y = priceToY(pl.price);
          if (y !== null && Math.abs(y - py) < THRESH) { near = true; break; }
        }
        if (!near) for (const vl of store.vLines.filter((v) => v.symbol === sym)) {
          const x = timeToX(vl.time);
          if (x !== null && Math.abs(x - px) < THRESH) { near = true; break; }
        }
        if (!near) for (const tl of store.trendLines.filter((t) => t.symbol === sym)) {
          const x1 = timeToX(tl.a.time), x2 = timeToX(tl.b.time);
          const y1 = priceToY(tl.a.price), y2 = priceToY(tl.b.price);
          if (x1 !== null && x2 !== null && y1 !== null && y2 !== null) {
            const dx = x2-x1, dy = y2-y1, lenSq = dx*dx+dy*dy;
            const u = lenSq ? Math.max(0, Math.min(1, ((px-x1)*dx+(py-y1)*dy)/lenSq)) : 0;
            if (Math.hypot(px-(x1+u*dx), py-(y1+u*dy)) < THRESH) { near = true; break; }
          }
        }
        if (!near) {
          const cH = containerRef.current?.offsetHeight ?? 1;
          for (const dl of store.dashLines.filter((d) => d.symbol === sym)) {
            const x1 = timeToX(dl.a.time), x2 = timeToX(dl.b.time);
            const y1 = dl.a.yFraction * cH, y2 = dl.b.yFraction * cH;
            if (x1 !== null && x2 !== null) {
              const dx = x2-x1, dy = y2-y1, lenSq = dx*dx+dy*dy;
              const u = lenSq ? Math.max(0, Math.min(1, ((px-x1)*dx+(py-y1)*dy)/lenSq)) : 0;
              if (Math.hypot(px-(x1+u*dx), py-(y1+u*dy)) < THRESH) { near = true; break; }
            }
          }
        }
        if (!near) for (const al of store.arrowLines.filter((a) => a.symbol === sym)) {
          const x1 = timeToX(al.a.time), x2 = timeToX(al.b.time);
          const y1 = priceToY(al.a.price), y2 = priceToY(al.b.price);
          if (x1 !== null && x2 !== null && y1 !== null && y2 !== null) {
            const dx = x2-x1, dy = y2-y1, lenSq = dx*dx+dy*dy;
            const u = lenSq ? Math.max(0, Math.min(1, ((px-x1)*dx+(py-y1)*dy)/lenSq)) : 0;
            if (Math.hypot(px-(x1+u*dx), py-(y1+u*dy)) < THRESH) { near = true; break; }
          }
        }
        if (!near) for (const rz of store.rectZones.filter((r) => r.symbol === sym)) {
          const x1 = timeToX(rz.a.time), x2 = timeToX(rz.b.time);
          const y1 = priceToY(rz.a.price), y2 = priceToY(rz.b.price);
          if (x1 !== null && x2 !== null && y1 !== null && y2 !== null) {
            if (px >= Math.min(x1,x2)-THRESH && px <= Math.max(x1,x2)+THRESH &&
                py >= Math.min(y1,y2)-THRESH && py <= Math.max(y1,y2)+THRESH) { near = true; break; }
          }
        }
        if (!near) for (const tl of store.textLabels.filter((l) => l.symbol === sym)) {
          const x = timeToX(tl.time), y = priceToY(tl.price);
          if (x !== null && y !== null && Math.hypot(x-px, y-py) < THRESH*2) { near = true; break; }
        }
        setIsNearDrawing(near);
      } else if (toolRef.current !== "cursor") {
        setIsNearDrawing(false);
      }

      if (!param.time || !candleSeriesRef.current) {
        setHover(null);
        return;
      }
      const data = param.seriesData.get(candleSeriesRef.current);
      const vol = volumeSeriesRef.current ? param.seriesData.get(volumeSeriesRef.current) : null;
      if (data && "open" in data) {
        const o = data.open as number;
        const c = data.close as number;
        setHover({
          o, h: data.high as number, l: data.low as number, c,
          v: vol && "value" in vol ? (vol.value as number) : 0,
          time: Number(param.time),
          pct: o === 0 ? 0 : ((c - o) / o) * 100,
        });
      }
    });

    const tsRangeHandler = () => setRenderTick((t) => t + 1);
    chart.timeScale().subscribeVisibleTimeRangeChange(tsRangeHandler);
    const logicalRangeHandler = () => setRenderTick((t) => t + 1);
    chart.timeScale().subscribeVisibleLogicalRangeChange(logicalRangeHandler);

    const ro = new ResizeObserver(() => {
      requestAnimationFrame(() => recomputePaneOffsets());
    });
    ro.observe(containerRef.current);
    recomputePaneOffsets();

    return () => {
      chart.timeScale().unsubscribeVisibleTimeRangeChange(tsRangeHandler);
      chart.timeScale().unsubscribeVisibleLogicalRangeChange(logicalRangeHandler);
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      volumeSeriesRef.current = null;
      altSeriesRef.current = null;
      ema20Ref.current = null;
      ema50Ref.current = null;
      ema200Ref.current = null;
      rsiRef.current = null;
      rsi30Ref.current = null;
      rsi70Ref.current = null;
      macdRef.current = null;
      macdSignalRef.current = null;
      macdHistRef.current = null;
      fourEma1Ref.current = null;
      fourEma2Ref.current = null;
      fourEma3Ref.current = null;
      fourEma4Ref.current = null;
      adxSeriesRef.current = null;
      plusDIRef.current = null;
      minusDIRef.current = null;
      adxKeyLevelRef.current = null;
      sqzMomRef.current = null;
      sqzDataRef.current = [];
    };
  }, []);

  // ─── Volume pane ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!chartRef.current) return;
    if (indicators.volume && !volumeSeriesRef.current) {
      const v = chartRef.current.addSeries(
        HistogramSeries,
        { priceFormat: { type: "volume" }, priceScaleId: "volume", color: TV_COLORS.textMuted, priceLineVisible: false, lastValueVisible: false },
        0,
      );
      v.priceScale().applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });
      volumeSeriesRef.current = v;
      const data = candlesRef.current.map((k) => ({
        time: k.time as UTCTimestamp,
        value: k.volume,
        color: k.close >= k.open ? `${TV_COLORS.green}66` : `${TV_COLORS.red}66`,
      }));
      v.setData(data);
    } else if (!indicators.volume && volumeSeriesRef.current && chartRef.current) {
      chartRef.current.removeSeries(volumeSeriesRef.current);
      volumeSeriesRef.current = null;
    }
    requestAnimationFrame(() => recomputePaneOffsets());
  }, [indicators.volume]);

  // ─── RSI pane ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!chartRef.current) return;
    if (indicators.rsi && !rsiRef.current) {
      const paneIndex = 1;
      const r = chartRef.current.addSeries(LineSeries, { color: INDICATOR_COLORS.rsi, lineWidth: 1, priceLineVisible: false, lastValueVisible: false }, paneIndex);
      const r30 = chartRef.current.addSeries(LineSeries, { color: TV_COLORS.textMuted, lineWidth: 1, lineStyle: 2, priceLineVisible: false, lastValueVisible: false }, paneIndex);
      const r70 = chartRef.current.addSeries(LineSeries, { color: TV_COLORS.textMuted, lineWidth: 1, lineStyle: 2, priceLineVisible: false, lastValueVisible: false }, paneIndex);
      rsiRef.current = r;
      rsi30Ref.current = r30;
      rsi70Ref.current = r70;
      try {
        chartRef.current.panes()[1]?.setStretchFactor(1);
        chartRef.current.panes()[0]?.setStretchFactor(3);
      } catch {}
      updateRSI();
    } else if (!indicators.rsi && rsiRef.current && chartRef.current) {
      chartRef.current.removeSeries(rsiRef.current);
      if (rsi30Ref.current) chartRef.current.removeSeries(rsi30Ref.current);
      if (rsi70Ref.current) chartRef.current.removeSeries(rsi70Ref.current);
      rsiRef.current = null;
      rsi30Ref.current = null;
      rsi70Ref.current = null;
    }
    requestAnimationFrame(() => recomputePaneOffsets());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [indicators.rsi]);

  // ─── MACD pane ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!chartRef.current) return;
    if (indicators.macd && !macdRef.current) {
      const paneIndex = indicators.rsi ? 2 : 1;
      const m = chartRef.current.addSeries(LineSeries, { color: INDICATOR_COLORS.macd, lineWidth: 1, priceLineVisible: false, lastValueVisible: false }, paneIndex);
      const s = chartRef.current.addSeries(LineSeries, { color: TV_COLORS.yellow, lineWidth: 1, priceLineVisible: false, lastValueVisible: false }, paneIndex);
      const h = chartRef.current.addSeries(HistogramSeries, { priceLineVisible: false, lastValueVisible: false }, paneIndex);
      macdRef.current = m;
      macdSignalRef.current = s;
      macdHistRef.current = h;
      try {
        chartRef.current.panes()[paneIndex]?.setStretchFactor(1);
        chartRef.current.panes()[0]?.setStretchFactor(3);
      } catch {}
      updateMACD();
    } else if (!indicators.macd && macdRef.current && chartRef.current) {
      if (macdRef.current) chartRef.current.removeSeries(macdRef.current);
      if (macdSignalRef.current) chartRef.current.removeSeries(macdSignalRef.current);
      if (macdHistRef.current) chartRef.current.removeSeries(macdHistRef.current);
      macdRef.current = null;
      macdSignalRef.current = null;
      macdHistRef.current = null;
    }
    requestAnimationFrame(() => recomputePaneOffsets());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [indicators.macd, indicators.rsi]);

  // ─── 4EMA — main pane overlay ──────────────────────────────────────────────
  useEffect(() => {
    if (!chartRef.current) return;
    if (indicators.fourEma && !fourEma1Ref.current) {
      const opts = (color: string, width: 1 | 2) => ({
        color, lineWidth: width, priceLineVisible: false, lastValueVisible: false,
      });
      fourEma1Ref.current = chartRef.current.addSeries(LineSeries, opts(FOUR_EMA_COLORS[0], 1), 0);
      fourEma2Ref.current = chartRef.current.addSeries(LineSeries, opts(FOUR_EMA_COLORS[1], 2), 0);
      fourEma3Ref.current = chartRef.current.addSeries(LineSeries, opts(FOUR_EMA_COLORS[2], 2), 0);
      fourEma4Ref.current = chartRef.current.addSeries(LineSeries, opts(FOUR_EMA_COLORS[3], 2), 0);
      updateFourEma();
    } else if (!indicators.fourEma && fourEma1Ref.current && chartRef.current) {
      if (fourEma1Ref.current) { chartRef.current.removeSeries(fourEma1Ref.current); fourEma1Ref.current = null; }
      if (fourEma2Ref.current) { chartRef.current.removeSeries(fourEma2Ref.current); fourEma2Ref.current = null; }
      if (fourEma3Ref.current) { chartRef.current.removeSeries(fourEma3Ref.current); fourEma3Ref.current = null; }
      if (fourEma4Ref.current) { chartRef.current.removeSeries(fourEma4Ref.current); fourEma4Ref.current = null; }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [indicators.fourEma]);

  // ─── ADX / DMI pane ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!chartRef.current) return;
    if (indicators.adx && !adxSeriesRef.current) {
      const paneIdx = 1 + (indicators.rsi ? 1 : 0) + (indicators.macd ? 1 : 0);
      adxSeriesRef.current = chartRef.current.addSeries(LineSeries, {
        color: INDICATOR_COLORS.adx, lineWidth: 2, priceLineVisible: false, lastValueVisible: false,
        priceScaleId: "right",
      }, paneIdx);
      plusDIRef.current = chartRef.current.addSeries(LineSeries, {
        color: "#2962ff", lineWidth: 1, priceLineVisible: false, lastValueVisible: false,
        visible: config.adxShowPlusDI, priceScaleId: "right",
      }, paneIdx);
      minusDIRef.current = chartRef.current.addSeries(LineSeries, {
        color: "#787b86", lineWidth: 1, priceLineVisible: false, lastValueVisible: false,
        visible: config.adxShowMinusDI, priceScaleId: "right",
      }, paneIdx);
      try {
        chartRef.current.panes()[paneIdx]?.setStretchFactor(1);
        chartRef.current.panes()[0]?.setStretchFactor(3);
      } catch {}
      updateADX();
    } else if (!indicators.adx && adxSeriesRef.current && chartRef.current) {
      adxKeyLevelRef.current = null;
      if (adxSeriesRef.current) { chartRef.current.removeSeries(adxSeriesRef.current); adxSeriesRef.current = null; }
      if (plusDIRef.current) { chartRef.current.removeSeries(plusDIRef.current); plusDIRef.current = null; }
      if (minusDIRef.current) { chartRef.current.removeSeries(minusDIRef.current); minusDIRef.current = null; }
    }
    requestAnimationFrame(() => recomputePaneOffsets());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [indicators.adx, indicators.rsi, indicators.macd]);

  // ─── Squeeze Momentum pane (shared with ADX) ──────────────────────────────
  useEffect(() => {
    if (!chartRef.current) return;
    if (indicators.sqzMom && !sqzMomRef.current) {
      // Same pane as ADX — no (adx ? 1 : 0) term
      const paneIdx = 1 + (indicators.rsi ? 1 : 0) + (indicators.macd ? 1 : 0);
      sqzMomRef.current = chartRef.current.addSeries(HistogramSeries, {
        priceLineVisible: false,
        lastValueVisible: false,
        priceScaleId: "left",
      }, paneIdx);
      sqzMomRef.current.priceScale().applyOptions({
        visible: false,
        scaleMargins: { top: 0.12, bottom: 0.05 },
      });
      try {
        chartRef.current.panes()[paneIdx]?.setStretchFactor(1);
        chartRef.current.panes()[0]?.setStretchFactor(3);
      } catch {}
      updateSQZ();
    } else if (!indicators.sqzMom && sqzMomRef.current && chartRef.current) {
      chartRef.current.removeSeries(sqzMomRef.current);
      sqzMomRef.current = null;
      sqzDataRef.current = [];
    }
    requestAnimationFrame(() => recomputePaneOffsets());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [indicators.sqzMom, indicators.rsi, indicators.macd]);

  // ─── Visibility (eye toggle) ────────────────────────────────────────────────
  useEffect(() => {
    const v = (key: IndicatorKey) => indicators[key] && !hidden[key];
    ema20Ref.current?.applyOptions({ visible: v("ema20") });
    ema50Ref.current?.applyOptions({ visible: v("ema50") });
    ema200Ref.current?.applyOptions({ visible: v("ema200") });
    if (rsiRef.current) rsiRef.current.applyOptions({ visible: v("rsi") });
    if (rsi30Ref.current) rsi30Ref.current.applyOptions({ visible: v("rsi") });
    if (rsi70Ref.current) rsi70Ref.current.applyOptions({ visible: v("rsi") });
    if (macdRef.current) macdRef.current.applyOptions({ visible: v("macd") });
    if (macdSignalRef.current) macdSignalRef.current.applyOptions({ visible: v("macd") });
    if (macdHistRef.current) macdHistRef.current.applyOptions({ visible: v("macd") });
    if (volumeSeriesRef.current) volumeSeriesRef.current.applyOptions({ visible: v("volume") });
    fourEma1Ref.current?.applyOptions({ visible: v("fourEma") });
    fourEma2Ref.current?.applyOptions({ visible: v("fourEma") });
    fourEma3Ref.current?.applyOptions({ visible: v("fourEma") });
    fourEma4Ref.current?.applyOptions({ visible: v("fourEma") });
    if (adxSeriesRef.current) adxSeriesRef.current.applyOptions({ visible: v("adx") });
    if (plusDIRef.current) plusDIRef.current.applyOptions({ visible: v("adx") && config.adxShowPlusDI });
    if (minusDIRef.current) minusDIRef.current.applyOptions({ visible: v("adx") && config.adxShowMinusDI });
    if (sqzMomRef.current) sqzMomRef.current.applyOptions({ visible: v("sqzMom") });
  }, [indicators, hidden]);

  // ─── Config change → recompute ────────────────────────────────────────────
  useEffect(() => { updateEMAs(); }, [config.ema20, config.ema50, config.ema200]);
  useEffect(() => { updateRSI(); }, [config.rsi]);
  useEffect(() => { updateMACD(); }, [config.macdFast, config.macdSlow, config.macdSignal]);
  useEffect(() => { updateFourEma(); }, [config.fourEma1, config.fourEma2, config.fourEma3, config.fourEma4]);
  useEffect(() => { updateADX(); }, [config.adxDiLen, config.adxLen, config.adxKeyLevel]);
  useEffect(() => {
    if (plusDIRef.current) plusDIRef.current.applyOptions({ visible: indicators.adx && !hidden.adx && config.adxShowPlusDI });
    if (minusDIRef.current) minusDIRef.current.applyOptions({ visible: indicators.adx && !hidden.adx && config.adxShowMinusDI });
  }, [config.adxShowPlusDI, config.adxShowMinusDI, indicators.adx, hidden.adx]);
  useEffect(() => { updateSQZ(); }, [config.sqzBbLen, config.sqzBbMult, config.sqzKcLen, config.sqzKcMult, config.sqzColorBullishUp, config.sqzColorBullishDown, config.sqzColorBearishDown, config.sqzColorBearishUp, config.sqzStyle]); // eslint-disable-line react-hooks/exhaustive-deps

  // Price lines, trendlines and vlines are rendered as SVG overlays — see drawingsRender above.

  // ─── Candle close countdown ───────────────────────────────────────────────
  useEffect(() => {
    const tfSecs = timeframeToSeconds(timeframe);
    if (!tfSecs) { setCountdown(""); return; }
    const tick = () => {
      const last = candlesRef.current.at(-1);
      if (!last) { setCountdown("--:--"); return; }
      const remaining = Math.max(0, (last.time + tfSecs) - Math.floor(Date.now() / 1000));
      setCountdown(formatCountdown(remaining));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [timeframe]);

  // ─── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        useChartStore.getState().undo();
      }
      if (e.altKey && e.key === "r") {
        e.preventDefault();
        resetView();
      }
      if (e.key === "Escape") {
        setTrendlinePhase("idle");
        setTrendlineA(null);
        setTrendlinePreviewB(null);
        setMeasure(INITIAL_MEASURE);
        setContextMenu(null);
        setRectPhase("idle");
        setRectA(null);
        setRectPreviewB(null);
        setArrowPhase("idle");
        setArrowA(null);
        setArrowPreviewB(null);
        setTextDraft(null);
        setTextInput("");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // ─── All drawing tools: DOM-based pointer detection ───────────────────────
  // - mousedown (window capture): starts brush strokes
  // - mousemove (window): collects brush points
  // - mouseup  (window capture): finalizes brush strokes
  // - click    (window capture): handles ALL other drawing tools
  //   Using 'click' instead of pointerup+dx/dy makes tools work everywhere,
  //   including the right-offset area where LWC blocks lower-level events.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Resolves relY → price using multiple fallbacks
    function getPrice(series: NonNullable<typeof candleSeriesRef.current>, relY: number): number | null {
      let p: number | null = series.coordinateToPrice(relY) as number | null;
      if (p !== null && isFinite(p)) return p;
      // Calibrate using hi/lo of recent candles — wider range, works for sub-panes and zoomed views
      const recent = candlesRef.current.slice(-100);
      if (recent.length >= 2) {
        const hi = Math.max(...recent.map((c) => c.high));
        const lo = Math.min(...recent.map((c) => c.low));
        if (hi !== lo) {
          const hiY = series.priceToCoordinate(hi) as number | null;
          const loY = series.priceToCoordinate(lo) as number | null;
          if (hiY !== null && loY !== null && hiY !== loY) {
            p = hi + (relY - hiY) * (lo - hi) / (loY - hiY);
            if (p !== null && isFinite(p)) return p;
          }
        }
      }
      return lastCursorRef.current?.price ?? null;
    }

    // Distance from point (px,py) to segment (x1,y1)-(x2,y2)
    function ptSeg(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
      const dx = x2 - x1, dy = y2 - y1, lenSq = dx * dx + dy * dy;
      if (lenSq === 0) return Math.hypot(px - x1, py - y1);
      const u = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lenSq));
      return Math.hypot(px - (x1 + u * dx), py - (y1 + u * dy));
    }

    // mousedown position — used to detect clicks (dx/dy < 5) inside onUp.
    // We can't rely on the native `click` event because LWC calls preventDefault()
    // on mousedown in the right-offset (future-bars) area, which cancels click.
    const downPos = { x: -1, y: -1 };

    // ── Brush: mousedown starts, mousemove collects, mouseup finalizes ──
    const onDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      downPos.x = e.clientX;
      downPos.y = e.clientY;

      // ── Drag-to-move: hit-test drawings in cursor mode ─────────────────
      if (toolRef.current === "cursor") {
        const chart2 = chartRef.current;
        const series = candleSeriesRef.current;
        if (chart2 && series) {
          const bounds = el.getBoundingClientRect();
          if (e.clientX >= bounds.left && e.clientX <= bounds.right &&
              e.clientY >= bounds.top  && e.clientY <= bounds.bottom) {
            const relX = e.clientX - bounds.left;
            const relY = e.clientY - bounds.top;
            const THRESH = 10;
            const store = useChartStore.getState();
            const sym = symbolRef.current;

            for (const pl of store.priceLines.filter((p) => p.symbol === sym)) {
              const y = priceToY(pl.price);
              if (y !== null && Math.abs(y - relY) < THRESH) {
                store.pushUndoSnapshot();
                drawingDragRef.current = { kind: "priceline", id: pl.id, startPx: { x: relX, y: relY } };
                e.stopPropagation(); e.preventDefault(); return;
              }
            }
            for (const vl of store.vLines.filter((v) => v.symbol === sym)) {
              const x = timeToX(vl.time);
              if (x !== null && Math.abs(x - relX) < THRESH) {
                store.pushUndoSnapshot();
                drawingDragRef.current = { kind: "vline", id: vl.id, startPx: { x: relX, y: relY } };
                e.stopPropagation(); e.preventDefault(); return;
              }
            }
            for (const tl of store.trendLines.filter((t) => t.symbol === sym)) {
              const x1 = timeToX(tl.a.time), x2 = timeToX(tl.b.time);
              const y1 = priceToY(tl.a.price), y2 = priceToY(tl.b.price);
              if (x1 !== null && x2 !== null && y1 !== null && y2 !== null && ptSeg(relX, relY, x1, y1, x2, y2) < THRESH) {
                const st = xToTime(relX), sp = getPrice(series, relY);
                if (st !== null && sp !== null) {
                  store.pushUndoSnapshot();
                  drawingDragRef.current = { kind: "trendline", id: tl.id, startPx: { x: relX, y: relY }, startTime: st, startPrice: sp, origA: { ...tl.a }, origB: { ...tl.b } };
                  e.stopPropagation(); e.preventDefault(); return;
                }
              }
            }
            {
              const cH = containerRef.current?.offsetHeight ?? 1;
              for (const dl of store.dashLines.filter((d) => d.symbol === sym)) {
                const x1 = timeToX(dl.a.time), x2 = timeToX(dl.b.time);
                const y1 = dl.a.yFraction * cH, y2 = dl.b.yFraction * cH;
                if (x1 !== null && x2 !== null && ptSeg(relX, relY, x1, y1, x2, y2) < THRESH) {
                  const st = xToTime(relX);
                  if (st !== null) {
                    store.pushUndoSnapshot();
                    drawingDragRef.current = { kind: "dashline", id: dl.id, startPx: { x: relX, y: relY }, startTime: st, startYFrac: relY / cH, origA: { ...dl.a }, origB: { ...dl.b } };
                    e.stopPropagation(); e.preventDefault(); return;
                  }
                }
              }
            }
            for (const al of store.arrowLines.filter((a) => a.symbol === sym)) {
              const x1 = timeToX(al.a.time), x2 = timeToX(al.b.time);
              const y1 = priceToY(al.a.price), y2 = priceToY(al.b.price);
              if (x1 !== null && x2 !== null && y1 !== null && y2 !== null && ptSeg(relX, relY, x1, y1, x2, y2) < THRESH) {
                const st = xToTime(relX), sp = getPrice(series, relY);
                if (st !== null && sp !== null) {
                  store.pushUndoSnapshot();
                  drawingDragRef.current = { kind: "arrowline", id: al.id, startPx: { x: relX, y: relY }, startTime: st, startPrice: sp, origA: { ...al.a }, origB: { ...al.b } };
                  e.stopPropagation(); e.preventDefault(); return;
                }
              }
            }
            for (const rz of store.rectZones.filter((r) => r.symbol === sym)) {
              const x1 = timeToX(rz.a.time), x2 = timeToX(rz.b.time);
              const y1 = priceToY(rz.a.price), y2 = priceToY(rz.b.price);
              if (x1 !== null && x2 !== null && y1 !== null && y2 !== null) {
                const inX = relX >= Math.min(x1, x2) - THRESH && relX <= Math.max(x1, x2) + THRESH;
                const inY = relY >= Math.min(y1, y2) - THRESH && relY <= Math.max(y1, y2) + THRESH;
                if (inX && inY) {
                  const st = xToTime(relX), sp = getPrice(series, relY);
                  if (st !== null && sp !== null) {
                    store.pushUndoSnapshot();
                    drawingDragRef.current = { kind: "rectzone", id: rz.id, startPx: { x: relX, y: relY }, startTime: st, startPrice: sp, origA: { ...rz.a }, origB: { ...rz.b } };
                    e.stopPropagation(); e.preventDefault(); return;
                  }
                }
              }
            }
            for (const tl of store.textLabels.filter((l) => l.symbol === sym)) {
              const x = timeToX(tl.time), y = priceToY(tl.price);
              if (x !== null && y !== null && Math.hypot(x - relX, y - relY) < THRESH * 2) {
                const st = xToTime(relX), sp = getPrice(series, relY);
                if (st !== null && sp !== null) {
                  store.pushUndoSnapshot();
                  drawingDragRef.current = { kind: "textlabel", id: tl.id, startPx: { x: relX, y: relY }, startTime: st, startPrice: sp, origA: { time: tl.time, price: tl.price }, origB: { time: tl.time, price: tl.price } };
                  e.stopPropagation(); e.preventDefault(); return;
                }
              }
            }
            // Measure overlay
            const meas = measureRef.current;
            if (meas.phase === "done" && meas.a && meas.b) {
              const ax = timeToX(meas.a.time), ay = priceToY(meas.a.price);
              const bx = timeToX(meas.b.time), by = priceToY(meas.b.price);
              if (ax !== null && bx !== null && ay !== null && by !== null) {
                const left = Math.min(ax, bx), right = Math.max(ax, bx);
                const top = Math.min(ay, by), bottom = Math.max(ay, by);
                if (relX >= left - THRESH && relX <= right + THRESH &&
                    relY >= top - THRESH  && relY <= bottom + THRESH) {
                  const st = xToTime(relX), sp = getPrice(series, relY);
                  if (st !== null && sp !== null) {
                    drawingDragRef.current = { kind: "measure", id: "measure", startPx: { x: relX, y: relY }, startTime: st, startPrice: sp, origA: { ...meas.a! }, origB: { ...meas.b! } };
                    e.stopPropagation(); e.preventDefault(); return;
                  }
                }
              }
            }
          }
        }
      }

      if (toolRef.current !== "brush") return;
      const bounds = el.getBoundingClientRect();
      if (e.clientX < bounds.left || e.clientX > bounds.right ||
          e.clientY < bounds.top  || e.clientY > bounds.bottom) return;
      isBrushingRef.current = true;
      currentBrushRef.current = [];
      brushTickRef.current = 0;
      setBrushDraftPoints([]);
    };

    const onMove = (e: MouseEvent) => {
      // ── Drag-to-move ───────────────────────────────────────────────────
      if (drawingDragRef.current) {
        const series = candleSeriesRef.current;
        if (!series) return;
        const rect = el.getBoundingClientRect();
        const relX = e.clientX - rect.left;
        const relY = e.clientY - rect.top;
        const drag = drawingDragRef.current;
        if (drag.kind === "priceline") {
          const np = getPrice(series, relY);
          if (np !== null) updatePriceLineRef.current(drag.id, np);
        } else if (drag.kind === "vline") {
          const nt = xToTime(relX);
          if (nt !== null) updateVLineRef.current(drag.id, nt);
        } else if (drag.kind === "dashline") {
          const ct = xToTime(relX);
          const cH = containerRef.current?.offsetHeight ?? 1;
          const dy = relY / cH - drag.startYFrac;
          const dt = ct !== null ? ct - drag.startTime : 0;
          const newA = { time: drag.origA.time + dt, yFraction: Math.max(0, Math.min(1, drag.origA.yFraction + dy)) };
          const newB = { time: drag.origB.time + dt, yFraction: Math.max(0, Math.min(1, drag.origB.yFraction + dy)) };
          updateDashLineRef.current(drag.id, newA, newB);
        } else {
          const ct = xToTime(relX), cp = getPrice(series, relY);
          if (ct === null || cp === null) return;
          const dt = ct - drag.startTime, dp = cp - drag.startPrice;
          const newA = { time: drag.origA.time + dt, price: drag.origA.price + dp };
          const newB = { time: drag.origB.time + dt, price: drag.origB.price + dp };
          if (drag.kind === "trendline")  updateTrendLineRef.current(drag.id, newA, newB);
          else if (drag.kind === "arrowline") updateArrowLineRef.current(drag.id, newA, newB);
          else if (drag.kind === "rectzone")  updateRectZoneRef.current(drag.id, newA, newB);
          else if (drag.kind === "textlabel") updateTextLabelRef.current(drag.id, newA.time, newA.price);
          else if (drag.kind === "measure")   setMeasure((prev) => prev.phase !== "done" ? prev : { ...prev, a: newA, b: newB });
        }
        return;
      }

      // Track native mouse position for dashline/measure previews — works everywhere including
      // sub-panes (Squeeze, ADX) and the future-bar area where LWC crosshair doesn't reach.
      {
        const bounds2 = el.getBoundingClientRect();
        if (e.clientX >= bounds2.left && e.clientX <= bounds2.right &&
            e.clientY >= bounds2.top  && e.clientY <= bounds2.bottom) {
          const rx = e.clientX - bounds2.left;
          const ry = e.clientY - bounds2.top;
          lastMouseYInContainerRef.current = ry;

          if (toolRef.current === "dashline" && dashlinePhaseRef.current === "placing") {
            const cH = containerRef.current?.offsetHeight ?? 1;
            const yFraction = ry / cH;
            const t2 = xToTime(rx) ?? lastCursorRef.current?.time ?? null;
            if (t2 !== null) setDashlinePreviewB({ time: t2, yFraction });
          }

          const ser2 = candleSeriesRef.current;
          if (ser2 && toolRef.current === "measure" && measureRef.current.phase === "placing") {
            const p2 = getPrice(ser2, ry);
            const t2 = xToTime(rx) ?? lastCursorRef.current?.time ?? null;
            if (p2 !== null && t2 !== null)
              setMeasure((prev) => prev.phase === "placing" ? { ...prev, b: { time: t2, price: p2 } } : prev);
          }
        }
      }

      if (!isBrushingRef.current) return;
      const series = candleSeriesRef.current;
      if (!series) return;
      const rect = el.getBoundingClientRect();
      const relX = e.clientX - rect.left;
      const relY = e.clientY - rect.top;
      const price = getPrice(series, relY);
      if (price === null) return;
      const time = xToTime(relX) ?? lastCursorRef.current?.time ?? null;
      if (time === null) return;
      currentBrushRef.current.push({ time, price });
      brushTickRef.current++;
      if (brushTickRef.current % 2 === 0) setBrushDraftPoints([...currentBrushRef.current]);
    };

    // ── mouseup: finalize brush OR detect a "click" for all other tools ──
    // Using mouseup instead of the native click event because LWC calls
    // preventDefault() on mousedown in the right-offset area, which would
    // silently cancel the click event — mouseup always fires regardless.
    const onUp = (e: MouseEvent) => {
      if (e.button !== 0) return;

      // ── End drag-to-move ────────────────────────────────────────────────
      if (drawingDragRef.current) {
        drawingDragRef.current = null;
        return;
      }

      // ── Brush finalize ──────────────────────────────────────────────────
      if (isBrushingRef.current) {
        isBrushingRef.current = false;
        const pts = currentBrushRef.current;
        if (pts.length >= 2) {
          addBrushStrokeRef.current(pts, symbolRef.current);
          useChartStore.getState().setTool("cursor");
        }
        currentBrushRef.current = [];
        setBrushDraftPoints([]);
        return;
      }

      // ── Click detection for all drawing tools ───────────────────────────
      // Reject if the mouse moved significantly (it was a pan, not a click)
      const dx = Math.abs(e.clientX - downPos.x);
      const dy = Math.abs(e.clientY - downPos.y);
      if (dx > 5 || dy > 5) return;

      const bounds = el.getBoundingClientRect();
      if (e.clientX < bounds.left || e.clientX > bounds.right ||
          e.clientY < bounds.top  || e.clientY > bounds.bottom) return;

      const t = toolRef.current;
      if (t === "cursor" || t === "brush") return;

      const relX = e.clientX - bounds.left;
      const relY = e.clientY - bounds.top;
      const series = candleSeriesRef.current;
      if (!series) return;

      // Dashline handled here (before price check) — works across all panes using yFraction
      if (t === "dashline") {
        const containerH = containerRef.current?.offsetHeight ?? 1;
        const yFraction = relY / containerH;
        const time = xToTime(relX);
        if (time === null) return;
        if (dashlinePhaseRef.current === "idle") {
          setDashlinePhase("placing"); setDashlineA({ time, yFraction }); setDashlinePreviewB({ time, yFraction });
        } else {
          const a = dashlineARef.current;
          if (a) addDashLineRef.current(a, { time, yFraction }, symbolRef.current);
          setDashlinePhase("idle"); setDashlineA(null); setDashlinePreviewB(null);
          useChartStore.getState().setTool("cursor");
        }
        return;
      }

      const price = getPrice(series, relY);
      if (price === null) return;

      if (t === "hline") {
        addPriceLineRef.current(price, symbolRef.current);
        useChartStore.getState().setTool("cursor");
        return;
      }

      // Eraser: hit-test all drawings by pixel proximity
      if (t === "eraser") {
        const chart2 = chartRef.current;
        if (!chart2) return;
        const ts2 = chart2.timeScale();
        const THRESH = 12;
        const store = useChartStore.getState();
        let bestDist = THRESH, bestRemove: (() => void) | null = null;
        for (const tl of store.trendLines.filter((l) => l.symbol === symbolRef.current)) {
          const x1 = ts2.timeToCoordinate(tl.a.time as UTCTimestamp);
          const x2 = ts2.timeToCoordinate(tl.b.time as UTCTimestamp);
          const y1 = series.priceToCoordinate(tl.a.price);
          const y2 = series.priceToCoordinate(tl.b.price);
          if (x1 !== null && x2 !== null && y1 !== null && y2 !== null) {
            const d = ptSeg(relX, relY, x1, y1, x2, y2);
            if (d < bestDist) { bestDist = d; bestRemove = () => removeTrendLineRef.current(tl.id); }
          }
        }
        {
          const cH = containerRef.current?.offsetHeight ?? 1;
          for (const dl of store.dashLines.filter((l) => l.symbol === symbolRef.current)) {
            const x1 = ts2.timeToCoordinate(dl.a.time as UTCTimestamp);
            const x2 = ts2.timeToCoordinate(dl.b.time as UTCTimestamp);
            const y1 = dl.a.yFraction * cH, y2 = dl.b.yFraction * cH;
            if (x1 !== null && x2 !== null) {
              const d = ptSeg(relX, relY, x1, y1, x2, y2);
              if (d < bestDist) { bestDist = d; bestRemove = () => removeDashLineRef.current(dl.id); }
            }
          }
        }
        for (const vl of store.vLines.filter((v) => v.symbol === symbolRef.current)) {
          const x = ts2.timeToCoordinate(vl.time as UTCTimestamp);
          if (x !== null && Math.abs(x - relX) < bestDist) { bestDist = Math.abs(x - relX); bestRemove = () => removeVLineRef.current(vl.id); }
        }
        for (const al of store.arrowLines.filter((a) => a.symbol === symbolRef.current)) {
          const x1 = ts2.timeToCoordinate(al.a.time as UTCTimestamp);
          const x2 = ts2.timeToCoordinate(al.b.time as UTCTimestamp);
          const y1 = series.priceToCoordinate(al.a.price);
          const y2 = series.priceToCoordinate(al.b.price);
          if (x1 !== null && x2 !== null && y1 !== null && y2 !== null) {
            const d = ptSeg(relX, relY, x1, y1, x2, y2);
            if (d < bestDist) { bestDist = d; bestRemove = () => removeArrowLineRef.current(al.id); }
          }
        }
        for (const rz of store.rectZones.filter((r) => r.symbol === symbolRef.current)) {
          const x1 = ts2.timeToCoordinate(rz.a.time as UTCTimestamp);
          const x2 = ts2.timeToCoordinate(rz.b.time as UTCTimestamp);
          const y1 = series.priceToCoordinate(rz.a.price);
          const y2 = series.priceToCoordinate(rz.b.price);
          if (x1 !== null && x2 !== null && y1 !== null && y2 !== null) {
            const inX = relX >= Math.min(x1,x2) - THRESH && relX <= Math.max(x1,x2) + THRESH;
            const inY = relY >= Math.min(y1,y2) - THRESH && relY <= Math.max(y1,y2) + THRESH;
            if (inX && inY) { bestDist = 0; bestRemove = () => removeRectZoneRef.current(rz.id); }
          }
        }
        for (const tl of store.textLabels.filter((l) => l.symbol === symbolRef.current)) {
          const x = ts2.timeToCoordinate(tl.time as UTCTimestamp);
          const y = series.priceToCoordinate(tl.price);
          if (x !== null && y !== null) {
            const d = Math.hypot(x - relX, y - relY);
            if (d < bestDist) { bestDist = d; bestRemove = () => removeTextLabelRef.current(tl.id); }
          }
        }
        for (const bs of store.brushStrokes.filter((b) => b.symbol === symbolRef.current)) {
          for (let k = 0; k < bs.points.length - 1; k++) {
            const x1 = ts2.timeToCoordinate(bs.points[k].time as UTCTimestamp);
            const x2 = ts2.timeToCoordinate(bs.points[k + 1].time as UTCTimestamp);
            const y1 = series.priceToCoordinate(bs.points[k].price);
            const y2 = series.priceToCoordinate(bs.points[k + 1].price);
            if (x1 !== null && x2 !== null && y1 !== null && y2 !== null) {
              const d = ptSeg(relX, relY, x1, y1, x2, y2);
              if (d < bestDist) { bestDist = d; bestRemove = () => removeBrushStrokeRef.current(bs.id); }
            }
          }
        }
        // Measure overlay — hit-test the line segment and the close button area
        const meas = measureRef.current;
        if (meas.phase === "done" && meas.a && meas.b) {
          const mx1 = ts2.timeToCoordinate(meas.a.time as UTCTimestamp);
          const mx2 = ts2.timeToCoordinate(meas.b.time as UTCTimestamp);
          const my1 = series.priceToCoordinate(meas.a.price);
          const my2 = series.priceToCoordinate(meas.b.price);
          if (mx1 !== null && mx2 !== null && my1 !== null && my2 !== null) {
            const d = ptSeg(relX, relY, mx1, my1, mx2, my2);
            if (d < bestDist) { bestDist = d; bestRemove = () => setMeasure(INITIAL_MEASURE); }
          }
        }

        if (bestRemove) { bestRemove(); useChartStore.getState().setTool("cursor"); }
        return;
      }

      const time = xToTime(relX) ?? lastCursorRef.current?.time ?? null;
      if (time === null) return;

      if (t === "vline") {
        addVLineRef.current(time, symbolRef.current);
        useChartStore.getState().setTool("cursor");
        return;
      }

      if (t === "measure") {
        const cur = measureRef.current;
        if (cur.phase === "idle") {
          setMeasure({ phase: "placing", a: { time, price }, b: { time, price } });
        } else if (cur.phase === "placing") {
          setMeasure({ phase: "done", a: cur.a, b: { time, price } });
          useChartStore.getState().setTool("cursor");
        } else {
          setMeasure({ phase: "placing", a: { time, price }, b: { time, price } });
        }
        return;
      }

      if (t === "trendline") {
        if (trendlinePhaseRef.current === "idle") {
          setTrendlinePhase("placing"); setTrendlineA({ time, price }); setTrendlinePreviewB({ time, price });
        } else {
          const a = trendlineARef.current;
          if (a) addTrendLineRef.current(a, { time, price }, symbolRef.current);
          setTrendlinePhase("idle"); setTrendlineA(null); setTrendlinePreviewB(null);
          // trendline is multi-use — stays active so you can draw the next impulse immediately
        }
        return;
      }

      if (t === "rectangle") {
        if (rectPhaseRef.current === "idle") {
          setRectPhase("placing"); setRectA({ time, price }); setRectPreviewB({ time, price });
        } else {
          const a = rectARef.current;
          if (a) addRectZoneRef.current(a, { time, price }, symbolRef.current);
          setRectPhase("idle"); setRectA(null); setRectPreviewB(null);
          useChartStore.getState().setTool("cursor");
        }
        return;
      }

      if (t === "arrow") {
        if (arrowPhaseRef.current === "idle") {
          setArrowPhase("placing"); setArrowA({ time, price }); setArrowPreviewB({ time, price });
        } else {
          const a = arrowARef.current;
          if (a) addArrowLineRef.current(a, { time, price }, symbolRef.current);
          setArrowPhase("idle"); setArrowA(null); setArrowPreviewB(null);
          useChartStore.getState().setTool("cursor");
        }
        return;
      }

      if (t === "text") {
        setTextDraft({ x: relX, y: relY, time, price });
        setTextInput("");
        // text auto-switches after the user presses Enter (handled in the input)
        return;
      }
    };

    window.addEventListener("mousedown", onDown, { capture: true });
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup",   onUp,   { capture: true });
    return () => {
      window.removeEventListener("mousedown", onDown, { capture: true });
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup",   onUp,   { capture: true });
    };
  }, []);

  // ─── Disable chart pan-on-drag when a drawing tool is active ──────────────
  useEffect(() => {
    if (!chartRef.current) return;
    const isTool = tool !== "cursor";
    chartRef.current.applyOptions({
      handleScroll: { mouseWheel: true, pressedMouseMove: !isTool, horzTouchDrag: !isTool, vertTouchDrag: !isTool },
    });
  }, [tool]);

  // ─── Crosshair mode per cursor selection ──────────────────────────────────
  useEffect(() => {
    if (!chartRef.current) return;
    // When a drawing tool is active always show crosshair; in cursor mode, respect cursorMode
    if (tool !== "cursor") {
      chartRef.current.applyOptions({ crosshair: { mode: CrosshairMode.Normal } });
      return;
    }
    chartRef.current.applyOptions({
      crosshair: { mode: cursorMode === "cross" ? CrosshairMode.Normal : CrosshairMode.Hidden },
    });
  }, [tool, cursorMode]);

  // ─── Grab cursor while panning ─────────────────────────────────────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onDown = (e: MouseEvent) => {
      if (toolRef.current === "cursor" && e.button === 0) setIsPanning(true);
    };
    const onUp = () => setIsPanning(false);
    el.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);
    return () => {
      el.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  // ─── Cursor style ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (containerRef.current) {
      const eraserSvg = `<svg xmlns='http://www.w3.org/2000/svg' width='22' height='20'><rect x='3' y='3' width='16' height='12' rx='2' fill='%23f28b82' stroke='%23c62828' stroke-width='1.5'/><rect x='3' y='11' width='16' height='4' rx='1' fill='%23ffffff50'/><line x1='3' y1='11' x2='19' y2='11' stroke='%23c62828' stroke-width='1'/></svg>`;
      const brushSvg = `<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24'><rect x='15' y='1' width='6' height='4' rx='1' fill='%23ef5350' transform='rotate(45 18 3)'/><rect x='6' y='6' width='6' height='10' rx='1' fill='%23ffd700' transform='rotate(45 9 11)'/><polygon points='2,22 5,16 8,19' fill='%23ffd700'/><circle cx='2' cy='22' r='1.5' fill='%23795548'/></svg>`;
      const rulerSvg = `<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24'><line x1='1' y1='12' x2='23' y2='12' stroke='white' stroke-width='1.2'/><line x1='12' y1='1' x2='12' y2='23' stroke='white' stroke-width='1.2'/><line x1='8' y1='10' x2='8' y2='14' stroke='white' stroke-width='1'/><line x1='16' y1='10' x2='16' y2='14' stroke='white' stroke-width='1'/><circle cx='12' cy='12' r='1.5' fill='white'/></svg>`;
      const dotSvg = `<svg xmlns='http://www.w3.org/2000/svg' width='18' height='18'><circle cx='9' cy='9' r='4.5' fill='rgba(255,255,255,0.92)' stroke='rgba(0,0,0,0.45)' stroke-width='1'/><line x1='9' y1='1' x2='9' y2='5' stroke='rgba(255,255,255,0.8)' stroke-width='1.2' stroke-linecap='round'/><line x1='9' y1='13' x2='9' y2='17' stroke='rgba(255,255,255,0.8)' stroke-width='1.2' stroke-linecap='round'/><line x1='1' y1='9' x2='5' y2='9' stroke='rgba(255,255,255,0.8)' stroke-width='1.2' stroke-linecap='round'/><line x1='13' y1='9' x2='17' y2='9' stroke='rgba(255,255,255,0.8)' stroke-width='1.2' stroke-linecap='round'/></svg>`;
      // Cross cursor: "+" with a dot in the center (white with dark shadow for visibility)
      const crossSvg = `<svg xmlns='http://www.w3.org/2000/svg' width='21' height='21'><line x1='10' y1='1' x2='10' y2='8' stroke='rgba(0,0,0,0.55)' stroke-width='2.5' stroke-linecap='round'/><line x1='10' y1='13' x2='10' y2='20' stroke='rgba(0,0,0,0.55)' stroke-width='2.5' stroke-linecap='round'/><line x1='1' y1='10' x2='8' y2='10' stroke='rgba(0,0,0,0.55)' stroke-width='2.5' stroke-linecap='round'/><line x1='13' y1='10' x2='20' y2='10' stroke='rgba(0,0,0,0.55)' stroke-width='2.5' stroke-linecap='round'/><circle cx='10' cy='10' r='3.2' fill='rgba(0,0,0,0.55)'/><line x1='10' y1='1' x2='10' y2='8' stroke='white' stroke-width='1.2' stroke-linecap='round'/><line x1='10' y1='13' x2='10' y2='20' stroke='white' stroke-width='1.2' stroke-linecap='round'/><line x1='1' y1='10' x2='8' y2='10' stroke='white' stroke-width='1.2' stroke-linecap='round'/><line x1='13' y1='10' x2='20' y2='10' stroke='white' stroke-width='1.2' stroke-linecap='round'/><circle cx='10' cy='10' r='2' fill='white'/></svg>`;
      const toCursor = (svg: string, hx: number, hy: number) =>
        `url("data:image/svg+xml,${svg}") ${hx} ${hy}, auto`;

      const crosshairTools = ["hline", "trendline", "dashline", "vline", "rectangle", "arrow", "text"];
      let cursor = "";
      if (tool === "eraser") cursor = toCursor(eraserSvg, 11, 15);
      else if (tool === "brush") cursor = toCursor(brushSvg, 3, 21);
      else if (tool === "measure") cursor = toCursor(rulerSvg, 12, 12);
      else if (crosshairTools.includes(tool)) cursor = "crosshair";
      else if (tool === "cursor") {
        if (isPanning) cursor = "grabbing";
        else if (isNearDrawing) cursor = "grab";
        else if (cursorMode === "arrow") cursor = "default";
        else if (cursorMode === "dot") cursor = toCursor(dotSvg, 9, 9);
        else if (cursorMode === "cross") cursor = toCursor(crossSvg, 10, 10);
      }
      containerRef.current.style.cursor = cursor;
    }
    if (tool !== "measure" && measureRef.current.phase !== "done") setMeasure(INITIAL_MEASURE);
    if (tool !== "trendline") {
      setTrendlinePhase("idle");
      setTrendlineA(null);
      setTrendlinePreviewB(null);
    }
    if (tool !== "dashline") {
      setDashlinePhase("idle");
      setDashlineA(null);
      setDashlinePreviewB(null);
    }
    if (tool !== "rectangle") { setRectPhase("idle"); setRectA(null); setRectPreviewB(null); }
    if (tool !== "arrow") { setArrowPhase("idle"); setArrowA(null); setArrowPreviewB(null); }
    if (tool !== "text") { setTextDraft(null); setTextInput(""); }
  }, [tool, cursorMode, isPanning, isNearDrawing]);

  // ─── Context menu (right-click) ───────────────────────────────────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = (e: MouseEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const relY = e.clientY - rect.top;
      const price = candleSeriesRef.current?.coordinateToPrice(relY) ?? null;
      setContextMenu({ x: e.clientX, y: e.clientY, price });
    };
    el.addEventListener("contextmenu", handler);
    return () => el.removeEventListener("contextmenu", handler);
  }, []);

  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [!!contextMenu]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Live price in browser tab ────────────────────────────────────────────
  useEffect(() => {
    if (!lastPrice) { document.title = "TradingLatino"; return; }
    const dir = lastPrice.pct >= 0 ? "▲" : "▼";
    const sign = lastPrice.pct >= 0 ? "+" : "";
    document.title = `${symbol} ${formatPrice(lastPrice.value)} ${dir} ${sign}${lastPrice.pct.toFixed(2)}% | TradingLatino`;
  }, [lastPrice, symbol]);

  // ─── Update functions ──────────────────────────────────────────────────────

  function updateEMAs() {
    const c = candlesRef.current;
    if (!c.length) return;
    const cfg = configRef.current;
    let last20: number | undefined, last50: number | undefined, last200: number | undefined;
    if (ema20Ref.current) {
      const data = ema(c, cfg.ema20);
      ema20Ref.current.setData(data.map((p) => ({ time: p.time as UTCTimestamp, value: p.value })));
      last20 = data.at(-1)?.value;
    }
    if (ema50Ref.current) {
      const data = ema(c, cfg.ema50);
      ema50Ref.current.setData(data.map((p) => ({ time: p.time as UTCTimestamp, value: p.value })));
      last50 = data.at(-1)?.value;
    }
    if (ema200Ref.current) {
      const data = ema(c, cfg.ema200);
      ema200Ref.current.setData(data.map((p) => ({ time: p.time as UTCTimestamp, value: p.value })));
      last200 = data.at(-1)?.value;
    }
    const lastVol = c.at(-1)?.volume;
    setLastValues((prev) => ({ ...prev, ema20: last20, ema50: last50, ema200: last200, volume: lastVol }));
  }

  function updateFourEma() {
    const c = candlesRef.current;
    if (!c.length || !fourEma1Ref.current) return;
    const cfg = configRef.current;
    const d1 = ema(c, cfg.fourEma1);
    const d2 = ema(c, cfg.fourEma2);
    const d3 = ema(c, cfg.fourEma3);
    const d4 = ema(c, cfg.fourEma4);
    const toSeries = (arr: typeof d1) => arr.map((p) => ({ time: p.time as UTCTimestamp, value: p.value }));
    fourEma1Ref.current.setData(toSeries(d1));
    fourEma2Ref.current?.setData(toSeries(d2));
    fourEma3Ref.current?.setData(toSeries(d3));
    fourEma4Ref.current?.setData(toSeries(d4));
    // Hide period-1 lines (they're just the close price — visually useless)
    fourEma3Ref.current?.applyOptions({ visible: cfg.fourEma3 > 1 });
    fourEma4Ref.current?.applyOptions({ visible: cfg.fourEma4 > 1 });
    setLastValues((prev) => ({
      ...prev,
      fourEma1: d1.at(-1)?.value,
      fourEma2: d2.at(-1)?.value,
      fourEma3: cfg.fourEma3 > 1 ? d3.at(-1)?.value : undefined,
      fourEma4: cfg.fourEma4 > 1 ? d4.at(-1)?.value : undefined,
    }));
  }

  function updateRSI() {
    const c = candlesRef.current;
    if (!c.length || !rsiRef.current) return;
    const cfg = configRef.current;
    const data = rsi(c, cfg.rsi).map((p) => ({ time: p.time as UTCTimestamp, value: p.value }));
    rsiRef.current.setData(data);
    if (rsi30Ref.current && data.length > 0)
      rsi30Ref.current.setData([{ time: data[0].time, value: 30 }, { time: data[data.length - 1].time, value: 30 }]);
    if (rsi70Ref.current && data.length > 0)
      rsi70Ref.current.setData([{ time: data[0].time, value: 70 }, { time: data[data.length - 1].time, value: 70 }]);
    setLastValues((prev) => ({ ...prev, rsi: data.at(-1)?.value }));
  }

  function updateMACD() {
    const c = candlesRef.current;
    if (!c.length || !macdRef.current) return;
    const cfg = configRef.current;
    const m = macd(c, cfg.macdFast, cfg.macdSlow, cfg.macdSignal);
    macdRef.current.setData(m.map((p) => ({ time: p.time as UTCTimestamp, value: p.macd })));
    macdSignalRef.current?.setData(m.map((p) => ({ time: p.time as UTCTimestamp, value: p.signal })));
    macdHistRef.current?.setData(
      m.map((p) => ({
        time: p.time as UTCTimestamp,
        value: p.histogram,
        color: p.histogram >= 0 ? `${TV_COLORS.green}80` : `${TV_COLORS.red}80`,
      })),
    );
    const last = m.at(-1);
    setLastValues((prev) => ({ ...prev, macd: last?.macd, macdSignal: last?.signal, macdHist: last?.histogram }));
  }

  function updateADX() {
    const c = candlesRef.current;
    const cfg = configRef.current;
    if (!c.length || !adxSeriesRef.current) return;
    const data = adxDmi(c, cfg.adxDiLen, cfg.adxLen);
    adxSeriesRef.current.setData(data.map((p) => ({ time: p.time as UTCTimestamp, value: p.adx })));
    plusDIRef.current?.setData(data.map((p) => ({ time: p.time as UTCTimestamp, value: p.plusDI })));
    minusDIRef.current?.setData(data.map((p) => ({ time: p.time as UTCTimestamp, value: p.minusDI })));
    // Recreate key level price line
    if (adxKeyLevelRef.current) {
      try { adxSeriesRef.current.removePriceLine(adxKeyLevelRef.current); } catch {}
    }
    adxKeyLevelRef.current = adxSeriesRef.current.createPriceLine({
      price: cfg.adxKeyLevel,
      color: "#d1d4dcb0",
      lineWidth: 2,
      lineStyle: 0,
      axisLabelVisible: true,
      title: `${cfg.adxKeyLevel}`,
    });
    const last = data.at(-1);
    setLastValues((prev) => ({ ...prev, adxVal: last?.adx, plusDI: last?.plusDI, minusDI: last?.minusDI }));
  }

  function updateSQZ() {
    const c = candlesRef.current;
    const cfg = configRef.current;
    if (!c.length || !sqzMomRef.current) return;
    const data = squeezeMomentum(c, cfg.sqzBbLen, cfg.sqzBbMult, cfg.sqzKcLen, cfg.sqzKcMult);
    sqzDataRef.current = data;
    if (cfg.sqzStyle === "columns") {
      sqzMomRef.current.setData(
        data.map((p, i) => {
          const prev = i > 0 ? data[i - 1].val : p.val;
          let color: string;
          if (p.val > 0) {
            color = p.val >= prev ? cfg.sqzColorBullishUp : cfg.sqzColorBullishDown;
          } else {
            color = p.val <= prev ? cfg.sqzColorBearishDown : cfg.sqzColorBearishUp;
          }
          return { time: p.time as UTCTimestamp, value: p.val, color };
        }),
      );
    } else {
      // Transparent bars — SVG overlay handles visual for line/area styles
      sqzMomRef.current.setData(
        data.map((p) => ({ time: p.time as UTCTimestamp, value: p.val, color: "rgba(0,0,0,0)" })),
      );
    }
    setLastValues((prev) => ({ ...prev, sqzMom: data.at(-1)?.val }));
    setRenderTick((t) => t + 1);
  }

  // ─── Load candle data + subscribe live ────────────────────────────────────
  useEffect(() => {
    let unsub: (() => void) | null = null;
    let unsubTicker: (() => void) | null = null;
    let cancelled = false;

    async function load() {
      // Clear stale data immediately so the chart doesn't show wrong range while loading
      candlesRef.current = [];
      candleSeriesRef.current?.setData([]);
      volumeSeriesRef.current?.setData([]);

      try {
        const klines = await fetchKlines(symbol, timeframe, 1000);
        if (cancelled) return;
        candlesRef.current = klines;
        if (candleSeriesRef.current) {
          candleSeriesRef.current.setData(
            klines.map((k) => ({
              time: k.time as UTCTimestamp,
              open: k.open, high: k.high, low: k.low, close: k.close,
            })),
          );
        }
        if (volumeSeriesRef.current) {
          volumeSeriesRef.current.setData(
            klines.map((k) => ({
              time: k.time as UTCTimestamp,
              value: k.volume,
              color: k.close >= k.open ? `${TV_COLORS.green}66` : `${TV_COLORS.red}66`,
            })),
          );
        }
        updateEMAs();
        updateFourEma();
        updateRSI();
        updateMACD();
        updateADX();
        updateSQZ();
        applyChartType(chartTypeRef.current);
        // Defer resetView one frame so LWC has processed setData before we set the range
        requestAnimationFrame(() => {
          resetView();
          recomputePaneOffsets();
        });

        if (klines.length > 0) {
          const last = klines[klines.length - 1];
          const prev = klines[klines.length - 2] ?? last;
          setLastPrice({
            value: last.close,
            pct: prev.close === 0 ? 0 : ((last.close - prev.close) / prev.close) * 100,
          });
        }

        const ws = getBinanceWS();
        unsub = ws.subscribeKline({
          symbol, interval: timeframe,
          onCandle: (k) => {
            if (!candleSeriesRef.current) return;
            const arr = candlesRef.current;
            const lastCandle = arr[arr.length - 1];
            if (lastCandle && lastCandle.time === k.time) {
              arr[arr.length - 1] = k;
            } else if (!lastCandle || k.time > lastCandle.time) {
              arr.push(k);
              if (arr.length > 2000) arr.shift();
            } else {
              return;
            }
            candleSeriesRef.current.update({
              time: k.time as UTCTimestamp,
              open: k.open, high: k.high, low: k.low, close: k.close,
            });
            if (volumeSeriesRef.current) {
              volumeSeriesRef.current.update({
                time: k.time as UTCTimestamp,
                value: k.volume,
                color: k.close >= k.open ? `${TV_COLORS.green}66` : `${TV_COLORS.red}66`,
              });
            }
            if (altSeriesRef.current) {
              const t = chartTypeRef.current;
              if (t === "bar") {
                altSeriesRef.current.update({ time: k.time as UTCTimestamp, open: k.open, high: k.high, low: k.low, close: k.close });
              } else {
                altSeriesRef.current.update({ time: k.time as UTCTimestamp, value: k.close });
              }
            }
            updateEMAs();
            updateFourEma();
            updateRSI();
            updateMACD();
            updateADX();
            updateSQZ();
            // lastPrice display is driven by mini-ticker below (same source as watchlist)
          },
        });

        // Mini-ticker fires every ~1s — same source as watchlist and symbol panel.
        // Drives lastPrice so all three displays stay perfectly in sync.
        unsubTicker = ws.subscribeMiniTickers([symbol], (tick) => {
          setLastPrice({ value: tick.close, pct: tick.pct });
        });
      } catch (e) {
        console.error("Failed to load chart data:", e);
      }
    }

    load();
    return () => {
      cancelled = true;
      if (unsub) unsub();
      if (unsubTicker) unsubTicker();
    };
  }, [symbol, timeframe]);

  // ─── Chart type switching ──────────────────────────────────────────────────
  function applyChartType(type: ChartType) {
    const chart = chartRef.current;
    const candles = candlesRef.current;
    if (!chart) return;

    // Remove previous alt series
    if (altSeriesRef.current) {
      try { chart.removeSeries(altSeriesRef.current); } catch {}
      altSeriesRef.current = null;
    }

    const isCandle = type === "candlestick";

    // Show/hide candlestick bodies
    if (candleSeriesRef.current) {
      if (isCandle) {
        candleSeriesRef.current.applyOptions({
          upColor: TV_COLORS.green, downColor: TV_COLORS.red,
          borderUpColor: TV_COLORS.green, borderDownColor: TV_COLORS.red,
          wickUpColor: TV_COLORS.green, wickDownColor: TV_COLORS.red,
        });
      } else {
        candleSeriesRef.current.applyOptions({
          upColor: "transparent", downColor: "transparent",
          borderUpColor: "transparent", borderDownColor: "transparent",
          wickUpColor: "transparent", wickDownColor: "transparent",
        });
      }
    }

    if (isCandle || !candles.length) return;

    const closeData = candles.map((k) => ({ time: k.time as UTCTimestamp, value: k.close }));
    const barData = candles.map((k) => ({ time: k.time as UTCTimestamp, open: k.open, high: k.high, low: k.low, close: k.close }));

    if (type === "line") {
      const s = chart.addSeries(LineSeries, { color: TV_COLORS.blue, lineWidth: 2, priceLineVisible: false, lastValueVisible: false }, 0);
      s.setData(closeData);
      altSeriesRef.current = s;
    } else if (type === "area") {
      const s = chart.addSeries(AreaSeries, { lineColor: TV_COLORS.blue, topColor: `${TV_COLORS.blue}50`, bottomColor: `${TV_COLORS.blue}00`, lineWidth: 2, priceLineVisible: false, lastValueVisible: false }, 0);
      s.setData(closeData);
      altSeriesRef.current = s;
    } else if (type === "bar") {
      const s = chart.addSeries(BarSeries, { upColor: TV_COLORS.green, downColor: TV_COLORS.red, priceLineVisible: false, lastValueVisible: false }, 0);
      s.setData(barData);
      altSeriesRef.current = s;
    }
  }

  useEffect(() => {
    applyChartType(chartType);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chartType]);

  const greenOrRed = (n: number) => (n >= 0 ? "text-tv-green" : "text-tv-red");

  // ─── Pane indices (dynamic) ────────────────────────────────────────────────
  const rsiPaneIdx = 1;
  const macdPaneIdx = indicators.rsi ? 2 : 1;
  const adxPaneIdx = 1 + (indicators.rsi ? 1 : 0) + (indicators.macd ? 1 : 0);
  // SQZ shares the same pane as ADX
  const sqzPaneIdx = adxPaneIdx;

  // ─── Measure overlay ───────────────────────────────────────────────────────
  let measureRender: React.ReactNode = null;
  if (measure.a && measure.b && chartRef.current && candleSeriesRef.current) {
    // Use timeToX / priceToY (both extrapolate) so the overlay renders even when
    // one or both points are in the future area beyond the last candle bar.
    const aX = timeToX(measure.a.time);
    const bX = timeToX(measure.b.time);
    const aY = priceToY(measure.a.price);
    const bY = priceToY(measure.b.price);
    if (aX !== null && bX !== null && aY !== null && bY !== null) {
      const priceDiff = measure.b.price - measure.a.price;
      const pctChange = measure.a.price === 0 ? 0 : (priceDiff / measure.a.price) * 100;
      const isUp = priceDiff >= 0;
      const start = Math.min(measure.a.time, measure.b.time);
      const end = Math.max(measure.a.time, measure.b.time);
      const inRange = candlesRef.current.filter((c) => c.time >= start && c.time <= end);
      measureRender = (
        <MeasureOverlay
          aX={aX} aY={aY} bX={bX} bY={bY}
          priceDiff={priceDiff} pctChange={pctChange}
          bars={inRange.length}
          volume={inRange.reduce((s, c) => s + c.volume, 0)}
          durationText={durationLabel(measure.a.time, measure.b.time)}
          isUp={isUp} isPreview={measure.phase === "placing"}
          barsLabel={t.measure.bars}
          volLabel={t.measure.vol}
          onClose={measure.phase === "done" ? () => setMeasure(INITIAL_MEASURE) : undefined}
        />
      );
    }
  }

  // ─── Drawings SVG overlay ────────────────────────────────────────────────
  let drawingsRender: React.ReactNode = null;
  void renderTick;
  {
    const chart = chartRef.current;
    const series = candleSeriesRef.current;
    const w = containerRef.current?.offsetWidth ?? 0;
    const h = containerRef.current?.offsetHeight ?? 0;
    if (chart && series && w > 0) {
      const elements: React.ReactNode[] = [];
      const priceAxisWidth = 65;
      const chartW = w - priceAxisWidth;

      // Arrowhead marker def
      elements.push(
        <defs key="defs">
          <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill="white" />
          </marker>
          <marker id="arrowhead-preview" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill="rgba(255,255,255,0.5)" />
          </marker>
        </defs>
      );

      // Horizontal price lines — white, solid, 1.5px
      for (const pl of priceLines.filter((p) => p.symbol === symbol)) {
        const y = priceToY(pl.price);
        if (y === null) continue;
        elements.push(
          <g key={`h-${pl.id}`}>
            <line x1={0} y1={y} x2={chartW} y2={y} stroke="rgba(255,255,255,0.85)" strokeWidth={1.5} />
            <rect x={chartW + 2} y={y - 8} width={priceAxisWidth - 4} height={16} rx={2} fill="rgba(255,255,255,0.2)" />
            <text x={chartW + priceAxisWidth / 2 - 1} y={y + 4} textAnchor="middle" fill="#fff" fontSize={10} fontFamily="monospace">
              {pl.price.toFixed(2)}
            </text>
          </g>
        );
      }

      // Trend lines
      const renderTrendLine = (tl: TrendLine, isPreview = false) => {
        const x1 = timeToX(tl.a.time);
        const x2 = timeToX(tl.b.time);
        const y1 = priceToY(tl.a.price);
        const y2 = priceToY(tl.b.price);
        if (x1 === null || x2 === null || y1 === null || y2 === null) return null;
        const TL_COLOR = "rgba(255,255,255,0.88)";
        const color = isPreview ? "rgba(255,255,255,0.38)" : TL_COLOR;
        return (
          <line key={`tl-${tl.id}`} x1={x1} y1={y1} x2={x2} y2={y2}
            stroke={color} strokeWidth={1.5} strokeDasharray={isPreview ? "5 3" : undefined} />
        );
      };

      for (const tl of trendLines.filter((t) => t.symbol === symbol)) {
        const el = renderTrendLine(tl);
        if (el) elements.push(el);
      }

      // In-progress trendline preview
      if (trendlinePhase === "placing" && trendlineA && trendlinePreviewB) {
        const preview: TrendLine = { id: "__preview", symbol, a: trendlineA, b: trendlinePreviewB };
        const el = renderTrendLine(preview, true);
        if (el) elements.push(el);
        const px = timeToX(trendlineA.time);
        const py = priceToY(trendlineA.price);
        if (px !== null && py !== null) {
          elements.push(<circle key="tl-dot-a" cx={px} cy={py} r={4} fill="rgba(255,255,255,0.88)" />);
        }
      }

      // Dashed lines — Y stored as yFraction so they work across all panes
      const cHForDash = containerRef.current?.offsetHeight ?? h;
      const renderDashLine = (dl: DashLine, isPreview = false) => {
        const x1 = timeToX(dl.a.time);
        const x2 = timeToX(dl.b.time);
        if (x1 === null || x2 === null) return null;
        const y1 = dl.a.yFraction * cHForDash;
        const y2 = dl.b.yFraction * cHForDash;
        const color = isPreview ? "rgba(255,255,255,0.38)" : "rgba(255,255,255,0.88)";
        return (
          <line key={`dl-${dl.id}`} x1={x1} y1={y1} x2={x2} y2={y2}
            stroke={color} strokeWidth={1.5} strokeDasharray="6 4" />
        );
      };

      for (const dl of dashLines.filter((d) => d.symbol === symbol)) {
        const el = renderDashLine(dl);
        if (el) elements.push(el);
      }

      // In-progress dashline preview
      if (dashlinePhase === "placing" && dashlineA && dashlinePreviewB) {
        const preview: DashLine = { id: "__dlpreview", symbol, a: dashlineA, b: dashlinePreviewB };
        const el = renderDashLine(preview, true);
        if (el) elements.push(el);
        const px = timeToX(dashlineA.time);
        const py = dashlineA.yFraction * cHForDash;
        if (px !== null) {
          elements.push(<circle key="dl-dot-a" cx={px} cy={py} r={4} fill="rgba(255,255,255,0.88)" />);
        }
      }

      // Vertical lines — white, solid, 1.5px
      for (const vl of vLines.filter((v) => v.symbol === symbol)) {
        const x = timeToX(vl.time);
        if (x === null) continue;
        elements.push(
          <line key={`vl-${vl.id}`} x1={x} y1={0} x2={x} y2={h}
            stroke="rgba(255,255,255,0.85)" strokeWidth={1.5} />
        );
      }

      // Rectangle zones — yellow semi-transparent
      for (const rz of rectZones.filter((r) => r.symbol === symbol)) {
        const x1 = timeToX(rz.a.time);
        const x2 = timeToX(rz.b.time);
        const y1 = priceToY(rz.a.price);
        const y2 = priceToY(rz.b.price);
        if (x1 === null || x2 === null || y1 === null || y2 === null) continue;
        const rx = Math.min(x1, x2), ry = Math.min(y1, y2);
        const rw = Math.abs(x2 - x1), rh = Math.abs(y2 - y1);
        elements.push(
          <rect key={`rz-${rz.id}`} x={rx} y={ry} width={rw} height={rh}
            fill="rgba(255,214,0,0.12)" stroke="#ffd700" strokeWidth={1.5} />
        );
      }

      // In-progress rectangle preview
      if (rectPhase === "placing" && rectA && rectPreviewB) {
        const x1 = timeToX(rectA.time);
        const x2 = timeToX(rectPreviewB.time);
        const y1 = priceToY(rectA.price);
        const y2 = priceToY(rectPreviewB.price);
        if (x1 !== null && x2 !== null && y1 !== null && y2 !== null) {
          const rx = Math.min(x1, x2), ry = Math.min(y1, y2);
          const rw = Math.abs(x2 - x1), rh = Math.abs(y2 - y1);
          elements.push(
            <rect key="rect-preview" x={rx} y={ry} width={rw} height={rh}
              fill="rgba(255,214,0,0.07)" stroke="rgba(255,215,0,0.5)" strokeWidth={1.5} strokeDasharray="5 3" />
          );
        }
      }

      // Arrow lines — dashed white with arrowhead
      for (const al of arrowLines.filter((a) => a.symbol === symbol)) {
        const x1 = timeToX(al.a.time);
        const x2 = timeToX(al.b.time);
        const y1 = priceToY(al.a.price);
        const y2 = priceToY(al.b.price);
        if (x1 === null || x2 === null || y1 === null || y2 === null) continue;
        elements.push(
          <line key={`al-${al.id}`} x1={x1} y1={y1} x2={x2} y2={y2}
            stroke="white" strokeWidth={1.5} strokeDasharray="6 3"
            markerEnd="url(#arrowhead)" />
        );
      }

      // In-progress arrow preview
      if (arrowPhase === "placing" && arrowA && arrowPreviewB) {
        const x1 = timeToX(arrowA.time);
        const x2 = timeToX(arrowPreviewB.time);
        const y1 = priceToY(arrowA.price);
        const y2 = priceToY(arrowPreviewB.price);
        if (x1 !== null && x2 !== null && y1 !== null && y2 !== null) {
          elements.push(
            <line key="arrow-preview" x1={x1} y1={y1} x2={x2} y2={y2}
              stroke="rgba(255,255,255,0.5)" strokeWidth={1.5} strokeDasharray="6 3"
              markerEnd="url(#arrowhead-preview)" />
          );
        }
      }

      // Brush strokes — yellow
      for (const bs of brushStrokes.filter((b) => b.symbol === symbol)) {
        if (bs.points.length < 2) continue;
        const pts = bs.points
          .map((p) => {
            const x = timeToX(p.time);
            const y = priceToY(p.price);
            return x !== null && y !== null ? `${x},${y}` : null;
          })
          .filter(Boolean)
          .join(" ");
        if (!pts) continue;
        elements.push(
          <polyline key={`bs-${bs.id}`} points={pts} fill="none"
            stroke="#ffeb3b" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        );
      }

      // In-progress brush draft
      if (brushDraftPoints.length >= 2) {
        const pts = brushDraftPoints
          .map((p) => {
            const x = timeToX(p.time);
            const y = priceToY(p.price);
            return x !== null && y !== null ? `${x},${y}` : null;
          })
          .filter(Boolean)
          .join(" ");
        if (pts) {
          elements.push(
            <polyline key="brush-draft" points={pts} fill="none"
              stroke="#ffeb3b" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          );
        }
      }

      // Text labels — small anchor dot in SVG; styled label rendered as HTML below
      for (const tl of textLabels.filter((t) => t.symbol === symbol)) {
        const x = timeToX(tl.time);
        const y = priceToY(tl.price);
        if (x === null || y === null) continue;
        elements.push(
          <circle key={`txt-dot-${tl.id}`} cx={x} cy={y} r={2.5}
            fill="white" opacity={0.75} />
        );
      }

      const hasContent = elements.length > 1 || trendlinePhase === "placing" || rectPhase === "placing" || arrowPhase === "placing" || brushDraftPoints.length > 0;
      if (hasContent) {
        drawingsRender = (
          <svg className="pointer-events-none absolute inset-0 z-10"
            style={{ width: "100%", height: "100%", overflow: "visible" }}>
            {elements}
          </svg>
        );
      }
    }
  }

  // ─── Text labels HTML overlay (professional styled pills) ───────────────
  let textLabelsHtmlRender: React.ReactNode = null;
  void renderTick;
  {
    if (chartRef.current && candleSeriesRef.current) {
      const nodes = textLabels
        .filter((tl) => tl.symbol === symbol)
        .flatMap((tl) => {
          const x = timeToX(tl.time);
          const y = priceToY(tl.price);
          if (x === null || y === null) return [];
          return [(
            <div
              key={`txt-html-${tl.id}`}
              className="pointer-events-none absolute z-10"
              style={{ left: x + 6, top: y - 14 }}
            >
              <div style={{
                display: "inline-block",
                background: "rgba(13, 15, 23, 0.82)",
                border: "1px solid rgba(255,255,255,0.18)",
                borderRadius: "5px",
                padding: "4px 10px",
                color: "#e0e3eb",
                fontSize: "13px",
                fontFamily: "Inter, -apple-system, system-ui, sans-serif",
                fontWeight: 500,
                letterSpacing: "0.01em",
                whiteSpace: "nowrap",
                boxShadow: "0 2px 12px rgba(0,0,0,0.6)",
                lineHeight: "1.45",
                backdropFilter: "blur(2px)",
              }}>
                {tl.text}
              </div>
            </div>
          )];
        });
      if (nodes.length > 0) textLabelsHtmlRender = <>{nodes}</>;
    }
  }

  // ─── SQZ line / area SVG overlay (non-columns styles) ────────────────────
  let sqzOverlayRender: React.ReactNode = null;
  if (indicators.sqzMom && !hidden.sqzMom && config.sqzStyle !== "columns" && chartRef.current && sqzDataRef.current.length > 0) {
    const ts = chartRef.current.timeScale();
    const range = ts.getVisibleRange();
    const sqzPane = paneOffsets[sqzPaneIdx];
    if (range && sqzPane && sqzPane.height > 0) {
      const from = Number(range.from);
      const to = Number(range.to);
      const cw = containerRef.current?.offsetWidth ?? 9999;
      const visibleSqz = sqzDataRef.current.filter((p) => p.time >= from && p.time <= to);
      if (visibleSqz.length >= 2) {
        const vals = visibleSqz.map((p) => p.val);
        const effectiveMin = Math.min(Math.min(...vals), 0);
        const effectiveMax = Math.max(Math.max(...vals), 0);
        const dataRange = effectiveMax - effectiveMin;
        if (dataRange > 0) {
          const topMargin = 0.12;
          const bottomMargin = 0.05;
          const plotBottom = sqzPane.top + sqzPane.height * (1 - bottomMargin);
          const plotHeight = sqzPane.height * (1 - topMargin - bottomMargin);
          const toY = (val: number) => plotBottom - ((val - effectiveMin) / dataRange) * plotHeight;
          const zeroY = toY(0);

          interface SqzOverlayPt { x: number; y: number; val: number; color: string }
          const pts: SqzOverlayPt[] = [];
          for (let i = 0; i < visibleSqz.length; i++) {
            const p = visibleSqz[i];
            const prev = i > 0 ? visibleSqz[i - 1].val : p.val;
            const x = ts.timeToCoordinate(p.time as UTCTimestamp);
            if (x === null || x < -100 || x > cw + 100) continue;
            let color: string;
            if (p.val > 0) {
              color = p.val >= prev ? config.sqzColorBullishUp : config.sqzColorBullishDown;
            } else {
              color = p.val <= prev ? config.sqzColorBearishDown : config.sqzColorBearishUp;
            }
            pts.push({ x, y: toY(p.val), val: p.val, color });
          }

          if (pts.length >= 2) {
            const elements: React.ReactNode[] = [];

            if (config.sqzStyle === "area") {
              // Each positive/negative region gets a clipPath of its exact curved outline.
              // Inside, each 4-color sub-segment is a full-height rect clipped to that outline.
              // Direct colors, no blending layers → maximum contrast between all 4 shades.
              const clipDefs: React.ReactNode[] = [];

              let ai = 0;
              while (ai < pts.length) {
                if (pts[ai].val === 0) { ai++; continue; }
                const isPos = pts[ai].val > 0;
                const rStart = ai;
                while (ai < pts.length && (isPos ? pts[ai].val >= 0 : pts[ai].val <= 0)) ai++;
                const grp = pts.slice(rStart, ai);
                if (grp.length < 1) continue;

                // Clip path = exact smooth outline of this region
                const clipId = `sqzrgn${rStart}`;
                const clipD = [`M ${grp[0].x},${zeroY}`,
                  ...grp.map((p) => `L ${p.x},${p.y}`),
                  `L ${grp[grp.length - 1].x},${zeroY} Z`].join(" ");
                clipDefs.push(
                  <clipPath key={clipId} id={clipId}><path d={clipD} /></clipPath>
                );

                // One full-height rect per 4-color segment, clipped to the region shape.
                // Rects extend to midpoints between neighbors so there are zero pixel gaps.
                let si = 0;
                while (si < grp.length) {
                  const col = grp[si].color;
                  const segStart = si;
                  while (si < grp.length && grp[si].color === col) si++;
                  const seg = grp.slice(segStart, si);
                  const xL = segStart > 0
                    ? (grp[segStart - 1].x + seg[0].x) / 2
                    : seg[0].x - 2;
                  const xR = si < grp.length
                    ? (seg[seg.length - 1].x + grp[si].x) / 2
                    : seg[seg.length - 1].x + 2;
                  elements.push(
                    <rect key={`sqzseg-${rStart}-${segStart}`}
                      x={xL} y={sqzPane.top}
                      width={Math.max(1, xR - xL)} height={sqzPane.height}
                      fill={col} fillOpacity={0.87}
                      clipPath={`url(#${clipId})`} />
                  );
                }
              }

              elements.unshift(<defs key="sqz-defs">{clipDefs}</defs>);
            }

            // Line (4-color segments) — used for both "line" and "area"
            let li = 0;
            while (li < pts.length) {
              const segColor = pts[li].color;
              let ei = li + 1;
              while (ei < pts.length && pts[ei].color === segColor) ei++;
              const seg = pts.slice(li, ei);
              if (seg.length >= 2) {
                const d = [`M ${seg[0].x},${seg[0].y}`, ...seg.slice(1).map((p) => `L ${p.x},${p.y}`)].join(" ");
                elements.push(<path key={`sqzln-${li}`} d={d} fill="none" stroke={segColor} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />);
              } else {
                elements.push(<circle key={`sqzpt-${li}`} cx={seg[0].x} cy={seg[0].y} r={2.5} fill={segColor} />);
              }
              li = ei;
            }

            if (elements.length > 0) {
              sqzOverlayRender = (
                <svg className="pointer-events-none absolute inset-0" style={{ width: "100%", height: "100%", overflow: "visible", zIndex: 4 }}>
                  {elements}
                </svg>
              );
            }
          }
        }
      }
    }
  }

  // ─── SQZ zero-line "+" crosses ────────────────────────────────────────────
  let sqzDotsRender: React.ReactNode = null;
  if (indicators.sqzMom && !hidden.sqzMom && chartRef.current && sqzDataRef.current.length > 0) {
    const ts = chartRef.current.timeScale();
    const range = ts.getVisibleRange();
    const sqzPane = paneOffsets[sqzPaneIdx];
    if (range && sqzPane && sqzPane.height > 0) {
      const from = Number(range.from);
      const to = Number(range.to);
      const cw = containerRef.current?.offsetWidth ?? 9999;
      const visibleSqz = sqzDataRef.current.filter((p) => p.time >= from && p.time <= to);
      if (visibleSqz.length > 0) {
        const vals = visibleSqz.map((p) => p.val);
        const dataMin = Math.min(...vals);
        const dataMax = Math.max(...vals);
        // Always include 0 so the zero line is within the pane
        const effectiveMin = Math.min(dataMin, 0);
        const effectiveMax = Math.max(dataMax, 0);
        const dataRange = effectiveMax - effectiveMin;
        if (dataRange > 0) {
          // Match the scaleMargins set on the SQZ price scale
          const topMargin = 0.12;
          const bottomMargin = 0.05;
          const plotTop = sqzPane.top + sqzPane.height * topMargin;
          const plotBottom = sqzPane.top + sqzPane.height * (1 - bottomMargin);
          const plotHeight = plotBottom - plotTop;
          const zeroY = plotBottom - ((0 - effectiveMin) / dataRange) * plotHeight;
          const crosses = visibleSqz
            .map((p, idx) => {
              const x = ts.timeToCoordinate(p.time as UTCTimestamp);
              if (x === null || x < -5 || x > cw + 5) return null;
              const stroke =
                p.sqzState === "none" ? config.sqzDotNoSqueeze
                : p.sqzState === "on" ? config.sqzDotOn
                : config.sqzDotOff;
              const arm = 2.5;
              return (
                <g key={idx}>
                  <line x1={x - arm} y1={zeroY} x2={x + arm} y2={zeroY} stroke={stroke} strokeWidth={1.5} strokeLinecap="round" />
                  <line x1={x} y1={zeroY - arm} x2={x} y2={zeroY + arm} stroke={stroke} strokeWidth={1.5} strokeLinecap="round" />
                </g>
              );
            })
            .filter(Boolean);
          if (crosses.length > 0) {
            sqzDotsRender = (
              <svg
                className="pointer-events-none absolute inset-0 z-10"
                style={{ width: "100%", height: "100%", overflow: "visible" }}
              >
                {crosses}
              </svg>
            );
          }
        }
      }
    }
  }

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />
      {drawingsRender}
      {textLabelsHtmlRender}
      {measureRender}

      {/* Text tool input — styled to match the committed label appearance */}
      {textDraft && (
        <div
          style={{ position: "absolute", left: textDraft.x + 6, top: textDraft.y - 14, zIndex: 30 }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <input
            autoFocus
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                if (textInput.trim()) {
                  addTextLabelRef.current(textDraft.time, textDraft.price, textInput.trim(), symbolRef.current);
                  useChartStore.getState().setTool("cursor");
                }
                setTextDraft(null);
                setTextInput("");
              }
              if (e.key === "Escape") {
                setTextDraft(null);
                setTextInput("");
              }
            }}
            onBlur={() => {
              if (textInput.trim()) {
                addTextLabelRef.current(textDraft.time, textDraft.price, textInput.trim(), symbolRef.current);
                useChartStore.getState().setTool("cursor");
              }
              setTextDraft(null);
              setTextInput("");
            }}
            style={{
              background: "rgba(13, 15, 23, 0.88)",
              border: "1px solid rgba(41, 98, 255, 0.7)",
              borderRadius: "5px",
              padding: "4px 10px",
              color: "#e0e3eb",
              fontSize: "13px",
              fontFamily: "Inter, -apple-system, system-ui, sans-serif",
              fontWeight: 500,
              letterSpacing: "0.01em",
              outline: "none",
              boxShadow: "0 2px 12px rgba(0,0,0,0.6), 0 0 0 2px rgba(41,98,255,0.25)",
              minWidth: "90px",
              lineHeight: "1.45",
            }}
            placeholder={t.chart.textPlaceholder}
          />
        </div>
      )}
      {sqzOverlayRender}
      {sqzDotsRender}

      {/* Candle close countdown — right price axis, below the current price label */}
      {(() => {
        if (!countdown) return null;
        const lastCandle = candlesRef.current.at(-1);
        if (!lastCandle) return null;
        const y = priceToY(lastCandle.close);
        if (y === null) return null;
        return (
          <div
            className="pointer-events-none absolute z-20 flex items-center justify-center"
            style={{ right: 0, top: y + 24, width: 65 }}
          >
            <span className="rounded px-1 py-0.5 text-[10px] font-medium tabular-nums text-tv-text-muted">
              {countdown}
            </span>
          </div>
        );
      })()}

      {/* VRVP overlay */}
      <VolumeProfile
        chartRef={chartRef}
        candlesRef={candlesRef}
        candleSeriesRef={candleSeriesRef}
        containerRef={containerRef}
        visible={indicators.vrvp}
        hidden={hidden.vrvp}
        maxBarWidth={300}
        tick={renderTick}
      />

      {/* Top-left: symbol info + OHLC */}
      <div
        style={{ top: (paneOffsets[0]?.top ?? 0) + 12, left: 12 }}
        className="pointer-events-none absolute z-10 flex flex-col gap-1 text-xs tabular-nums"
      >
        <div className="flex h-5 flex-nowrap items-center gap-x-3 overflow-hidden whitespace-nowrap">
          <div className="flex shrink-0 items-center gap-2 text-[13px] font-semibold">
            <span className="text-tv-text">{symbol}</span>
            <span className="text-tv-text-muted">·</span>
            <span className="uppercase text-tv-text-muted">{timeframe}</span>
            <span className="text-tv-text-muted">·</span>
            <span className="text-tv-text-muted">Binance</span>
          </div>
          {hover && (
            <div className="flex items-center gap-x-3 text-[11px]">
              <span className="text-tv-text-muted">O <span className={greenOrRed(hover.c - hover.o)}>{formatPrice(hover.o)}</span></span>
              <span className="text-tv-text-muted">H <span className={greenOrRed(hover.c - hover.o)}>{formatPrice(hover.h)}</span></span>
              <span className="text-tv-text-muted">L <span className={greenOrRed(hover.c - hover.o)}>{formatPrice(hover.l)}</span></span>
              <span className="text-tv-text-muted">C <span className={greenOrRed(hover.c - hover.o)}>{formatPrice(hover.c)}</span></span>
              <span className={greenOrRed(hover.pct)}>{hover.pct >= 0 ? "+" : ""}{hover.pct.toFixed(2)}%</span>
              <span className="text-tv-text-muted">Vol <span className="text-tv-text">{formatVolume(hover.v)}</span></span>
            </div>
          )}
        </div>

        <div className="flex h-7 items-center gap-2">
          {lastPrice ? (
            <>
              <span className={`text-lg font-semibold tabular-nums ${greenOrRed(lastPrice.pct)}`}>
                {formatPrice(lastPrice.value)}
              </span>
              <span className={`text-xs ${greenOrRed(lastPrice.pct)}`}>
                {lastPrice.pct >= 0 ? "+" : ""}{lastPrice.pct.toFixed(2)}%
              </span>
            </>
          ) : (
            <span className="text-xs text-tv-text-muted">{t.chart.loading}</span>
          )}
        </div>

        {/* Candle close countdown */}
        {countdown && (
          <div className="flex items-center gap-1.5">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="shrink-0 text-tv-text-muted">
              <circle cx="5" cy="5" r="4" stroke="currentColor" strokeWidth="1.2"/>
              <line x1="5" y1="2.5" x2="5" y2="5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
              <line x1="5" y1="5" x2="7" y2="6.2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
            <span className="tabular-nums text-[11px] text-tv-text-muted">{countdown}</span>
          </div>
        )}

        {/* Main pane pills */}
        <div className="mt-1 flex flex-col items-start gap-1">
          {indicators.ema20 && (
            <IndicatorPill
              name={`EMA ${config.ema20}`} value={lastValues.ema20 !== undefined ? formatPrice(lastValues.ema20) : undefined}
              color={INDICATOR_COLORS.ema20} hidden={hidden.ema20}
              onToggleHide={() => toggleHidden("ema20")} onSettings={() => setSettingsTarget("ema20")} onRemove={() => removeIndicator("ema20")}
            />
          )}
          {indicators.ema50 && (
            <IndicatorPill
              name={`EMA ${config.ema50}`} value={lastValues.ema50 !== undefined ? formatPrice(lastValues.ema50) : undefined}
              color={INDICATOR_COLORS.ema50} hidden={hidden.ema50}
              onToggleHide={() => toggleHidden("ema50")} onSettings={() => setSettingsTarget("ema50")} onRemove={() => removeIndicator("ema50")}
            />
          )}
          {indicators.ema200 && (
            <IndicatorPill
              name={`EMA ${config.ema200}`} value={lastValues.ema200 !== undefined ? formatPrice(lastValues.ema200) : undefined}
              color={INDICATOR_COLORS.ema200} hidden={hidden.ema200}
              onToggleHide={() => toggleHidden("ema200")} onSettings={() => setSettingsTarget("ema200")} onRemove={() => removeIndicator("ema200")}
            />
          )}
          {indicators.fourEma && (
            <IndicatorPill
              name={`4EMA ${config.fourEma1} ${config.fourEma2} ${config.fourEma3} ${config.fourEma4}`}
              value={lastValues.fourEma4 !== undefined ? formatPrice(lastValues.fourEma4) : undefined}
              color={FOUR_EMA_COLORS[3]} hidden={hidden.fourEma}
              onToggleHide={() => toggleHidden("fourEma")} onSettings={() => setSettingsTarget("fourEma")} onRemove={() => removeIndicator("fourEma")}
            />
          )}
          {indicators.volume && (
            <IndicatorPill
              name="Vol" value={lastValues.volume !== undefined ? formatVolume(lastValues.volume) : undefined}
              color={INDICATOR_COLORS.volume} hidden={hidden.volume}
              onToggleHide={() => toggleHidden("volume")} onSettings={() => setSettingsTarget("volume")} onRemove={() => removeIndicator("volume")}
            />
          )}
        </div>
      </div>

      {/* RSI pane label */}
      {indicators.rsi && paneOffsets[rsiPaneIdx] && (
        <div style={{ top: paneOffsets[rsiPaneIdx].top + 6, left: 12 }} className="pointer-events-none absolute z-10">
          <IndicatorPill
            name={`RSI ${config.rsi}`} value={lastValues.rsi !== undefined ? lastValues.rsi.toFixed(2) : undefined}
            color={INDICATOR_COLORS.rsi} hidden={hidden.rsi}
            onToggleHide={() => toggleHidden("rsi")} onSettings={() => setSettingsTarget("rsi")} onRemove={() => removeIndicator("rsi")}
          />
        </div>
      )}

      {/* MACD pane label */}
      {indicators.macd && paneOffsets[macdPaneIdx] && (
        <div style={{ top: paneOffsets[macdPaneIdx].top + 6, left: 12 }} className="pointer-events-none absolute z-10">
          <IndicatorPill
            name={`MACD ${config.macdFast}, ${config.macdSlow}, ${config.macdSignal}`}
            value={lastValues.macd !== undefined ? `${lastValues.macd.toFixed(2)} / ${(lastValues.macdSignal ?? 0).toFixed(2)}` : undefined}
            color={INDICATOR_COLORS.macd} hidden={hidden.macd}
            onToggleHide={() => toggleHidden("macd")} onSettings={() => setSettingsTarget("macd")} onRemove={() => removeIndicator("macd")}
          />
        </div>
      )}

      {/* ADX pane label */}
      {indicators.adx && paneOffsets[adxPaneIdx] && (
        <div style={{ top: paneOffsets[adxPaneIdx].top + 6, left: 12 }} className="pointer-events-none absolute z-10">
          <IndicatorPill
            name={`ADX ${config.adxDiLen}`}
            value={lastValues.adxVal !== undefined ? `${lastValues.adxVal.toFixed(1)} +${(lastValues.plusDI ?? 0).toFixed(1)} -${(lastValues.minusDI ?? 0).toFixed(1)}` : undefined}
            color={INDICATOR_COLORS.adx} hidden={hidden.adx}
            onToggleHide={() => toggleHidden("adx")} onSettings={() => setSettingsTarget("adx")} onRemove={() => removeIndicator("adx")}
          />
        </div>
      )}

      {/* Right-click context menu */}
      {contextMenu && (
        <div
          className="fixed z-50 min-w-[220px] overflow-hidden rounded border border-[#2a2e39] bg-[#1e222d] py-1 text-sm shadow-xl"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="flex w-full items-center gap-3 px-4 py-2 text-left text-[#d1d4dc] hover:bg-white/5"
            onClick={() => { resetView(); setContextMenu(null); }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0">
              <path d="M7 2a5 5 0 1 0 4.33 2.5" stroke="#d1d4dc" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M11.5 2v3h-3" stroke="#d1d4dc" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="flex-1">Reset chart view</span>
            <span className="text-xs text-[#787b86]">Alt+R</span>
          </button>
          {contextMenu.price !== null && (
            <>
              <div className="my-1 border-t border-[#2a2e39]" />
              <button
                className="flex w-full items-center gap-3 px-4 py-2 text-left text-[#d1d4dc] hover:bg-white/5"
                onClick={() => { navigator.clipboard?.writeText(formatPrice(contextMenu.price!)); setContextMenu(null); }}
              >
                Copy price {formatPrice(contextMenu.price!)}
              </button>
            </>
          )}
        </div>
      )}

      {/* SQZ pane label — shares ADX pane, offset below ADX pill */}
      {indicators.sqzMom && paneOffsets[sqzPaneIdx] && (
        <div style={{ top: paneOffsets[sqzPaneIdx].top + (indicators.adx ? 28 : 6), left: 12 }} className="pointer-events-none absolute z-10">
          <IndicatorPill
            name={`SQZ ${config.sqzBbLen}/${config.sqzKcLen}`}
            value={lastValues.sqzMom !== undefined ? lastValues.sqzMom.toFixed(4) : undefined}
            color={INDICATOR_COLORS.sqzMom} hidden={hidden.sqzMom}
            onToggleHide={() => toggleHidden("sqzMom")} onSettings={() => setSettingsTarget("sqzMom")} onRemove={() => removeIndicator("sqzMom")}
          />
        </div>
      )}
    </div>
  );
}
