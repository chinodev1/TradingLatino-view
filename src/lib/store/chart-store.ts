"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Timeframe } from "@/lib/binance/types";
import type { Lang } from "@/lib/i18n";

export type IndicatorKey =
  | "ema20"
  | "ema50"
  | "ema200"
  | "rsi"
  | "macd"
  | "volume"
  | "fourEma"
  | "adx"
  | "sqzMom"
  | "vrvp"
  | "bb"
  | "vwap"
  | "stochRsi"
  | "williamsR"
  | "atr"
  | "cci"
  | "obv"
  | "mfi";

export type DrawingTool = "cursor" | "hline" | "measure" | "eraser" | "trendline" | "dashline" | "vline" | "rectangle" | "arrow" | "brush" | "text" | "fibonacci";

export type CursorMode = "cross" | "dot" | "arrow";

export type ChartType = "candlestick" | "bar" | "line" | "area" | "heikinashi";

export interface TrendLine {
  id: string;
  symbol: string;
  a: { time: number; price: number };
  b: { time: number; price: number };
}

export interface DashLine {
  id: string;
  symbol: string;
  // Y stored as fraction of container height (0=top, 1=bottom) so it works across all panes
  a: { time: number; yFraction: number };
  b: { time: number; yFraction: number };
}

export interface VLine {
  id: string;
  symbol: string;
  time: number;
}

export interface PriceLine {
  id: string;
  symbol: string;
  price: number;
}

export interface RectZone {
  id: string;
  symbol: string;
  a: { time: number; price: number };
  b: { time: number; price: number };
}

export interface ArrowLine {
  id: string;
  symbol: string;
  a: { time: number; price: number };
  b: { time: number; price: number };
}

export interface BrushStroke {
  id: string;
  symbol: string;
  points: Array<{ time: number; price: number }>;
}

export interface TextLabel {
  id: string;
  symbol: string;
  time: number;
  price: number;
  text: string;
}

export interface FiboZone {
  id: string;
  symbol: string;
  a: { time: number; price: number };
  b: { time: number; price: number };
}

function genId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;
}

export interface IndicatorConfig {
  ema20: number;
  ema50: number;
  ema200: number;
  rsi: number;
  macdFast: number;
  macdSlow: number;
  macdSignal: number;
  // 4EMA
  fourEma1: number;
  fourEma2: number;
  fourEma3: number;
  fourEma4: number;
  // ADX / DMI
  adxDiLen: number;
  adxLen: number;
  adxKeyLevel: number;
  adxShowPlusDI: boolean;
  adxShowMinusDI: boolean;
  // Squeeze Momentum
  sqzBbLen: number;
  sqzBbMult: number;
  sqzKcLen: number;
  sqzKcMult: number;
  // SQZ histogram colors
  sqzColorBullishUp: string;
  sqzColorBullishDown: string;
  sqzColorBearishDown: string;
  sqzColorBearishUp: string;
  // SQZ dot/cross colors
  sqzDotNoSqueeze: string;
  sqzDotOn: string;
  sqzDotOff: string;
  // SQZ chart style
  sqzStyle: "columns" | "line" | "area";
  // Bollinger Bands
  bbPeriod: number;
  bbMult: number;
  // Stochastic RSI
  stochRsiLen: number;
  stochRsiPeriod: number;
  stochRsiSmoothK: number;
  stochRsiSmoothD: number;
  // Williams %R
  williamsRPeriod: number;
  // ATR
  atrPeriod: number;
  // CCI
  cciPeriod: number;
  // MFI
  mfiPeriod: number;
}

export const DEFAULT_CONFIG: IndicatorConfig = {
  ema20: 20,
  ema50: 50,
  ema200: 200,
  rsi: 14,
  macdFast: 12,
  macdSlow: 26,
  macdSignal: 9,
  fourEma1: 55,
  fourEma2: 10,
  fourEma3: 1,
  fourEma4: 1,
  adxDiLen: 14,
  adxLen: 14,
  adxKeyLevel: 23,
  adxShowPlusDI: false,
  adxShowMinusDI: false,
  sqzBbLen: 20,
  sqzBbMult: 2.0,
  sqzKcLen: 20,
  sqzKcMult: 1.5,
  sqzColorBullishUp: "#00e676",
  sqzColorBullishDown: "#1b6e1b",
  sqzColorBearishDown: "#ff1744",
  sqzColorBearishUp: "#9a0000",
  sqzDotNoSqueeze: "#2962ff",
  sqzDotOn: "#000000",
  sqzDotOff: "#787b86",
  sqzStyle: "columns" as const,
  bbPeriod: 20,
  bbMult: 2.0,
  stochRsiLen: 14,
  stochRsiPeriod: 14,
  stochRsiSmoothK: 3,
  stochRsiSmoothD: 3,
  williamsRPeriod: 14,
  atrPeriod: 14,
  cciPeriod: 20,
  mfiPeriod: 14,
};

