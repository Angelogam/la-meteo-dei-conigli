"use client";

import { weatherService, type MeteoHourly, type MeteoCurrent, type MeteoDaily } from "./weatherService";
import { weatherService7Timer, type TimerHourly, type TimerDaily } from "./weatherService7Timer";

// ============================================================
// CONFIGURAZIONE PESI
// ============================================================
// I pesi determinano quanto "ascoltiamo" ogni fonte per ogni parametro.
// Open-Meteo è più affidabile per temperatura/vento al suolo (dati orari fitti).
// 7Timer! è più affidabile per CAPE/LI (usa GFS diretto).
// La confidenza finale si basa su quanto le due fonti concordano.

interface FontePesi {
  openMeteo: number;
  timer7: number;
}

const PESI: Record<string, FontePesi> = {
  temperatura:          { openMeteo: 0.65, timer7: 0.35 },
  vento:               { openMeteo: 0.60, timer7: 0.40 },
  ventoDir:            { openMeteo: 0.70, timer7: 0.30 },
  nuvole:              { openMeteo: 0.60, timer7: 0.40 },
  umidita:             { openMeteo: 0.75, timer7: 0.25 },
  precipitazioni:      { openMeteo: 0.70, timer7: 0.30 },
  cape:                { openMeteo: 0.30, timer7: 0.70 }, // 7Timer! meglio per CAPE
  liftedIndex:         { openMeteo: 0.35, timer7: 0.65 }, // 7Timer! meglio per LI
  pressione:           { openMeteo: 0.80, timer7: 0.20 },
};

// ============================================================
// INTERFACCE RISULTATO
// ============================================================

export interface FusedHourly {
  time: Date;
  temperature: number;      // media pesata
  humidity: number;         // media pesata
  dewPoint: number;         // calcolato da temp+hum
  apparentTemp: number;     // stimato
  precipitation: number;    // media pesata
  precipitationProbability: number; // da Open-Meteo o stimato
  weatherCode: number;      // priorità a Open-Meteo (se presente)
  cloudCover: number;       // media pesata
  windSpeed: number;        // media pesata
  windDir: number;          // media pesata (circolare)
  windGusts: number;        // da Open-Meteo (7Timer! non dà gusts)
  uvIndex: number;          // da Open-Meteo
  cape: number;             // media pesata, peso maggiore a 7Timer!
  cin: number;              // da Open-Meteo
  liftedIndex: number;      // media pesata, peso maggiore a 7Timer!
  temp80m?: number;         // da Open-Meteo
  temp120m?: number;        // da Open-Meteo
  shortwaveRadiation: number; // da Open-Meteo
  windProfile?: { height: number; speed: number; dir: number }[]; // unione

  // Campo nuovo: confidenza (0-100)
  // Indica quanto le due fonti concordano su questa ora
  confidenza: number;

  // Dettaglio delle singole fonti (per debug)
  fonte: {
    openMeteo: { temperatura: number; vento: number; nuvole: number } | null;
    timer7: { temperatura: number; vento: number; nuvole: number } | null;
  };
}

export interface FusedCurrent {
  time: Date;
  temperature: number;
  humidity: number;
  apparentTemp: number;
  isDay: number;
  precipitation: number;
  rain: number;
  showers: number;
  snowfall: number;
  weatherCode: number;
  cloudCover: number;
  pressure: number;
  surfacePressure: number;
  windSpeed: number;
  windDir: number;
  windGusts: number;
  confidenza: number;
}

export interface FusedDaily {
  date: Date;
  tempMax: number;
  tempMin: number;
  apparentTempMax: number;
  apparentTempMin: number;
  precipitationSum: number;
  precipitationProbaMax: number;
  weatherCode: number;
  windSpeedMax: number;
  windGustsMax: number;
  windDirDominant: number;
  uvIndexMax: number;
  confidenza: number;
}

export interface FusionResult {
  hourly: FusedHourly[];
  current: FusedCurrent | null;
  daily: FusedDaily[];
  model: string;
  confidenzaMedia: number;
  fontiAttive: string[];
  warning: string[];
}

// ============================================================
// UTILITY
// ============================================================

