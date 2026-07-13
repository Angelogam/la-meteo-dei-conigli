"use client";

const BASE_URL = "https://api.open-meteo.com/v1/forecast";

// Cache per i dati reali
const realDataCache = new Map<string, any[]>();

export interface RealHourData {
  time: Date;
  temperature: number;
  dewPoint: number;
  windSpeed: number;
  cloudCover: number;
  humidity: number;
  pressure: number;
  precipitation: number;
  uvIndex: number;
  temp80m?: number;
  temp120m?: number;
  cape: number;
  cin: number;
  li: number;
}

/**
 * Recupera dati orari REALI da Open-Meteo per le ore 9:00-19:00
 * Usa il modello GFS (best for paragliding) + CAPE + CIN
 */
export async function fetchRealHourlyData(
  lat: number,
  lon: number,
  altitude: number,
  days: number = 3
): Promise<RealHourData[]> {
  const cacheKey = `${lat.toFixed(2)}_${lon.toFixed(2)}_${days}`;
  
  // Cache 5 minuti
  const cached = realDataCache.get(cacheKey);
  if (cached) {
    const now = Date.now();
    if (now - (cached[0]?._cachedAt || 0) < 300000) {
      return cached.map(c => ({
        time: new Date(c.time),
        temperature: c.temperature,
        dewPoint: c.dewPoint,
        windSpeed: c.windSpeed,
        cloudCover: c.cloudCover,
        humidity: c.humidity,
        pressure: c.pressure,
        precipitation: c.precipitation,
        uvIndex: c.uvIndex,
        temp80m: c.temp80m,
        temp120m: c.temp120m,
        cape: c.cape,
        cin: c.cin,
        li: c.li,
      }));
    }
  }

  try {
    const params = new URLSearchParams({
      latitude: lat.toString(),
      longitude: lon.toString(),
      hourly: [
        "temperature_2m",
        "dew_point_2m",
        "wind_speed_80m",
        "wind_speed_120m",
        "cloud_cover",
        "relative_humidity_2m",
        "surface_pressure",
        "precipitation",
        "uv_index",
        "temperature_80m",
        "temperature_120m",
        "cape",
        "convective_inhibition",
        "lifted_index",
      ].join(","),
      wind_speed_unit: "kmh",
      temperature_unit: "celsius",
      timezone: "Europe/Rome",
      forecast_days: Math.min(5, Math.max(1, days)).toString(),
    });

    const res = await fetch(`${BASE_URL}?${params.toString()}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    
    const raw = await res.json();
    
    const risultati: RealHourData[] = raw.hourly.time
      .map((t: string, i: number) => ({
        time: new Date(t),
        temperature: raw.hourly.temperature_2m?.[i] ?? 0,
        dewPoint: raw.hourly.dew_point_2m?.[i] ?? 0,
        windSpeed: (raw.hourly.wind_speed_80m?.[i] ?? raw.hourly.wind_speed_120m?.[i] ?? 0) / 3.6, // kmh -> m/s
        cloudCover: raw.hourly.cloud_cover?.[i] ?? 0,
        humidity: raw.hourly.relative_humidity_2m?.[i] ?? 50,
        pressure: raw.hourly.surface_pressure?.[i] ?? 1013,
        precipitation: raw.hourly.precipitation?.[i] ?? 0,
        uvIndex: raw.hourly.uv_index?.[i] ?? 0,
        temp80m: raw.hourly.temperature_80m?.[i],
        temp120m: raw.hourly.temperature_120m?.[i],
        cape: raw.hourly.cape?.[i] ?? 0,
        cin: raw.hourly.convective_inhibition?.[i] ?? 0,
        li: raw.hourly.lifted_index?.[i] ?? 0,
      }))
      // Filtra solo ore 9:00-19:00
      .filter(h => {
        const ora = h.time.getHours();
        return ora >= 9 && ora <= 19;
      });

    // Salva in cache con timestamp
    const cachedData = risultati.map(r => ({ ...r, _cachedAt: Date.now() }));
    realDataCache.set(cacheKey, cachedData);

    // Pulisci cache dopo 5 min
    setTimeout(() => realDataCache.delete(cacheKey), 300000);

    return risultati;
  } catch (err) {
    console.error("Errore fetchRealHourlyData:", err);
    return [];
  }
}

/**
 * Recupera CAPE, CIN, LI per ogni ora (usato da algoritmoPrevisioni)
 */
export async function fetchRealCapeData(lat: number, lon: number): Promise<{ time: Date; cape: number; cin: number; li: number }[]> {
  const data = await fetchRealHourlyData(lat, lon, 0);
  return data.map(h => ({
    time: h.time,
    cape: h.cape,
    cin: h.cin,
    li: h.li,
  }));
}