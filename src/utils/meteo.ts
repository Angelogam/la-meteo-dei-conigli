"use client";

import type { HourData, MeteoData, ThermalData, WindProfile } from "@/types/meteo";

const BASE_URL = "https://api.open-meteo.com/v1/forecast";

export const fetchMeteo = async (lat: number, lon: number): Promise<MeteoData> => {
  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lon.toString(),
    hourly: "temperature_2m,apparent_temperature,relative_humidity_2m,dew_point_2m,precipitation,weather_code,cloud_cover,pressure_msl,wind_speed_10m,wind_direction_10m,wind_gusts_10m,uv_index,is_day",
    daily: "temperature_2m_max,temperature_2m_min,weather_code,precipitation_sum",
    timezone: "Europe/Rome",
    forecast_days: "4",
  });

  const url = `${BASE_URL}?${params}`;
  console.log(`[fetchMeteo] Chiamata a: ${url}`);

  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    console.error(`[fetchMeteo] Errore HTTP ${res.status}:`, text);
    throw new Error(`Errore HTTP ${res.status}: ${res.statusText}`);
  }

  const raw = await res.json();
  console.log(`[fetchMeteo] Risposta ricevuta per lat=${lat} lon=${lon}`, raw);

  // Parse orari
  const times: string[] = raw.hourly.time;
  const hourly: HourData[] = times.map((t: string, i: number) => ({
    time: new Date(t),
    temperature: raw.hourly.temperature_2m[i],
    feelsLike: raw.hourly.apparent_temperature[i],
    humidity: raw.hourly.relative_humidity_2m[i],
    dewPoint: raw.hourly.dew_point_2m[i],
    precipitation: raw.hourly.precipitation[i],
    weatherCode: raw.hourly.weather_code[i],
    cloudCover: raw.hourly.cloud_cover[i],
    pressure: raw.hourly.pressure_msl[i],
    windSpeed: raw.hourly.wind_speed_10m[i],
    windDir: raw.hourly.wind_direction_10m[i],
    windGust: raw.hourly.wind_gusts_10m[i],
    uvIndex: raw.hourly.uv_index[i],
    isDay: raw.hourly.is_day[i] === 1,
  }));

  // Parse giornalieri
  const dTimes: string[] = raw.daily.time;
  const daily = dTimes.map((t: string, i: number) => ({
    date: new Date(t),
    tempMax: raw.daily.temperature_2m_max[i],
    tempMin: raw.daily.temperature_2m_min[i],
    weatherCode: raw.daily.weather_code[i],
    precipitationSum: raw.daily.precipitation_sum[i],
  }));

  console.log(`[fetchMeteo] Parsed: ${hourly.length} ore, ${daily.length} giorni`);
  return { hourly, daily, lat, lon };
};

export const fetchWindProfiles = async (lat: number, lon: number): Promise<WindProfile[]> => {
  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lon.toString(),
    hourly: "temperature_120m,wind_speed_120m,wind_direction_120m,wind_speed_180m,wind_direction_180m,wind_speed_300m,wind_direction_300m,wind_speed_600m,wind_direction_600m,wind_speed_900m,wind_direction_900m,wind_speed_1200m,wind_direction_1200m,wind_speed_1500m,wind_direction_1500m",
    timezone: "Europe/Rome",
    forecast_days: "4",
  });

  try {
    const url = `${BASE_URL}?${params}`;
    console.log(`[fetchWindProfiles] Chiamata a: ${url}`);
    const res = await fetch(url);
    if (!res.ok) return [];
    const raw = await res.json();
    console.log(`[fetchWindProfiles] Risposta ricevuta`);

    const times: string[] = raw.hourly.time;
    const levels = [
      { height: 120, speedKey: "wind_speed_120m", dirKey: "wind_direction_120m" },
      { height: 180, speedKey: "wind_speed_180m", dirKey: "wind_direction_180m" },
      { height: 300, speedKey: "wind_speed_300m", dirKey: "wind_direction_300m" },
      { height: 600, speedKey: "wind_speed_600m", dirKey: "wind_direction_600m" },
      { height: 900, speedKey: "wind_speed_900m", dirKey: "wind_direction_900m" },
      { height: 1200, speedKey: "wind_speed_1200m", dirKey: "wind_direction_1200m" },
      { height: 1500, speedKey: "wind_speed_1500m", dirKey: "wind_direction_1500m" },
    ];

    const profiles: WindProfile[] = [];
    for (let t = 0; t < times.length; t++) {
      const levelsData = levels.map((l) => ({
        height: l.height,
        speed: raw.hourly[l.speedKey]?.[t] ?? null,
        dir: raw.hourly[l.dirKey]?.[t] ?? null,
      }));
      profiles.push({
        time: new Date(times[t]),
        levels: levelsData,
      });
    }
    return profiles;
  } catch (err) {
    console.error("[fetchWindProfiles] Errore:", err);
    return [];
  }
};

