"use client";

import { useState } from "react";
import Link from "next/link";
import { Zap, Copy, Check, ArrowLeft, Loader2, AlertCircle } from "lucide-react";

type Currency = "usdtbsc" | "usdtarbitrum" | "usdcbsc" | "usdcarbitrum";

const CURRENCIES: { key: Currency; label: string; network: string }[] = [
  { key: "usdtbsc",       label: "USDT",  network: "BEP20 (BSC)" },
  { key: "usdtarbitrum",  label: "USDT",  network: "Arbitrum" },
  { key: "usdcbsc",       label: "USDC",  network: "BEP20 (BSC)" },
  { key: "usdcarbitrum",  label: "USDC",  network: "Arbitrum" },
];

interface PaymentInfo {
  paymentId: string;
  payAddress: string;
  payAmount: number;
  payCurrency: string;
}

export function SubscribeClient() {
  const [selected, setSelected] = useState<Currency>("usdtbsc");
  const [loading, setLoading] = useState(false);
  const [payment, setPayment] = useState<PaymentInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<"address" | "amount" | null>(null);

  async function handlePay() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/payment/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currency: selected }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al crear el pago");
      setPayment(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }

  function copy(text: string, which: "address" | "amount") {
    navigator.clipboard.writeText(text);
    setCopied(which);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-tv-bg px-4">
      <div className="w-full max-w-md">
        {/* Back */}
        <Link href="/" className="mb-6 flex items-center gap-1.5 text-xs text-tv-text-muted hover:text-tv-text transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" /> Volver al inicio
        </Link>

        <div className="rounded-xl border border-tv-border bg-tv-panel p-8 shadow-2xl">
          {/* Header */}
          <div className="mb-6 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-tv-blue/15">
              <Zap className="h-4 w-4 text-tv-blue" />
            </div>
            <div>
              <div className="text-sm font-bold text-tv-text">TradingLatino</div>
              <div className="text-[11px] text-tv-text-muted">Suscripción mensual</div>
            </div>
            <div className="ml-auto text-xl font-extrabold text-tv-text">$2<span className="text-xs font-normal text-tv-text-muted">/mes</span></div>
          </div>

          {!payment ? (
            <>
              {/* Currency selector */}
              <div className="mb-5">
                <div className="mb-2 text-xs font-semibold text-tv-text-muted uppercase tracking-wide">
                  Elegí la moneda de pago
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {CURRENCIES.map(({ key, label, network }) => (
                    <button
                      key={key}
                      onClick={() => setSelected(key)}
                      className={[
                        "flex flex-col rounded-lg border p-3 text-left text-xs transition-colors",
                        selected === key
                          ? "border-tv-blue bg-tv-blue/10 text-tv-text"
                          : "border-tv-border text-tv-text-muted hover:border-tv-blue/40 hover:text-tv-text",
                      ].join(" ")}
                    >
                      <span className="font-bold">{label}</span>
                      <span className="text-[10px] opacity-70">{network}</span>
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  {error}
                </div>
              )}

              <button
                onClick={handlePay}
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-tv-blue py-3 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {loading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Generando pago...</>
                ) : (
                  "Generar dirección de pago"
                )}
              </button>

              <p className="mt-4 text-center text-[10px] text-tv-text-dim leading-relaxed">
                Al hacer click se genera una dirección de pago única válida por 60 minutos.
                La suscripción se activa automáticamente al confirmar el pago.
              </p>
            </>
          ) : (
            <>
              {/* Payment address UI */}
              <div className="mb-4 rounded-lg border border-tv-blue/30 bg-tv-blue/5 px-4 py-3 text-center">
                <div className="text-xs text-tv-text-muted mb-1">Enviá exactamente</div>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-lg font-extrabold text-tv-text">
                    {payment.payAmount} {payment.payCurrency.toUpperCase()}
                  </span>
                  <button
                    onClick={() => copy(String(payment.payAmount), "amount")}
                    className="rounded p-1 text-tv-text-muted hover:text-tv-text transition-colors"
                  >
                    {copied === "amount" ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              <div className="mb-2 text-xs font-semibold text-tv-text-muted uppercase tracking-wide">
                Dirección de pago
              </div>
              <div className="mb-5 flex items-center gap-2 rounded-lg border border-tv-border bg-tv-bg px-3 py-2.5">
                <span className="flex-1 break-all font-mono text-[11px] text-tv-text">{payment.payAddress}</span>
                <button
                  onClick={() => copy(payment.payAddress, "address")}
                  className="shrink-0 rounded p-1 text-tv-text-muted hover:text-tv-text transition-colors"
                >
                  {copied === "address" ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>

              <div className="mb-5 rounded-lg border border-yellow-500/20 bg-yellow-500/5 px-3 py-2.5 text-[11px] text-yellow-400 leading-relaxed">
                ⚠️ Enviá <strong>exactamente</strong> el monto indicado a esta dirección. Una vez confirmado en la red, tu acceso se activa en minutos. El pago es válido por <strong>60 minutos</strong>.
              </div>

              <Link
                href="/chart"
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-tv-border py-2.5 text-sm text-tv-text-muted hover:bg-tv-panel-hover hover:text-tv-text transition-colors"
              >
                Ya pagué — ir al chart
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
