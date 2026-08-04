import { DECOLLI } from "@/data/decolli";
import { weatherService } from "@/services/weatherService";
import { calcolaTermiche } from "@/utils/termiche";
import { degreesToCardinal } from "@/utils/windDirections";
import type { HourData } from "@/types/meteo";

export function avviaVerificaContinua(intervalo: number = 60000): void {
  console.log("Verifica continua avviata con intervallo:", intervalo, "ms");
}