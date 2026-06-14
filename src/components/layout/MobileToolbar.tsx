"use client";

import {
  Minus, Ruler, Trash2, TrendingUp, AlignCenter,
  Square, ArrowUpRight, Paintbrush, Type, Eraser,
  MousePointer2, Percent, ChevronUp, ChevronDown as ChevronDownIcon,
} from "lucide-react";
import { useChartStore, type DrawingTool } from "@/lib/store/chart-store";
import { useTranslation } from "@/lib/useTranslation";
import { cn } from "@/lib/utils";
import { useState } from "react";

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

const TOOLS: { key: DrawingTool; Icon: React.FC<{ className?: string }> }[] = [
  { key: "cursor",    Icon: ({ className }) => <MousePointer2 className={className} /> },
  { key: "hline",     Icon: ({ className }) => <Minus className={className} /> },
  { key: "vline",     Icon: ({ className }) => <AlignCenter className={className} /> },
  { key: "trendline", Icon: ({ className }) => <TrendingUp className={className} /> },
  { key: "dashline",  Icon: DashLineIcon },
  { key: "fibonacci", Icon: ({ className }) => <Percent className={className} /> },
  { key: "rectangle", Icon: ({ className }) => <Square className={className} /> },
  { key: "arrow",     Icon: ({ className }) => <ArrowUpRight className={className} /> },
  { key: "brush",     Icon: ({ className }) => <Paintbrush className={className} /> },
  { key: "text",      Icon: ({ className }) => <Type className={className} /> },
  { key: "eraser",    Icon: ({ className }) => <Eraser className={className} /> },
  { key: "measure",   Icon: ({ className }) => <Ruler className={className} /> },
];

export function MobileToolbar() {
  const tool = useChartStore((s) => s.tool);
  const setTool = useChartStore((s) => s.setTool);
  const clearDrawings = useChartStore((s) => s.clearDrawings);
  const symbol = useChartStore((s) => s.symbol);
  const t = useTranslation();

  const [expanded, setExpanded] = useState(false);

  const toolLabels: Record<DrawingTool, string> = {
    cursor: "Cursor", hline: "H. Line", vline: "V. Line",
    trendline: "Tendencia", dashline: "Línea rota",
    fibonacci: "Fibonacci", rectangle: "Rectángulo",
    arrow: "Flecha", brush: "Pincel", text: "Texto",
    eraser: "Borrar", measure: t.tools.measure,
  };

  return (
    <div className="md:hidden border-t border-tv-border bg-tv-panel">
      {/* Toggle strip */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-1.5 text-[11px] text-tv-text-muted active:bg-tv-panel-hover"
      >
        <span className="font-medium">Herramientas · {toolLabels[tool] ?? tool}</span>
        {expanded ? <ChevronDownIcon className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
      </button>

      {/* Tool grid — shown when expanded */}
      {expanded && (
        <div className="border-t border-tv-border px-3 pb-2 pt-2">
          <div className="grid grid-cols-6 gap-1.5">
            {TOOLS.map(({ key, Icon }) => (
              <button
                key={key}
                onClick={() => { setTool(key); }}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-lg py-2 transition-colors active:scale-95",
                  tool === key
                    ? "bg-tv-blue/20 text-tv-blue"
                    : "text-tv-text-muted hover:bg-tv-panel-hover hover:text-tv-text"
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="text-[9px] leading-none">{toolLabels[key]}</span>
              </button>
            ))}

            {/* Clear all */}
            <button
              onClick={() => { clearDrawings(symbol); }}
              className="flex flex-col items-center gap-1 rounded-lg py-2 text-tv-text-muted active:scale-95 hover:bg-tv-panel-hover hover:text-tv-red"
            >
              <Trash2 className="h-5 w-5" />
              <span className="text-[9px] leading-none">Borrar todo</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
