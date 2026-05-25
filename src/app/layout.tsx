import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "TradingLatino — Charts crypto en vivo",
  description:
    "Plataforma profesional de charts crypto en vivo. Indicadores avanzados: 4EMA, DMI/ADX, Squeeze Momentum, Volume Profile. Powered by Binance.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html
        lang="es"
        className={`dark ${inter.variable} ${jetbrains.variable} h-full antialiased`}
      >
        <body className="h-full bg-tv-bg text-tv-text">
          <TooltipProvider delay={150}>{children}</TooltipProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