export const fetchMeteoHourly = async (lat: number, lon: number): Promise<HourData[]> => {
  const data = await fetchMeteo(lat, lon);
  return data.hourly;
};

// Icone meteo WMO
export const wic = (code: number, emoji: boolean = true): string => {
  if (emoji) {
    if (code === 0) return "☀️";
    if (code <= 3) return "🌤️";
    if (code <= 48) return "🌫️";
    if (code <= 57) return "🌦️";
    if (code <= 67) return "🌧️";
    if (code <= 77) return "🌨️";
    if (code <= 82) return "🌦️";
    return "⛈️";
  }
  return "";
};

// Direzione vento
export const wd = (deg: number): string => {
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return dirs[Math.round(deg / 22.5) % 16];
};

export const wa = (deg: number): string => wd(deg);

// Arricchisci daily con dati aggregati
export const enrDaily = (daily: MeteoData["daily"], hourly: HourData[]) => {
  return daily.map((d) => {
    const dayHours = hourly.filter(
      (h) =>
        h.time.getDate() === d.date.getDate() &&
        h.time.getMonth() === d.date.getMonth() &&
        h.time.getFullYear() === d.date.getFullYear()
    );
    const avgWind = dayHours.length
      ? dayHours.reduce((s, h) => s + h.windSpeed, 0) / dayHours.length
      : 0;
    const maxWind = dayHours.length
      ? Math.max(...dayHours.map((h) => h.windSpeed))
      : 0;
    const avgCloud = dayHours.length
      ? dayHours.reduce((s, h) => s + h.cloudCover, 0) / dayHours.length
      : 0;
    return {
      ...d,
      avgWind,
      maxWind,
      avgCloud,
    };
  });
};

// Calcolo termiche
export const calcThermal = (dayData: HourData[], siteAlt: number): ThermalData | null => {
  if (!dayData.length) return null;

  const avgTemp = dayData.reduce((s, h) => s + h.temperature, 0) / dayData.length;
  const avgDew = dayData.reduce((s, h) => s + h.dewPoint, 0) / dayData.length;
  const avgHum = dayData.reduce((s, h) => s + h.humidity, 0) / dayData.length;
  const maxTemp = Math.max(...dayData.map((h) => h.temperature));
  const minTemp = Math.min(...dayData.map((h) => h.temperature));
  const tempRange = maxTemp - minTemp;

  // LCL approssimato (base nuvole)
  const cloudBase = Math.round((avgTemp - avgDew) * 125);

  // CAPE approssimato
  const cape = Math.round(Math.max(0, (tempRange * 50) + (avgHum > 50 ? 200 : 0)));

  // Cima termica approssimata (base + CAPE factor)
  const thermalTop = Math.round(cloudBase + (cape / 100) * 300);

  // Soaring index (0-10)
  const soarIdx = Math.min(10, Math.max(0, Math.round(
    (tempRange / 15) * 3 +
    (avgHum < 60 ? 2 : 0) +
    (cloudBase > 800 ? 2 : 0) +
    (avgTemp > 20 ? 2 : 0) +
    (avgTemp > 25 ? 1 : 0)
  )));

  return { cloudBase, thermalTop, soarIdx };
};

// Filtra ore volo (9-19)
export const filterFlightHours = (data: HourData[]): HourData[] => {
  return data.filter((h) => {
    const hh = h.time.getHours();
    return hh >= 9 && hh <= 19;
  });
};