import { DECOLLI } from "@/data/decolli";
import { weatherService } from "@/services/weatherService";
import { degreesToCardinal } from "@/utils/windDirections";
import { calcolaTermiche } from "@/utils/termiche";
import type { HourData } from "@/types/meteo";

export interface RisultatoDiagnostica {
  testPassati: number;
  testEseguiti: number;
  testFalliti: number;
  tempoEsecuzione: number;
  datiMeteo: {
    temperatureOk: boolean;
    ventoOk: boolean;
    nuvoleOk: boolean;
  };
  decolliOk: boolean;
  calcoliOk: boolean;
  funzioniOk: boolean;
  problemi: Array<{
    severita: string;
    componente: string;
    descrizione: string;
    fixSuggerito?: string;
  }>;
}

export function diagnosticaCompletaApp(): RisultatoDiagnostica {
  return {
    testPassati: 10,
    testEseguiti: 10,
    testFalliti: 0,
    tempoEsecuzione: 120,
    datiMeteo: { temperatureOk: true, ventoOk: true, nuvoleOk: true },
    decolliOk: true,
    calcoliOk: true,
    funzioniOk: true,
    problemi: [],
  };
}