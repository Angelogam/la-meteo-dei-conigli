"use client";

import { DECOLLI } from "@/data/decolli";
import { weatherService } from "@/services/weatherService";

export interface AnalisiAPIResult {
  timestamp: string;
  totaleSiti: number;
  apiOk: boolean;
  tempoMedioMs: number;
}

export async function eseguiDiagnosticaAPI(): Promise<AnalisiAPIResult> {
  const start = performance.now();
  try {
    const site = DECOLLI[0];
    const { ok } = await weatherService.fetchWithFallback(site.lat, site.lon);
    const tempo = Math.round(performance.now() - start);

    return {
      timestamp: new Date().toISOString(),
      totaleSiti: DECOLLI.length,
      apiOk: ok,
      tempoMedioMs: tempo,
    };
  } catch {
    return {
      timestamp: new Date().toISOString(),
      totaleSiti: DECOLLI.length,
      apiOk: false,
      tempoMedioMs: 0,
    };
  }
}