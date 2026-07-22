"use client";

import { DECOLLI } from "@/data/decolli";
import { weatherService } from "@/services/weatherService";
import { calcolaTermiche } from "@/utils/termiche";
import { degreesToCardinal } from "@/utils/windDirections";
import type { HourData } from "@/types/meteo";

export interface ReportDiagnostica {
  timestamp: string;
  errori: string[];
  warning: string[];
  ok: boolean;
  dettagli: {
    decolli: { ok: boolean; count: number; errori: string[] };
    apiMeteo: { ok: boolean; testati: number; okCount: number; errori: string[] };
    calcoli: { ok: boolean; termicheOk: boolean; cardinaliOk: boolean; errori: string[] };
    warning: { duplicati: string[]; nomi: string[] };
  };
  statistiche: {
    decolliTotali: number;
    decolliConDati: number;
    apiMediaRisposta: number;
  };
}

function createMockHourData(overrides: Partial<HourData> = {}): HourData {
  return {
    time: new Date(),
    temperature: 24,
    humidity: 45,
    dewPoint: 10,
    windSpeed: 12,
    windDir: 180,
    windGusts: 18,
    cloudCover: 30,
    weatherCode: 0,
    pressure: 1015,
    surfacePressure: 1013,
    precipitation: 0,
    rain: 0,
    snowfall: 0,
    uvIndex: 6,
    feelsLike: 22,
    radiation: 500,
    directRadiation: 400,
    visibility: 10000,
    vapourPressureDeficit: 14,
    isDay: true,
    freezingLevel: 3000,
    sunshineDuration: 3600,
    cloudCoverLow: 15,
    cloudCoverMid: 10,
    cloudCoverHigh: 5,
    cape: 300,
    cin: -30,
    liftedIndex: -1.5,
    mixingRatio: 0.01,
    virtualTemp: 298,
    ...overrides,
  };
}

export async function diagnosticaCompleta(): Promise<ReportDiagnostica> {
  const errori: string[] = [];
  const warning: string[] = [];

  // --- 1. Verifica decolli ---
  const decolliErrors: string[] = [];
  const ids = new Set<string>();
  let decolliConDati = 0;

  for (const d of DECOLLI) {
    if (!d.id) decolliErrors.push(`Decollo senza id: ${d.name}`);
    if (!d.name) decolliErrors.push("Decollo senza nome");
    if (!d.lat || !d.lon) decolliErrors.push(`${d.name}: coordinate mancanti`);
    if (!d.altitude) decolliErrors.push(`${d.name}: altitudine mancante`);
    if (!d.exposure) decolliErrors.push(`${d.name}: esposizione mancante`);
    if (ids.has(d.id)) decolliErrors.push(`ID duplicato: ${d.id}`);
    else ids.add(d.id);
  }

  // --- 2. Verifica API meteo (solo 2 siti per non stressare) ---
  const apiErrors: string[] = [];
  let apiOkCount = 0;
  let tempiRisposta: number[] = [];

  const sitiTest = DECOLLI.slice(0, 2);
  for (const site of sitiTest) {
    try {
      const start = performance.now();
      const { data, ok } = await weatherService.fetchWithFallback(site.lat, site.lon);
      const elapsed = Math.round(performance.now() - start);
      tempiRisposta.push(elapsed);

      if (!ok || !data) {
        apiErrors.push(`${site.name}: API non risponde (${elapsed}ms)`);
        continue;
      }
      apiOkCount++;

      if (data.hourly.length > 0) {
        const temps = data.hourly.map(h => h.temperature).filter(t => t != null);
        if (temps.length > 0) {
          const minT = Math.min(...temps);
          const maxT = Math.max(...temps);
          if (minT < -30 || maxT > 50) {
            apiErrors.push(`${site.name}: temperature non realistiche (${minT}°C ~ ${maxT}°C)`);
          }
        }
        decolliConDati++;
      }
    } catch (err) {
      apiErrors.push(`${site.name}: eccezione "${err instanceof Error ? err.message : String(err)}"`);
    }
  }

  // --- 3. Verifica calcoli ---
  const calcErrors: string[] = [];

  const testCardinali = [
    { in: 0, atteso: "N" },
    { in: 90, atteso: "E" },
    { in: 180, atteso: "S" },
    { in: 270, atteso: "W" },
  ];
  let cardinaliOk = true;
  for (const t of testCardinali) {
    if (degreesToCardinal(t.in) !== t.atteso) {
      cardinaliOk = false;
      calcErrors.push(`degreesToCardinal(${t.in}°) = "${degreesToCardinal(t.in)}", atteso "${t.atteso}"`);
    }
  }

  let termicheOk = true;
  const mockData = createMockHourData();
  const termiche = calcolaTermiche(mockData, 1250);
  if (!termiche || termiche.rateo < 0.1 || termiche.base < 200) {
    termicheOk = false;
    calcErrors.push(`calcolaTermiche: risultato non valido (rateo=${termiche?.rateo}, base=${termiche?.base})`);
  }

  const warningDuplicati: string[] = [];
  const warningNomi: string[] = [];

  if (DECOLLI.length < 5) {
    warningNomi.push("Pochi decolli configurati");
  }

 <dyad-write path="src/utils/mantenimentoAuto.ts" description="Complete the diagnosticaCompleta function">
  const mediaRisposta = tempiRisposta.length > 0
    ? Math.round(tempiRisposta.reduce((s, t) => s + t, 0) / tempiRisposta.length)
    : 0;

  if (decolliErrors.length > 0) errori.push(...decolliErrors);
  if (apiErrors.length > 0) errori.push(...apiErrors);
  if (calcErrors.length > 0) errori.push(...calcErrors);

  if (warningDuplicati.length > 0) warning.push(...warningDuplicati);
  if (warningNomi.length > 0) warning.push(...warningNomi);

  return {
    timestamp: new Date().toISOString(),
    errori,
    warning,
    ok: errori.length === 0,
    dettagli: {
      decolli: {
        ok: decolliErrors.length === 0,
        count: DECOLLI.length,
        errori: decolliErrors,
      },
      apiMeteo: {
        ok: apiErrors.length === 0,
        testati: sitiTest.length,
        okCount: apiOkCount,
        errori: apiErrors,
      },
      calcoli: {
        ok: calcErrors.length === 0,
        termicheOk,
        cardinaliOk,
        errori: calcErrors,
      },
      warning: {
        duplicati: warningDuplicati,
        nomi: warningNomi,
      },
    },
    statistiche: {
      decolliTotali: DECOLLI.length,
      decolliConDati,
      apiMediaRisposta: mediaRisposta,
    },
  };
}

export function avviaVerificaContinua(intervalMs: number = 30000) {
  console.log("🚀 [Manutenzione Auto] Verifica continua attiva (ogni " + (intervalMs / 1000) + "s)");

  const esegui = async () => {
    try {
      const report = await diagnosticaCompleta();
      if (report.ok) {
        console.log("✅ [Manutenzione Auto] Codebase OK — " +
          report.statistiche.decolliTotali + " decolli, " +
          report.statistiche.apiMediaRisposta + "ms media API");
      } else {
        console.error("❌ [Manutenzione Auto] Problemi: " + report.errori.length + " errori, " +
          report.warning.length + " warning");
        console.table(report.errori);
      }
    } catch (err) {
      console.error("❌ [Manutenzione Auto] Errore diagnostica:", err);
    }
  };

  esegui();
  setInterval(esegui, intervalMs);
}