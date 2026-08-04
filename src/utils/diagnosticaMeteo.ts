"use client";

import { DECOLLI } from "@/data/decolli";
import { weatherService, type MeteoHourly } from "@/services/weatherService";
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

function validaTemperatura(temp: number, alt: number): { ok: boolean; msg: string } {
  if (temp < -30 || temp > 50) return { ok: false, msg: `Temperatura ${temp}°C fuori range realistico per ${alt}m` };
  return { ok: true, msg: "" };
}

function validaVento(speed: number): { ok: boolean; msg: string } {
  if (speed < 0 || speed > 120) return { ok: false, msg: `Vento ${speed} km/h non realistico` };
  return { ok: true, msg: "" };
}

function validaNuvole(cloud: number): { ok: boolean; msg: string } {
  if (cloud < 0 || cloud > 100) return { ok: false, msg: `Nuvolosità ${cloud}% fuori range 0-100` };
  return { ok: true, msg: "" };
}

function validaPressione(press: number): { ok: boolean; msg: string } {
  if (press < 900 || press > 1080) return { ok: false, msg: `Pressione ${press} hPa non realistica` };
  return { ok: true, msg: "" };
}

export async function diagnosticaMeteoCompleta(): Promise<ReportConflittoMeteo> {
  const errori: string[] = [];
  const warning: string[] = [];
  const dettaglioDecolli: ReportConflittoMeteo["dettaglioDecolli"] = [];
  const testCalcoli: ReportConflittoMeteo["testCalcoli"] = [];
  const statistiche = { apiMediaRisposta: 0, apiOk: 0, apiKo: 0, temperatureMin: 999, temperatureMax: -999, ventoMax: 0, nuvoleMedia: 0 };
  let sommaNuvole = 0;
  let countNuvole = 0;

  // ... keep existing test logic ...

  // --- 2. Test calcoli ---
  const cardTest: { in: number; atteso: string }[] = [
    { in: 0, atteso: "N" }, { in: 90, atteso: "E" },
    { in: 180, atteso: "S" }, { in: 270, atteso: "W" },
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
    nome: "degreesToCardinal",
    ok: cardinaliOk,
    dettaglio: cardinaliOk ? "✅ Tutti i 4 test cardinali passati" : "❌ Test fallito",
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
    nome: "calcolaTermiche",
    ok: termicheOk,
    dettaglio: termicheOk
      ? `✅ Rateo ${termiche.rateo} m/s, base ${termiche.base}m, top ${termiche.top}m`
      : `❌ Rateo ${termiche.rateo}, base ${termiche.base}, top ${termiche.top}`,
  });

  const mockTempesta: HourData = { ...mockData, weatherCode: 95, precipitation: 5, cloudCover: 90 };
  const termTempesta = calcolaTermiche(mockTempesta, 1250);
  const tempestaOk = termTempesta.rateo < 0.5;
  testCalcoli.push({
    nome: "calcolaTermiche (temporale)",
    ok: tempestaOk,
    dettaglio: tempestaOk ? `✅ Temporale riconosciuto: rateo ${termTempesta.rateo} m/s` : `❌ Rateo ${termTempesta.rateo} m/s durante temporale`,
  });

  return {
    timestamp: new Date().toISOString(),
    ok: false, // Placeholder
    totaleDecolli: 0,
    decolliConDati: 0,
    decolliSenzaDati: 0,
    decolliConAnomalie: 0,
    errori,
    warning,
    dettaglioDecolli,
    testCalcoli,
    statistiche,
  };
}