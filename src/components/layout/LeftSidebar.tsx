"use client";

import { useEffect, useRef, useState } from "react";
import {
  Minus, Ruler, Trash2, TrendingUp, AlignCenter,
  Square, ArrowUpRight, Paintbrush, Type, Eraser, MousePointer2,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useChartStore, type DrawingTool, type CursorMode } from "@/lib/store/chart-store";
import { useTranslation } from "@/lib/useTranslation";
import { cn } from "@/lib/utils";

interface ToolDef {
  key: DrawingTool;
  icon: typeof MousePointer2;
  label: string;
  hint?: string;
}

function DashLineIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <line x1="1" y1="13" x2="4" y2="10" strokeDasharray="0"/>
      <line x1="4" y1="10" x2="7" y2="7" strokeDasharray="3 2"/>
      <line x1="7" y1="7" x2="10" y2="4" strokeDasharray="3 2"/>
      <line x1="10" y1="4" x2="13" y2="1" strokeDasharray="0"/>
      <circle cx="2" cy="12" r="1.5" fill="currentColor" stroke="none"/>
      <circle cx="14" cy="2" r="1.5" fill="currentColor" stroke="none"/>
    </svg>
  );
}

const DRAW_TOOL_ICONS: { key: DrawingTool; icon: typeof MousePointer2 }[] = [
  { key: "hline",     icon: Minus },
  { key: "vline",     icon: AlignCenter },
  { key: "trendline", icon: TrendingUp },
  { key: "dashline",  icon: DashLineIcon as typeof MousePointer2 },
  { key: "rectangle", icon: Square },
  { key: "arrow",     icon: ArrowUpRight },
  { key: "brush",     icon: Paintbrush },
  { key: "text",      icon: Type },
];

const UTIL_TOOL_ICONS: { key: DrawingTool; icon: typeof MousePointer2 }[] = [
  { key: "eraser",  icon: Eraser },
  { key: "measure", icon: Ruler },
];

function ToolBtn({ t, tool, setTool }: { t: ToolDef; tool: DrawingTool; setTool: (k: DrawingTool) => void }) {
  const Icon = t.icon;
  const active = tool === t.key;
  return (
    <Tooltip key={t.key}>
      <TooltipTrigger
        onClick={() => setTool(t.key)}
        aria-label={t.label}
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded transition-colors hover:bg-tv-panel-hover",
          active ? "bg-tv-blue/15 text-tv-blue" : "text-tv-text-muted hover:text-tv-text",
        )}
      >
        <Icon className="h-4 w-4" />
      </TooltipTrigger>
      <TooltipContent side="right" className="text-xs">
        <div className="font-medium">{t.label}</div>
        {t.hint && <div className="mt-0.5 text-[10px] text-tv-text-muted">{t.hint}</div>}
      </TooltipContent>
    </Tooltip>
  );
}

// Icons for each cursor mode
function CrossIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor">
      <rect x="7" y="1" width="2" height="14" rx="0.5"/>
      <rect x="1" y="7" width="14" height="2" rx="0.5"/>
    </svg>
  );
}
function DotIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="3.5" fill="currentColor"/>
      <line x1="8" y1="1" x2="8" y2="4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="8" y1="12" x2="8" y2="15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="1" y1="8" x2="4" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="12" y1="8" x2="15" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

const CURSOR_MODES: { key: CursorMode; label: string; Icon: React.FC<{ className?: string }> }[] = [
  { key: "cross",  label: "Cross",  Icon: CrossIcon },
  { key: "dot",    label: "Dot",    Icon: DotIcon },
  { key: "arrow",  label: "Arrow",  Icon: ({ className }) => <MousePointer2 className={className} /> },
];

function CursorModeIcon({ mode, className }: { mode: CursorMode; className?: string }) {
  const m = CURSOR_MODES.find((c) => c.key === mode);
  if (!m) return <MousePointer2 className={className} />;
  return <m.Icon className={className} />;
}

