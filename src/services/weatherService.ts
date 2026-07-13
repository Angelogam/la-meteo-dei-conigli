"use client";

import type { WindLevel } from "@/types/meteo";

// Quote target in metri AGL per le quali vogliamo i dati del vento
const QUOTE_TARGET = [0, 500, 1000, 1500, 2000, 2500, 3000, 3500, 4000];

/**
 * Altezze approssimative dei livelli di pressione in Italia (metri AGL)
 * Queste sono stime – Open-Meteo fornisce i dati a livelli di pressione, non quote fisse.
 * Convertiamo i livelli di pressione in quote usando l'atmosfera standard ISA.
 */
function pressioneAQuota(pressioneHpa: number): number {
  // Formula barometrica (atmosfera standard): h = 44330 * (1 - (P/1013.25)^0.1903)
  return Math.round(44330 * (1 - Math.pow(pressioneHpa / 1013.25, 0.1903)));
}

export class WeatherService {
  private baseUrl = 'https://api.open-meteo.com/v1/forecast';

  async fetchWithFallback(lat: number, lon: number): Promise<any> {
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const url = this.buildUrl(lat, lon);
        const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        if (!data?.hourly?.time?.length) throw new Error('Dati non validi');
        return this.parseData(data);
      } catch (err) {
        lastError = err instanceof Error ? err : new Error('Errore sconosciuto');
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
      }
    }
    throw new Error(`Impossibile ottenere dati: ${lastError?.message || 'nessuna risposta'}`);
  }

  private buildUrl(lat: number, lon: number): string {
    const params = new URLSearchParams({
      latitude: lat.toString(),
      longitude: lon.toString(),
      hourly: [
        // Dati base
        'temperature_2m', 'dewpoint_2m', 'relative_humidity_2m',
        'apparent_temperature',
        'cloudcover', 'precipitation', 'weathercode',
        'wind_speed_10m', 'wind_gusts_10m', 'wind_direction_10m',
        'uv_index', 'is_day', 'pressure_msl',
        'soil_temperature_0_to_7cm', 'soil_moisture_0_to_7cm',
        'visibility',
        // Vento a quote fisse (Open-Meteo le fornisce fino a 180m)
        'wind_speed_80m', 'wind_direction_80m',
        'wind_speed_120m', 'wind_direction_120m',
        'wind_speed_180m', 'wind_direction_180m',
        // Temperature a quote fisse per calcolare il gradiente termico reale
        'temperature_80m', 'temperature_120m',
        // Vento a livelli di pressione (coprono fino a 5000m+)
        'wind_speed_1000hPa', 'wind_direction_1000hPa',
        'wind_speed_975hPa', 'wind_direction_975hPa',
        'wind_speed_950hPa', 'wind_direction_950hPa',
        'wind_speed_925hPa', 'wind_direction_925hPa',
        'wind_speed_900hPa', 'wind_direction_900hPa',
        'wind_speed_850hPa', 'wind_direction_850hPa',
        'wind_speed_800hPa', 'wind_direction_800hPa',
        'wind_speed_700hPa', 'wind_direction_700hPa',
        'wind_speed_600hPa', 'wind_direction_600hPa',
        // Temperature a livelli di pressione per profilo termico verticale
        'temperature_1000hPa',
        'temperature_975hPa',
        'temperature_950hPa',
        'temperature_925hPa',
        'temperature_900hPa',
        'temperature_850hPa',
        'temperature_800hPa',
        'temperature_700hPa',
        'temperature_600hPa',
        // Geopotenziale per calcolare l'altezza esatta di ogni livello
        'geopotential_height_1000hPa',
        'geopotential_height_975hPa',
        'geopotential_height_950hPa',
        'geopotential_height_925hPa',
        'geopotential_height_900hPa',
        'geopotential_height_850hPa',
        'geopotential_height_800hPa',
        'geopotential_height_700hPa',
        'geopotential_height_600hPa',
      ].join(','),
      daily: [
        'weathercode', 'temperature_2m_max', 'temperature_2m_min',
        'sunrise', 'sunset', 'uv_index_max',
        'precipitation_sum', 'precipitation_hours',
        'wind_speed_10m_max', 'wind_direction_10m_dominant',
      ].join(','),
      timezone: 'Europe/Rome',
      forecast_days: '5', // Aumento a 5 giorni per avere dati più estesi
    });
    params.append('_t', Date.now().toString());
    return `${this.baseUrl}?${params.toString()}`;
  }

  /**
   * Interpola i dati di vento dai livelli di pressione per ottenere
   * valori a quote fisse ogni 500m
   */
  private interpolateWindAtHeights(
    pressureLevelData: Record<string, { speed: number | null; dir: number | null }>,
    geopotential: Record<string, number | null>,
    siteAltitude: number
  ): WindLevel[] {
    // Costruisce array di { quota, speed, dir } dai livelli di pressione
    const livelli: { quota: number; speed: number | null; dir: number | null }[] = [];

    const livelliPressione = ['1000hPa', '975hPa', '950hPa', '925hPa', '900hPa', '850hPa', '800hPa', '700hPa', '600hPa'];

    for (const livello of livelliPressione) {
      const geo = geopotential[livello];
      // Il geopotential height è in metri geopotenziali, ma per la nostra precisione va bene
      const heightAGL = geo != null
        ? Math.max(0, Math.round(geo - siteAltitude))
        : Math.max(0, Math.round(pressioneAQuota(parseInt(livello)) - siteAltitude));

      livelli.push({
        quota: heightAGL,
        speed: pressureLevelData[livello]?.speed ?? null,
        dir: pressureLevelData[livello]?.dir ?? null,
      });
    }

    // Ordina per quota crescente
    livelli.sort((a, b) => a.quota - b.quota);

    // Interpola per le quote target
    return QUOTE_TARGET.map((targetHeight) => {
      // Se la quota target è 0 (suolo), usiamo i dati a 10m
      if (targetHeight === 0) {
        const groundLevel = pressureLevelData['1000hPa'];
        return {
          height: 0,
          speed: groundLevel?.speed ?? null,
          dir: groundLevel?.dir ?? null,
        };
      }

      // Trova i due livelli tra cui interpolar
      let lowerIdx = -1;
      let upperIdx = -1;

      for (let i = 0; i < livelli.length - 1; i++) {
        if (livelli[i].quota <= targetHeight && livelli[i + 1].quota >= targetHeight) {
          lowerIdx = i;
          upperIdx = i + 1;
          break;
        }
      }

      // Se non troviamo due livelli intorno, cerchiamo il più vicino
      if (lowerIdx === -1) {
        // Se target è sopra tutti i livelli, usa l'ultimo
        if (targetHeight > livelli[livelli.length - 1]?.quota) {
          const last = livelli[livelli.length - 1];
          return {
            height: targetHeight,
            speed: last?.speed ?? null,
            dir: last?.dir ?? null,
          };
        }
        // Se target è sotto tutti, usa il primo
        const first = livelli[0];
        return {
          height: targetHeight,
          speed: first?.speed ?? null,
          dir: first?.dir ?? null,
        };
      }

      // Interpolazione lineare
      const lower = livelli[lowerIdx];
      const upper = livelli[upperIdx];

      if (lower.speed == null || upper.speed == null) {
        return { height: targetHeight, speed: null, dir: null };
      }

      const ratio = (targetHeight - lower.quota) / (upper.quota - lower.quota);
      const speed = Math.round((lower.speed + (upper.speed - lower.speed) * ratio) * 10) / 10;

      // Per la direzione, usiamo l'interpolazione dell'angolo più breve
      let dir: number;
      if (lower.dir != null && upper.dir != null) {
        let diff = upper.dir - lower.dir;
        if (diff > 180) diff -= 360;
        else if (diff < -180) diff += 360;
        dir = (lower.dir + diff * ratio + 360) % 360;
        dir = Math.round(dir);
      } else {
        dir = lower.dir ?? upper.dir ?? 0;
      }

      return { height: targetHeight, speed, dir };
    });
  }

  private parseData(data: any) {
    const hourly = data.hourly;
    const daily = data.daily;

    // I livelli di pressione e le loro altezze geopotenziali
    const pressureLevels = ['1000hPa', '975hPa', '950hPa', '925hPa', '900hPa', '850hPa', '800hPa', '700hPa', '600hPa'];

    const hours = hourly.time.map((t: string, i: number) => {
      // Costruisce i dati di vento per ogni livello di pressione a questo timestamp
      const pressureWindData: Record<string, { speed: number | null; dir: number | null }> = {};
      const geopotentialData: Record<string, number | null> = {};

      for (const livello of pressureLevels) {
        const key = livello.replace('hPa', '');
        pressureWindData[livello] = {
          speed: hourly[`wind_speed_${key}hPa`]?.[i] ?? null,
          dir: hourly[`wind_direction_${key}hPa`]?.[i] ?? null,
        };
        geopotentialData[livello] = hourly[`geopotential_height_${key}hPa`]?.[i] ?? null;
      }

      // Aggiungiamo anche i dati a 10m, 80m, 120m, 180m come livelli extra
      // (li usiamo per quote basse dove i livelli di pressione sono troppo alti)
      const extraLevels: WindLevel[] = [
        { height: 10, speed: hourly.wind_speed_10m[i], dir: hourly.wind_direction_10m[i] },
        { height: 80, speed: hourly.wind_speed_80m?.[i] ?? null, dir: hourly.wind_direction_80m?.[i] ?? null },
        { height: 120, speed: hourly.wind_speed_120m?.[i] ?? null, dir: hourly.wind_direction_120m?.[i] ?? null },
        { height: 180, speed: hourly.wind_speed_180m?.[i] ?? null, dir: hourly.wind_direction_180m?.[i] ?? null },
      ];

      // Interpola i venti a quote fisse ogni 500m
      const windProfile = this.interpolateWindAtHeights(pressureWindData, geopotentialData, 0); // 0 = livello mare, poi aggiungiamo offset

      // Combina i livelli: per quote basse (< 500m) usiamo i dati reali,
      // per quote alte usiamo l'interpolazione dai livelli di pressione
      const combinedProfile: WindLevel[] = [];

      // Quote basse (10m, 80m, 120m, 180m) da dati reali
      for (const level of extraLevels) {
        if (level.speed != null) {
          combinedProfile.push(level);
        }
      }

      // Quote ogni 500m dall'interpolazione
      for (const level of windProfile) {
        // Non duplicare la quota 0m (già gestita da 10m)
        if (level.height > 0 && level.speed != null) {
          // Evitiamo duplicati ravvicinati
          const exists = combinedProfile.some(ex => Math.abs(ex.height - level.height) < 50);
          if (!exists) {
            combinedProfile.push(level);
          }
        }
      }

      // Ordina per quota crescente
      combinedProfile.sort((a, b) => a.height - b.height);

      return {
        time: new Date(t),
        temperature: hourly.temperature_2m[i],
        feelsLike: hourly.apparent_temperature?.[i] ?? hourly.temperature_2m[i],
        humidity: hourly.relative_humidity_2m[i],
        dewPoint: hourly.dewpoint_2m[i],
        precipitation: hourly.precipitation[i] || 0,
        weatherCode: hourly.weathercode?.[i] ?? 0,
        cloudCover: hourly.cloudcover[i],
        pressure: hourly.pressure_msl?.[i] ?? null,
        windSpeed: hourly.wind_speed_10m[i],
        windDir: hourly.wind_direction_10m[i],
        windGust: hourly.wind_gusts_10m?.[i] ?? null,
        soilTemp: hourly.soil_temperature_0_to_7cm?.[i] ?? null,
        soilMoisture: hourly.soil_moisture_0_to_7cm?.[i] ?? null,
        uvIndex: hourly.uv_index?.[i] ?? null,
        isDay: hourly.is_day?.[i] === 1,
        windProfile: combinedProfile,

        // Campi extra per retrocompatibilità con componenti esistenti
        wind80m: hourly.wind_speed_80m?.[i] ?? null,
        windDir80m: hourly.wind_direction_80m?.[i] ?? null,
        wind120m: hourly.wind_speed_120m?.[i] ?? null,
        windDir120m: hourly.wind_direction_120m?.[i] ?? null,
        wind180m: hourly.wind_speed_180m?.[i] ?? null,
        windDir180m: hourly.wind_direction_180m?.[i] ?? null,
        temp80m: hourly.temperature_80m?.[i] ?? null,
        temp120m: hourly.temperature_120m?.[i] ?? null,
        visibility: hourly.visibility?.[i] ?? null,
      };
    });

    const dailyData = daily.time.map((d: string, i: number) => ({
      date: new Date(d),
      weatherCode: daily.weathercode[i],
      tempMax: daily.temperature_2m_max[i],
      tempMin: daily.temperature_2m_min[i],
      sunrise: new Date(daily.sunrise[i]),
      sunset: new Date(daily.sunset[i]),
      uvMax: daily.uv_index_max[i],
      precipitationSum: daily.precipitation_sum[i],
      precipitationHours: daily.precipitation_hours[i],
      windMax: daily.wind_speed_10m_max[i],
      windDirDominant: daily.wind_direction_10m_dominant[i],
    }));

    return { hourly: hours, daily: dailyData };
  }
}

export const weatherService = new WeatherService();