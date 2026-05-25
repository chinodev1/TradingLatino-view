"use client";

import { useChartStore } from "@/lib/store/chart-store";
import { translations } from "@/lib/i18n";

export function useTranslation() {
  const language = useChartStore((s) => s.language);
  return translations[language];
}
