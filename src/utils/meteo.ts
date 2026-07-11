"use client";

import type { HourData, DailyData, MeteoData, ThermalData, AiAnalysis, PressureGradient } from "@/types/meteo";

export type { HourData, DailyData, MeteoData, ThermalData, AiAnalysis, PressureGradient };

const OPENMETEO_URL = "https://api.open-meteo.com/v1/forecast";

function pr(v: number | undefined | null, d = 0): number {
  return v ?? d;
}

export async function fetchMeteo(lat: number, lon: number): Promise<MeteoData> {
  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lon.toString(),
    hourly: [
      "temperature_2m",
      "relative_humidity_2m",
      "dew_point_2m",
      "apparent_temperature",
      "precipitation",
      "weather_code",
      "cloud_cover",
      "pressure_msl",
      "wind_speed_10m",
      "wind_direction_10m",
      "wind_gusts_10m",
      "soil_temperature_0cm",
      "soil_moisture_0_to_1cm",
      "uv_index",
      "is_day",
    ].join(","),
    daily: [
      "temperature_2m_max",
      "temperature_2m_min",
      "weather_code",
      "precipitation_sum",
    ].join(","),
    timezone: "Europe/Rome",
    forecast_days: "7",
  });

  const resp = await fetch(`${OPENMETEO_URL}?${params}`);
  if (!resp.ok) throw new Error(`Errore HTTP ${resp.status}`);
  const json = await resp.json();
  const transform = (j: any, i: number): HourData => ({
    time: new Date(j.hourly.time[i] + "Z"),
    temperature: j.hourly.temperature_2m[i],
    feelsLike: j.hourly.apparent_temperature[i],
    humidity: j.hourly.relative_humidity_2m[i],
    dewPoint: j.hourly.dew_point_2m[i],
    precipitation: pr(j.hourly.precipitation[i]),
    weatherCode: j.hourly.weather_code[i],
    cloudCover: pr(j.hourly.cloud_cover[i]),
    pressure: pr(j.hourly.pressure_msl[i]),
    windSpeed: pr(j.hourly.wind_speed_10m[i]),
    windDir: pr(j.hourly.wind_direction_10m[i]),
    windGust: pr(j.hourly.wind_gusts_10m[i]),
    soilTemp: j.hourly.soil_temperature_0cm?.[i] ?? null,
    soilMoisture: j.hourly.soil_moisture_0_to_1cm?.[i] ?? null,
    uvIndex: j.hourly.uv_index?.[i] ?? null,
    isDay: pr(j.hourly.is_day[i], 1) === 1,
  });

  const hourly: HourData[] = json.hourly.time.map((_: string, i: number) => transform(json, i));
  const daily: DailyData[] = json.daily.time.map((t: string, i: number) => ({
    date: new Date(t + "T12:00:00Z"),
    tempMax: pr(json.daily.temperature_2m_max[i]),
    tempMin: pr(json.daily.temperature_2m_min[i]),
    weatherCode: json.daily.weather_code[i],
    precipitationSum: pr(json.daily.precipitation_sum[i]),
  }));

  return { hourly, daily, lat, lon };
}

/** fetchMeteoHourly – returns only hourly data array */
export async function fetchMeteoHourly(lat: number, lon: number): Promise<HourData[]> {
  const data = await fetchMeteo(lat, lon);
  return data.hourly;
}

/** fetchMeteoDaily – returns only daily data array */
export async function fetchMeteoDaily(lat: number, lon: number): Promise<DailyData[]> {
  const data = await fetchMeteo(lat, lon);
  return data.daily;
}

/** Enrich daily with delta and idx */
export function enrDaily(daily: DailyData[], hourly: HourData[]) {
  return daily.map((d, i) => {
    const dayHours = hourly.filter(h => {
      const hDate = h.time.getDate();
      const dDate = d.date.getDate();
      return hDate === dDate;
    });
    const delta = Math.round(d.tempMax - d.tempMin);
    return { ...d, delta, idx: i };
  });
}

