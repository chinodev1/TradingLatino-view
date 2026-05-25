import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import {
  Zap, TrendingUp, BarChart2, Layers, Eye, ArrowRight,
  Check, Bitcoin, Shield, Globe,
} from "lucide-react";

const FEATURES = [
  {
    icon: TrendingUp,
    title: "4 EMA automáticas",
    desc: "EMAs de 9, 21, 55 y 200 períodos con colores diferenciados. Tendencia a golpe de vista.",
  },
  {
    icon: BarChart2,
    title: "DMI / ADX + Key Level",
    desc: "Panel dedicado con ADX, +DI y -DI. Línea de nivel clave en 23 para filtrar señales débiles.",
  },
  {
    icon: Zap,
    title: "Squeeze Momentum",
    desc: "Histograma colorido que identifica compresión de volatilidad y dirección del impulso.",
  },
  {
    icon: Layers,
    title: "Volume Profile (VRVP)",
    desc: "Barras horizontales de volumen por precio. Se actualiza en tiempo real al hacer zoom o pan.",
  },
  {
    icon: Eye,
    title: "Herramientas de dibujo",
    desc: "Líneas, flechas, rectángulos, texto, brocha y herramienta de medición. Deshacer incluido.",
  },
  {
    icon: Globe,
    title: "Datos en tiempo real",
    desc: "WebSocket directo a Binance. Sin delay, sin intermediarios. Todos los pares USDT disponibles.",
  },
];

export default async function LandingPage() {
  const { userId } = await auth();

  return (
    <div className="min-h-screen bg-tv-bg text-tv-text">
      {/* Nav */}
      <nav className="flex items-center justify-between border-b border-tv-border px-6 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded bg-tv-blue/20">
            <Zap className="h-4 w-4 text-tv-blue" />
          </div>
          <span className="text-sm font-bold text-tv-text">
            TradingLatino
          </span>
        </div>
        <div className="flex items-center gap-3">
          {userId ? (
            <Link
              href="/chart"
              className="flex items-center gap-1.5 rounded bg-tv-blue px-4 py-1.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              Abrir chart <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          ) : (
            <>
              <Link href="/sign-in" className="text-sm text-tv-text-muted hover:text-tv-text transition-colors">
                Iniciar sesión
              </Link>
              <Link
                href="/sign-up"
                className="flex items-center gap-1.5 rounded bg-tv-blue px-4 py-1.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              >
                Empezar gratis
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-4xl px-6 py-20 text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-tv-blue/30 bg-tv-blue/10 px-3 py-1 text-xs text-tv-blue">
          <Bitcoin className="h-3 w-3" /> Datos en tiempo real · Binance WebSocket
        </div>
        <h1 className="mb-6 text-4xl font-extrabold leading-tight tracking-tight text-tv-text sm:text-5xl">
          Charts profesionales<br />
          <span className="text-tv-blue">para traders latinos</span>
        </h1>
        <p className="mx-auto mb-10 max-w-2xl text-base text-tv-text-muted">
          Indicadores avanzados, herramientas de dibujo y datos en vivo directos de Binance.
          Todo lo que necesitás para analizar el mercado — sin complicaciones, sin excusas.
        </p>
        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href={userId ? "/chart" : "/sign-up"}
            className="flex items-center gap-2 rounded-lg bg-tv-blue px-8 py-3 text-base font-bold text-white shadow-lg shadow-tv-blue/25 transition-all hover:opacity-90 hover:shadow-tv-blue/40"
          >
            {userId ? "Abrir chart" : "Acceder ahora"} <ArrowRight className="h-4 w-4" />
          </Link>
          <span className="text-sm text-tv-text-muted">$2 / mes · Pago con crypto</span>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-5xl px-6 pb-20">
        <h2 className="mb-10 text-center text-2xl font-bold text-tv-text">
          Todo lo que un trader necesita
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="rounded-lg border border-tv-border bg-tv-panel p-5 transition-colors hover:border-tv-blue/40"
            >
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-tv-blue/15">
                <Icon className="h-4.5 w-4.5 text-tv-blue" />
              </div>
              <h3 className="mb-1.5 text-sm font-semibold text-tv-text">{title}</h3>
              <p className="text-xs leading-relaxed text-tv-text-muted">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="border-t border-tv-border bg-tv-panel py-20">
        <div className="mx-auto max-w-sm px-6 text-center">
          <h2 className="mb-2 text-2xl font-bold text-tv-text">Precio simple</h2>
          <p className="mb-8 text-sm text-tv-text-muted">Sin sorpresas. Sin suscripciones anuales. Cancelás cuando querés.</p>

          <div className="rounded-xl border border-tv-blue/40 bg-tv-bg p-8 shadow-xl shadow-tv-blue/10">
            <div className="mb-1 text-4xl font-extrabold text-tv-text">$2</div>
            <div className="mb-6 text-sm text-tv-text-muted">por mes</div>
            <ul className="mb-8 space-y-3 text-left text-sm">
              {[
                "Todos los indicadores avanzados",
                "Datos en tiempo real (Binance WS)",
                "Herramientas de dibujo completas",
                "Todos los pares USDT",
                "Acceso inmediato tras el pago",
                "Pago anónimo con crypto (USDT / USDC)",
              ].map((f) => (
                <li key={f} className="flex items-center gap-2.5 text-tv-text-muted">
                  <Check className="h-4 w-4 shrink-0 text-tv-blue" />
                  {f}
                </li>
              ))}
            </ul>
            <Link
              href={userId ? "/subscribe" : "/sign-up"}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-tv-blue py-3 text-sm font-bold text-white transition-all hover:opacity-90"
            >
              {userId ? "Suscribirme ahora" : "Crear cuenta y suscribirse"}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <div className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-tv-text-dim">
              <Shield className="h-3 w-3" /> Pago seguro · USDT o USDC · BEP20 / Arbitrum
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-tv-border px-6 py-6 text-center text-xs text-tv-text-dim">
        © {new Date().getFullYear()} TradingLatino · Datos provistos por Binance · No somos asesoría financiera
      </footer>
    </div>
  );
}
