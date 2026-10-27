"use client";

/**
 * MEGA TEST METEO — 1000 richieste reali a Open-Meteo
 * 
 * Esegue 1000 test su siti diversi per verificare:
 * - Dati realistici (temperature, vento, nuvole, pressione)
 * - Coerenza tra i parametri
 * - Tempi di risposta
 * - Eventuali anomalie
 */

import { getMeteoBaseUrl } from "@/config/apiConfig";
const BASE_URL = getMeteoBaseUrl();
const HOURLY_PARAMS = "temperature_2m,relative_humidity_2m,dew_point_2m,apparent_temperature,precipitation,weather_code,cloud_cover,pressure_msl,wind_speed_10m,wind_direction_10m,wind_gusts_10m,uv_index,shortwave_radiation,cape,convective_inhibition,lifted_index";
const DAILY_PARAMS = "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,wind_direction_10m_dominant,uv_index_max";

export interface TestRisultato {
  id: number;
  lat: number;
  lon: number;
  alt: number;
  successo: boolean;
  tempoMs: number;
  errore: string | null;
  anomalie: string[];
  metriche: {
    tempMedia: number;
    tempMax: number;
    tempMin: number;
    umiditaMedia: number;
    ventoMedio: number;
    ventoMax: number;
    pioggiaTot: number;
    nuvoleMedia: number;
    pressioneMedia: number;
    oreDati: number;
    capeMedio: number;
  };
  rawResponseCode: number;
}

