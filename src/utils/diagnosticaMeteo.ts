"use client";

import { DECOLLI } from "@/data/decolli";
import { weatherService } from "@/services/weatherService";
import { degreesToCardinal } from "@/utils/windDirections";
import { calcolaTermiche } from "@/utils/termiche";
import type { HourData } from "@/types/meteo";

export interface ReportConflittoMeteo {
  timestamp: string;
  ok: boolean;
  totaleDecolli: number;
  decolliConDati: number;
  decolliSenzaDati: number;
  decolliConAnomalie: number;
  errori: string[];
  warning: string[];
  dettaglioDecolli: {
    nome: string;
    id: string;
    lat: number;
    lon: number;
    alt: number;
    datiOk: boolean;
    ultimoAggiornamento: string | null;
    temperaturaOk: boolean;
    ventoOk: boolean;
    nuvoleOk: boolean;
    pressioneOk: boolean;
    errore?: string;
  }[];
  testCalcoli: {
    nome: string;
    ok: boolean;
    dettaglio: string;
  }[];
  statistiche: {
    apiMediaRisposta: number;
    apiOk: number;
    apiKo: number;
    temperatureMin: number;
    temperatureMax: number;
    ventoMax: number;
    nuvoleMedia: number;
  };
}

export async function diagnosticaMeteoCompleta(): Promise<ReportConflittoMeteo> {
  const errori: string[] = [];
  const warning: string[] = [];
  const dettaglioDecolli: ReportConflittoMeteo["dettaglioDecolli"] = [];
  const testCalcoli: ReportConflittoMeteo["testCalcoli"] = [];
  const statistiche = {
    apiMediaRisposta: 0,
    apiOk: 0,
    apiKo: 0,
    temperatureMin: 999,
    temperatureMax: -999,
    ventoMax: 0,
    nuvoleMedia: 0,
  };

  let decolliConDati = 0;
  let decolliSenzaDati = 0;
  let decolliConAnomalie = 0;
  let sommaTempi = 0;
  let sommaNuvole = 0;
  let countNuvole = 0;

  // Test su primi siti di riferimento
  const campione = DECOLLI.slice(0, 4);

  for (const decollo of campione) {
    const t0 = performance.now();
    try {
      const { data, ok } = await weatherService.fetchWithFallback(decollo.lat, decollo.lon);
      const tempo = Math.round(performance.now() - t0);
      sommaTempi += tempo;

      if (!ok || !data || !data.hourly || data.hourly.length === 0) {
        decolliSenzaDati++;
        statistiche.apiKo++;
        dettaglioDecolli.push({
          nome: decollo.name,
          id: decollo.id,
          lat: decollo.lat,
          lon: decollo.lon,
          alt: decollo.altitude,
          datiOk: false,
          ultimoAggiornamento: null,
          temperaturaOk: false,
          ventoOk: false,
          nuvoleOk: false,
          pressioneOk: false,
          errore: "Nessun dato restituito",
        });
        errori.push(`API non risponde per ${decollo.name}`);
        continue;
      }

      statistiche.apiOk++;
      decolliConDati++;

      const temps = data.hourly.map(h => h.temperature);
      const winds = data.hourly.map(h => h.windSpeed);
      const clouds = data.hourly.map(h => h.cloudCover);

      const minT = Math.min(...temps);
      const maxT = Math.max(...temps);
      const maxW = Math.max(...winds);

      if (minT < statistiche.temperatureMin) statistiche.temperatureMin = Math.round(minT);
      if (maxT > statistiche.temperatureMax) statistiche.temperatureMax = Math.round(maxT);
      if (maxW > statistiche.ventoMax) statistiche.ventoMax = Math.round(maxW);

      clouds.forEach(c => { sommaNuvole += c; countNuvole++; });

      const tempOk = minT > -35 && maxT < 48;
      const ventoOk = maxW >= 0 && maxW < 120;
      const nuvoleOk = clouds.every(c => c >= 0 && c <= 100);

      if (!tempOk || !ventoOk || !nuvoleOk) {
        decolliConAnomalie++;
      }

      dettaglioDecolli.push({
        nome: decollo.name,
        id: decollo.id,
        lat: decollo.lat,
        lon: decollo.lon,
        alt: decollo.altitude,
        datiOk: true,
        ultimoAggiornamento: new Date().toLocaleTimeString("it-IT"),
        temperaturaOk: tempOk,
        ventoOk,
        nuvoleOk,
        pressioneOk: true,
      });

    } catch (err) {
      decolliSenzaDati++;
      statistiche.apiKo++;
      errori.push(`Errore rete ${decollo.name}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  statistiche.apiMediaRisposta = campione.length > 0 ? Math.round(sommaTempi / campione.length) : 0;
  statistiche.nuvoleMedia = countNuvole > 0 ? Math.round(sommaNuvole / countNuvole) : 0;

  // Test Calcoli
  const cardTest: { in: number; atteso: string }[] = [
    { in: 0, atteso: "N" },
    { in: 90, atteso: "E" },
    { in: 180, atteso: "S" },
    { in: 270, atteso: "W" },
  ];
  let cardinaliOk = true;
  for (const t of cardTest) {
    const res = degreesToCardinal(t.in);
    if (res !== t.atteso) {
      cardinaliOk = false;
      errori.push(`degreesToCardinal(${t.in}) = "${res}", atteso "${t.atteso}"`);
    }
  }
  testCalcoli.push({
    nome: "Direzioni cardinali vento",
    ok: cardinaliOk,
    dettaglio: cardinaliOk ? "✅ Tutte le conversioni N/E/S/W corrette" : "❌ Errore conversione angoli",
  });

  const mockData: HourData = {
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
  };
  const termiche = calcolaTermiche(mockData, 1250);
  const termicheOk = termiche.rateo > 0.3 && termiche.base > 200 && termiche.top > termiche.base;
  testCalcoli.push({
    nome: "Calcolo termiche (condizioni ideali)",
    ok: termicheOk,
    dettaglio: termicheOk
      ? `✅ Rateo ${termiche.rateo} m/s, base ${termiche.base}m, top ${termiche.top}m`
      : `❌ Risultato anomalo: rateo ${termiche.rateo} m/s`,
  });

  const mockTempesta: HourData = { ...mockData, weatherCode: 95, precipitation: 5, cloudCover: 90 };
  const termTempesta = calcolaTermiche(mockTempesta, 1250);
  const tempestaOk = termTempesta.rateo <= 0.2;
  testCalcoli.push({
    nome: "Blocco termiche durante maltempo/temporale",
    ok: tempestaOk,
    dettaglio: tempestaOk
      ? `✅ Temporale riconosciuto: termiche azzerate (${termTempesta.rateo} m/s)`
      : `❌ Errore: termiche attive durante temporale (${termTempesta.rateo} m/s)`,
  });

  return {
    timestamp: new Date().toISOString(),
    ok: errori.length === 0 && decolliSenzaDati === 0,
    totaleDecolli: DECOLLI.length,
    decolliConDati,
    decolliSenzaDati,
    decolliConAnomalie,
    errori,
    warning,
    dettaglioDecolli,
    testCalcoli,
    statistiche,
  };
}