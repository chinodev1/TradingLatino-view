"use client";

import {
  Minus, Ruler, Trash2, TrendingUp, AlignCenter,
  Square, ArrowUpRight, Paintbrush, Type, Eraser,
  MousePointer2, Percent, X, PenLine,
} from "lucide-react";
import { useChartStore, type DrawingTool } from "@/lib/store/chart-store";
import { useTranslation } from "@/lib/useTranslation";
import { cn } from "@/lib/utils";
import { useState, useEffect, useRef } from "react";

function DashLineIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <line x1="1" y1="13" x2="4" y2="10" />
      <line x1="4" y1="10" x2="7" y2="7" strokeDasharray="3 2" />
      <line x1="7" y1="7" x2="10" y2="4" strokeDasharray="3 2" />
      <line x1="10" y1="4" x2="13" y2="1" />
      <circle cx="2" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="14" cy="2" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

const TOOLS: { key: DrawingTool; Icon: React.FC<{ className?: string }>; label: string }[] = [
  { key: "cursor",    Icon: ({ className }) => <MousePointer2 className={className} />, label: "Cursor" },
  { key: "hline",     Icon: ({ className }) => <Minus className={className} />,         label: "H. Línea" },
  { key: "vline",     Icon: ({ className }) => <AlignCenter className={className} />,   label: "V. Línea" },
  { key: "trendline", Icon: ({ className }) => <TrendingUp className={className} />,    label: "Tendencia" },
  { key: "dashline",  Icon: DashLineIcon,                                               label: "Línea rota" },
  { key: "fibonacci", Icon: ({ className }) => <Percent className={className} />,       label: "Fibonacci" },
  { key: "rectangle", Icon: ({ className }) => <Square className={className} />,        label: "Rectángulo" },
  { key: "arrow",     Icon: ({ className }) => <ArrowUpRight className={className} />,  label: "Flecha" },
  { key: "brush",     Icon: ({ className }) => <Paintbrush className={className} />,    label: "Pincel" },
  { key: "text",      Icon: ({ className }) => <Type className={className} />,          label: "Texto" },
  { key: "eraser",    Icon: ({ className }) => <Eraser className={className} />,        label: "Borrar" },
  { key: "measure",   Icon: ({ className }) => <Ruler className={className} />,         label: "% Regla" },
];

export function MobileToolbar() {
  const tool = useChartStore((s) => s.tool);
  const setTool = useChartStore((s) => s.setTool);
  const clearDrawings = useChartStore((s) => s.clearDrawings);
  const symbol = useChartStore((s) => s.symbol);
  const t = useTranslation();

  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on outside tap
  useEffect(() => {
    if (!open) return;
    const handler = (e: TouchEvent | MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("touchstart", handler);
    document.addEventListener("mousedown", handler);
    return () => {
      document.removeEventListener("touchstart", handler);
      document.removeEventListener("mousedown", handler);
    };
  }, [open]);

  const ActiveIcon = TOOLS.find((t) => t.key === tool)?.Icon ?? (({ className }) => <PenLine className={className} />);

  return (
    <>
      {/* Floating action button — bottom-left, mobile only */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "md:hidden fixed bottom-6 left-4 z-40 flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition-all active:scale-95",
          open
            ? "bg-tv-blue text-white"
            : tool !== "cursor"
              ? "bg-tv-blue/20 text-tv-blue border border-tv-blue/40"
              : "bg-tv-panel border border-tv-border text-tv-text-muted"
        )}
        style={{ bottom: "calc(1.5rem + env(safe-area-inset-bottom))" }}
      >
        <ActiveIcon className="h-5 w-5" />
      </button>

      {/* Backdrop */}
      {open && (
        <div className="md:hidden fixed inset-0 z-30 bg-black/40" onClick={() => setOpen(false)} />
      )}

      {/* Slide-in panel from left — mobile only */}
      <div
        ref={panelRef}
        className={cn(
          "md:hidden fixed left-0 top-0 z-40 h-full w-56 bg-tv-panel border-r border-tv-border shadow-2xl transition-transform duration-200 flex flex-col",
          open ? "translate-x-0" : "-translate-x-full"
        )}
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        {/* Panel header */}
        <div className="flex items-center justify-between border-b border-tv-border px-4 py-3">
          <span className="text-sm font-semibold text-tv-text">Herramientas</span>
          <button
            onClick={() => setOpen(false)}
            className="rounded p-1 text-tv-text-muted hover:bg-tv-panel-hover hover:text-tv-text"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tools list */}
        <div className="flex-1 overflow-y-auto py-2">
          {TOOLS.map(({ key, Icon, label }) => {
            const active = tool === key;
            return (
              <button
                key={key}
                onClick={() => { setTool(key); setOpen(false); }}
                className={cn(
                  "flex w-full items-center gap-4 px-5 py-3.5 transition-colors active:bg-tv-panel-hover",
                  active
                    ? "bg-tv-blue/10 text-tv-blue border-r-2 border-tv-blue"
                    : "text-tv-text-muted hover:bg-tv-panel-hover hover:text-tv-text"
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span className="text-sm font-medium">{label}</span>
                {active && <span className="ml-auto text-tv-blue text-xs">✓</span>}
              </button>
            );
          })}

          {/* Divider + Clear all */}
          <div className="my-2 mx-4 h-px bg-tv-border" />
          <button
            onClick={() => { clearDrawings(symbol); setOpen(false); }}
            className="flex w-full items-center gap-4 px-5 py-3.5 text-tv-text-muted hover:bg-tv-panel-hover hover:text-tv-red transition-colors active:bg-tv-panel-hover"
          >
            <Trash2 className="h-5 w-5 shrink-0" />
            <span className="text-sm font-medium">{t.tools.clearDrawings}</span>
          </button>
        </div>
      </div>
    </>
  );
}