/** Media circolare per direzioni vento */
function mediaCircolare(valori: { valore: number; peso: number }[]): number {
  if (valori.length === 0) return 0;
  let sinSum = 0, cosSum = 0, pesoTot = 0;
  for (const v of valori) {
    const rad = (v.valore * Math.PI) / 180;
    sinSum += Math.sin(rad) * v.peso;
    cosSum += Math.cos(rad) * v.peso;
    pesoTot += v.peso;
  }
  if (pesoTot === 0) return valori[0]?.valore ?? 0;
  const avgRad = Math.atan2(sinSum / pesoTot, cosSum / pesoTot);
  return ((avgRad * 180) / Math.PI + 360) % 360;
}

/** Calcola la confidenza (quanto due valori concordano) */
function calcolaConfidenza(val1: number | null | undefined, val2: number | null | undefined, tolleranzaPercentuale: number = 20): number {
  if (val1 == null || val2 == null) return 50; // confidenza media se manca una fonte
  if (val1 === val2) return 100;
  const diff = Math.abs(val1 - val2);
  const media = (Math.abs(val1) + Math.abs(val2)) / 2 || 1;
  const diffPercentuale = (diff / media) * 100;
  if (diffPercentuale <= tolleranzaPercentuale * 0.25) return 95;
  if (diffPercentuale <= tolleranzaPercentuale * 0.5) return 85;
  if (diffPercentuale <= tolleranzaPercentuale * 0.75) return 70;
  if (diffPercentuale <= tolleranzaPercentuale) return 55;
  if (diffPercentuale <= tolleranzaPercentuale * 1.5) return 40;
  return 25;
}

/** Media pesata semplice */
function mediaPesata(
  val1: number | null | undefined,
  val2: number | null | undefined,
  peso1: number,
  peso2: number,
  fallback: number = 0
): number {
  if (val1 == null && val2 == null) return fallback;
  if (val1 == null) return val2 ?? fallback;
  if (val2 == null) return val1 ?? fallback;
  return Math.round((val1 * peso1 + val2 * peso2) * 10) / 10;
}

// ============================================================
// ALGORITMO PRINCIPALE
// ============================================================