export const INDICATOR_COLORS: Record<IndicatorKey, string> = {
  ema20: "#ffb74d",
  ema50: "#2962ff",
  ema200: "#ab47bc",
  rsi: "#ab47bc",
  macd: "#2962ff",
  volume: "#787b86",
  fourEma: "#ff9800",
  adx: "#b2b5be",
  sqzMom: "#00c853",
  vrvp: "#2962ff",
  bb: "#2962ff",
  vwap: "#ff9800",
  stochRsi: "#2962ff",
  williamsR: "#ab47bc",
  atr: "#ffb74d",
  cci: "#26a69a",
  obv: "#2962ff",
  mfi: "#ff6d00",
};

/** Colors for each of the 4 EMA lines: slot1=orange(55), slot2=blue(10), slot3/4=dim */
export const FOUR_EMA_COLORS = ["#ff9800", "#2962ff", "#00bcd4", "#ab47bc"] as const;

export const DEFAULT_WATCHLIST = [
  "BTCUSDT",
  "ETHUSDT",
  "SOLUSDT",
  "BNBUSDT",
  "XRPUSDT",
  "DOGEUSDT",
  "ADAUSDT",
  "AVAXUSDT",
  "LINKUSDT",
  "MATICUSDT",
];

type DrawingSnapshot = {
  priceLines: PriceLine[];
  trendLines: TrendLine[];
  dashLines: DashLine[];
  vLines: VLine[];
  rectZones: RectZone[];
  arrowLines: ArrowLine[];
  brushStrokes: BrushStroke[];
  textLabels: TextLabel[];
  fiboZones: FiboZone[];
};

interface ChartState {
  symbol: string;
  timeframe: Timeframe;
  chartType: ChartType;
  language: Lang;
  /** Indicator is added to the chart (appears in pill + renders unless hidden) */
  indicators: Record<IndicatorKey, boolean>;
  /** Indicator is hidden (eye icon off) — kept in pill list, just not rendered */
  hidden: Record<IndicatorKey, boolean>;
  /** Periods and parameters for each indicator */
  config: IndicatorConfig;
  watchlist: string[];

  // Ephemeral UI state (not persisted)
  tool: DrawingTool;
  cursorMode: CursorMode;
  priceLines: PriceLine[];
  trendLines: TrendLine[];
  dashLines: DashLine[];
  vLines: VLine[];
  rectZones: RectZone[];
  arrowLines: ArrowLine[];
  brushStrokes: BrushStroke[];
  textLabels: TextLabel[];
  fiboZones: FiboZone[];
  undoStack: DrawingSnapshot[];
  symbolDialogOpen: boolean;
  /** Which indicator's settings dialog is open (null = closed) */
  settingsTarget: IndicatorKey | null;
  /** Increments each time clearDrawings is called — lets PriceChart reset local measure state */
  measureClearToken: number;
  logScale: boolean;
  triggerResetView: (() => void) | null;
  triggerScreenshot: (() => void) | null;

