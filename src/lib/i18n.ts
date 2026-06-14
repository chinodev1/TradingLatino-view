export type Lang = "es" | "en";

export const translations = {
  es: {
    // Header
    chartTypes: {
      candlestick: "Velas japonesas",
      bar: "Barras OHLC",
      line: "Línea",
      area: "Área",
    },
    undo: "Deshacer (Ctrl+Z)",

    // Indicators menu
    indicators: "Indicadores",
    groups: {
      "Medias móviles": "Medias móviles",
      "Volumen": "Volumen",
      "Osciladores": "Osciladores",
      "Overlays": "Overlays",
    },
    indicatorLabels: {
      volume: "Volumen",
    },

    // Left sidebar tools
    tools: {
      cursor: "Cursor",
      hline: "Línea horizontal",
      hlineHint: "Click para marcar un precio",
      vline: "Línea vertical",
      vlineHint: "Click para agregar una línea vertical",
      trendline: "Línea de tendencia",
      trendlineHint: "Click en dos puntos para trazar",
      dashline: "Línea punteada",
      dashlineHint: "Click en dos puntos para trazar una línea punteada",
      rectangle: "Rectángulo / Zona",
      rectangleHint: "Click en dos puntos para dibujar una zona",
      arrow: "Flecha",
      arrowHint: "Click en dos puntos para trazar una flecha",
      brush: "Pincel",
      brushHint: "Dibujá libremente manteniendo click",
      text: "Texto",
      textHint: "Click en el chart para escribir texto",
      eraser: "Goma de borrar",
      eraserHint: "Click sobre un dibujo para borrarlo",
      measure: "Regla / Medir",
      measureHint: "Click en dos puntos para medir Δ precio, %, barras y volumen",
      clearDrawings: "Borrar todos los dibujos",
    },

    // Symbol panel
    symbolPanel: {
      exchange: "Binance · Spot · Crypto",
      marketOpen: "Market open",
      keyStats: "Key stats",
      performance: "Performance",
      technicals: "Técnicos",
      volumeUsdt: "Volumen USDT",
      high24h: "Máximo 24h",
      low24h: "Mínimo 24h",
      loading: "Cargando…",
      strongBuy: "Strong buy",
      buy: "Buy",
      neutral: "Neutral",
      sell: "Sell",
      strongSell: "Strong sell",
      buyLabel: "Compra",
      neutralLabel: "Neutro",
      sellLabel: "Venta",
      emaRsiLabel: "EMA 20/50 · RSI 14 · 1h",
    },

    // Watchlist
    watchlist: {
      title: "Lista de seguimiento",
      addPlaceholder: "Agregar símbolo…",
      empty: "Tu watchlist está vacío",
      colSymbol: "Símbolo",
      colPrice: "Precio",
      col24h: "24h",
    },

    // Bottom panel
    bottomPanel: {
      symbol: "Símbolo",
      change24h: "24h Cambio",
      high24h: "24h Alto",
      low24h: "24h Bajo",
      vol24hBase: "24h Vol (base)",
      vol24hUsdt: "24h Vol (USDT)",
    },

    // Measure overlay
    measure: {
      bars: "barras",
      vol: "Vol",
    },

    // Settings dialog
    settings: {
      title: "Configuración",
      apply: "Aplicar",
      cancel: "Cancelar",
      resetDefaults: "Restablecer",
      style: "Estilo del gráfico",
      columns: "Columnas",
      line: "Línea",
      area: "Área",
      barsHistogram: "Barras (histograma)",
      dotMarkers: "Marcadores ×",
      volumeNoParams: "El volumen no tiene parámetros configurables.",
      vrvpNoParams: "El Volume Profile se calcula automáticamente para el rango visible. Sin parámetros.",
      period: "Período",
      fast: "Rápida",
      slow: "Lenta",
      signal: "Señal",
      colorBullishUp: "Color 0 — alcista ↑",
      colorBullishDown: "Color 1 — alcista ↓",
      colorBearishDown: "Color 2 — bajista ↓",
      colorBearishUp: "Color 3 — bajista ↑",
      dotNoSqueeze: "Sin squeeze",
      dotOn: "Squeeze activo",
      dotOff: "Squeeze liberado",
      ema1fast: "EMA 1 (rápida)",
      ema4slow: "EMA 4 (lenta)",
    },

    // Price chart overlay
    chart: {
      loading: "Cargando…",
      textPlaceholder: "Texto…",
    },

    // Language button
    langButton: "EN",
    langLabel: "Cambiar a inglés",
  },

  en: {
    // Header
    chartTypes: {
      candlestick: "Candlestick",
      bar: "OHLC Bars",
      line: "Line",
      area: "Area",
    },
    undo: "Undo (Ctrl+Z)",

    // Indicators menu
    indicators: "Indicators",
    groups: {
      "Medias móviles": "Moving averages",
      "Volumen": "Volume",
      "Osciladores": "Oscillators",
      "Overlays": "Overlays",
    },
    indicatorLabels: {
      volume: "Volume",
    },

    // Left sidebar tools
    tools: {
      cursor: "Cursor",
      hline: "Horizontal line",
      hlineHint: "Click to mark a price",
      vline: "Vertical line",
      vlineHint: "Click to add a vertical line",
      trendline: "Trend line",
      trendlineHint: "Click two points to draw",
      dashline: "Dashed line",
      dashlineHint: "Click two points to draw a dashed line",
      rectangle: "Rectangle / Zone",
      rectangleHint: "Click two points to draw a zone",
      arrow: "Arrow",
      arrowHint: "Click two points to draw an arrow",
      brush: "Brush",
      brushHint: "Draw freely while holding click",
      text: "Text",
      textHint: "Click on the chart to write text",
      eraser: "Eraser",
      eraserHint: "Click on a drawing to erase it",
      measure: "Ruler / Measure",
      measureHint: "Click two points to measure Δ price, %, bars and volume",
      clearDrawings: "Clear all drawings",
    },

    // Symbol panel
    symbolPanel: {
      exchange: "Binance · Spot · Crypto",
      marketOpen: "Market open",
      keyStats: "Key stats",
      performance: "Performance",
      technicals: "Technicals",
      volumeUsdt: "USDT Volume",
      high24h: "24h High",
      low24h: "24h Low",
      loading: "Loading…",
      strongBuy: "Strong buy",
      buy: "Buy",
      neutral: "Neutral",
      sell: "Sell",
      strongSell: "Strong sell",
      buyLabel: "Buy",
      neutralLabel: "Neutral",
      sellLabel: "Sell",
      emaRsiLabel: "EMA 20/50 · RSI 14 · 1h",
    },

    // Watchlist
    watchlist: {
      title: "Watchlist",
      addPlaceholder: "Add symbol…",
      empty: "Your watchlist is empty",
      colSymbol: "Symbol",
      colPrice: "Price",
      col24h: "24h",
    },

    // Bottom panel
    bottomPanel: {
      symbol: "Symbol",
      change24h: "24h Change",
      high24h: "24h High",
      low24h: "24h Low",
      vol24hBase: "24h Vol (base)",
      vol24hUsdt: "24h Vol (USDT)",
    },

    // Measure overlay
    measure: {
      bars: "bars",
      vol: "Vol",
    },

    // Settings dialog
    settings: {
      title: "Settings",
      apply: "Apply",
      cancel: "Cancel",
      resetDefaults: "Reset defaults",
      style: "Chart style",
      columns: "Columns",
      line: "Line",
      area: "Area",
      barsHistogram: "Bars (histogram)",
      dotMarkers: "Dot markers ×",
      volumeNoParams: "Volume has no configurable parameters.",
      vrvpNoParams: "Volume Profile is automatically calculated for the visible range. No parameters.",
      period: "Period",
      fast: "Fast",
      slow: "Slow",
      signal: "Signal",
      colorBullishUp: "Color 0 — bullish ↑",
      colorBullishDown: "Color 1 — bullish ↓",
      colorBearishDown: "Color 2 — bearish ↓",
      colorBearishUp: "Color 3 — bearish ↑",
      dotNoSqueeze: "No squeeze",
      dotOn: "Squeeze on",
      dotOff: "Squeeze off",
      ema1fast: "EMA 1 (fast)",
      ema4slow: "EMA 4 (slow)",
    },

    // Price chart overlay
    chart: {
      loading: "Loading…",
      textPlaceholder: "Text…",
    },

    // Language button
    langButton: "ES",
    langLabel: "Switch to Spanish",
  },
} as const;

export type Translations = typeof translations.es;
