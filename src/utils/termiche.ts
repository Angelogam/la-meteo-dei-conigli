"use client";

import { calcolaTermicheReali } from "@/services/termicheEngine";

export interface TermicheData {
  rateo: number;
  forza: number;
  base: number;
  top: number;
  label: string;
  colore: string;
  gradienteReale: number;
}

/**
 * Calcola termiche per una data ora meteo.
 * Ora usa il motore unificato termicheEngine.
 */
export function calcolaTermiche(weather: any, altitude: number): TermicheData {
  const result = calcolaTermicheReali(weather, altitude);
  return {
    rateo: result.rateo,
    forza: result.forza,
    base: result.base,
    top: result.top,
    label: result.label,
    colore: result.colore,
    gradienteReale: result.gradienteReale,
  };
}