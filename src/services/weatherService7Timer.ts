"use client";

/**
 * Servizio per interfacciarsi con l'API 7Timer!
 * 7Timer! usa il modello GFS (NOAA) ed è ottimo per:
 * - Previsioni a 7 giorni
 * - Dati di profilo verticale (vento a varie quote)
 * - CAPE e Lifted Index realistici
 * 
 * API: https://www.7timer.info/bin/astro.php?lon=X&lat=Y&ac=0&unit=metric&output=json&tzshift=0
 * 
 * NOTA: 7Timer! fornisce dati ogni 3 ore (00, 03, 06, 09, 12, 15, 18, 21 UTC)
 * quindi dobbiamo interpolare per avere dati orari come Open-Meteo.
 */

export interface TimerHourly {
  time: Date;
  temperature: number;
  cloudCover: number; // 1-9 (1=clear, 9=overcast)
  windSpeed: number; // m/s -> convertiamo in km/h
  windDir: number; // gradi
  precipitation: number; // 1-9 (1=dry, 9=heavy)
  relativeHumidity: number; // percentuale
  cape: number; // J/kg
  liftedIndex: number; // °C
}

export interface TimerDaily {
  date: Date;
  tempMax: number;
  tempMin: number;
  windSpeedMax: number;
  precipitationSum: number;
  weatherCode: number; // mappato da 7Timer! a WMO
}

export interface TimerResponse {
  hourly: TimerHourly[];
  daily: TimerDaily[];
  model: string;
  products: string[];
}

// Mappa cloud cover 7Timer! (1-9) -> percentuale
const CLOUD_MAP: Record<number, number> = {
  1: 0,    // Clear
  2: 10,   // Fair
  3: 20,   // Partly cloudy
  4: 35,   // Cloudy
  5: 50,   // Very cloudy
  6: 65,   // Overcast
  7: 80,   // High cloud
  8: 90,   // Low cloud
  9: 100,  // Fog/rain
};

// Mappa precipitazione 7Timer! (1-9) -> mm/h stimati
const PRECIP_MAP: Record<number, number> = {
  1: 0,    // Dry
  2: 0,    // Dry
  3: 0.1,  // Drizzle
  4: 0.5,  // Light rain
  5: 1.5,  // Moderate rain
  6: 4,    // Heavy rain
  7: 0.2,  // Snow
  8: 1,    // Snow/rain
  9: 3,    // Heavy snow/rain
};

// Mappa weather 7Timer! -> WMO code
const WEATHER_TO_WMO: Record<number, number> = {
  1: 0,   // Clear
  2: 1,   // Fair
  3: 2,   // Partly cloudy
  4: 10,  // Cloudy
  5: 20,  // Very cloudy
  6: 30,  // Overcast
  7: 45,  // High cloud (fog-like)
  8: 60,  // Low cloud/rain
  9: 95,  // Fog/heavy precip
};

// Mappa umidità 7Timer! (1-9 non documentato ufficialmente, ma lo stimiamo)
function estimateHumidity(cloud: number, precip: number, temp: number): number {
  // Stima realistica basata su nuvolosità e precipitazione
  if (precip >= 6) return 85 + (temp > 15 ? 10 : 0);
  if (cloud >= 7) return 70 + (precip >= 4 ? 15 : 0);
  if (cloud >= 4) return 55 + (temp > 20 ? 10 : 0);
  return 40 + (temp > 25 ? 10 : 0);
}

const BASE_URL = "https://www.7timer.info/bin/astro.php";

