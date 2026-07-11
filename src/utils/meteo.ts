"use client";

import type { MeteoData, HourData, DailyData, WindProfile } from "@/types/meteo";
import { Cloud, CloudSun, CloudRain, CloudLightning, CloudSnow, CloudFog, Sun, CloudDrizzle } from "lucide-react";
import React from "react";

export function wic(code: number, emoji?: boolean): string | React.ReactNode {
  if (emoji) {
    if (code === 0 || code === 1) return "☀️";
    if (code === 2) return "⛅";
    if (code === 3) return "☁️";
    if (code >= 45 && code <= 48) return "🌫️";
    if (code >= 51 && code <= 55) return "🌦️";
    if (code >= 56 && code <= 57) return "🌧️";
    if (code >= 61 && code <= 65) return "🌧️";
    if (code >= 66 && code <= 67) return "🌧️";
    if (code >= 71 && code <= 75) return "🌨️";
    if (code === 77) return "🌨️";
    if (code >= 80 && code <= 82) return "🌦️";
    if (code >= 85 && code <= 86) return "🌨️";
    if (code >= 95 && code <= 99) return "⛈️";
    return "❓";
  }

  if (code === 0 || code === 1) return React.createElement(Sun, { className: "w-8 h-8 text-yellow-400 drop-shadow-lg animate-pulse" });
  if (code === 2) return React.createElement(CloudSun, { className: "w-8 h-8 text-yellow-400 drop-shadow-lg" });
  if (code === 3) return React.createElement(Cloud, { className: "w-8 h-8 text-slate-200 drop-shadow-lg" });
  if (code >= 45 && code <= 48) return React.createElement(CloudFog, { className: "w-8 h-8 text-slate-300 drop-shadow-lg animate-pulse" });
  if (code >= 51 && code <= 55) return React.createElement(CloudDrizzle, { className: "w-8 h-8 text-blue-300 drop-shadow-lg animate-bounce" });
  if (code >= 56 && code <= 57) return React.createElement(CloudRain, { className: "w-8 h-8 text-blue-300 drop-shadow-lg" });
  if (code >= 61 && code <= 65) return React.createElement(CloudRain, { className: "w-8 h-8 text-blue-400 drop-shadow-lg animate-bounce" });
  if (code >= 66 && code <= 67) return React.createElement(CloudRain, { className: "w-8 h-8 text-blue-400 drop-shadow-lg animate-bounce" });
  if (code >= 71 && code <= 75) return React.createElement(CloudSnow, { className: "w-8 h-8 text-blue-200 drop-shadow-lg animate-pulse" });
  if (code === 77) return React.createElement(CloudSnow, { className: "w-8 h-8 text-blue-200 drop-shadow-lg" });
  if (code >= 80 && code <= 82) return React.createElement(CloudRain, { className: "w-8 h-8 text-blue-400 drop-shadow-lg animate-bounce" });
  if (code >= 85 && code <= 86) return React.createElement(CloudSnow, { className: "w-8 h-8 text-blue-200 drop-shadow-lg animate-pulse" });
  if (code >= 95 && code <= 99) return React.createElement(CloudLightning, { className: "w-8 h-8 text-yellow-400 drop-shadow-lg animate-pulse" });
  return React.createElement(Sun, { className: "w-8 h-8 text-yellow-400 drop-shadow-lg" });
}

export function wa(deg: number): string {
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  const index = Math.round(deg / 22.5) % 16;
  return dirs[index];
}

export function wd(deg: number): string {
  return wa(deg);
}

export interface RichDay {
  date: Date;
  tempMax: number;
  tempMin: number;
  weatherCode: number;
  precipSum: number;
  windAvg: number;
  windMax: number;
  cloudAvg: number;
}

export interface ThermalCalcData {
  base: number;
  top: number;
  salita: number;
  cape: number;
}

export function enrDaily(daily: DailyData[], hourly: HourData[]): RichDay[] {
  return daily.map((d) => {
    const dayHours = hourly.filter((h) => {
      const hd = h.time;
      return (
        hd.getDate() === d.date.getDate() &&
        hd.getMonth() === d.date.getMonth() &&
        hd.getFullYear() === d.date.getFullYear()
      );
    });
    const windSpeeds = dayHours.map((h) => h.windSpeed);
    const avgWind = windSpeeds.length > 0
      ? windSpeeds.reduce((a, b) => a + b, 0) / windSpeeds.length
      : 0;
    const maxWind = windSpeeds.length > 0 ? Math.max(...windSpeeds) : 0;
    const cloudAvg = dayHours.length > 0
      ? dayHours.reduce((a, h) => a + h.cloudCover, 0) / dayHours.length
      : 0;

    return {
      date: d.date,
      tempMax: d.tempMax,
      tempMin: d.tempMin,
      weatherCode: d.weatherCode,
      precipSum: d.precipitationSum,
      windAvg: avgWind,
      windMax: maxWind,
      cloudAvg: cloudAvg,
    };
  });
}

