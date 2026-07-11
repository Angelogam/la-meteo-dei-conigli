"use client";

import type { HourData, DailyData } from "@/types/meteo";

const WI: Record<number, string> = {
  0: "\u2600", 1: "\uD83C\uDF24", 2: "\u26C5", 3: "\u2601",
  45: "\uD83C\uDF2B", 48: "\uD83C\uDF2B", 51: "\uD83C\uDF26",
  53: "\uD83C\uDF27", 55: "\uD83C\uDF27", 61: "\uD83C\uDF27",
  63: "\uD83C\uDF27", 65: "\uD83C\uDF27", 71: "\u2744",
  73: "\u2744", 75: "\u2744", 80: "\uD83C\uDF27",
  81: "\uD83C\uDF27", 82: "\u26C8", 95: "\u26C8",
  96: "\u26C8", 99: "\u26C8"
};

export function wic(code: number, day: number) { return WI[code] || (day ? "\u2600" : "\uD83C\uDF19"); }
export function wd(deg: number) {
  if (deg === undefined || deg === null) return "--";
  return ["N", "NE", "E", "SE", "S", "SW", "W", "NW"][Math.round(deg / 45) % 8];
}
export function wa(deg: number) {
  if (deg === undefined || deg === null) return "\u27A1";
  return ["\u2B06", "\u2197", "\u27A1", "\u2198", "\u2B07", "\u2199", "\u2B05", "\u2196"][Math.round(deg / 45) % 8];
}
export function ct(cc: number) {
  if (cc < 20) return "Sereno";
  if (cc < 40) return "Poco nuvoloso";
  if (cc < 60) return "Nuvoloso";
  if (cc < 80) return "Molto nuvoloso";
  return "Coperto";
}

export async function fetchMeteo(lat: number, lon: number) {
  const p = new URLSearchParams({
    latitude: lat.toString(), longitude: lon.toString(),
    hourly: "temperature_2m,dewpoint_2m,relativehumidity_2m,cloudcover,precipitation,visibility,wind_speed_10m,wind_gusts_10m,wind_direction_10m,wind_speed_80m,wind_direction_80m,wind_speed_120m,wind_direction_120m,uv_index,is_day,weathercode,pressure_msl",
    daily: "weathercode,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_sum,precipitation_hours,wind_speed_10m_max,wind_direction_10m_dominant",
    timezone: "auto", forecast_days: "3"
  });
  const r = await fetch("https://api.open-meteo.com/v1/forecast?" + p.toString());
  if (!r.ok) throw new Error("HTTP " + r.status);
  const d = await r.json();
  return {
    hourly: d.hourly.time.map((t: string, i: number) => ({
      time: new Date(t), temperature: d.hourly.temperature_2m[i], dewPoint: d.hourly.dewpoint_2m[i],
      humidity: d.hourly.relativehumidity_2m[i], cloudCover: d.hourly.cloudcover[i],
      precipitation: d.hourly.precipitation[i] || 0, visibility: d.hourly.visibility ? d.hourly.visibility[i] / 1000 : 40,
      windSpeed: d.hourly.wind_speed_10m[i], windGust: d.hourly.wind_gusts_10m ? d.hourly.wind_gusts_10m[i] : d.hourly.wind_speed_10m[i] + 8,
      windDir: d.hourly.wind_direction_10m[i], wind80m: d.hourly.wind_speed_80m?.[i] ?? null,
      windDir80m: d.hourly.wind_direction_80m?.[i] ?? null, wind120m: d.hourly.wind_speed_120m?.[i] ?? null,
      windDir120m: d.hourly.wind_direction_120m?.[i] ?? null, uvIndex: d.hourly.uv_index?.[i] ?? 0,
      isDay: d.hourly.is_day?.[i] ?? 1, weatherCode: d.hourly.weathercode?.[i] ?? 0,
      pressure: d.hourly.pressure_msl?.[i] ?? 1013
    } as HourData)),
    daily: d.daily.time.map((t: string, i: number) => ({
      date: new Date(t), weatherCode: d.daily.weathercode[i], tempMax: d.daily.temperature_2m_max[i],
      tempMin: d.daily.temperature_2m_min[i], sunrise: new Date(d.daily.sunrise[i]), sunset: new Date(d.daily.sunset[i]),
      uvMax: d.daily.uv_index_max[i], precipitationSum: d.daily.precipitation_sum[i],
      precipitationHours: d.daily.precipitation_hours[i], windMax: d.daily.wind_speed_10m_max[i],
      windDirDominant: d.daily.wind_direction_10m_dominant[i]
    } as DailyData))
  };
}