/** Calcola lo zero termico basato sul gradiente adiabatico secco (0.98°C per 100m) */
export function getZeroTermico(temperature: number, altitude: number): number {
  if (temperature <= 0) return altitude;
  return Math.round(altitude + (temperature / 0.0098));
}

/** Weather icon code */
export const wic = (code: number, isDay: boolean): string => {
  if (code === 0) return isDay ? "\u2600\uFE0F" : "\uD83C\uDF19";
  if (code <= 3) return isDay ? "\u26C5" : "\uD83C\uDF24\uFE0F";
  if (code <= 48) return "\uD83C\uDF2B\uFE0F";
  if (code <= 57) return "\uD83C\uDF26\uFE0F";
  if (code <= 67) return "\uD83C\uDF27\uFE0F";
  if (code <= 77) return "\u2744\uFE0F";
  if (code <= 82) return "\uD83C\uDF28\uFE0F";
  return "\u26C8\uFE0F";
};

export const ct = (c: number): string => {
  if (c <= 20) return "Sereno";
  if (c <= 40) return "Poco nuvoloso";
  if (c <= 60) return "Nuvolosità variabile";
  if (c <= 80) return "Molto nuvoloso";
  return "Coperto";
};

export const wa = (deg: number): string => {
  const dirs = [
    "N", "NNE", "NE", "ENE",
    "E", "ESE", "SE", "SSE",
    "S", "SSO", "SO", "OSO",
    "O", "ONO", "NO", "NNO",
  ];
  const i = Math.round(deg / 22.5) % 16;
  return dirs[i];
};

export const wd = (s: number): string => {
  if (s < 1) return "Calma";
  if (s < 6) return "Brezza leggera";
  if (s < 12) return "Brezza";
  if (s < 20) return "Vento moderato";
  if (s < 30) return "Vento teso";
  if (s < 40) return "Vento forte";
  return "Burrasca";
};

export interface WindProfile {
  dir: string;
  speed: number;
  speed1200: number;
  speed1800: number;
  speed2400: number;
}

export function getWindProfile(speed: number, dir: number): WindProfile {
  const beta = 0.143;
  const base = speed * (1 + beta * Math.log(300 / 10)) / (1 + beta * Math.log(10 / 10));
  const calcAlt = (alt: number) => Math.round(base * (1 + beta * Math.log(alt / 300)));
  return {
    dir: wa(dir),
    speed: Math.round(speed),
    speed1200: calcAlt(1200),
    speed1800: calcAlt(1800),
    speed2400: calcAlt(2400),
  };
}

export interface ThermalData {
  cloudBase: number;
  thermalTop: number;
  soarIdx: number;
}

export function calcThermal(dayData: HourData[], altitude: number): ThermalData {
  const maxTemp = Math.max(...dayData.map(h => h.temperature).filter(t => t != null));
  const humidity = dayData.reduce((s, h) => s + h.humidity, 0) / dayData.length;
  const cloud = dayData.reduce((s, h) => s + h.cloudCover, 0) / dayData.length;

  const dew = maxTemp - ((100 - humidity) / 5);
  const cloudBase = altitude + Math.round((maxTemp - dew) * 125);
  const delta = maxTemp - dew;
  const soarRaw = Math.min(10, Math.max(0, Math.round((delta - 4) * 1.5)));
  const thermalTop = cloudBase + Math.round(soarRaw * 80);
  const soarIdx = Math.min(10, Math.max(0, soarRaw));

  return { cloudBase, thermalTop, soarIdx };
}

/** Calcola turbolenza per una data ora e quota */
export function calcTurbulence(dayData: HourData[], hour: number, altitude: number): number {
  const hd = dayData.find((x) => x.time.getHours() === hour);
  if (!hd) return 0;
  // Formula semplificata: più vento e turbolenza di gradiente
  const ws = hd.windSpeed;
  const gust = hd.windGust;
  const turb = Math.min(5, Math.max(1, Math.round((ws * 0.15) + (gust * 0.1) + (altitude > 2000 ? 0.5 : 0))));
  return turb;
}