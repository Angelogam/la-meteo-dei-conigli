import { useAnalisiAvanzata, type AnalisiCompletaConMargine } from "./useAnalisiAvanzata";
import { weatherService, type MeteoHourly, type MeteoCurrent, type MeteoDaily } from "@/services/weatherService";

export function useMeteoCompleto() {
  return {
    useAnalisiAvanzata,
    AnalisiCompletaConMargine,
    weatherService,
  };
}