// Genera coordinate realistiche per siti di volo in Piemonte/Alpi
function generaCoordinata(): { lat: number; lon: number; alt: number } {
  const piemonte = [
    { lat: 44.3, lon: 7.2, alt: 1200 },
    { lat: 44.5, lon: 7.4, alt: 1400 },
    { lat: 44.6, lon: 7.1, alt: 1600 },
    { lat: 44.7, lon: 7.3, alt: 1100 },
    { lat: 44.8, lon: 7.0, alt: 1500 },
    { lat: 44.9, lon: 7.5, alt: 900 },
    { lat: 45.0, lon: 7.2, alt: 1000 },
    { lat: 45.1, lon: 7.4, alt: 800 },
    { lat: 45.2, lon: 7.6, alt: 700 },
    { lat: 45.3, lon: 7.8, alt: 600 },
    { lat: 45.4, lon: 7.1, alt: 1100 },
    { lat: 45.5, lon: 7.9, alt: 500 },
    { lat: 45.6, lon: 8.0, alt: 400 },
    { lat: 44.4, lon: 7.5, alt: 1300 },
    { lat: 44.2, lon: 7.6, alt: 1800 },
    { lat: 44.1, lon: 7.7, alt: 2000 },
    { lat: 44.0, lon: 7.8, alt: 2200 },
    { lat: 44.35, lon: 7.9, alt: 1500 },
    { lat: 44.55, lon: 8.0, alt: 1000 },
    { lat: 44.75, lon: 8.1, alt: 800 },
    // Altre valli
    { lat: 44.25, lon: 7.1, alt: 1600 },
    { lat: 44.45, lon: 7.3, alt: 1200 },
    { lat: 44.65, lon: 7.5, alt: 900 },
    { lat: 44.85, lon: 7.7, alt: 700 },
    { lat: 44.95, lon: 7.9, alt: 600 },
    { lat: 45.05, lon: 8.1, alt: 500 },
    { lat: 45.15, lon: 8.3, alt: 400 },
    { lat: 45.25, lon: 8.5, alt: 300 },
    { lat: 45.35, lon: 8.7, alt: 200 },
    { lat: 45.45, lon: 8.9, alt: 100 },
  ];

  const base = piemonte[Math.floor(Math.random() * piemonte.length)];
  
  // Aggiungi piccola variazione casuale (+- 0.05 gradi)
  const lat = Math.round((base.lat + (Math.random() - 0.5) * 0.1) * 10000) / 10000;
  const lon = Math.round((base.lon + (Math.random() - 0.5) * 0.1) * 10000) / 10000;
  const alt = Math.max(100, base.alt + Math.round((Math.random() - 0.5) * 200));

  return { lat, lon, alt };
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Rate limiter — massimo 1 richiesta ogni 1.2s
let ultimaRichiesta = 0;
async function rateLimit(): Promise<void> {
  const ora = Date.now();
  const attesa = Math.max(0, 1200 - (ora - ultimaRichiesta));
  if (attesa > 0) await delay(attesa);
  ultimaRichiesta = Date.now();
}

export async function eseguiTestSingolo(lat: number, lon: number, alt: number, id: number): Promise<TestRisultato> {
  const inizio = performance.now();
  const anomalie: string[] = [];

  try {
    await rateLimit();

    const params = new URLSearchParams({
      latitude: lat.toString(),
      longitude: lon.toString(),
      hourly: HOURLY_PARAMS,
      daily: DAILY_PARAMS,
      timezone: "Europe/Rome",
      forecast_days: "2",
    });

    const url = `${getMeteoBaseUrl()}?${params.toString()}`;
    const res = await fetch(url);
    const tempoMs = Math.round(performance.now() - inizio);

    if (!res.ok) {
      return {
        id, lat, lon, alt,
        successo: false,
        tempoMs,
        errore: `HTTP ${res.status}`,
        anomalie: [],
        metriche: { tempMedia: 0, tempMax: 0, tempMin: 0, umiditaMedia: 0, ventoMedio: 0, ventoMax: 0, pioggiaTot: 0, nuvoleMedia: 0, pressioneMedia: 0, oreDati: 0, capeMedio: 0 },
        rawResponseCode: res.status,
      };
    }

    const raw = await res.json();

    if (!raw.hourly?.time?.length) {
      return {
        id, lat, lon, alt,
        successo: false,
        tempoMs,
        errore: "Nessun dato orario",
        anomalie: [],
        metriche: { tempMedia: 0, tempMax: 0, tempMin: 0, umiditaMedia: 0, ventoMedio: 0, ventoMax: 0, pioggiaTot: 0, nuvoleMedia: 0, pressioneMedia: 0, oreDati: 0, capeMedio: 0 },
        rawResponseCode: 200,
      };
    }

    // Estrai metriche
    const temps: number[] = raw.hourly.temperature_2m.filter((t: number) => t != null);
    const hums: number[] = raw.hourly.relative_humidity_2m.filter((h: number) => h != null);
    const winds: number[] = raw.hourly.wind_speed_10m.filter((w: number) => w != null);
    const rains: number[] = raw.hourly.precipitation.filter((p: number) => p != null);
    const clouds: number[] = raw.hourly.cloud_cover.filter((c: number) => c != null);
    const pressures: number[] = raw.hourly.pressure_msl.filter((p: number) => p != null);
    const capes: number[] = raw.hourly.cape.filter((c: number) => c != null);

    const oreDati = temps.length;

    const tempMax = temps.length > 0 ? Math.max(...temps) : 0;
    const tempMin = temps.length > 0 ? Math.min(...temps) : 0;
    const tempMedia = temps.length > 0 ? Math.round(temps.reduce((s: number, t: number) => s + t, 0) / temps.length * 10) / 10 : 0;
    const umiditaMedia = hums.length > 0 ? Math.round(hums.reduce((s: number, h: number) => s + h, 0) / hums.length) : 0;
    const ventoMedio = winds.length > 0 ? Math.round(winds.reduce((s: number, w: number) => s + w, 0) / winds.length * 10) / 10 : 0;
    const ventoMax = winds.length > 0 ? Math.max(...winds) : 0;
    const pioggiaTot = rains.length > 0 ? Math.round(rains.reduce((s: number, p: number) => s + p, 0) * 10) / 10 : 0;
    const nuvoleMedia = clouds.length > 0 ? Math.round(clouds.reduce((s: number, c: number) => s + c, 0) / clouds.length) : 0;
    const pressioneMedia = pressures.length > 0 ? Math.round(pressures.reduce((s: number, p: number) => s + p, 0) / pressures.length) : 1013;
    const capeMedio = capes.length > 0 ? Math.round(capes.reduce((s: number, c: number) => s + c, 0) / capes.length) : 0;

    // VALIDAZIONE REALISTICA
    if (tempMax > 50) anomalie.push(`Temperatura max irrealistica: ${tempMax}°C (alt: ${alt}m)`);
    if (tempMin < -30) anomalie.push(`Temperatura min irrealistica: ${tempMin}°C (alt: ${alt}m)`);
    if (tempMax - tempMin > 35) anomalie.push(`Escursione termica eccessiva: ${(tempMax - tempMin).toFixed(1)}°C`);
    if (ventoMax > 120) anomalie.push(`Vento max non realistico: ${ventoMax} km/h`);
    if (ventoMax < 0) anomalie.push(`Vento max negativo: ${ventoMax}`);
    if (nuvoleMedia < 0 || nuvoleMedia > 100) anomalie.push(`Nuvolosità fuori range: ${nuvoleMedia}%`);
    if (umiditaMedia < 0 || umiditaMedia > 100) anomalie.push(`Umidità fuori range: ${umiditaMedia}%`);
    if (oreDati < 10) anomalie.push(`Pochi dati orari: ${oreDati}`);
    if (pressioneMedia < 900 || pressioneMedia > 1080) anomalie.push(`Pressione non realistica: ${pressioneMedia} hPa`);
    if (pioggiaTot > 100) anomalie.push(`Pioggia eccessiva: ${pioggiaTot}mm in un giorno`);
    if (capeMedio > 5000) anomalie.push(`CAPE eccessivo: ${capeMedio} J/kg`);
    
    // Verifica coerenza: se piove molto, le nuvole dovrebbero essere alte
    if (pioggiaTot > 5 && nuvoleMedia < 20) {
      anomalie.push(`Incoerenza: ${pioggiaTot}mm di pioggia ma solo ${nuvoleMedia}% nuvole`);
    }

    // Verifica coerenza vento: vento medio non può essere > vento max
    if (ventoMedio > ventoMax && ventoMax > 0) {
      anomalie.push(`Vento medio (${ventoMedio}) > vento max (${ventoMax})`);
    }

    return {
      id, lat, lon, alt,
      successo: anomalie.length === 0,
      tempoMs,
      errore: null,
      anomalie,
      metriche: {
        tempMedia, tempMax, tempMin,
        umiditaMedia, ventoMedio, ventoMax,
        pioggiaTot, nuvoleMedia, pressioneMedia,
        oreDati, capeMedio,
      },
      rawResponseCode: 200,
    };

  } catch (err) {
    const tempoMs = Math.round(performance.now() - inizio);
    return {
      id, lat, lon, alt,
      successo: false,
      tempoMs,
      errore: err instanceof Error ? err.message : String(err),
      anomalie: [],
      metriche: { tempMedia: 0, tempMax: 0, tempMin: 0, umiditaMedia: 0, ventoMedio: 0, ventoMax: 0, pioggiaTot: 0, nuvoleMedia: 0, pressioneMedia: 0, oreDati: 0, capeMedio: 0 },
      rawResponseCode: 0,
    };
  }
}

export interface RisultatoMegaTest {
  totale: number;
  successi: number;
  fallimenti: number;
  anomalieTotali: number;
  tempoTotale: number;
  tempoMedio: number;
  dettagli: TestRisultato[];
  statistiche: {
    tempMediaMin: number;
    tempMediaMax: number;
    tempMediaMedia: number;
    ventoMedioMin: number;
    ventoMedioMax: number;
    ventoMedioMedia: number;
    nuvoleMedia: number;
    pioggiaMedia: number;
    pressioneMedia: number;
    capeMedio: number;
    tempMaxAssoluta: number;
    tempMinAssoluta: number;
    ventoMaxAssoluto: number;
  };
}

/**
 * Esegue N test su coordinate casuali del Piemonte
 * @param numTest numero di test (default: 1000)
 * @param onProgress callback per aggiornamento progresso
 */
export async function megaTestMeteo(
  numTest: number = 1000,
  onProgress?: (completati: number, totale: number, risultatoParziale: TestRisultato) => void
): Promise<RisultatoMegaTest> {
  const inizioTotale = performance.now();
  const risultati: TestRisultato[] = [];

  for (let i = 0; i < numTest; i++) {
    const coord = generaCoordinata();
    const risultato = await eseguiTestSingolo(coord.lat, coord.lon, coord.alt, i + 1);
    risultati.push(risultato);

    if (onProgress) {
      onProgress(i + 1, numTest, risultato);
    }

    // Piccola pausa extra ogni 100 richieste per non stressare troppo l'API
    if ((i + 1) % 100 === 0) {
      await delay(5000);
    }
  }

  const tempoTotale = Math.round(performance.now() - inizioTotale);
  const successi = risultati.filter(r => r.successo).length;
  const fallimenti = risultati.filter(r => !r.successo).length;
  const anomalieTotali = risultati.reduce((s, r) => s + r.anomalie.length, 0);

  const tempMedie = risultati.filter(r => r.metriche.tempMedia !== 0).map(r => r.metriche.tempMedia);
  const ventiMedi = risultati.filter(r => r.metriche.ventoMedio > 0).map(r => r.metriche.ventoMedio);
  const nuvole = risultati.filter(r => r.metriche.nuvoleMedia > 0).map(r => r.metriche.nuvoleMedia);
  const piogge = risultati.filter(r => r.metriche.pioggiaTot > 0).map(r => r.metriche.pioggiaTot);
  const pressioni = risultati.filter(r => r.metriche.pressioneMedia > 0).map(r => r.metriche.pressioneMedia);
  const capi = risultati.filter(r => r.metriche.capeMedio > 0).map(r => r.metriche.capeMedio);

  const tempMaxs = risultati.map(r => r.metriche.tempMax);
  const tempMins = risultati.map(r => r.metriche.tempMin);
  const ventoMaxs = risultati.map(r => r.metriche.ventoMax);

  return {
    totale: numTest,
    successi,
    fallimenti,
    anomalieTotali,
    tempoTotale,
    tempoMedio: Math.round(tempoTotale / numTest),
    dettagli: risultati,
    statistiche: {
      tempMediaMin: tempMedie.length > 0 ? Math.min(...tempMedie) : 0,
      tempMediaMax: tempMedie.length > 0 ? Math.max(...tempMedie) : 0,
      tempMediaMedia: tempMedie.length > 0 ? Math.round(tempMedie.reduce((s, t) => s + t, 0) / tempMedie.length * 10) / 10 : 0,
      ventoMedioMin: ventiMedi.length > 0 ? Math.min(...ventiMedi) : 0,
      ventoMedioMax: ventiMedi.length > 0 ? Math.max(...ventiMedi) : 0,
      ventoMedioMedia: ventiMedi.length > 0 ? Math.round(ventiMedi.reduce((s, v) => s + v, 0) / ventiMedi.length * 10) / 10 : 0,
      nuvoleMedia: nuvole.length > 0 ? Math.round(nuvole.reduce((s, n) => s + n, 0) / nuvole.length) : 0,
      pioggiaMedia: piogge.length > 0 ? Math.round(piogge.reduce((s, p) => s + p, 0) / piogge.length * 10) / 10 : 0,
      pressioneMedia: pressioni.length > 0 ? Math.round(pressioni.reduce((s, p) => s + p, 0) / pressioni.length) : 1013,
      capeMedio: capi.length > 0 ? Math.round(capi.reduce((s, c) => s + c, 0) / capi.length) : 0,
      tempMaxAssoluta: tempMaxs.length > 0 ? Math.max(...tempMaxs) : 0,
      tempMinAssoluta: tempMins.length > 0 ? Math.min(...tempMins) : 0,
      ventoMaxAssoluto: ventoMaxs.length > 0 ? Math.max(...ventoMaxs) : 0,
    },
  };
}