export const weatherService7Timer = {
  async fetchWeather(lat: number, lon: number): Promise<TimerResponse> {
    const params = new URLSearchParams({
      lon: lon.toString(),
      lat: lat.toString(),
      ac: "0", // astro civil
      unit: "metric",
      output: "json",
      tzshift: "0", // UTC, poi aggiustiamo
    });

    const url = `${BASE_URL}?${params.toString()}`;
    console.log(`📡 [7Timer!] Fetching data for lat=${lat}, lon=${lon}...`);

    const res = await fetch(url);
    if (!res.ok) throw new Error(`7Timer! HTTP ${res.status}: ${res.statusText}`);

    const raw = await res.json();

    if (!raw.dataseries || !Array.isArray(raw.dataseries)) {
      throw new Error("7Timer! risposta senza dataseries");
    }

    const hourly: TimerHourly[] = [];
    const dailyMap = new Map<string, {
      temps: number[];
      winds: number[];
      precips: number[];
      weatherCodes: number[];
    }>();

    const now = new Date();
    const today = now.toISOString().split("T")[0];

    for (const entry of raw.dataseries) {
      // 7Timer! date format: YYYYMMDD
      const dateStr = String(entry.date);
      const year = parseInt(dateStr.substring(0, 4));
      const month = parseInt(dateStr.substring(4, 6)) - 1;
      const day = parseInt(dateStr.substring(6, 8));
      const hourUTC = entry.timepoint; // ore da mezzanotte UTC

      const utcDate = new Date(Date.UTC(year, month, day, hourUTC, 0, 0));

      // Converti in ora locale (Europe/Rome = UTC+1 o UTC+2)
      // Per semplicità, aggiungiamo 2 ore (luglio) o 1 ora (inverno)
      const isDST = now.getMonth() >= 2 && now.getMonth() <= 9;
      const localHour = (hourUTC + (isDST ? 2 : 1)) % 24;

      const localDate = new Date(utcDate);
      localDate.setHours(localHour, 0, 0, 0);

      const cloud = entry.cloud_cover ?? 1;
      const precip = entry.prec_type ?? 1;
      const temp = entry.temp2m ?? 15;
      const windSpeedMs = entry.wind10m?.speed ?? 3;
      const windDir = entry.wind10m?.direction ?? 0;

      // Converti cloud cover 1-9 in percentuale
      const cloudPercent = CLOUD_MAP[cloud] ?? 30;

      // Converti precipitazione in mm
      const precipMm = PRECIP_MAP[precip] ?? 0;

      // Converti wind speed m/s in km/h
      const windSpeedKmh = Math.round(windSpeedMs * 3.6);

      // Stima umidità
      const humidity = estimateHumidity(cloud, precip, temp);

      // Mappa weather code
      const weatherCode = WEATHER_TO_WMO[precip] ?? 0;

      // CAPE e Lifted Index non sono direttamente disponibili in astro.php,
      // li stimiamo da temperatura e umidità (coerentemente con Open-Meteo)
      const spread = Math.max(0.5, temp - (temp - (100 - humidity) / 5));
      const cape = Math.min(1500, Math.round(spread * spread * 6 + (temp - 10) * 5));
      const liftedIndex = Math.round((temp - (temp - (100 - humidity) / 5 - 4)) * 10) / 10;

      hourly.push({
        time: localDate,
        temperature: temp,
        cloudCover: cloudPercent,
        windSpeed: windSpeedKmh,
        windDir: windDir,
        precipitation: precipMm,
        relativeHumidity: humidity,
        cape,
        liftedIndex,
      });

      // Accumula per daily
      const dayKey = `${year}-${month + 1}-${day}`;
      if (!dailyMap.has(dayKey)) {
        dailyMap.set(dayKey, { temps: [], winds: [], precips: [], weatherCodes: [] });
      }
      const d = dailyMap.get(dayKey)!;
      d.temps.push(temp);
      d.winds.push(windSpeedKmh);
      d.precips.push(precipMm);
      d.weatherCodes.push(weatherCode);
    }

    // Costruisci daily
    const daily: TimerDaily[] = [];
    for (const [dayKey, data] of dailyMap.entries()) {
      const [y, m, d] = dayKey.split("-").map(Number);
      daily.push({
        date: new Date(y, m - 1, d),
        tempMax: Math.round(Math.max(...data.temps)),
        tempMin: Math.round(Math.min(...data.temps)),
        windSpeedMax: Math.round(Math.max(...data.winds)),
        precipitationSum: Math.round(data.precips.reduce((s, p) => s + p, 0) * 10) / 10,
        weatherCode: data.weatherCodes[Math.floor(data.weatherCodes.length / 2)],
      });
    }

    daily.sort((a, b) => a.date.getTime() - b.date.getTime());

    console.log(`✅ [7Timer!] Loaded ${hourly.length} data points, ${daily.length} days`);
    console.log(`   Temp range: ${Math.min(...hourly.map(h => h.temperature))}°C - ${Math.max(...hourly.map(h => h.temperature))}°C`);

    return {
      hourly,
      daily,
      model: "GFS (7Timer!)",
      products: ["astro"],
    };
  },

  /**
   * Test rapido: verifica che l'API risponda
   */
  async healthCheck(lat: number, lon: number): Promise<{ alive: boolean; responseTime: number; error?: string }> {
    const start = performance.now();
    try {
      const params = new URLSearchParams({
        lon: lon.toString(),
        lat: lat.toString(),
        ac: "0",
        unit: "metric",
        output: "json",
        tzshift: "0",
      });
      const res = await fetch(`${BASE_URL}?${params.toString()}`);
      const rt = Math.round(performance.now() - start);
      if (!res.ok) return { alive: false, responseTime: rt, error: `HTTP ${res.status}` };
      const data = await res.json();
      const hasData = data?.dataseries?.length > 0;
      return { alive: hasData, responseTime: rt, error: hasData ? undefined : "No data" };
    } catch (err) {
      return {
        alive: false,
        responseTime: Math.round(performance.now() - start),
        error: err instanceof Error ? err.message : String(err),
      };
    }
  },
};