export async function fuseWeatherData(
  lat: number,
  lon: number,
  altitude: number
): Promise<FusionResult> {
  const warning: string[] = [];
  const fontiAttive: string[] = [];
  const startTime = performance.now();

  // 1. CHIAMATE PARALLELE
  const [openMeteoResult, timerResult] = await Promise.allSettled([
    weatherService.fetchWeather(lat, lon),
    weatherService7Timer.fetchWeather(lat, lon),
  ]);

  const omData = openMeteoResult.status === "fulfilled" ? openMeteoResult.value : null;
  if (omData) fontiAttive.push("Open-Meteo");
  else warning.push("Open-Meteo non risponde");

  const tmData = timerResult.status === "fulfilled" ? timerResult.value : null;
  if (tmData) fontiAttive.push("7Timer!");
  else warning.push("7Timer! non risponde");

  // Se nessuna fonte è disponibile, lancia errore
  if (!omData && !tmData) {
    throw new Error("Nessuna fonte meteo disponibile");
  }

  console.log(`🔀 [Fusion] ${fontiAttive.join(" + ")} — ${Math.round(performance.now() - startTime)}ms`);

  // 2. FUSIONE ORARIA
  const fusedHourly: FusedHourly[] = [];

  // Creiamo una mappa delle ore disponibili da entrambe le fonti
  const oreOM = new Map<number, MeteoHourly>();
  const oreTM = new Map<number, TimerHourly>();

  if (omData) {
    for (const h of omData.hourly) {
      const key = h.time.getHours() + h.time.getDate() * 100;
      oreOM.set(key, h);
    }
  }

  if (tmData) {
    for (const h of tmData.hourly) {
      const key = h.time.getHours() + h.time.getDate() * 100;
      oreTM.set(key, h);
    }
  }

  // Uniamo tutte le chiavi disponibili (da entrambe le fonti)
  const tutteLeOre = new Set([...oreOM.keys(), ...oreTM.keys()]);

  for (const key of tutteLeOre) {
    const om = oreOM.get(key) ?? null;
    const tm = oreTM.get(key) ?? null;

    // Se una fonte manca completamente, usiamo solo l'altra (confidenza media)
    const soloOM = !tm && !!om;
    const soloTM = !om && !!tm;

    // Dati orari
    const time = om?.time ?? tm?.time ?? new Date();

    // Calcola i valori fusi
    const temperatura = soloOM ? om!.temperature : soloTM ? tm!.temperature : mediaPesata(
      om?.temperature, tm?.temperature,
      PESI.temperatura.openMeteo, PESI.temperatura.timer7
    );

    const windSpeed = soloOM ? om!.windSpeed : soloTM ? tm!.windSpeed : mediaPesata(
      om?.windSpeed, tm?.windSpeed,
      PESI.vento.openMeteo, PESI.vento.timer7
    );

    const windDir = soloOM ? om!.windDir : soloTM ? tm!.windDir : Math.round(mediaCircolare([
      { valore: om?.windDir ?? 0, peso: PESI.ventoDir.openMeteo },
      { valore: tm?.windDir ?? 0, peso: PESI.ventoDir.timer7 },
    ]));

    const cloudCover = soloOM ? om!.cloudCover : soloTM ? tm!.cloudCover : mediaPesata(
      om?.cloudCover, tm?.cloudCover,
      PESI.nuvole.openMeteo, PESI.nuvole.timer7
    );

    const humidity = soloOM ? om!.humidity : soloTM ? tm!.relativeHumidity : mediaPesata(
      om?.humidity, tm?.relativeHumidity,
      PESI.umidita.openMeteo, PESI.umidita.timer7
    );

    const precipitation = soloOM ? om!.precipitation : soloTM ? tm!.precipitation : mediaPesata(
      om?.precipitation, tm?.precipitation,
      PESI.preicipitazioni.openMeteo, PESI.preicipitazioni.timer7
    );

    const cape = soloOM ? om!.cape : soloTM ? tm!.cape : mediaPesata(
      om?.cape, tm?.cape,
      PESI.cape.openMeteo, PESI.cape.timer7
    );

    const liftedIndex = soloOM ? om!.liftedIndex : soloTM ? tm!.liftedIndex : mediaPesata(
      om?.liftedIndex, tm?.liftedIndex,
      PESI.liftedIndex.openMeteo, PESI.liftedIndex.timer7
    );

    // Calcola confidenza per questa ora
    const confidenze = [
      calcolaConfidenza(om?.temperature, tm?.temperature, 15),
      calcolaConfidenza(om?.windSpeed, tm?.windSpeed, 25),
      calcolaConfidenza(om?.cloudCover, tm?.cloudCover, 30),
    ];
    const confidenza = Math.round(confidenze.reduce((s, c) => s + c, 0) / confidenze.length);

    // Dew point calcolato dalla temperatura/umidità fusa
    const dewPoint = Math.round((temperatura - (100 - humidity) / 5) * 10) / 10;

    // Weather code: priorità a Open-Meteo (più granulare)
    const weatherCode = om?.weatherCode ?? tm?.precipitation > 3 ? 61 : 0;

    // Usa campi specifici di Open-Meteo (7Timer! non li ha)
    const windGusts = om?.windGusts ?? Math.round(windSpeed * 1.4 * 10) / 10;
    const uvIndex = om?.uvIndex ?? 5;
    const cin = om?.cin ?? 0;
    const temp80m = om?.temp80m;
    const temp120m = om?.temp120m;
    const shortwaveRadiation = om?.shortwaveRadiation ?? 300;
    const windProfile = om?.windProfile;
    const apparentTemp = om?.apparentTemp ?? temperatura;
    const precipitationProbability = om?.precipitationProbability ?? 20;

    fusedHourly.push({
      time,
      temperature: Math.round(temperatura * 10) / 10,
      humidity: Math.round(humidity),
      dewPoint,
      apparentTemp,
      precipitation: Math.round(precipitation * 10) / 10,
      precipitationProbability,
      weatherCode,
      cloudCover: Math.round(cloudCover),
      windSpeed: Math.round(windSpeed),
      windDir,
      windGusts: Math.round(windGusts),
      uvIndex,
      cape: Math.round(cape),
      cin: Math.round(cin),
      liftedIndex: Math.round(liftedIndex * 10) / 10,
      temp80m,
      temp120m,
      shortwaveRadiation,
      windProfile,
      confidenza,
      fonte: {
        openMeteo: om ? { temperatura: om.temperature, vento: om.windSpeed, nuvole: om.cloudCover } : null,
        timer7: tm ? { temperatura: tm.temperature, vento: tm.windSpeed, nuvole: tm.cloudCover } : null,
      },
    });
  }

  fusedHourly.sort((a, b) => a.time.getTime() - b.time.getTime());

  // 3. FUSIONE CURRENT
  let fusedCurrent: FusedCurrent | null = null;
  if (omData?.current) {
    const c = omData.current;
    // Confronta con 7Timer! se disponibile per l'ora corrente
    const now = new Date();
    const nowKey = now.getHours() + now.getDate() * 100;
    const tmCurrent = oreTM.get(nowKey) ?? null;

    const confidenza = tmCurrent
      ? Math.round((
        calcolaConfidenza(c.temperature, tmCurrent.temperature, 15) +
        calcolaConfidenza(c.windSpeed, tmCurrent.windSpeed, 25)
      ) / 2)
      : 70;

    fusedCurrent = {
      time: c.time,
      temperature: c.temperature,
      humidity: c.humidity,
      apparentTemp: c.apparentTemp,
      isDay: c.isDay,
      precipitation: c.precipitation,
      rain: c.rain,
      showers: c.showers,
      snowfall: c.snowfall,
      weatherCode: c.weatherCode,
      cloudCover: c.cloudCover,
      pressure: c.pressure,
      surfacePressure: c.surfacePressure,
      windSpeed: c.windSpeed,
      windDir: c.windDir,
      windGusts: c.windGusts,
      confidenza,
    };
  }

  // 4. FUSIONE DAILY
  const fusedDaily: FusedDaily[] = [];
  const omDailyMap = new Map<string, MeteoDaily>();
  const tmDailyMap = new Map<string, TimerDaily>();

  if (omData) {
    for (const d of omData.daily) {
      const key = d.date.toISOString().split("T")[0];
      omDailyMap.set(key, d);
    }
  }

  if (tmData) {
    for (const d of tmData.daily) {
      const key = d.date.toISOString().split("T")[0];
      tmDailyMap.set(key, d);
    }
  }

  const tuttiGiorni = new Set([...omDailyMap.keys(), ...tmDailyMap.keys()]);

  for (const key of tuttiGiorni) {
    const om = omDailyMap.get(key) ?? null;
    const tm = tmDailyMap.get(key) ?? null;

    const confidenzaDaily = Math.round((
      calcolaConfidenza(om?.tempMax, tm?.tempMax, 15) +
      calcolaConfidenza(om?.windSpeedMax, tm?.windSpeedMax, 30)
    ) / 2);

    fusedDaily.push({
      date: om?.date ?? tm?.date ?? new Date(),
      tempMax: mediaPesata(om?.tempMax, tm?.tempMax, 0.65, 0.35, 20),
      tempMin: mediaPesata(om?.tempMin, tm?.tempMin, 0.65, 0.35, 10),
      apparentTempMax: om?.apparentTempMax ?? (om?.tempMax ?? 20),
      apparentTempMin: om?.apparentTempMin ?? (om?.tempMin ?? 10),
      precipitationSum: mediaPesata(om?.precipitationSum, tm?.precipitationSum, 0.70, 0.30, 0),
      precipitationProbaMax: om?.precipitationProbaMax ?? 20,
      weatherCode: om?.weatherCode ?? 0,
      windSpeedMax: mediaPesata(om?.windSpeedMax, tm?.windSpeedMax, 0.60, 0.40, 15),
      windGustsMax: om?.windGustsMax ?? 20,
      windDirDominant: om?.windDirDominant ?? 0,
      uvIndexMax: om?.uvIndexMax ?? 5,
      confidenza: confidenzaDaily,
    });
  }

  fusedDaily.sort((a, b) => a.date.getTime() - b.date.getTime());

  // 5. CALCOLA CONFIDENZA MEDIA
  const confidenzaMedia = fusedHourly.length > 0
    ? Math.round(fusedHourly.reduce((s, h) => s + h.confidenza, 0) / fusedHourly.length)
    : 50;

  const elapsed = Math.round(performance.now() - startTime);
  console.log(`✅ [Fusion] Completata in ${elapsed}ms — ${fusedHourly.length} ore fuse, confidenza media ${confidenzaMedia}%`);

  return {
    hourly: fusedHourly,
    current: fusedCurrent,
    daily: fusedDaily,
    model: `Fuso: ${fontiAttive.join(" + ")}`,
    confidenzaMedia,
    fontiAttive,
    warning,
  };
}

