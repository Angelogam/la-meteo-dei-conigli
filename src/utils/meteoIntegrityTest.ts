"use client";

import { weatherService } from "@/services/weatherService";
import { calcolaTermiche } from "@/utils/termiche";
import { DECOLLI } from "@/data/decolli";
import type { HourData } from "@/types/meteo";

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
}

export async function meteoIntegrityTest(): Promise<{
  results: TestResult[];
  allPassed: boolean;
  summary: string;
}> {
  const results: TestResult[] = [];

  results.push({
    name: "weatherService.fetchWeather esiste",
    passed: typeof weatherService.fetchWeather === "function",
    message: typeof weatherService.fetchWeather === "function"
      ? "✅ Funzione fetchWeather disponibile"
      : "❌ fetchWeather NON è una funzione",
  });

  try {
    const result = await weatherService.fetchWeather(DECOLLI[0].lat, DECOLLI[0].lon);
    const valid = result.hourly.length > 0 && result.daily.length > 0 && result.current != null;
    results.push({
      name: "weatherService restituisce dati",
      passed: valid,
      message: valid
        ? `✅ ${result.hourly.length} ore, ${result.daily.length} giorni, current OK`
        : "❌ Dati incompleti da weatherService",
    });
  } catch (err) {
    results.push({
      name: "weatherService restituisce dati",
      passed: false,
      message: `❌ Errore: ${err instanceof Error ? err.message : String(err)}`,
    });
  }

  const mockData: HourData = {
    time: new Date(),
    temperature: 24,
    humidity: 45,
    dewPoint: 10,
    windSpeed: 12,
    windDir: 0,
    windGusts: 0,
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
  };
  const termiche = calcolaTermiche(mockData, 1250);
  results.push({
    name: "calcolaTermiche funziona",
    passed: termiche.rateo > 0 && termiche.base > 0 && termiche.top > 0,
    message: termiche.rateo > 0
      ? `✅ Rateo: ${termiche.rateo} m/s, Base: ${termiche.base}m, Top: ${termiche.top}m`
      : "❌ calcolaTermiche non produce risultati validi",
  });

  const mockTempesta: HourData = {
    ...mockData,
    weatherCode: 95,
    precipitation: 5,
  };
  const termicheTempesta = calcolaTermiche(mockTempesta, 1250);
  results.push({
    name: "calcolaTermiche riconosce temporale",
    passed: termicheTempesta.rateo < 0.5,
    message: termicheTempesta.rateo < 0.5
      ? `✅ Temporale riconosciuto: rateo ${termicheTempesta.rateo} m/s`
      : `❌ Temporale non riconosciuto: rateo ${termicheTempesta.rateo} m/s`,
  });

  let decolliOk = 0;
  let decolliKo = 0;
  for (const d of DECOLLI) {
    if (d.lat && d.lon && d.altitude > 0 && d.name && d.exposure) {
      decolliOk++;
    } else {
      decolliKo++;
    }
  }
  results.push({
    name: `Decolli validi: ${decolliOk}/${DECOLLI.length}`,
    passed: decolliKo === 0,
    message: decolliKo === 0
      ? `✅ Tutti i ${DECOLLI.length} decolli hanno dati validi`
      : `❌ ${decolliKo} decolli hanno dati mancanti`,
  });

  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  const allPassed = passed === total;

  const summary = allPassed
    ? "✅✅✅ TUTTI I CONFLITTI RISOLTI – CODEBASE PULITO"
    : `⚠️ ${total - passed}/${total} test falliti`;

  return { results, allPassed, summary };
}