export function LeftSidebar() {
  const tool = useChartStore((s) => s.tool);
  const setTool = useChartStore((s) => s.setTool);
  const clearDrawings = useChartStore((s) => s.clearDrawings);
  const symbol = useChartStore((s) => s.symbol);
  const cursorMode = useChartStore((s) => s.cursorMode);
  const setCursorMode = useChartStore((s) => s.setCursorMode);
  const t = useTranslation();

  const DRAW_TOOLS: ToolDef[] = DRAW_TOOL_ICONS.map(({ key, icon }) => ({
    key, icon,
    label: t.tools[key as keyof typeof t.tools] as string,
    hint: t.tools[`${key}Hint` as keyof typeof t.tools] as string | undefined,
  }));
  const UTIL_TOOLS: ToolDef[] = UTIL_TOOL_ICONS.map(({ key, icon }) => ({
    key, icon,
    label: t.tools[key as keyof typeof t.tools] as string,
    hint: t.tools[`${key}Hint` as keyof typeof t.tools] as string | undefined,
  }));

  const [flyoutOpen, setFlyoutOpen] = useState(false);
  const flyoutRef = useRef<HTMLDivElement>(null);

  // Close flyout on outside click
  useEffect(() => {
    if (!flyoutOpen) return;
    const handler = (e: MouseEvent) => {
      if (flyoutRef.current && !flyoutRef.current.contains(e.target as Node)) {
        setFlyoutOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [flyoutOpen]);

  const isCursorActive = tool === "cursor";

  return (
    <aside className="flex w-11 flex-col items-center gap-0.5 border-r border-tv-border bg-tv-panel py-1.5">

      {/* Cursor tool with cursor-mode flyout */}
      <div ref={flyoutRef} className="relative">
        <Tooltip>
          <TooltipTrigger
            aria-label="Cursor"
            onClick={() => {
              setTool("cursor");
              setFlyoutOpen((v) => !v);
            }}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded transition-colors hover:bg-tv-panel-hover",
              isCursorActive ? "bg-tv-blue/15 text-tv-blue" : "text-tv-text-muted hover:text-tv-text",
            )}
          >
            <CursorModeIcon mode={cursorMode} className="h-4 w-4" />
          </TooltipTrigger>
          <TooltipContent side="right" className="text-xs">
            <div className="font-medium">{t.tools.cursor}</div>
          </TooltipContent>
        </Tooltip>

        {flyoutOpen && (
          <div className="absolute left-full top-0 z-50 ml-1.5 min-w-[130px] overflow-hidden rounded border border-tv-border bg-tv-panel shadow-xl">
            {CURSOR_MODES.map(({ key, label, Icon }) => {
              const active = cursorMode === key;
              return (
                <button
                  key={key}
                  onClick={() => { setCursorMode(key); setTool("cursor"); setFlyoutOpen(false); }}
                  className={cn(
                    "flex w-full items-center gap-2.5 px-3 py-2 text-xs transition-colors hover:bg-tv-panel-hover",
                    active ? "text-tv-blue" : "text-tv-text",
                  )}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span className="flex-1 text-left">{label}</span>
                  {active && <span className="text-tv-blue">✓</span>}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="my-1 h-px w-6 bg-tv-border" />

      {DRAW_TOOLS.map((t) => <ToolBtn key={t.key} t={t} tool={tool} setTool={setTool} />)}

      <div className="my-1 h-px w-6 bg-tv-border" />

      {UTIL_TOOLS.map((t) => <ToolBtn key={t.key} t={t} tool={tool} setTool={setTool} />)}

      <div className="my-1 h-px w-6 bg-tv-border" />

      <Tooltip>
        <TooltipTrigger
          onClick={() => clearDrawings(symbol)}
          aria-label={t.tools.clearDrawings}
          className="flex h-8 w-8 items-center justify-center rounded text-tv-text-muted hover:bg-tv-panel-hover hover:text-tv-red"
        >
          <Trash2 className="h-4 w-4" />
        </TooltipTrigger>
        <TooltipContent side="right" className="text-xs">
          <div className="font-medium">{t.tools.clearDrawings}</div>
        </TooltipContent>
      </Tooltip>
    </aside>
  );
}
