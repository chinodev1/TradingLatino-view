import type { Candle } from "@/lib/binance/types";

export interface IndicatorPoint {
  time: number;
  value: number;
}

export interface MACDPoint {
  time: number;
  macd: number;
  signal: number;
  histogram: number;
}

/**
 * Simple Moving Average
 */
export function sma(candles: Candle[], period: number): IndicatorPoint[] {
  const out: IndicatorPoint[] = [];
  if (candles.length < period) return out;
  let sum = 0;
  for (let i = 0; i < candles.length; i++) {
    sum += candles[i].close;
    if (i >= period) sum -= candles[i - period].close;
    if (i >= period - 1) out.push({ time: candles[i].time, value: sum / period });
  }
  return out;
}

/**
 * Exponential Moving Average — seeded with SMA of first `period` candles.
 */
export function ema(candles: Candle[], period: number): IndicatorPoint[] {
  const out: IndicatorPoint[] = [];
  if (candles.length < period) return out;
  const k = 2 / (period + 1);
  let prev = 0;
  for (let i = 0; i < period; i++) prev += candles[i].close;
  prev /= period;
  out.push({ time: candles[period - 1].time, value: prev });
  for (let i = period; i < candles.length; i++) {
    prev = candles[i].close * k + prev * (1 - k);
    out.push({ time: candles[i].time, value: prev });
  }
  return out;
}

/**
 * RSI (Wilder) — period typically 14.
 */
export function rsi(candles: Candle[], period = 14): IndicatorPoint[] {
  const out: IndicatorPoint[] = [];
  if (candles.length <= period) return out;
  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= period; i++) {
    const diff = candles[i].close - candles[i - 1].close;
    if (diff >= 0) gain += diff;
    else loss -= diff;
  }
  gain /= period;
  loss /= period;
  let rs = loss === 0 ? 100 : gain / loss;
  out.push({ time: candles[period].time, value: 100 - 100 / (1 + rs) });
  for (let i = period + 1; i < candles.length; i++) {
    const diff = candles[i].close - candles[i - 1].close;
    const g = diff > 0 ? diff : 0;
    const l = diff < 0 ? -diff : 0;
    gain = (gain * (period - 1) + g) / period;
    loss = (loss * (period - 1) + l) / period;
    rs = loss === 0 ? 100 : gain / loss;
    out.push({ time: candles[i].time, value: 100 - 100 / (1 + rs) });
  }
  return out;
}

/**
 * MACD — fast EMA, slow EMA, signal EMA of the MACD line.
 * Defaults: 12 / 26 / 9.
 */