  // Actions
  setSymbol: (s: string) => void;
  setTimeframe: (t: Timeframe) => void;
  setChartType: (t: ChartType) => void;
  setLanguage: (l: Lang) => void;
  toggleIndicator: (key: IndicatorKey) => void;
  removeIndicator: (key: IndicatorKey) => void;
  toggleHidden: (key: IndicatorKey) => void;
  setConfig: (patch: Partial<IndicatorConfig>) => void;
  addToWatchlist: (s: string) => void;
  removeFromWatchlist: (s: string) => void;
  setTool: (t: DrawingTool) => void;
  setCursorMode: (mode: CursorMode) => void;
  addPriceLine: (price: number, symbol: string) => void;
  addTrendLine: (a: { time: number; price: number }, b: { time: number; price: number }, symbol: string) => void;
  removeTrendLine: (id: string) => void;
  addDashLine: (a: { time: number; yFraction: number }, b: { time: number; yFraction: number }, symbol: string) => void;
  removeDashLine: (id: string) => void;
  updateDashLine: (id: string, a: { time: number; yFraction: number }, b: { time: number; yFraction: number }) => void;
  addVLine: (time: number, symbol: string) => void;
  removeVLine: (id: string) => void;
  addRectZone: (a: { time: number; price: number }, b: { time: number; price: number }, symbol: string) => void;
  removeRectZone: (id: string) => void;
  addArrowLine: (a: { time: number; price: number }, b: { time: number; price: number }, symbol: string) => void;
  removeArrowLine: (id: string) => void;
  addBrushStroke: (points: Array<{ time: number; price: number }>, symbol: string) => void;
  removeBrushStroke: (id: string) => void;
  addTextLabel: (time: number, price: number, text: string, symbol: string) => void;
  removeTextLabel: (id: string) => void;
  updatePriceLine: (id: string, price: number) => void;
  updateVLine: (id: string, time: number) => void;
  updateTrendLine: (id: string, a: { time: number; price: number }, b: { time: number; price: number }) => void;
  updateRectZone: (id: string, a: { time: number; price: number }, b: { time: number; price: number }) => void;
  updateArrowLine: (id: string, a: { time: number; price: number }, b: { time: number; price: number }) => void;
  updateTextLabel: (id: string, time: number, price: number) => void;
  pushUndoSnapshot: () => void;
  clearDrawings: (symbol?: string) => void;
  /** @deprecated use clearDrawings */
  clearPriceLines: (symbol?: string) => void;
  undo: () => void;
  setSymbolDialogOpen: (v: boolean) => void;
  setSettingsTarget: (k: IndicatorKey | null) => void;
  addFiboZone: (a: { time: number; price: number }, b: { time: number; price: number }, symbol: string) => void;
  removeFiboZone: (id: string) => void;
  setLogScale: (v: boolean) => void;
  setTriggerResetView: (fn: (() => void) | null) => void;
  setTriggerScreenshot: (fn: (() => void) | null) => void;
}

function snap(s: ChartState): DrawingSnapshot {
  return {
    priceLines: s.priceLines,
    trendLines: s.trendLines,
    dashLines: s.dashLines,
    vLines: s.vLines,
    rectZones: s.rectZones,
    arrowLines: s.arrowLines,
    brushStrokes: s.brushStrokes,
    textLabels: s.textLabels,
    fiboZones: s.fiboZones,
  };
}