export function getWindProfile(sw: number, sd: number) {
  const p = [{ alt: 10, speed: sw, dir: sd, dirName: wd(sd) }];
  for (let a = 400; a <= 4000; a += 250) {
    const f = Math.min(3.5, 1 + (a - 10) * 0.0025);
    const s = Math.round(sw * f * 10) / 10;
    const dir = (sd + Math.min(45, ((a - 10) / 1000) * 15)) % 360;
    p.push({ alt: a, speed: s, dir: Math.round(dir), dirName: wd(dir) });
  }
  return p;
}

export function calcShear(p: any[]) {
  if (p.length < 2) return { shear: 0, risk: "basso", desc: "Dati insufficienti" };
  const s = p[0], h = p[p.length - 1];
  const v = Math.abs(h.speed - s.speed) + Math.abs((h.dir - s.dir) % 360) * 0.5;
  let risk = "basso", desc = "Shear basso - Condizioni stabili";
  if (v > 30) { risk = "alto"; desc = "SHEAR FORTE - Volo pericoloso!"; }
  else if (v > 20) { risk = "medio"; desc = "Shear forte - Richiesta esperienza"; }
  else if (v > 10) { risk = "medio-basso"; desc = "Shear moderato - Attenzione"; }
  return { shear: Math.round(v * 10) / 10, risk, desc };
}

export function calcThermal(dayData: HourData[], el: number) {
  if (!dayData?.length) return null;
  const temps = dayData.map((h) => h.temperature);
  const maxT = Math.max(...temps), minT = Math.min(...temps);
  const delta = Math.round(maxT - minT);
  const avgT = temps.reduce((a, b) => a + b, 0) / temps.length;
  const avgDew = dayData.reduce((s, h) => s + h.dewPoint, 0) / dayData.length;
  const avgCloud = dayData.reduce((s, h) => s + h.cloudCover, 0) / dayData.length;
  const avgHum = dayData.reduce((s, h) => s + h.humidity, 0) / dayData.length;
  const cb = Math.round((avgT - avgDew) * 120 + el);
  const tt = Math.round(el + delta * 100);
  const si = Math.min(10, Math.round(delta / 2 + (avgCloud < 40 ? 2 : 0) + (avgHum < 50 ? 1 : 0)));
  return {
    cloudBase: cb, thermalTop: tt, delta, avgT, maxT, minT, avgCloud, avgHum, soarIdx: si,
    hourly: dayData.filter((h) => h.time.getHours() >= 9 && h.time.getHours() <= 19).map((h) => ({
      hour: h.time.getHours(), temp: h.temperature,
      intensity: Math.round(((h.temperature - minT) / 10) * 1.5 * 10) / 10,
      cloudBase: Math.round((h.temperature - h.dewPoint) * 120 + el),
      wind: h.windSpeed, dir: h.windDir, cloud: h.cloudCover
    }))
  };
}

export function calcTurbulence(dayData: HourData[], h: number, alt: number): number {
  const hd = dayData.find((x) => x.time.getHours() === h);
  if (!hd) return 0;
  const gustFactor = hd.windGust / Math.max(hd.windSpeed, 1);
  const windFactor = Math.min(hd.windSpeed * 0.12, 2.5);
  const cloudFactor = hd.cloudCover > 70 ? 1.5 : hd.cloudCover > 40 ? 0.8 : 0.3;
  const altFactor = (alt - 500) / 3000;
  return Math.min(5, Math.max(1, Math.round(windFactor + cloudFactor + gustFactor * 0.5 + altFactor)));
}