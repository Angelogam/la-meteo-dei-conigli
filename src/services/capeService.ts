"use client";

const BASE_URL = "https://api.open-meteo.com/v1/forecast";

// Cache per non rifare sempre le stesse richieste
const capeCache = new Map<string, { time: string; cape: number; cin: number; li: number }[]>();

export interface CapeData {
  time: Date;
  cape: number;
  cin: number;
  li: number;
}

/**
 * Recupera CAPE, CIN e Lifted Index da Open-Meteo (GFS)
 * Condiviso tra termicheEngine e algoritmoPrevisioni
 */
export async function fetchCapeData(lat: number, lon: number): Promise<CapeData[]> {
  const cacheKey = `${lat.toFixed(2)}_${lon.toFixed(2)}`;
  
  // Controlla cache (5 minuti)
  const cached = capeCache.get(cacheKey);
  if (cached) {
    const now = Date.now();
    const firstTime = new Date(cached[0]?.time).getTime();
    if (now - firstTime < 300000) { // 5 minuti
      return cached.map(c => ({
        time: new Date(c.time),
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
        "cape",
        "convective_inhibition",
        "lifted_index",
        "temperature_1000hPa",
        "temperature_975hPa",
        "temperature_950hPa",
        "temperature_925hPa",
        "temperature_900hPa",
        "temperature_850hPa",
        "temperature_800hPa",
        "temperature_700hPa",
        "temperature_600hPa",
        "geopotential_height_1000hPa",
        "geopotential_height_975hPa",
        "geopotential_height_950hPa",
        "geopotential_height_925hPa",
        "geopotential_height_900hPa",
        "geopotential_height_850hPa",
        "geopotential_height_800hPa",
        "geopotential_height_700hPa",
        "geopotential_height_600hPa",
      ].join(","),
      timezone: "Europe/Rome",
      forecast_days: "5",
    });

    const res = await fetch(`${BASE_URL}?${params.toString()}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    
    const raw = await res.json();
    
    const capes: CapeData[] = raw.hourly.time.map((t: string, i: number) => ({
      time: new Date(t),
      cape: raw.hourly.cape?.[i] ?? 0,
      cin: raw.hourly.convective_inhibition?.[i] ?? 0,
      li: raw.hourly.lifted_index?.[i] ?? 0,
    }));

    // Salva in cache
    capeCache.set(cacheKey, capes.map(c => ({
      time: c.time.toISOString(),
      cape: c.cape,
      cin: c.cin,
      li: c.li,
    })));

    // Pulisci cache vecchia
    setTimeout(() => capeCache.delete(cacheKey), 300000);

    return capes;
  } catch {
    return [];
  }
}