export const useChartStore = create<ChartState>()(
  persist(
    (set) => ({
      symbol: "BTCUSDT",
      timeframe: "1d" as Timeframe,
      indicators: {
        ema20: false,
        ema50: false,
        ema200: false,
        rsi: false,
        macd: false,
        volume: false,
        fourEma: true,
        adx: true,
        sqzMom: true,
        vrvp: true,
        bb: false,
        vwap: false,
        stochRsi: false,
        williamsR: false,
        atr: false,
        cci: false,
        obv: false,
        mfi: false,
      },
      hidden: {
        ema20: false,
        ema50: false,
        ema200: false,
        rsi: false,
        macd: false,
        volume: false,
        fourEma: false,
        adx: false,
        sqzMom: false,
        vrvp: false,
        bb: false,
        vwap: false,
        stochRsi: false,
        williamsR: false,
        atr: false,
        cci: false,
        obv: false,
        mfi: false,
      },
      config: { ...DEFAULT_CONFIG },
      watchlist: DEFAULT_WATCHLIST,
      chartType: "candlestick" as ChartType,
      language: "es" as Lang,
      tool: "cursor",
      cursorMode: "cross",
      priceLines: [],
      trendLines: [],
      dashLines: [],
      vLines: [],
      rectZones: [],
      arrowLines: [],
      brushStrokes: [],
      textLabels: [],
      fiboZones: [],
      undoStack: [],
      symbolDialogOpen: false,
      settingsTarget: null,
      measureClearToken: 0,
      logScale: false,
      triggerResetView: null,
      triggerScreenshot: null,

      setSymbol: (symbol) => set({ symbol }),
      setLanguage: (language) => set({ language }),
      setTimeframe: (timeframe) => set({ timeframe }),
      setChartType: (chartType) => set({ chartType }),
      toggleIndicator: (key) =>
        set((s) => ({
          indicators: { ...s.indicators, [key]: !s.indicators[key] },
          hidden: !s.indicators[key]
            ? { ...s.hidden, [key]: false }
            : s.hidden,
        })),
      removeIndicator: (key) =>
        set((s) => ({
          indicators: { ...s.indicators, [key]: false },
          hidden: { ...s.hidden, [key]: false },
        })),
      toggleHidden: (key) =>
        set((s) => ({ hidden: { ...s.hidden, [key]: !s.hidden[key] } })),
      setConfig: (patch) =>
        set((s) => ({ config: { ...s.config, ...patch } })),
      addToWatchlist: (s) =>
        set((state) => ({
          watchlist: state.watchlist.includes(s)
            ? state.watchlist
            : [...state.watchlist, s],
        })),
      removeFromWatchlist: (s) =>
        set((state) => ({
          watchlist: state.watchlist.filter((x) => x !== s),
        })),
      setTool: (tool) => set({ tool }),
      setCursorMode: (cursorMode) => set({ cursorMode }),
      addPriceLine: (price, symbol) =>
        set((state) => ({
          undoStack: [...state.undoStack.slice(-19), snap(state)],
          priceLines: [...state.priceLines, { id: genId(), symbol, price }],
        })),
      addTrendLine: (a, b, symbol) =>
        set((state) => ({
          undoStack: [...state.undoStack.slice(-19), snap(state)],
          trendLines: [...state.trendLines, { id: genId(), symbol, a, b }],
        })),
      removeTrendLine: (id) =>
        set((state) => ({ trendLines: state.trendLines.filter((t) => t.id !== id) })),
      addDashLine: (a, b, symbol) =>
        set((state) => ({
          undoStack: [...state.undoStack.slice(-19), snap(state)],
          dashLines: [...state.dashLines, { id: genId(), symbol, a, b }],
        })),
      removeDashLine: (id) =>
        set((state) => ({ dashLines: state.dashLines.filter((d) => d.id !== id) })),
      updateDashLine: (id, a, b) =>
        set((s) => ({ dashLines: s.dashLines.map((d) => d.id === id ? { ...d, a, b } : d) })),
      addVLine: (time, symbol) =>
        set((state) => ({
          undoStack: [...state.undoStack.slice(-19), snap(state)],
          vLines: [...state.vLines, { id: genId(), symbol, time }],
        })),
      removeVLine: (id) =>
        set((state) => ({ vLines: state.vLines.filter((v) => v.id !== id) })),
      addRectZone: (a, b, symbol) =>
        set((state) => ({
          undoStack: [...state.undoStack.slice(-19), snap(state)],
          rectZones: [...state.rectZones, { id: genId(), symbol, a, b }],
        })),
      removeRectZone: (id) =>
        set((state) => ({ rectZones: state.rectZones.filter((r) => r.id !== id) })),
      addArrowLine: (a, b, symbol) =>
        set((state) => ({
          undoStack: [...state.undoStack.slice(-19), snap(state)],
          arrowLines: [...state.arrowLines, { id: genId(), symbol, a, b }],
        })),
      removeArrowLine: (id) =>
        set((state) => ({ arrowLines: state.arrowLines.filter((a) => a.id !== id) })),
      addBrushStroke: (points, symbol) =>
        set((state) => ({
          undoStack: [...state.undoStack.slice(-19), snap(state)],
          brushStrokes: [...state.brushStrokes, { id: genId(), symbol, points }],
        })),
      removeBrushStroke: (id) =>
        set((state) => ({ brushStrokes: state.brushStrokes.filter((b) => b.id !== id) })),
      addTextLabel: (time, price, text, symbol) =>
        set((state) => ({
          undoStack: [...state.undoStack.slice(-19), snap(state)],
          textLabels: [...state.textLabels, { id: genId(), symbol, time, price, text }],
        })),
      removeTextLabel: (id) =>
        set((state) => ({ textLabels: state.textLabels.filter((t) => t.id !== id) })),
      updatePriceLine: (id, price) =>
        set((s) => ({ priceLines: s.priceLines.map((p) => p.id === id ? { ...p, price } : p) })),
      updateVLine: (id, time) =>
        set((s) => ({ vLines: s.vLines.map((v) => v.id === id ? { ...v, time } : v) })),
      updateTrendLine: (id, a, b) =>
        set((s) => ({ trendLines: s.trendLines.map((tl) => tl.id === id ? { ...tl, a, b } : tl) })),
      updateRectZone: (id, a, b) =>
        set((s) => ({ rectZones: s.rectZones.map((r) => r.id === id ? { ...r, a, b } : r) })),
      updateArrowLine: (id, a, b) =>
        set((s) => ({ arrowLines: s.arrowLines.map((al) => al.id === id ? { ...al, a, b } : al) })),
      updateTextLabel: (id, time, price) =>
        set((s) => ({ textLabels: s.textLabels.map((tl) => tl.id === id ? { ...tl, time, price } : tl) })),
      pushUndoSnapshot: () =>
        set((s) => ({ undoStack: [...s.undoStack.slice(-19), snap(s)] })),
      clearDrawings: (symbol) =>
        set((state) => ({
          priceLines:   symbol ? state.priceLines.filter((p)   => p.symbol !== symbol)   : [],
          trendLines:   symbol ? state.trendLines.filter((t)   => t.symbol !== symbol)   : [],
          dashLines:    symbol ? state.dashLines.filter((d)    => d.symbol !== symbol)   : [],
          vLines:       symbol ? state.vLines.filter((v)       => v.symbol !== symbol)   : [],
          rectZones:    symbol ? state.rectZones.filter((r)    => r.symbol !== symbol)   : [],
          arrowLines:   symbol ? state.arrowLines.filter((a)   => a.symbol !== symbol)   : [],
          brushStrokes: symbol ? state.brushStrokes.filter((b) => b.symbol !== symbol)   : [],
          textLabels:   symbol ? state.textLabels.filter((t)   => t.symbol !== symbol)   : [],
          fiboZones:    symbol ? state.fiboZones.filter((f)    => f.symbol !== symbol)   : [],
          measureClearToken: (state.measureClearToken ?? 0) + 1,
        })),
      clearPriceLines: (symbol) =>
        set((state) => ({
          priceLines: symbol ? state.priceLines.filter((p) => p.symbol !== symbol) : [],
          trendLines: symbol ? state.trendLines.filter((t) => t.symbol !== symbol) : [],
          vLines:     symbol ? state.vLines.filter((v)     => v.symbol !== symbol) : [],
        })),
      undo: () =>
        set((state) => {
          if (!state.undoStack.length) return {};
          const snapshot = state.undoStack[state.undoStack.length - 1];
          return { ...snapshot, undoStack: state.undoStack.slice(0, -1) };
        }),
      setSymbolDialogOpen: (symbolDialogOpen) => set({ symbolDialogOpen }),
      setSettingsTarget: (settingsTarget) => set({ settingsTarget }),
      addFiboZone: (a, b, symbol) =>
        set((state) => ({
          undoStack: [...state.undoStack.slice(-19), snap(state)],
          fiboZones: [...state.fiboZones, { id: genId(), symbol, a, b }],
        })),
      removeFiboZone: (id) =>
        set((state) => ({ fiboZones: state.fiboZones.filter((f) => f.id !== id) })),
      setLogScale: (logScale) => set({ logScale }),
      setTriggerResetView: (triggerResetView) => set({ triggerResetView }),
      setTriggerScreenshot: (triggerScreenshot) => set({ triggerScreenshot }),
    }),
    {
      name: "tv-gratis-chart-state",
      version: 11,
      migrate: (stored: unknown, fromVersion: number) => {
        // Chained migrations — each step mutates `state` so multi-version jumps apply all patches
        let state = stored as Record<string, unknown>;
        if (fromVersion < 2) {
          state = {
            ...state,
            timeframe: "1d",
            chartType: state.chartType ?? "candlestick",
            indicators: {
              ema20: false, ema50: false, ema200: false,
              rsi: false, macd: false, volume: false,
              fourEma: true, adx: true, sqzMom: true, vrvp: true,
            },
            config: { ...DEFAULT_CONFIG },
            trendLines: state.trendLines ?? [],
            vLines: state.vLines ?? [],
            priceLines: state.priceLines ?? [],
          };
        }
        if (fromVersion < 3) {
          const prev = (state.config ?? {}) as Record<string, unknown>;
          state = {
            ...state,
            config: {
              ...DEFAULT_CONFIG, ...prev,
              sqzColorBullishUp: prev.sqzColorBullishUp ?? DEFAULT_CONFIG.sqzColorBullishUp,
              sqzColorBullishDown: prev.sqzColorBullishDown ?? DEFAULT_CONFIG.sqzColorBullishDown,
              sqzColorBearishDown: prev.sqzColorBearishDown ?? DEFAULT_CONFIG.sqzColorBearishDown,
              sqzColorBearishUp: prev.sqzColorBearishUp ?? DEFAULT_CONFIG.sqzColorBearishUp,
              sqzDotNoSqueeze: prev.sqzDotNoSqueeze ?? DEFAULT_CONFIG.sqzDotNoSqueeze,
              sqzDotOn: prev.sqzDotOn ?? DEFAULT_CONFIG.sqzDotOn,
              sqzDotOff: prev.sqzDotOff ?? DEFAULT_CONFIG.sqzDotOff,
            },
          };
        }
        if (fromVersion < 4) {
          const prev = (state.config ?? {}) as Record<string, unknown>;
          state = { ...state, config: { ...DEFAULT_CONFIG, ...prev, sqzStyle: prev.sqzStyle ?? "columns" } };
        }
        if (fromVersion < 5) {
          const prevInds = (state.indicators ?? {}) as Record<string, unknown>;
          state = { ...state, indicators: { ...prevInds, volume: false } };
        }
        if (fromVersion < 6) {
          const prev = (state.config ?? {}) as Record<string, unknown>;
          state = {
            ...state,
            config: {
              ...prev,
              sqzColorBullishDown: DEFAULT_CONFIG.sqzColorBullishDown,
              sqzColorBearishUp: DEFAULT_CONFIG.sqzColorBearishUp,
            },
          };
        }
        if (fromVersion < 7) {
          const prev = (state.config ?? {}) as Record<string, unknown>;
          state = {
            ...state,
            config: { ...prev, sqzColorBearishUp: DEFAULT_CONFIG.sqzColorBearishUp },
          };
        }
        if (fromVersion < 8) {
          const prev = (state.config ?? {}) as Record<string, unknown>;
          state = {
            ...state,
            config: { ...prev, sqzColorBearishUp: DEFAULT_CONFIG.sqzColorBearishUp },
          };
        }
        if (fromVersion < 9) {
          const prev = (state.config ?? {}) as Record<string, unknown>;
          state = {
            ...state,
            config: { ...prev, sqzColorBearishUp: DEFAULT_CONFIG.sqzColorBearishUp },
          };
        }
        if (fromVersion < 10) {
          state = { ...state, dashLines: state.dashLines ?? [] };
        }
        if (fromVersion < 11) {
          const prevInds = (state.indicators ?? {}) as Record<string, unknown>;
          state = {
            ...state,
            logScale: false,
            fiboZones: [],
            indicators: {
              bb: false, vwap: false, stochRsi: false, williamsR: false,
              atr: false, cci: false, obv: false, mfi: false,
              ...prevInds,
            },
            hidden: {
              bb: false, vwap: false, stochRsi: false, williamsR: false,
              atr: false, cci: false, obv: false, mfi: false,
              ...((state.hidden as Record<string, unknown>) ?? {}),
            },
            config: {
              ...DEFAULT_CONFIG,
              ...((state.config as Record<string, unknown>) ?? {}),
            },
          };
        }
        return state;
      },
      partialize: (s) => ({
        symbol: s.symbol,
        timeframe: s.timeframe,
        chartType: s.chartType,
        indicators: s.indicators,
        language: s.language,
        hidden: s.hidden,
        config: s.config,
        watchlist: s.watchlist,
        priceLines: s.priceLines,
        trendLines: s.trendLines,
        dashLines: s.dashLines,
        vLines: s.vLines,
        rectZones: s.rectZones,
        arrowLines: s.arrowLines,
        brushStrokes: s.brushStrokes,
        textLabels: s.textLabels,
        fiboZones: s.fiboZones,
        logScale: s.logScale,
      }),
      merge: (persisted, current) => {
        const p = persisted as Partial<typeof current>;
        return {
          ...current,
          ...p,
          // Always force volume off regardless of stored state
          indicators: { ...current.indicators, ...p.indicators, volume: false },
          hidden: { ...current.hidden, ...p.hidden, volume: false },
        };
      },
    },
  ),
);