/**
 * Versione con fallback: se la fusione fallisce, torna a Open-Meteo da solo
 */
export async function fuseWithFallback(
  lat: number,
  lon: number,
  altitude: number
): Promise<{
  data: FusionResult | null;
  ok: boolean;
  error?: string;
  fallbackToOpenMeteo: boolean;
}> {
  try {
    const data = await fuseWeatherData(lat, lon, altitude);
    return { data, ok: true, fallbackToOpenMeteo: false };
  } catch (err) {
    console.warn("[Fusion] Fallita, fallback a Open-Meteo:", err);
    try {
      const om = await weatherService.fetchWeather(lat, lon);
      // Costruisce un risultato "finto" solo con Open-Meteo
      const fakeResult: FusionResult = {
        hourly: om.hourly.map(h => ({
          time: h.time,
          temperature: h.temperature,
          humidity: h.humidity,
          dewPoint: h.dewPoint,
          apparentTemp: h.apparentTemp,
          precipitation: h.precipitation,
          precipitationProbability: h.precipitationProbability,
          weatherCode: h.weatherCode,
          cloudCover: h.cloudCover,
          windSpeed: h.windSpeed,
          windDir: h.windDir,
          windGusts: h.windGusts,
          uvIndex: h.uvIndex,
          cape: h.cape,
          cin: h.cin,
          liftedIndex: h.liftedIndex,
          temp80m: h.temp80m,
          temp120m: h.temp120m,
          shortwaveRadiation: h.shortwaveRadiation,
          windProfile: h.windProfile,
          confidenza: 70,
          fonte: {
            openMeteo: { temperatura: h.temperature, vento: h.windSpeed, nuvole: h.cloudCover },
            timer7: null,
          },
        })),
        current: {
          time: om.current.time,
          temperature: om.current.temperature,
          humidity: om.current.humidity,
          apparentTemp: om.current.apparentTemp,
          isDay: om.current.isDay,
          precipitation: om.current.precipitation,
          rain: om.current.rain,
          showers: om.current.showers,
          snowfall: om.current.snowfall,
          weatherCode: om.current.weatherCode,
          cloudCover: om.current.cloudCover,
          pressure: om.current.pressure,
          surfacePressure: om.current.surfacePressure,
          windSpeed: om.current.windSpeed,
          windDir: om.current.windDir,
          windGusts: om.current.windGusts,
          confidenza: 70,
        },
        daily: om.daily.map(d => ({
          date: d.date,
          tempMax: d.tempMax,
          tempMin: d.tempMin,
          apparentTempMax: d.apparentTempMax,
          apparentTempMin: d.apparentTempMin,
          precipitationSum: d.precipitationSum,
          precipitationProbaMax: d.precipitationProbaMax,
          weatherCode: d.weatherCode,
          windSpeedMax: d.windSpeedMax,
          windGustsMax: d.windGustsMax,
          windDirDominant: d.windDirDominant,
          uvIndexMax: d.uvIndexMax,
          confidenza: 70,
        })),
        model: "Solo Open-Meteo (fallback)",
        confidenzaMedia: 70,
        fontiAttive: ["Open-Meteo"],
        warning: ["7Timer! non disponibile, uso solo Open-Meteo"],
      };
      return { data: fakeResult, ok: true, fallbackToOpenMeteo: true };
    } catch (err2) {
      return {
        data: null,
        ok: false,
        error: err2 instanceof Error ? err2.message : String(err2),
        fallbackToOpenMeteo: false,
      };
    }
  }
}