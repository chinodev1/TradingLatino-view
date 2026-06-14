"use client";

import { useState } from "react";
import { Bell, Trash2, Check, AlertCircle } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useChartStore } from "@/lib/store/chart-store";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";

export function PriceAlertsPanel() {
  const open = useChartStore((s) => s.alertsOpen);
  const setOpen = useChartStore((s) => s.setAlertsOpen);
  const alerts = useChartStore((s) => s.alerts);
  const symbol = useChartStore((s) => s.symbol);
  const addAlert = useChartStore((s) => s.addAlert);
  const removeAlert = useChartStore((s) => s.removeAlert);

  const [price, setPrice] = useState("");
  const [direction, setDirection] = useState<"above" | "below">("above");
  const [label, setLabel] = useState("");

  const symbolAlerts = alerts.filter((a) => a.symbol === symbol);
  const activeAlerts = symbolAlerts.filter((a) => !a.triggered);
  const triggeredAlerts = symbolAlerts.filter((a) => a.triggered);

  function handleAdd() {
    const p = parseFloat(price.replace(",", "."));
    if (!isNaN(p) && p > 0) {
      addAlert(symbol, p, direction, label.trim());
      setPrice("");
      setLabel("");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-sm gap-0 bg-tv-panel p-0">
        <DialogHeader className="border-b border-tv-border px-4 py-3">
          <DialogTitle className="flex items-center gap-2 text-sm font-medium">
            <Bell className="h-4 w-4 text-tv-blue" />
            Alertas de precio — {symbol}
          </DialogTitle>
        </DialogHeader>

        {/* Add new alert */}
        <div className="border-b border-tv-border p-4 space-y-3">
          <div className="flex gap-2">
            <button
              onClick={() => setDirection("above")}
              className={cn("flex-1 rounded py-1.5 text-xs font-medium transition-colors",
                direction === "above" ? "bg-tv-green/20 text-tv-green" : "bg-tv-bg text-tv-text-muted hover:bg-tv-panel-hover")}
            >
              ▲ Por encima
            </button>
            <button
              onClick={() => setDirection("below")}
              className={cn("flex-1 rounded py-1.5 text-xs font-medium transition-colors",
                direction === "below" ? "bg-tv-red/20 text-tv-red" : "bg-tv-bg text-tv-text-muted hover:bg-tv-panel-hover")}
            >
              ▼ Por debajo
            </button>
          </div>
          <input
            type="number"
            placeholder="Precio (ej: 65000)"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            className="w-full rounded bg-tv-bg px-3 py-2 text-xs text-tv-text placeholder:text-tv-text-muted outline-none border border-tv-border focus:border-tv-blue"
          />
          <input
            type="text"
            placeholder="Nota (opcional)"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            className="w-full rounded bg-tv-bg px-3 py-2 text-xs text-tv-text placeholder:text-tv-text-muted outline-none border border-tv-border focus:border-tv-blue"
          />
          <button
            onClick={handleAdd}
            disabled={!price || isNaN(parseFloat(price))}
            className="w-full rounded bg-tv-blue py-2 text-xs font-semibold text-white disabled:opacity-40 hover:bg-tv-blue/80 transition-colors"
          >
            Agregar alerta
          </button>
        </div>

        {/* Alert list */}
        <div className="max-h-72 overflow-y-auto">
          {symbolAlerts.length === 0 && (
            <div className="p-6 text-center text-xs text-tv-text-muted">
              No hay alertas para {symbol}
            </div>
          )}
          {activeAlerts.map((a) => (
            <div key={a.id} className="flex items-center gap-3 border-b border-tv-border px-4 py-2.5">
              <AlertCircle className={cn("h-3.5 w-3.5 shrink-0", a.direction === "above" ? "text-tv-green" : "text-tv-red")} />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-tv-text">
                  {a.direction === "above" ? "▲" : "▼"} {formatPrice(a.price)}
                </div>
                {a.label && <div className="text-[10px] text-tv-text-muted truncate">{a.label}</div>}
              </div>
              <button onClick={() => removeAlert(a.id)} className="shrink-0 text-tv-text-dim hover:text-tv-red">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          {triggeredAlerts.length > 0 && (
            <>
              <div className="px-4 py-1.5 text-[10px] uppercase tracking-wider text-tv-text-muted bg-tv-bg">Disparadas</div>
              {triggeredAlerts.map((a) => (
                <div key={a.id} className="flex items-center gap-3 border-b border-tv-border px-4 py-2.5 opacity-50">
                  <Check className="h-3.5 w-3.5 shrink-0 text-tv-green" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-tv-text line-through">
                      {a.direction === "above" ? "▲" : "▼"} {formatPrice(a.price)}
                    </div>
                    {a.label && <div className="text-[10px] text-tv-text-muted truncate">{a.label}</div>}
                  </div>
                  <button onClick={() => removeAlert(a.id)} className="shrink-0 text-tv-text-dim hover:text-tv-red">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
