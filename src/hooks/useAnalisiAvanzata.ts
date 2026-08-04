"use client";

import { useState, useCallback } from "react";
import { analisiAvanzataCompleta } from "@/services/analisiAvanzata";
import type { AnalisiCompleta } from "@/types/volo";
import type { HourData } from "@/types/meteo";

export type AnalisiCompletaConMargine = AnalisiCompleta & {
  margineSicurezza: number;
};

export function useAnalisiAvanzata() {
  const [analisi, setAnalisi] = useState<AnalisiCompletaConMargine | null>(null);

  const calcolaAnalisi = useCallback((hourData: HourData[], altitude: number) => {
    const base = analisiAvanzataCompleta(hourData, altitude);
    const margineSicurezza = Math.max(0, Math.min(100, 100 - Math.round(base.voloScore / 2)));
    setAnalisi({ ...base, margineSicurezza });
    return base;
  }, []);

  return { analisi, calcolaAnalisi };
}

export default useAnalisiAvanzata;