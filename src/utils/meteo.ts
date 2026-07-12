"use client";

import type { HourData, MeteoData, DailyData, ThermalData } from "@/types/meteo";

const BASE_URL = "https://api.open-meteo.com/v1/forecast";

export async function fetchMeteo(lat: number, lon: number): Promise<MeteoData> {
  const hourlyParams = [
    "temperature_2m",
    "apparent_temperature",
    "relative_humidity_2m",
    "dew_point_2m",
    "precipitation",
    "weather_code",
    "cloud_cover",
    "pressure_msl",
    "wind_speed_10m",
    "wind_direction_10m",
    "wind_gusts_10m",
    "uv_index",
    "is_day",
  ].join(",");

  const dailyParams = [
    "temperature_2m_max",
    "temperature_2m_min",
    "weather_code",
    "precipitation_sum",
  ].join(",");

  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lon.toString(),
    hourly: hourlyParams,
    daily: dailyParams,
    timezone: "Europe/Rome",
    forecast_days: "4",
  });

  const res = await fetch(`${BASE_URL}?${params}`);
  if (!res.ok) throw new Error(`Errore HTTP ${res.status}`);
  const raw = await res.json();

  // Parse orari – array completo (tutte le ore di tutti i giorni)
  const times: string[] = raw.hourly.time;
  const hourly: HourData[] = times.map((t: string, i: number) => ({
    time: new Date(t),
    temperature: raw.hourly.temperature_2m[i],
    feelsLike: raw.hourly.apparent_temperature[i],
    humidity: raw.hourly.relative_humidity_2m[i],
    dewPoint: raw.hourly.dew_point_2m?.[i] ?? 0,
    precipitation: raw.hourly.precipitation[i],
    weatherCode: raw.hourly.weather_code[i],
    cloudCover: raw.hourly.cloud_cover[i],
    pressure: raw.hourly.pressure_msl?.[i] ?? null,
    windSpeed: raw.hourly.wind_speed_10m[i],
    windDir: raw.hourly.wind_direction_10m[i],
    windGust: raw.hourly.wind_gusts_10m?.[i] ?? null,
    soilTemp: null,
    soilMoisture: null,
    uvIndex: raw.hourly.uv_index?.[i] ?? null,
    isDay: raw.hourly.is_day?.[i] === 1,
  }));

  // Parse giornalieri
  const dTimes: string[] = raw.daily.time;
  const daily: DailyData[] = dTimes.map((t: string, i: number) => ({
    date: new Date(t),
    tempMax: raw.daily.temperature_2m_max[i],
    tempMin: raw.daily.temperature_2m_min[i],
    weatherCode: raw.daily.weather_code[i],
    precipitationSum: raw.daily.precipitation_sum[i],
  }));

  return { hourly, daily, lat, lon };
}

/** Filtra solo le ore di volo (9–19) */
export function filterFlightHours(data: HourData[]): HourData[] {
  return data.filter((h) => {
    const hh = h.time.getHours();
    return hh >= 9 && hh <= 19;
  });
}

/** Arricchisce i dati giornalieri con medie orarie */
export function enrDaily(daily: DailyData[], hourly: HourData[]) {
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
    return { ...d, avgWind, maxWind, avgCloud };
  });
}

/** Calcola dati termici approssimati */
export function calcThermal(dayData: HourData[], _siteAlt: number): ThermalData | null {
  if (!dayData.length) return null;
  const avgTemp = dayData.reduce((s, h) => s + h.temperature, 0) / dayData.length;
  const avgDew = dayData.reduce((s, h) => s + h.dewPoint, 0) / dayData.length;
  const avgHum = dayData.reduce((s, h) => s + h.humidity, 0) / dayData.length;
  const maxTemp = Math.max(...dayData.map((h) => h.temperature));
  const minTemp = Math.min(...dayData.map((h) => h.temperature));
  const tempRange = maxTemp - minTemp;

  const cloudBase = Math.round((avgTemp - avgDew) * 125);
  const cape = Math.round(Math.max(0, tempRange * 50 + (avgHum > 50 ? 200 : 0)));
  const thermalTop = Math.round(cloudBase + (cape / 100) * 300);
  const soarIdx = Math.min(
    10,
    Math.max(
      0,
      Math.round(
        (tempRange / 15) * 3 + (avgHum < 60 ? 2 : 0) + (cloudBase > 800 ? 2 : 0) + (avgTemp > 20 ? 2 : 0) + (avgTemp > 25 ? 1 : 0)
      )
    )
  );

  return { cloudBase, thermalTop, soarIdx };
}

/** Icona meteo WMO (emoji) */
export function wic(code: number, _emoji?: boolean): string {
  if (code === 0) return "☀️";
  if (code <= 3) return "🌤️";
  if (code <= 48) return "🌫️";
  if (code <= 57) return "🌦️";
  if (code <= 67) return "🌧️";
  if (code <= 77) return "🌨️";
  if (code <= 82) return "🌦️";
  return "⛈️";
}

/** Direzione vento in testo */
export function wd(deg: number): string {
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return dirs[Math.round(deg / 22.5) % 16];
}

export function wa(deg: number): string {
  return wd(deg);
}