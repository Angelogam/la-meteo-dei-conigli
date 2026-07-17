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

  // --- 1. Verifica TUTTI i decolli con dati reali da Open-Meteo ---
  for (let i = 0; i < DECOLLI.length; i++) {
    const d = DECOLLI[i];
    if (!d || !d.lat || !d.lon) {
      errori.push(`Decollo #${i + 1} senza coordinate valide (lat=${d?.lat}, lon=${d?.lon})`);
      dettaglioDecolli.push({
        nome: d?.name || `Decollo #${i + 1}`, id: d?.id || `unknown-${i}`,
        lat: d?.lat || 0, lon: d?.lon || 0, alt: d?.altitude || 0,
        datiOk: false, ultimoAggiornamento: null,
        temperaturaOk: false, ventoOk: false, nuvoleOk: false, pressioneOk: false,
        errore: "Coordinate mancanti",
      });
      continue;
    }

    try {
      const start = performance.now();
      const { data, ok: apiOk } = await weatherService.fetchWithFallback(d.lat, d.lon);
      const elapsed = Math.round(performance.now() - start);
      statistiche.apiMediaRisposta += elapsed;

      if (!apiOk || !data || !data.hourly || data.hourly.length === 0) {
        errori.push(`${d.name}: API non risponde (${elapsed}ms)`);
        statistiche.apiKo++;
        dettaglioDecolli.push({
          nome: d.name, id: d.id, lat: d.lat, lon: d.lon, alt: d.altitude,
          datiOk: false, ultimoAggiornamento: null,
          temperaturaOk: false, ventoOk: false, nuvoleOk: false, pressioneOk: false,
          errore: `API fallita (${elapsed}ms)`,
        });
        continue;
      }

      statistiche.apiOk++;

      // Prendi i dati orari del giorno corrente
      const oggi = new Date();
      const oreOggi = data.hourly.filter(h =>
        h.time.getDate() === oggi.getDate() &&
        h.time.getMonth() === oggi.getMonth() &&
        h.time.getFullYear() === oggi.getFullYear()
      );
      const oreValide = oreOggi.filter(h => h.time.getHours() >= 6 && h.time.getHours() <= 22);
      const haDati = oreValide.length >= 8;

      let tempOk = true, ventoOk = true, nuvoleOk = true, pressioneOk = true;
      let temperaturaMin = 999, temperaturaMax = -999;

      for (const h of oreOggi) {
        const t = h.temperature;
        if (t < temperaturaMin) temperaturaMin = t;
        if (t > temperaturaMax) temperaturaMax = t;
        if (t != null && t > statistiche.temperatureMax) statistiche.temperatureMax = t;
        if (t != null && t < statistiche.temperatureMin) statistiche.temperatureMin = t;

        const tv = validaTemperatura(t, d.altitude);
        if (!tv.ok) { tempOk = false; errori.push(`${d.name}: ${tv.msg}`); }

        const wv = validaVento(h.windSpeed);
        if (!wv.ok) { ventoOk = false; errori.push(`${d.name}: ${wv.msg}`); }
        if (h.windSpeed > statistiche.ventoMax) statistiche.ventoMax = h.windSpeed;

        const cv = validaNuvole(h.cloudCover);
        if (!cv.ok) { nuvoleOk = false; errori.push(`${d.name}: ${cv.msg}`); }
        sommaNuvole += h.cloudCover;
        countNuvole++;

        const pv = validaPressione(h.pressure || 1013);
        if (!pv.ok) { pressioneOk = false; errori.push(`${d.name}: ${pv.msg}`); }
      }

      const ultimoAgg = oreOggi.length > 0 ? oreOggi[oreOggi.length - 1].time.toISOString() : null;

      dettaglioDecolli.push({
        nome: d.name, id: d.id, lat: d.lat, lon: d.lon, alt: d.altitude,
        datiOk: haDati && tempOk && ventoOk && nuvoleOk && pressioneOk,
        ultimoAggiornamento: ultimoAgg,
        temperaturaOk: tempOk,
        ventoOk,
        nuvoleOk,
        pressioneOk,
      });

      if (!haDati) warning.push(`${d.name}: solo ${oreValide.length} ore di dati valide su 17 attese`);
      if (!tempOk) warning.push(`${d.name}: temperature anomale (${temperaturaMin}°C ~ ${temperaturaMax}°C)`);
      if (!ventoOk) warning.push(`${d.name}: vento anomalo`);

    } catch (err) {
      errori.push(`${d.name}: eccezione "${err instanceof Error ? err.message : String(err)}"`);
      statistiche.apiKo++;
      dettaglioDecolli.push({
        nome: d.name, id: d.id, lat: d.lat, lon: d.lon, alt: d.altitude,
        datiOk: false, ultimoAggiornamento: null,
        temperaturaOk: false, ventoOk: false, nuvoleOk: false, pressioneOk: false,
        errore: `Eccezione: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }

  // --- 2. Test calcoli (degreesToCardinal, calcolaTermiche) ---
  const cardTest: { in: number; atteso: string }[] = [
    { in: 0, atteso: "N" }, { in: 90, atteso: "E" },
    { in: 180, atteso: "S" }, { in: 270, atteso: "W" },
  ];
  let cardinaliOk = true;
  for (const t of cardTest) {
    const res = degreesToCardinal(t.in);
    if (res !== t.atteso) {
      cardinaliOk = false;
      errori.push(`degreesToCardinal(${t.in}°) = "${res}", atteso "${t.atteso}"`);
    }
  }
  testCalcoli.push({
    nome: "degreesToCardinal",
    ok: cardinaliOk,
    dettaglio: cardinaliOk ? "✅ Tutti i 4 test cardinali passati" : "❌ Test fallito",
  });

  const mockData: HourData = {
    time: new Date(), temperature: 24, humidity: 45, dewPoint: 10,
    apparentTemp: 22, precipitationProba: 0, precipitation: 0, rain: 0,
    showers: 0, snowfall: 0, weatherCode: 0, pressure: 1015, surfacePressure: 1013,
    cloudCover: 30, cloudCoverLow: 15, cloudCoverMid: 10, cloudCoverHigh: 5,
    evapotranspiration: 0, et0: 0, vapourPressureDeficit: 14,
    windSpeed: 12, windDir: 180, windGusts: 18,
    soilTemp: 22, soilMoisture: 0.25, uvIndex: 6,
    temp80m: 22.5, temp120m: 21.8,
    shortwaveRadiation: 500, directRadiation: 400, diffuseRadiation: 100,
    directNormalIrradiance: 350, terrestrialRadiation: 0, sunshineDuration: 3600,
    windProfile: undefined,
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

  // Mock temporale
  const mockTempesta: HourData = { ...mockData, weatherCode: 95, precipitation: 5, cloudCover: 90 };
  const termTempesta = calcolaTermiche(mockTempesta, 1250);
  const tempestaOk = termTempesta.rateo < 0.5;
  testCalcoli.push({
    nome: "calcolaTermiche (temporale)",
    ok: tempestaOk,
    dettaglio: tempestaOk ? `✅ Temporale riconosciuto: rateo ${termTempesta.rateo} m/s` : `❌ Rateo ${termTempesta.rateo} m/s durante temporale`,
  });

  // --- 3. Statistiche finali ---
  statistiche.apiMediaRisposta = statistiche.apiOk > 0
    ? Math.round(statistiche.apiMediaRisposta / (statistiche.apiOk > 0 ? statistiche.apiOk : 1) || 0)
    : 0;
  statistiche.nuvoleMedia = countNuvole > 0 ? Math.round(sommaNuvole / countNuvole * 10) / 10 : 0;

  const decolliOk = dettaglioDecolli.filter(d => d.datiOk).length;
  const decolliKo = dettaglioDecolli.filter(d => !d.datiOk).length;
  const decolliConAnomalieCount = dettaglioDecolli.filter(d =>
    !d.temperaturaOk || !d.ventoOk || !d.nuvoleOk || !d.pressioneOk
  ).length;

  return {
    timestamp: new Date().toISOString(),
    ok: errori.length === 0,
    totaleDecolli: DECOLLI.length,
    decolliConDati: decolliOk,
    decolliSenzaDati: decolliKo,
    decolliConAnomalie: decolliConAnomalieCount,
    errori,
    warning,
    dettaglioDecolli,
    testCalcoli,
    statistiche,
  };
}