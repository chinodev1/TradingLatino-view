"use client";

import { useEffect, useCallback, useState } from "react";
import type { IChartApi, ISeriesApi } from "lightweight-charts";
import type { Candle } from "@/lib/binance/types";

interface Bar {
  y1: number;
  y2: number;
  barWidth: number;
  isBullish: boolean;
  isPoc?: boolean;
}

interface Props {
  chartRef: React.RefObject<IChartApi | null>;
  candlesRef: React.RefObject<Candle[]>;
  candleSeriesRef: React.RefObject<ISeriesApi<"Candlestick"> | null>;
  containerRef: React.RefObject<HTMLDivElement | null>;
  visible: boolean;
  hidden: boolean;
  rows?: number;
  maxBarWidth?: number;
  /** Increments after chart+data are ready, so the subscription is retried */
  tick?: number;
}

export function VolumeProfile({
  chartRef,
  candlesRef,
  candleSeriesRef,
  containerRef,
  visible,
  hidden,
  rows = 64,
  maxBarWidth = 120,
  tick = 0,
}: Props) {
  const [bars, setBars] = useState<Bar[]>([]);
  const [containerWidth, setContainerWidth] = useState(0);

  const recompute = useCallback(() => {
    const chart = chartRef.current;
    const candles = candlesRef.current;
    const series = candleSeriesRef.current;
    const container = containerRef.current;
    if (!chart || !candles.length || !series || !container) return;

    setContainerWidth(container.offsetWidth);

    const range = chart.timeScale().getVisibleRange();
    if (!range) return;

    const from = Number(range.from);
    const to = Number(range.to);
    const visibleCandles = candles.filter((c) => c.time >= from && c.time <= to);
    if (!visibleCandles.length) return;

    const minPrice = Math.min(...visibleCandles.map((c) => c.low));
    const maxPrice = Math.max(...visibleCandles.map((c) => c.high));
    const priceRange = maxPrice - minPrice;
    if (!priceRange) return;

    const bucketSize = priceRange / rows;
    const bullBuckets = new Array(rows).fill(0);
    const bearBuckets = new Array(rows).fill(0);

    for (const c of visibleCandles) {
      const cRange = c.high - c.low;
      const startB = Math.max(0, Math.floor((c.low - minPrice) / bucketSize));
      const endB = Math.min(rows - 1, Math.floor((c.high - minPrice) / bucketSize));
      const isBull = c.close >= c.open;

      if (cRange === 0) {
        if (isBull) bullBuckets[startB] += c.volume;
        else bearBuckets[startB] += c.volume;
      } else {
        for (let b = startB; b <= endB; b++) {
          const bLow = minPrice + b * bucketSize;
          const bHigh = bLow + bucketSize;
          const overlap = Math.max(0, Math.min(c.high, bHigh) - Math.max(c.low, bLow));
          const vol = c.volume * (overlap / cRange);
          if (isBull) bullBuckets[b] += vol;
          else bearBuckets[b] += vol;
        }
      }
    }

    const totalVols = bullBuckets.map((b, i) => b + bearBuckets[i]);
    const maxVol = Math.max(...totalVols);
    if (!maxVol) return;

    const pocBucket = totalVols.indexOf(maxVol);

    const newBars: Bar[] = [];
    for (let i = 0; i < rows; i++) {
      const totalVol = totalVols[i];
      if (totalVol < maxVol * 0.002) continue;

      const bLow = minPrice + i * bucketSize;
      const bHigh = bLow + bucketSize;
      const y1 = series.priceToCoordinate(bHigh as unknown as number);
      const y2 = series.priceToCoordinate(bLow as unknown as number);
      if (y1 === null || y2 === null) continue;

      const barW = (totalVol / maxVol) * maxBarWidth;
      const isBullish = bullBuckets[i] >= bearBuckets[i];
      newBars.push({ y1, y2, barWidth: barW, isBullish, isPoc: i === pocBucket });
    }

    setBars(newBars);
  }, [chartRef, candlesRef, candleSeriesRef, containerRef, rows, maxBarWidth]);

  useEffect(() => {
    if (!visible) {
      setBars([]);
      return;
    }
    const chart = chartRef.current;
    if (!chart) return;

    recompute();

    const h = () => recompute();
    chart.timeScale().subscribeVisibleTimeRangeChange(h);
    chart.timeScale().subscribeVisibleLogicalRangeChange(h);

    return () => {
      chart.timeScale().unsubscribeVisibleTimeRangeChange(h);
      chart.timeScale().unsubscribeVisibleLogicalRangeChange(h);
    };
  }, [visible, recompute, tick]);

  if (!visible || hidden || !bars.length) return null;

  // Right edge = container width minus price-axis width (85px for wide prices like $130,000)
  const priceAxisWidth = 85;
  const rightEdge = containerWidth - priceAxisWidth;
  const pocBar = bars.find((b) => b.isPoc);

  return (
    <svg
      className="pointer-events-none absolute inset-0"
      style={{ width: "100%", height: "100%", overflow: "visible", zIndex: 5 }}
    >
      {bars.map((bar, i) => {
        const x = rightEdge - bar.barWidth;
        const h = Math.max(1, bar.y2 - bar.y1);
        return (
          <rect
            key={i}
            x={x}
            y={bar.y1}
            width={bar.barWidth}
            height={h}
            fill="rgba(41,98,255,0.65)"
            stroke="rgba(41,98,255,0.3)"
            strokeWidth={0.5}
          />
        );
      })}
      {pocBar && (
        <line
          x1={0}
          y1={(pocBar.y1 + pocBar.y2) / 2}
          x2={rightEdge}
          y2={(pocBar.y1 + pocBar.y2) / 2}
          stroke="rgba(255,255,255,0.7)"
          strokeWidth={1.5}
          strokeDasharray="3 3"
        />
      )}
    </svg>
  );
}