export function macd(
  candles: Candle[],
  fast = 12,
  slow = 26,
  signal = 9,
): MACDPoint[] {
  if (candles.length < slow + signal) return [];
  const emaFast = ema(candles, fast);
  const emaSlow = ema(candles, slow);
  // align: emaSlow starts later
  const slowStartTime = emaSlow[0].time;
  const fastByTime = new Map(emaFast.map((p) => [p.time, p.value]));
  const macdLine: IndicatorPoint[] = [];
  for (const p of emaSlow) {
    const f = fastByTime.get(p.time);
    if (f !== undefined) macdLine.push({ time: p.time, value: f - p.value });
  }
  // signal = EMA of MACD line. Build synthetic candles for ema()
  const synth: Candle[] = macdLine.map((p) => ({
    time: p.time,
    open: p.value,
    high: p.value,
    low: p.value,
    close: p.value,
    volume: 0,
  }));
  const sig = ema(synth, signal);
  const sigByTime = new Map(sig.map((p) => [p.time, p.value]));
  const out: MACDPoint[] = [];
  for (const p of macdLine) {
    const s = sigByTime.get(p.time);
    if (s === undefined) continue;
    out.push({ time: p.time, macd: p.value, signal: s, histogram: p.value - s });
  }
  void slowStartTime;
  return out;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Wilder's Smoothed Moving Average — alpha = 1/period */
function rma(values: number[], period: number): number[] {
  const out: number[] = [];
  if (values.length < period) return out;
  let prev = 0;
  for (let i = 0; i < period; i++) prev += values[i];
  prev /= period;
  out.push(prev);
  for (let i = period; i < values.length; i++) {
    prev = (prev * (period - 1) + values[i]) / period;
    out.push(prev);
  }
  return out;
}

// ─── ADX / DMI ────────────────────────────────────────────────────────────────

export interface ADXPoint {
  time: number;
  adx: number;
  plusDI: number;
  minusDI: number;
}

/**
 * Directional Movement Index + ADX (Wilder smoothing).
 * Matches Pine Script: study("DMI/ADX/KEYLEVEL").
 */
export function adxDmi(candles: Candle[], diLen = 14, adxLen = 14): ADXPoint[] {
  const n = candles.length;
  if (n < 2) return [];

  const trArr: number[] = [];
  const plusDMArr: number[] = [];
  const minusDMArr: number[] = [];

  for (let i = 1; i < n; i++) {
    const cur = candles[i];
    const prv = candles[i - 1];
    trArr.push(
      Math.max(cur.high - cur.low, Math.abs(cur.high - prv.close), Math.abs(cur.low - prv.close)),
    );
    const up = cur.high - prv.high;
    const dn = prv.low - cur.low;
    plusDMArr.push(up > dn && up > 0 ? up : 0);
    minusDMArr.push(dn > up && dn > 0 ? dn : 0);
  }

  const smTR = rma(trArr, diLen);
  const smPlus = rma(plusDMArr, diLen);
  const smMinus = rma(minusDMArr, diLen);

  const diPlus: number[] = [];
  const diMinus: number[] = [];
  const dxArr: number[] = [];

  for (let i = 0; i < smTR.length; i++) {
    const tr = smTR[i];
    const p = tr === 0 ? 0 : (100 * smPlus[i]) / tr;
    const m = tr === 0 ? 0 : (100 * smMinus[i]) / tr;
    diPlus.push(p);
    diMinus.push(m);
    const s = p + m;
    dxArr.push(s === 0 ? 0 : (100 * Math.abs(p - m)) / s);
  }

  const adxArr = rma(dxArr, adxLen);
  // smTR[0] → candle[diLen]; adxArr[0] → candle[diLen + adxLen - 1]
  const startIdx = diLen + adxLen - 1;
  const diOff = adxLen - 1;

  const out: ADXPoint[] = [];
  for (let i = 0; i < adxArr.length; i++) {
    const ci = startIdx + i;
    if (ci >= n) break;
    out.push({
      time: candles[ci].time,
      adx: adxArr[i],
      plusDI: diPlus[diOff + i] ?? 0,
      minusDI: diMinus[diOff + i] ?? 0,
    });
  }
  return out;
}

// ─── Squeeze Momentum (LazyBear) ─────────────────────────────────────────────

export type SqzState = "on" | "off" | "none";

export interface SqzPoint {
  time: number;
  val: number;
  /** on = BB inside KC (building), off = BB outside KC (released), none = no squeeze */
  sqzState: SqzState;
}

/**
 * Squeeze Momentum Indicator [LazyBear].
 * Histogram: lime = positive rising, green = positive falling,
 *            red = negative falling, maroon = negative rising.
 * Zero-line dot: blue = no squeeze, dark = squeeze on, gray = squeeze off.
 */
export function squeezeMomentum(
  candles: Candle[],
  bbLen = 20,
  bbMult = 2.0,
  kcLen = 20,
  kcMult = 1.5,
): SqzPoint[] {
  const n = candles.length;
  const minLen = Math.max(bbLen, kcLen);
  if (n < minLen) return [];

  const closes = candles.map((c) => c.close);

  // Precompute rolling highest/lowest for kcLen window
  const hiArr: number[] = [];
  const loArr: number[] = [];
  for (let i = kcLen - 1; i < n; i++) {
    let hi = -Infinity, lo = Infinity;
    for (let j = i - kcLen + 1; j <= i; j++) {
      if (candles[j].high > hi) hi = candles[j].high;
      if (candles[j].low < lo) lo = candles[j].low;
    }
    hiArr.push(hi);
    loArr.push(lo);
  }

  const out: SqzPoint[] = [];

  for (let i = minLen - 1; i < n; i++) {
    // Bollinger Bands
    const bbSlice = closes.slice(i - bbLen + 1, i + 1);
    const bbMean = bbSlice.reduce((a, b) => a + b, 0) / bbLen;
    const bbStd = Math.sqrt(bbSlice.reduce((a, b) => a + (b - bbMean) ** 2, 0) / bbLen);
    const upperBB = bbMean + bbMult * bbStd;
    const lowerBB = bbMean - bbMult * bbStd;

    // Keltner Channel (SMA of True Range)
    const kcMa = closes.slice(i - kcLen + 1, i + 1).reduce((a, b) => a + b, 0) / kcLen;
    let trSum = 0;
    for (let j = i - kcLen + 1; j <= i; j++) {
      const c = candles[j], p = j > 0 ? candles[j - 1] : c;
      trSum += Math.max(c.high - c.low, Math.abs(c.high - p.close), Math.abs(c.low - p.close));
    }
    const rangema = trSum / kcLen;
    const upperKC = kcMa + rangema * kcMult;
    const lowerKC = kcMa - rangema * kcMult;

    const sqzOn = lowerBB > lowerKC && upperBB < upperKC;
    const sqzOff = lowerBB < lowerKC && upperBB > upperKC;

    // val = linreg(close - avg(avg(highest, lowest), sma(close, kcLen)), kcLen, 0)
    const deltaArr: number[] = [];
    for (let j = i - kcLen + 1; j <= i; j++) {
      const hIdx = j - (kcLen - 1);
      if (hIdx < 0) { deltaArr.push(0); continue; }
      const hi = hiArr[hIdx];
      const lo = loArr[hIdx];
      const smaC = closes.slice(j - kcLen + 1, j + 1).reduce((a, b) => a + b, 0) / kcLen;
      deltaArr.push(closes[j] - ((hi + lo) / 2 + smaC) / 2);
    }

    const len = deltaArr.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    for (let j = 0; j < len; j++) {
      sumX += j; sumY += deltaArr[j];
      sumXY += j * deltaArr[j]; sumXX += j * j;
    }
    const denom = len * sumXX - sumX * sumX;
    let val: number;
    if (denom === 0) {
      val = deltaArr[len - 1] ?? 0;
    } else {
      const b = (len * sumXY - sumX * sumY) / denom;
      val = (sumY - b * sumX) / len + b * (len - 1);
    }

    out.push({
      time: candles[i].time,
      val,
      sqzState: !sqzOn && !sqzOff ? "none" : sqzOn ? "on" : "off",
    });
  }

  return out;
}