export function calcThermal(hourly: HourData[], altitude: number): ThermalCalcData {
  if (!hourly.length) {
    return { base: 0, top: 0, salita: 0, cape: 0 };
  }
  const avgTemp = hourly.reduce((s, h) => s + h.temperature, 0) / hourly.length;
  const avgHumidity = hourly.reduce((s, h) => s + h.humidity, 0) / hourly.length;
  const avgDew = hourly.reduce((s, h) => s + (h.dewPoint || h.temperature - (100 - h.humidity) / 5), 0) / hourly.length;
  const spread = avgTemp - avgDew;
  const cloudBase = Math.round(Math.max(0, spread * 125));
  const cape = Math.round(Math.max(0, spread * 80 + Math.random() * 100));
  const thermalTop = Math.round(cloudBase + Math.min(2000, cape * 2));
  const salita = Math.round(Math.min(5, Math.max(0, spread * 0.3)) * 10) / 10;

  return {
    base: altitude + cloudBase,
    top: altitude + thermalTop,
    salita,
    cape,
  };
}

export function filterFlightHours(hourly: HourData[]): HourData[] {
  return hourly.filter((h) => {
    const hh = h.time.getHours();
    return hh >= 9 && hh <= 19;
  });
}

export async function fetchMeteo(lat: number, lon: number): Promise<MeteoData> {
  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lon.toString(),
    hourly: [
      "temperature_2m",
      "apparent_temperature",
      "relative_humidity_2m",
      "dew_point_2m",
      "precipitation",
      "weather_code",
      "cloud_cover",
      "surface_pressure",
      "wind_speed_10m",
      "wind_direction_10m",
      "wind_gusts_10m",
    ].join(","),
    daily: [
      "temperature_2m_max",
      "temperature_2m_min",
      "weather_code",
      "precipitation_sum",
    ].join(","),
    timezone: "Europe/Rome",
    forecast_days: "3",
  });

  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
  if (!res.ok) throw new Error(`Open-Meteo error: ${res.status}`);
  const json = await res.json();

  const hourlyRaw: HourData[] = json.hourly.time.map((t: string, i: number) => ({
    time: new Date(t),
    temperature: json.hourly.temperature_2m[i],
    feelsLike: json.hourly.apparent_temperature[i],
    humidity: json.hourly.relative_humidity_2m[i],
    dewPoint: json.hourly.dew_point_2m[i],
    precipitation: json.hourly.precipitation[i] || 0,
    weatherCode: json.hourly.weather_code[i],
    cloudCover: json.hourly.cloud_cover[i],
    pressure: json.hourly.surface_pressure[i] || null,
    windSpeed: json.hourly.wind_speed_10m[i],
    windDir: json.hourly.wind_direction_10m[i],
    windGust: json.hourly.wind_gusts_10m[i] || null,
    soilTemp: null,
    soilMoisture: null,
    uvIndex: null,
    isDay: true,
  }));

  const dailyRaw: DailyData[] = json.daily.time.map((t: string, i: number) => ({
    date: new Date(t),
    tempMax: json.daily.temperature_2m_max[i],
    tempMin: json.daily.temperature_2m_min[i],
    weatherCode: json.daily.weather_code[i],
    precipitationSum: json.daily.precipitation_sum[i] || 0,
  }));

  return { hourly: hourlyRaw, daily: dailyRaw, lat, lon };
}

export async function fetchWindProfiles(lat: number, lon: number): Promise<WindProfile[]> {
  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lon.toString(),
    hourly: ["wind_speed_10m", "wind_direction_10m", "wind_speed_80m", "wind_direction_80m"].join(","),
    timezone: "Europe/Rome",
    forecast_days: "2",
  });

  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
  if (!res.ok) throw new Error(`Open-Meteo wind error: ${res.status}`);
  const json = await res.json();

  const profiles: WindProfile[] = json.hourly.time.map((t: string, i: number) => ({
    time: new Date(t),
    levels: [
      { height: 10, speed: json.hourly.wind_speed_10m[i], dir: json.hourly.wind_direction_10m[i] },
      { height: 80, speed: json.hourly.wind_speed_80m[i], dir: json.hourly.wind_direction_80m[i] },
    ],
  }));

  return profiles;
}