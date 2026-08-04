import { analisiAvanzataCompleta, type AnalisiCompleta } from "@/services/analisiAvanzata";
import { weatherService, type MeteoHourly, type MeteoCurrent } from "@/services/weatherService";

export type AnalisiCompletaConMargine = AnalisiCompleta & {
  margineSicurezza: number;
};

export function useAnalisiAvanzata() {
  return {
    analisi: analisiAvanzataCompleta,
    AnalisiCompleta,
  };
}