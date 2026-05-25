"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  useChartStore,
  DEFAULT_CONFIG,
  type IndicatorKey,
} from "@/lib/store/chart-store";
import { useTranslation } from "@/lib/useTranslation";

const TITLES: Record<IndicatorKey, string> = {
  ema20: "EMA — Slot 1",
  ema50: "EMA — Slot 2",
  ema200: "EMA — Slot 3",
  rsi: "RSI",
  macd: "MACD",
  volume: "Volumen",
  fourEma: "4EMA",
  adx: "DMI / ADX / KeyLevel",
  sqzMom: "Squeeze Momentum (LazyBear)",
  vrvp: "Volume Profile (VRVP)",
};

export function IndicatorSettingsDialog() {
  const target = useChartStore((s) => s.settingsTarget);
  const setTarget = useChartStore((s) => s.setSettingsTarget);
  const config = useChartStore((s) => s.config);
  const setConfig = useChartStore((s) => s.setConfig);
  const tDialog = useTranslation();

  const open = target !== null;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) setTarget(null); }}>
      <DialogContent className="max-w-sm bg-tv-panel">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold">
            {target ? TITLES[target] : ""} — {tDialog.settings.title}
          </DialogTitle>
        </DialogHeader>
        {target && (
          <SettingsForm
            target={target}
            config={config}
            onSave={(patch) => { setConfig(patch); setTarget(null); }}
            onReset={() => { setConfig(DEFAULT_CONFIG); setTarget(null); }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

interface FormProps {
  target: IndicatorKey;
  config: typeof DEFAULT_CONFIG;
  onSave: (patch: Partial<typeof DEFAULT_CONFIG>) => void;
  onReset: () => void;
}

function SettingsForm({ target, config, onSave, onReset }: FormProps) {
  const t = useTranslation();
  const [draft, setDraft] = useState({ ...config });

  useEffect(() => {
    setDraft({ ...config });
  }, [config, target]);

  function save() {
    if (target === "ema20") onSave({ ema20: clamp(draft.ema20, 2, 500) });
    else if (target === "ema50") onSave({ ema50: clamp(draft.ema50, 2, 500) });
    else if (target === "ema200") onSave({ ema200: clamp(draft.ema200, 2, 500) });
    else if (target === "rsi") onSave({ rsi: clamp(draft.rsi, 2, 100) });
    else if (target === "macd")
      onSave({
        macdFast: clamp(draft.macdFast, 2, 100),
        macdSlow: clamp(draft.macdSlow, 2, 200),
        macdSignal: clamp(draft.macdSignal, 2, 100),
      });
    else if (target === "volume") onSave({});
    else if (target === "fourEma")
      onSave({
        fourEma1: clamp(draft.fourEma1, 1, 500),
        fourEma2: clamp(draft.fourEma2, 1, 500),
        fourEma3: clamp(draft.fourEma3, 1, 500),
        fourEma4: clamp(draft.fourEma4, 1, 500),
      });
    else if (target === "adx")
      onSave({
        adxDiLen: clamp(draft.adxDiLen, 2, 100),
        adxLen: clamp(draft.adxLen, 2, 100),
        adxKeyLevel: clamp(draft.adxKeyLevel, 1, 100),
        adxShowPlusDI: draft.adxShowPlusDI,
        adxShowMinusDI: draft.adxShowMinusDI,
      });
    else if (target === "sqzMom")
      onSave({
        sqzBbLen: clamp(draft.sqzBbLen, 2, 200),
        sqzBbMult: clampF(draft.sqzBbMult, 0.1, 10),
        sqzKcLen: clamp(draft.sqzKcLen, 2, 200),
        sqzKcMult: clampF(draft.sqzKcMult, 0.1, 10),
        sqzColorBullishUp: draft.sqzColorBullishUp,
        sqzColorBullishDown: draft.sqzColorBullishDown,
        sqzColorBearishDown: draft.sqzColorBearishDown,
        sqzColorBearishUp: draft.sqzColorBearishUp,
        sqzDotNoSqueeze: draft.sqzDotNoSqueeze,
        sqzDotOn: draft.sqzDotOn,
        sqzDotOff: draft.sqzDotOff,
        sqzStyle: draft.sqzStyle,
      });
    else if (target === "vrvp") onSave({});
  }

  return (
    <div className="flex flex-col gap-3">
      {(target === "ema20" || target === "ema50" || target === "ema200") && (
        <Field label={t.settings.period} value={draft[target]} onChange={(n) => setDraft((d) => ({ ...d, [target]: n }))} />
      )}
      {target === "rsi" && (
        <Field label={t.settings.period} value={draft.rsi} onChange={(n) => setDraft((d) => ({ ...d, rsi: n }))} />
      )}
      {target === "macd" && (
        <div className="grid grid-cols-3 gap-2">
          <Field label={t.settings.fast} value={draft.macdFast} onChange={(n) => setDraft((d) => ({ ...d, macdFast: n }))} />
          <Field label={t.settings.slow} value={draft.macdSlow} onChange={(n) => setDraft((d) => ({ ...d, macdSlow: n }))} />
          <Field label={t.settings.signal} value={draft.macdSignal} onChange={(n) => setDraft((d) => ({ ...d, macdSignal: n }))} />
        </div>
      )}
      {target === "volume" && (
        <p className="text-xs text-tv-text-muted">{t.settings.volumeNoParams}</p>
      )}
      {target === "fourEma" && (
        <div className="grid grid-cols-2 gap-2">
          <Field label={t.settings.ema1fast} value={draft.fourEma1} onChange={(n) => setDraft((d) => ({ ...d, fourEma1: n }))} />
          <Field label="EMA 2" value={draft.fourEma2} onChange={(n) => setDraft((d) => ({ ...d, fourEma2: n }))} />
          <Field label="EMA 3" value={draft.fourEma3} onChange={(n) => setDraft((d) => ({ ...d, fourEma3: n }))} />
          <Field label={t.settings.ema4slow} value={draft.fourEma4} onChange={(n) => setDraft((d) => ({ ...d, fourEma4: n }))} />
        </div>
      )}
      {target === "adx" && (
        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-3 gap-2">
            <Field label="DI Length" value={draft.adxDiLen} onChange={(n) => setDraft((d) => ({ ...d, adxDiLen: n }))} />
            <Field label="ADX Smooth" value={draft.adxLen} onChange={(n) => setDraft((d) => ({ ...d, adxLen: n }))} />
            <Field label="Key Level" value={draft.adxKeyLevel} onChange={(n) => setDraft((d) => ({ ...d, adxKeyLevel: n }))} />
          </div>
          <div className="flex gap-4 pt-1">
            <label className="flex cursor-pointer items-center gap-2 text-xs text-tv-text">
              <input type="checkbox" checked={draft.adxShowPlusDI}
                onChange={(e) => setDraft((d) => ({ ...d, adxShowPlusDI: e.target.checked }))}
                className="accent-tv-blue" />
              <span className="text-[#2962ff]">+DI</span>
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-xs text-tv-text">
              <input type="checkbox" checked={draft.adxShowMinusDI}
                onChange={(e) => setDraft((d) => ({ ...d, adxShowMinusDI: e.target.checked }))}
                className="accent-tv-blue" />
              <span className="text-[#787b86]">−DI</span>
            </label>
          </div>
        </div>
      )}
      {target === "sqzMom" && (
        <div className="flex flex-col gap-3">
          <SectionLabel>{t.settings.style}</SectionLabel>
          <div className="flex gap-1.5">
            {(["columns", "line", "area"] as const).map((s) => {
              const active = draft.sqzStyle === s;
              const styleLabel = s === "columns" ? t.settings.columns : s === "line" ? t.settings.line : t.settings.area;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setDraft((d) => ({ ...d, sqzStyle: s }))}
                  title={styleLabel}
                  className={`flex flex-col items-center gap-1 rounded border px-3 py-1.5 transition-colors ${
                    active ? "border-tv-blue bg-tv-blue/20 text-tv-blue" : "border-tv-border bg-tv-bg text-tv-text-muted hover:border-tv-text-muted"
                  }`}
                >
                  {s === "columns" && (
                    <svg width="20" height="14" viewBox="0 0 20 14" fill="currentColor">
                      <rect x="1" y="5" width="3.5" height="9" rx="0.5"/>
                      <rect x="6.5" y="1" width="3.5" height="13" rx="0.5"/>
                      <rect x="12" y="3" width="3.5" height="11" rx="0.5"/>
                      <rect x="17" y="6" width="2" height="8" rx="0.5"/>
                    </svg>
                  )}
                  {s === "line" && (
                    <svg width="20" height="14" viewBox="0 0 20 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="0,12 4,8 8,3 12,7 16,4 20,6"/>
                    </svg>
                  )}
                  {s === "area" && (
                    <svg width="20" height="14" viewBox="0 0 20 14">
                      <path d="M0,12 L4,8 L8,3 L12,7 L16,4 L20,6 L20,14 L0,14 Z" fill="currentColor" fillOpacity="0.35"/>
                      <polyline points="0,12 4,8 8,3 12,7 16,4 20,6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                  <span className="text-[9px] uppercase tracking-wide">{styleLabel}</span>
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Field label="BB Length" value={draft.sqzBbLen} onChange={(n) => setDraft((d) => ({ ...d, sqzBbLen: n }))} />
            <FieldFloat label="BB Mult" value={draft.sqzBbMult} onChange={(n) => setDraft((d) => ({ ...d, sqzBbMult: n }))} />
            <Field label="KC Length" value={draft.sqzKcLen} onChange={(n) => setDraft((d) => ({ ...d, sqzKcLen: n }))} />
            <FieldFloat label="KC Mult" value={draft.sqzKcMult} onChange={(n) => setDraft((d) => ({ ...d, sqzKcMult: n }))} />
          </div>

          <SectionLabel>{t.settings.barsHistogram}</SectionLabel>
          <div className="flex flex-col gap-1.5">
            <ColorField label={t.settings.colorBullishUp} value={draft.sqzColorBullishUp} onChange={(c) => setDraft((d) => ({ ...d, sqzColorBullishUp: c }))} />
            <ColorField label={t.settings.colorBullishDown} value={draft.sqzColorBullishDown} onChange={(c) => setDraft((d) => ({ ...d, sqzColorBullishDown: c }))} />
            <ColorField label={t.settings.colorBearishDown} value={draft.sqzColorBearishDown} onChange={(c) => setDraft((d) => ({ ...d, sqzColorBearishDown: c }))} />
            <ColorField label={t.settings.colorBearishUp} value={draft.sqzColorBearishUp} onChange={(c) => setDraft((d) => ({ ...d, sqzColorBearishUp: c }))} />
          </div>

          <SectionLabel>{t.settings.dotMarkers}</SectionLabel>
          <div className="flex flex-col gap-1.5">
            <ColorField label={t.settings.dotNoSqueeze} value={draft.sqzDotNoSqueeze} onChange={(c) => setDraft((d) => ({ ...d, sqzDotNoSqueeze: c }))} />
            <ColorField label={t.settings.dotOn} value={draft.sqzDotOn} onChange={(c) => setDraft((d) => ({ ...d, sqzDotOn: c }))} />
            <ColorField label={t.settings.dotOff} value={draft.sqzDotOff} onChange={(c) => setDraft((d) => ({ ...d, sqzDotOff: c }))} />
          </div>
        </div>
      )}
      {target === "vrvp" && (
        <p className="text-xs text-tv-text-muted">
          {t.settings.vrvpNoParams}
        </p>
      )}

      <div className="mt-2 flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onReset} className="text-tv-text-muted hover:text-tv-text">
          {t.settings.resetDefaults}
        </Button>
        <Button size="sm" onClick={save} className="bg-tv-blue hover:bg-tv-blue/90">
          {t.settings.apply}
        </Button>
      </div>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-tv-text-muted">{label}</span>
      <Input
        type="number" min={1} max={500} value={value}
        onChange={(e) => { const n = parseInt(e.target.value, 10); if (!isNaN(n)) onChange(n); }}
        className="bg-tv-bg tabular-nums"
      />
    </label>
  );
}

function FieldFloat({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-tv-text-muted">{label}</span>
      <Input
        type="number" min={0.1} max={10} step={0.1} value={value}
        onChange={(e) => { const n = parseFloat(e.target.value); if (!isNaN(n)) onChange(n); }}
        className="bg-tv-bg tabular-nums"
      />
    </label>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (c: string) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-3">
      <span className="w-36 shrink-0 text-[11px] text-tv-text">{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-6 w-8 cursor-pointer rounded border border-tv-border bg-tv-bg p-0.5"
        />
        <div className="h-0.5 w-12 rounded-full" style={{ background: value }} />
      </div>
    </label>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 pt-1">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-tv-text-muted">{children}</span>
      <div className="h-px flex-1 bg-tv-border" />
    </div>
  );
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function clampF(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}
