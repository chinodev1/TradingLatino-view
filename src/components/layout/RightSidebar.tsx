"use client";

import { Watchlist } from "@/components/watchlist/Watchlist";
import { SymbolPanel } from "@/components/layout/SymbolPanel";

export function RightSidebar() {
  return (
    <aside className="flex w-64 flex-col overflow-hidden border-l border-tv-border bg-tv-panel">
      {/* Watchlist — takes remaining space, scrolls internally */}
      <div className="min-h-0 flex-1 overflow-hidden">
        <Watchlist />
      </div>
      {/* Symbol info panel — fixed size, scrolls if needed */}
      <div className="shrink-0 overflow-y-auto">
        <SymbolPanel />
      </div>
    </aside>
  );
}
