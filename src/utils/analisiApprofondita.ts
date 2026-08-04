import type { HourData } from "@/types/meteo";

export interface AnalisiApprofondita {
  description: string;
  severity: number;
  parameters: {
    temperature: number;
    windSpeed: number;
    precipitation: number;
  };
}

export interface AnalisiResult {
  analysis: AnalisiApprofondita;
  recommendations: string[];
}

export function AnalisiApprofondita(hourData: HourData): AnalisiApprofondita {
  return {
    description: 'Analisi dettagliata del vento',
    severity: hourData.windSpeed,
    parameters: {
      temperature: hourData.temperature,
      windSpeed: hourData.windSpeed,
      precipitation: hourData.precipitation,
    },
  };
}

export function calcolaAnalisiApprofondita(hourData: HourData[]): AnalisiResult {
  const analysis = AnalisiApprofondita(hourData[0]);
  return {
    analysis,
    recommendations: ['Monitorare le condizioni', 'Aggiornare previsioni'],
  };
}