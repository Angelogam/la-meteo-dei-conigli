"use client";

import React, { useEffect, useState, useMemo } from "react";

// ============================================================
// DATI DECOLLI
// ============================================================
const DECOLLI = [
  { id: "malanotte", name: "Malanotte", lat: 44.25874571728482, lon: 7.794304664370852, exposure: "S/SE", valley: "Valle Infernotto", difficulty: 3, altitude: 1740 },
  { id: "colle_di_tenda", name: "Colle di Tenda", lat: 44.15093973937469, lon: 7.569262924652476, exposure: "S", valley: "Valle Roya/Vermenagna", difficulty: 2, altitude: 1870 },
  { id: "boves", name: "Boves", lat: 44.32113720462757, lon: 7.544697617792515, exposure: "S", valley: "Cuneese", difficulty: 1, altitude: 900 },
  { id: "monte_male", name: "Monte Male – Dronero", lat: 44.43163071064606, lon: 7.362886778152897, exposure: "S", valley: "Valle Maira", difficulty: 3, altitude: 1500 },
  { id: "iretta", name: "Iretta", lat: 44.49893744007536, lon: 7.382036612070795, exposure: "S", valley: "Valle Maira", difficulty: 2, altitude: 1300 },
  { id: "val_mala", name: "Pratoni di Val Mala", lat: 44.50780117336976, lon: 7.346618978966227, exposure: "S", valley: "Valle Maira", difficulty: 2, altitude: 1400 },
  { id: "birrone", name: "Monte Birrone", lat: 44.5398927839592, lon: 7.25293945830122, exposure: "S", valley: "Valle Maira", difficulty: 4, altitude: 2131 },
  { id: "agnello", name: "Colle dell'Agnello", lat: 44.68282592463814, lon: 6.978200601250462, exposure: "S", valley: "Valle Varaita", difficulty: 5, altitude: 2748 },
  { id: "pian_mune_alto", name: "Pian Munè – Seggiovia", lat: 44.63861029121272, lon: 7.230889474766025, exposure: "S/SW", valley: "Valle Po", difficulty: 2, altitude: 1870 },
  { id: "pian_mune_basso", name: "Pian Munè – Bric Lombatera", lat: 44.65736521807557, lon: 7.260017009542715, exposure: "S", valley: "Valle Po", difficulty: 1, altitude: 1350 },
  { id: "martiniana_po", name: "Martiniana Po", lat: 44.60695265332723, lon: 7.38322612877631, exposure: "S", valley: "Valle Po", difficulty: 1, altitude: 900 },
  { id: "rucas_alto", name: "Rucas alto", lat: 44.74213930591463, lon: 7.220118689737356, exposure: "S/SE", valley: "Valle Infernotto", difficulty: 2, altitude: 1500 },
  { id: "montoso_basso", name: "Montoso – decollo basso", lat: 44.7643723437882, lon: 7.249757926713178, exposure: "SE", valley: "Valle Infernotto", difficulty: 1, altitude: 1250 },
  { id: "vandalino", name: "Monte Vandalino", lat: 44.83671231480542, lon: 7.173866924055591, exposure: "S/SE", valley: "Val Pellice", difficulty: 4, altitude: 2120 },
  { id: "pian_dell_alpe", name: "Pian dell'Alpe", lat: 45.06396153999711, lon: 7.028266530872771, exposure: "S", valley: "Val Chisone", difficulty: 3, altitude: 1700 },
  { id: "roletto", name: "Roletto – Piggi", lat: 44.93249288285819, lon: 7.310959031722244, exposure: "S", valley: "Pinerolese", difficulty: 1, altitude: 820 },
  { id: "piossasco", name: "Piossasco – Monte S. Giorgio", lat: 44.99671840144012, lon: 7.44800217882953, exposure: "S", valley: "Collina Torinese", difficulty: 1, altitude: 673 },
  { id: "truccetti", name: "Truccetti", lat: 45.07973511679036, lon: 7.342018342463826, exposure: "S", valley: "Canavese", difficulty: 1, altitude: 900 },
  { id: "val_della_torre", name: "Val della Torre", lat: 45.16262748864921, lon: 7.463716167415302, exposure: "S", valley: "Val della Torre", difficulty: 1, altitude: 970 },
  { id: "rocca_canavese", name: "Rocca Canavese – M. della Neve", lat: 45.32757754837493, lon: 7.572793582322621, exposure: "S", valley: "Canavese", difficulty: 2, altitude: 1100 },
  { id: "s_elisabetta", name: "Santa Elisabetta", lat: 45.4182733880574, lon: 7.641945041749434, exposure: "S", valley: "Canavese", difficulty: 1, altitude: 900 },
  { id: "s_elisabetta_alto", name: "Santa Elisabetta alto", lat: 45.44019393073506, lon: 7.648025947229948, exposure: "S", valley: "Canavese", difficulty: 2, altitude: 1100 },
  { id: "cavallaria", name: "Monte Cavallaria", lat: 45.51729363773779, lon: 7.798808327293107, exposure: "S", valley: "Canavese", difficulty: 2, altitude: 1300 },
  { id: "andrate", name: "Andrate", lat: 45.55063933418272, lon: 7.880775591143394, exposure: "S", valley: "Canavese", difficulty: 1, altitude: 1000 },
];

// ============================================================
// TYPES
// ============================================================
interface HourData {
  time: Date;
  temperature: number;
  dewPoint: number;
  humidity: number;
  cloudCover: number;
  precipitation: number;
  visibility: number;
  windSpeed: number;
  windGust: number;
  windDir: number;
  wind80m: number | null;
  windDir80m: number | null;
  wind120m: number | null;
  windDir120m: number | null;
  uvIndex: number;
  isDay: number;
  weatherCode: number;
  pressure: number;
}

interface DailyData {
  date: Date;
  weatherCode: number;
  tempMax: number;
  tempMin: number;
  sunrise: Date;
  sunset: Date;
  uvMax: number;
  precipitationSum: number;
  precipitationHours: number;
  windMax: number;
  windDirDominant: number;
}

// ============================================================
// UTILITY METEO
// ============================================================
const WEATHER_ICONS: Record<number, string> = {
  0: '☀️', 1: '🌤️', 2: '⛅', 3: '☁️',
  45: '🌫️', 48: '🌫️',
  51: '🌦️', 53: '🌧️', 55: '🌧️',
  61: '🌧️', 63: '🌧️', 65: '🌧️',
  71: '❄️', 73: '❄️', 75: '❄️',
  80: '🌧️', 81: '🌧️', 82: '⛈️',
  95: '⛈️', 96: '⛈️', 99: '⛈️',
};

function getWeatherIcon(code: number, isDay: number): string {
  return WEATHER_ICONS[code] || (isDay ? '☀️' : '🌙');
}

function getWindDir(deg: number): string {
  if (deg === undefined || deg === null) return '--';
  return ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(deg / 45) % 8];
}

function getWindArrow(deg: number): string {
  if (deg === undefined || deg === null) return '➡️';
  return ['↑', '↗', '→', '↘', '↓', '↙', '←', '↖'][Math.round(deg / 45) % 8];
}

function getCloudText(cc: number): string {
  if (cc < 20) return 'Sereno';
  if (cc < 40) return 'Poco nuvoloso';
  if (cc < 60) return 'Nuvoloso';
  if (cc < 80) return 'Molto nuvoloso';
  return 'Coperto';
}

const WIND_COLORS = ['#4caf50', '#8bc34a', '#ff9800', '#ff5722', '#f44336'];

function getWindColor(speed: number, maxSpeed: number): string {
  const ratio = speed / maxSpeed;
  if (ratio < 0.3) return WIND_COLORS[0];
  if (ratio < 0.5) return WIND_COLORS[1];
  if (ratio < 0.7) return WIND_COLORS[2];
  if (ratio < 0.9) return WIND_COLORS[3];
  return WIND_COLORS[4];
}

// ============================================================
// FETCH OPEN-METEO
// ============================================================
async function fetchMeteo(lat: number, lon: number) {
  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lon.toString(),
    hourly: [
      'temperature_2m', 'dewpoint_2m', 'relativehumidity_2m',
      'cloudcover', 'precipitation', 'visibility',
      'wind_speed_10m', 'wind_gusts_10m', 'wind_direction_10m',
      'wind_speed_80m', 'wind_direction_80m',
      'wind_speed_120m', 'wind_direction_120m',
      'uv_index', 'is_day', 'weathercode', 'pressure_msl'
    ].join(','),
    daily: [
      'weathercode', 'temperature_2m_max', 'temperature_2m_min',
      'sunrise', 'sunset', 'uv_index_max',
      'precipitation_sum', 'precipitation_hours',
      'wind_speed_10m_max', 'wind_direction_10m_dominant'
    ].join(','),
    timezone: 'auto',
    forecast_days: '3'
  });

  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();

  return {
    hourly: data.hourly.time.map((t: string, i: number) => ({
      time: new Date(t),
      temperature: data.hourly.temperature_2m[i],
      dewPoint: data.hourly.dewpoint_2m[i],
      humidity: data.hourly.relativehumidity_2m[i],
      cloudCover: data.hourly.cloudcover[i],
      precipitation: data.hourly.precipitation[i] || 0,
      visibility: data.hourly.visibility ? data.hourly.visibility[i] / 1000 : 40,
      windSpeed: data.hourly.wind_speed_10m[i],
      windGust: data.hourly.wind_gusts_10m ? data.hourly.wind_gusts_10m[i] : data.hourly.wind_speed_10m[i] + 8,
      windDir: data.hourly.wind_direction_10m[i],
      wind80m: data.hourly.wind_speed_80m?.[i] ?? null,
      windDir80m: data.hourly.wind_direction_80m?.[i] ?? null,
      wind120m: data.hourly.wind_speed_120m?.[i] ?? null,
      windDir120m: data.hourly.wind_direction_120m?.[i] ?? null,
      uvIndex: data.hourly.uv_index?.[i] ?? 0,
      isDay: data.hourly.is_day?.[i] ?? 1,
      weatherCode: data.hourly.weathercode?.[i] ?? 0,
      pressure: data.hourly.pressure_msl?.[i] ?? 1013,
    })),
    daily: data.daily.time.map((t: string, i: number) => ({
      date: new Date(t),
      weatherCode: data.daily.weathercode[i],
      tempMax: data.daily.temperature_2m_max[i],
      tempMin: data.daily.temperature_2m_min[i],
      sunrise: new Date(data.daily.sunrise[i]),
      sunset: new Date(data.daily.sunset[i]),
      uvMax: data.daily.uv_index_max[i],
      precipitationSum: data.daily.precipitation_sum[i],
      precipitationHours: data.daily.precipitation_hours[i],
      windMax: data.daily.wind_speed_10m_max[i],
      windDirDominant: data.daily.wind_direction_10m_dominant[i],
    }))
  };
}

// ============================================================
// PROFILO VENTO
// ============================================================
function getWindProfile(surfaceWind: number, surfaceDir: number) {
  const profile = [{ alt: 10, speed: surfaceWind, dir: surfaceDir, dirName: getWindDir(surfaceDir) }];
  for (let a = 400; a <= 4000; a += 250) {
    const factor = Math.min(3.5, 1 + (a - 10) * 0.0025);
    const speed = Math.round(surfaceWind * factor * 10) / 10;
    const dir = (surfaceDir + Math.min(45, (a - 10) / 1000 * 15)) % 360;
    profile.push({ alt: a, speed, dir: Math.round(dir), dirName: getWindDir(dir) });
  }
  return profile;
}

function calcShear(profile: any[]) {
  if (profile.length < 2) return { shear: 0, risk: 'basso', desc: 'Dati insufficienti' };
  const s = profile[0];
  const h = profile[profile.length - 1];
  const val = Math.abs(h.speed - s.speed) + Math.abs((h.dir - s.dir) % 360) * 0.5;
  let risk = 'basso';
  let desc = '✅ Shear basso - Condizioni stabili';
  if (val > 30) { risk = 'alto'; desc = '⚠️ SHEAR FORTE - Volo pericoloso!'; }
  else if (val > 20) { risk = 'medio'; desc = '⚡ Shear forte - Richiesta esperienza'; }
  else if (val > 10) { risk = 'medio-basso'; desc = '🌀 Shear moderato - Attenzione'; }
  return { shear: Math.round(val * 10) / 10, risk, desc };
}

// ============================================================
// ANALISI TERMICHE
// ============================================================
function calcThermalProfile(dayData: HourData[], elevation: number) {
  if (!dayData?.length) return null;
  const temps = dayData.map(h => h.temperature);
  const maxT = Math.max(...temps);
  const minT = Math.min(...temps);
  const delta = Math.round(maxT - minT);
  const avgT = temps.reduce((a, b) => a + b, 0) / temps.length;
  const avgDew = dayData.reduce((s, h) => s + h.dewPoint, 0) / dayData.length;
  const avgCloud = dayData.reduce((s, h) => s + h.cloudCover, 0) / dayData.length;
  const avgHum = dayData.reduce((s, h) => s + h.humidity, 0) / dayData.length;
  const cloudBase = Math.round((avgT - avgDew) * 120 + elevation);
  const thermalTop = Math.round(elevation + delta * 100);
  const soarIdx = Math.min(10, Math.round(delta / 2 + (avgCloud < 40 ? 2 : 0) + (avgHum < 50 ? 1 : 0)));
  return {
    cloudBase, thermalTop, delta, avgT, maxT, minT, avgCloud, avgHum, soarIdx,
    hourly: dayData.filter(h => h.time.getHours() >= 9 && h.time.getHours() <= 19).map(h => ({
      hour: h.time.getHours(),
      temp: h.temperature,
      intensity: Math.round(((h.temperature - minT) / 10) * 1.5 * 10) / 10,
      cloudBase: Math.round((h.temperature - h.dewPoint) * 120 + elevation),
      wind: h.windSpeed, dir: h.windDir, cloud: h.cloudCover
    }))
  };
}

// ============================================================
// GENERAZIONE ANALISI AI
// ============================================================
function generateAI(dayData: HourData[], site: any, thermal: any, windProfile: any[]) {
  if (!dayData?.length) return null;
  const maxW = Math.max(...dayData.map(h => h.windSpeed));
  const avgC = dayData.reduce((s, h) => s + h.cloudCover, 0) / dayData.length;
  const hasRain = dayData.some(h => h.precipitation > 0.5);
  const hasStorm = dayData.some(h => h.weatherCode >= 95);
  const soar = thermal?.soarIdx || 0;
  const shear = windProfile ? calcShear(windProfile) : null;
  let risk = 'basso';
  let riskScore = 0;
  if (maxW > 25) riskScore += 2;
  if (hasStorm) riskScore += 3;
  if (soar < 3) riskScore += 1;
  if (shear?.risk === 'alto') riskScore += 2;
  else if (shear?.risk === 'medio') riskScore += 1;
  if (riskScore >= 5) risk = 'alto';
  else if (riskScore >= 3) risk = 'medio';

  let general = `📋 PANORAMICA GENERALE\n\n`;
  general += `🌅 La giornata al decollo di ${site.name} si presenta `;
  if (avgC < 30) general += `con cielo sereno. `;
  else if (avgC < 60) general += `con cielo parzialmente nuvoloso. `;
  else general += `con cielo nuvoloso. `;
  if (maxW > 25) general += `💨 Vento forte (${Math.round(maxW)} km/h). `;
  else if (maxW > 15) general += `💨 Vento moderato (${Math.round(maxW)} km/h). `;
  else general += `💨 Vento debole (${Math.round(maxW)} km/h). `;
  general += hasRain ? `🌧️ Precipitazioni previste. ` : `✅ Nessuna precipitazione. `;
  general += `📍 Esposizione: ${site.exposure}.`;

  let advice = `💡 CONSIGLI PER IL VOLO\n\n`;
  advice += `📊 Rischio: `;
  if (risk === 'alto') advice += `🔴 ALTO - Sconsigliato!\n`;
  else if (risk === 'medio') advice += `🟡 MEDIO - Attenzione!\n`;
  else advice += `🟢 BASSO - Favorevole!\n\n`;
  if (maxW > 25) advice += `⚠️ Vento forte (>25 km/h).\n`;
  else if (maxW > 18) advice += `⚠️ Vento sostenuto (18-25 km/h).\n`;
  else if (maxW < 5) advice += `💨 Vento debole (<5 km/h).\n`;
  else advice += `✅ Vento ideale (5-18 km/h).\n`;
  if (soar >= 7) advice += `🔥 Termiche forti - Ottime per cross!\n`;
  else if (soar >= 5) advice += `💪 Termiche medie - Buona attività.\n`;
  else advice += `🫤 Termiche deboli - Voli locali.\n`;
  if (shear) advice += `${shear.desc}\n`;

  let thermalTxt = `🔥 ANALISI TERMICHE\n\n`;
  if (thermal) {
    thermalTxt += `• Base nuvole: ${thermal.cloudBase}m\n`;
    thermalTxt += `• Plafond: ${thermal.thermalTop}m\n`;
    thermalTxt += `• Delta: ${thermal.delta}°C\n`;
    thermalTxt += `• Soaring Index: ${thermal.soarIdx}/10\n`;
    if (soar >= 7) thermalTxt += `\n🪂 Galleggiamento eccellente!\n`;
    else if (soar >= 5) thermalTxt += `\n🪂 Buon galleggiamento.\n`;
    else thermalTxt += `\n🪂 Galleggiamento scarso.\n`;
    thermal.hourly.forEach((h: any) => {
      thermalTxt += `• ${String(h.hour).padStart(2, '0')}:00 → ${h.intensity > 2 ? '🔥' : h.intensity > 1 ? '💪' : '🫤'} ${h.intensity}m/s\n`;
    });
  }

  let altTxt = `🏔️ QUOTE E PLAFOND\n\n`;
  if (thermal) {
    altTxt += `• Base decollo: ${site.altitude || 1500}m\n`;
    altTxt += `• Cloud Base: ${thermal.cloudBase}m\n`;
    altTxt += `• Thermal Top: ${thermal.thermalTop}m\n`;
    if (soar >= 7 && thermal.thermalTop > 3000) altTxt += `\n✅ Cross Country eccellente!\n`;
    else if (soar >= 5 && thermal.thermalTop > 2500) altTxt += `\n👍 Buono per cross.\n`;
    else altTxt += `\n🫤 Cross limitato.\n`;
  }

  let hourlyTxt = `⏰ SVOLGIMENTO GIORNATA\n\n`;
  for (let h = 9; h <= 19; h++) {
    const d = dayData.find(x => x.time.getHours() === h);
    if (!d) continue;
    const th = thermal?.hourly?.find((x: any) => x.hour === h);
    hourlyTxt += `🕐 ${String(h).padStart(2, '0')}:00 ${getWeatherIcon(d.weatherCode, d.isDay)} ${Math.round(d.temperature)}°C\n`;
    hourlyTxt += `   • Vento: ${getWindArrow(d.windDir)} ${Math.round(d.windSpeed)} km/h (${getWindDir(d.windDir)})\n`;
    hourlyTxt += `   • Nuvole: ${Math.round(d.cloudCover)}% (${getCloudText(d.cloudCover)})\n`;
    if (th) hourlyTxt += `   • Termiche: ${th.intensity > 2 ? '🔥' : th.intensity > 1 ? '💪' : '🫤'} ${th.intensity}m/s\n`;
    if (d.precipitation > 0.5) hourlyTxt += `   • 🌧️ Pioggia: ${Math.round(d.precipitation)}mm\n`;
  }

  let pressureTxt = `📊 PRESSIONE\n\n`;
  const pressures = dayData.filter(h => h.pressure).map(h => h.pressure);
  if (pressures.length > 0) {
    const avg = pressures.reduce((a, b) => a + b, 0) / pressures.length;
    const trend = pressures[pressures.length - 1] - pressures[0];
    pressureTxt += `• Media: ${Math.round(avg)} hPa\n`;
    pressureTxt += `• Trend: ${trend > 3 ? '⬆️ In aumento' : trend < -3 ? '⬇️ In diminuzione' : '➡️ Stabile'}\n`;
    if (trend < -3) pressureTxt += `⚠️ Possibile peggioramento!\n`;
  }

  let stormTxt = `⛈️ TEMPORALI\n\n`;
  if (hasStorm) stormTxt += `🔴 ALLERTA TEMPORALI! Volo sconsigliato!\n`;
  else if (hasRain && avgC > 70) stormTxt += `🟡 Possibili temporali - Monitorare.\n`;
  else stormTxt += `✅ Nessun temporale.\n`;

  return { general, advice, thermal: thermalTxt, altitude: altTxt, hourly: hourlyTxt, pressure: pressureTxt, thunderstorm: stormTxt };
}

// ============================================================
// STILI
// ============================================================
const S: { [key: string]: React.CSSProperties | ((...args: any[]) => React.CSSProperties) } = {};

S.app = {
  background: 'linear-gradient(135deg,#0a0e27 0%,#1a1a3e 30%,#16213e 60%,#0d1b2a 100%)',
  color: '#eee', minHeight: '100vh', fontFamily: "'Segoe UI',sans-serif", overflowX: 'hidden'
};
S.header = {
  textAlign: 'center', marginBottom: 20, padding: '15px 0',
  borderBottom: '1px solid rgba(255,255,255,0.08)'
};
S.logoFlex = {
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10
};
S.logoRabbit = {
  fontSize: 'clamp(2rem,6vw,2.8rem)', animation: 'hop 1.2s ease-in-out infinite'
};
S.logoPara = {
  fontSize: 'clamp(1.6rem,5vw,2.2rem)', animation: 'glide 2.5s ease-in-out infinite'
};
S.logoText = {
  fontSize: 'clamp(1.5rem,5vw,2.5rem)', fontWeight: 800 as const,
  background: 'linear-gradient(135deg,#ff6b6b,#ffd93d)', WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent'
};
S.sub = { fontSize: 'clamp(0.7rem,2vw,0.9rem)', color: '#888', marginTop: 6 };
S.grid = {
  display: 'grid', gridTemplateColumns: 'minmax(260px,300px) 1fr',
  gap: 'clamp(12px,3vw,20px)', maxWidth: 1400, margin: '0 auto', padding: '0 10px'
};
S.leftCol = {
  background: 'rgba(255,255,255,0.04)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.08)',
  padding: 12, overflow: 'hidden', backdropFilter: 'blur(10px)',
  height: 'calc(100vh - 180px)'
};
S.leftTitle = { fontSize: 'clamp(0.9rem,2vw,1.1rem)', color: '#ff6b6b', marginBottom: 12, fontWeight: 700 as const };
S.leftList = { overflowY: 'auto', height: 'calc(100% - 40px)', paddingRight: 4 };
S.siteBtn = (sel: boolean): React.CSSProperties => ({
  width: '100%', textAlign: 'left' as const, background: sel ? 'rgba(255,107,107,0.12)' : 'rgba(255,255,255,0.03)',
  border: `1px solid ${sel ? '#ff6b6b' : 'rgba(255,255,255,0.08)'}`,
  borderRadius: 10, padding: '8px 10px', marginBottom: 6, cursor: 'pointer', transition: 'all 0.2s', color: '#eee'
});
S.siteName = { fontSize: 'clamp(0.8rem,1.8vw,0.95rem)', fontWeight: 700 as const };
S.siteRow = { display: 'flex', justifyContent: 'space-between', fontSize: 'clamp(0.6rem,1.2vw,0.7rem)', color: '#888', marginTop: 2 };
S.badge = (color: string): React.CSSProperties => ({
  fontSize: 'clamp(0.5rem,1vw,0.65rem)', padding: '1px 6px', borderRadius: 10, background: color, color: '#fff', fontWeight: 600 as const
});
S.rightCol = {
  background: 'rgba(255,255,255,0.04)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.08)',
  padding: 'clamp(10px,2vw,18px)', maxHeight: 'calc(100vh - 180px)', overflowY: 'auto', backdropFilter: 'blur(10px)'
};
S.siteHeader = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  paddingBottom: 12, borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: 12, flexWrap: 'wrap', gap: 8
};
S.siteBigName = { fontSize: 'clamp(1.2rem,3.5vw,1.6rem)', fontWeight: 700 as const, color: '#fff' };
S.siteInfo = { fontSize: 'clamp(0.65rem,1.5vw,0.8rem)', color: '#888' };
S.weatherNow = {
  display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.08)',
  padding: '4px 12px', borderRadius: 30
};
S.tempBig = { fontSize: 'clamp(1.2rem,3vw,1.5rem)', fontWeight: 700 as const, color: '#ffd93d' };
S.tabs = {
  display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 4, marginBottom: 14
};
S.tab = (active: boolean): React.CSSProperties => ({
  padding: '6px 4px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)',
  background: active ? 'rgba(255,107,107,0.15)' : 'transparent',
  color: active ? '#ff6b6b' : '#aaa', cursor: 'pointer', fontWeight: 600 as const,
  fontSize: 'clamp(0.55rem,1.3vw,0.8rem)', textAlign: 'center' as const, transition: 'all 0.2s'
});
S.days = {
  display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6, marginBottom: 12
};
S.dayBtn = (sel: boolean): React.CSSProperties => ({
  background: sel ? 'rgba(255,107,107,0.15)' : 'rgba(255,255,255,0.04)',
  border: `1px solid ${sel ? '#ff6b6b' : 'rgba(255,255,255,0.08)'}`,
  borderRadius: 10, padding: '8px 6px', cursor: 'pointer', textAlign: 'center' as const, color: '#eee'
});
S.dayLabel = { fontSize: 'clamp(0.6rem,1.3vw,0.75rem)', fontWeight: 600 as const };
S.dayIcon = { fontSize: 'clamp(1rem,2.5vw,1.4rem)', margin: '2px 0' };
S.dayTemp = { fontSize: 'clamp(0.7rem,1.5vw,0.85rem)', color: '#ff6b6b', fontWeight: 600 as const };
S.dayDelta = { fontSize: 'clamp(0.5rem,1vw,0.65rem)', color: '#888' };
S.sliderRow = {
  display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12,
  padding: '6px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: 10
};
S.sliderLabel = { fontSize: 'clamp(0.65rem,1.5vw,0.8rem)', color: '#888' };
S.slider = { flex: 1, accentColor: '#ff6b6b', height: 4, minWidth: 60 } as React.CSSProperties;
S.sliderVal = { fontSize: 'clamp(0.7rem,1.8vw,0.85rem)', fontWeight: 700 as const, color: '#fff', minWidth: 40, textAlign: 'center' as const };
S.grid8 = {
  display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(110px,1fr))', gap: 6, marginBottom: 12
};
S.card = {
  background: 'rgba(0,0,0,0.3)', padding: '8px 10px', borderRadius: 10,
  border: '1px solid rgba(255,255,255,0.05)'
};
S.cardLabel = { fontSize: 'clamp(0.55rem,1.2vw,0.7rem)', color: '#888', fontWeight: 500 as const };
S.cardVal = { fontSize: 'clamp(0.8rem,2vw,1rem)', fontWeight: 700 as const, color: '#fff' };
S.cardSub = { fontSize: 'clamp(0.5rem,1vw,0.65rem)', color: '#666', marginTop: 1 };
S.pressureBox = {
  marginBottom: 12, padding: '10px 14px', background: 'rgba(0,<dyad-write path="src/pages/Index.tsx" description="App meteo parapendio completa - file unico corretto (continuazione)">
  marginBottom: 12, padding: '10px 14px', background: 'rgba(0,0,0,0.3)',
  borderRadius: 10, border: '1px solid rgba(255,255,255,0.05)'
};
S.pressureGrid = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 };
S.sectionTitle = { fontSize: 'clamp(0.8rem,2vw,0.95rem)', color: '#4fc3f7', marginBottom: 10, fontWeight: 600 as const };
S.windGrid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(90px,1fr))', gap: 6, marginBottom: 12 };
S.windCard = { textAlign: 'center' as const, padding: '8px 6px', background: 'rgba(255,255,255,0.04)', borderRadius: 8 };
S.windLabel = { fontSize: 'clamp(0.55rem,1.2vw,0.7rem)', color: '#888' };
S.windVal = { fontSize: 'clamp(0.75rem,1.8vw,0.9rem)', fontWeight: 700 as const, color: '#fff' };
S.windDir = { fontSize: 'clamp(0.6rem,1.3vw,0.7rem)', color: '#aaa' };
S.windGust = { fontSize: 'clamp(0.5rem,1vw,0.65rem)', color: '#ff6b6b' };
S.profileContainer = {
  marginBottom: 12, padding: '8px 10px', background: 'rgba(0,0,0,0.3)',
  borderRadius: 10, border: '1px solid rgba(255,255,255,0.05)', maxHeight: 320, overflowY: 'auto' as const
};
S.profileRow = {
  display: 'grid', gridTemplateColumns: '55px 1fr 40px', gap: 6, alignItems: 'center',
  padding: '2px 4px', fontSize: 'clamp(0.55rem,1.2vw,0.7rem)'
};
S.profileAlt = { color: '#888' };
S.barContainer = { height: 14, background: 'rgba(255,255,255,0.05)', borderRadius: 8, overflow: 'hidden' as const };
S.bar = (w: number, c: string): React.CSSProperties => ({
  height: '100%', width: `${w}%`, background: c, borderRadius: 8,
  display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 3, minWidth: 30,
  transition: 'width 0.3s'
});
S.barText = { fontSize: 'clamp(0.45rem,1vw,0.55rem)', color: '#fff', fontWeight: 700 as const, textShadow: '0 1px 2px rgba(0,0,0,0.5)' as const };
S.shearBox = (risk: string): React.CSSProperties => ({
  padding: 8, borderRadius: 8, border: `2px solid ${risk === 'alto' ? '#f44336' : risk === 'medio' ? '#ff9800' : '#4caf50'}`,
  background: 'rgba(0,0,0,0.2)', marginTop: 8, fontSize: 'clamp(0.6rem,1.3vw,0.75rem)'
});
S.hourlyWindGrid = {
  display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(38px,1fr))', gap: 2, overflowX: 'auto' as const
};
S.hourlyCard = { textAlign: 'center' as const, padding: '4px 2px', background: 'rgba(255,255,255,0.03)', borderRadius: 4, minWidth: 34 };
S.hourlyTime = { fontSize: 'clamp(0.45rem,1vw,0.55rem)', color: '#888' };
S.hourlySpeed = { fontSize: 'clamp(0.6rem,1.5vw,0.75rem)', fontWeight: 700 as const, color: '#fff' };
S.aiBlock = {
  marginBottom: 10, padding: '8px 12px', background: 'rgba(0,0,0,0.3)',
  borderRadius: 10, border: '1px solid rgba(255,255,255,0.05)'
};
S.aiText = { fontSize: 'clamp(0.65rem,1.5vw,0.8rem)', color: '#e0e0e0', lineHeight: 1.6, whiteSpace: 'pre-wrap' as const };
S.stormAlert = {
  padding: '8px 12px', borderRadius: 8, background: 'rgba(244,67,54,0.12)',
  border: '2px solid #f44336', marginBottom: 8
};
S.stormSafe = {
  padding: '8px 12px', borderRadius: 8, background: 'rgba(76,175,80,0.08)',
  border: '1px solid rgba(76,175,80,0.3)', marginBottom: 8
};
S.fullAnalysis = {
  marginBottom: 14, background: 'rgba(0,0,0,0.35)', borderRadius: 12,
  border: '1px solid rgba(255,107,107,0.12)', overflow: 'hidden' as const
};
S.analysisHeader = {
  display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px',
  background: 'rgba(255,107,107,0.06)', borderBottom: '1px solid rgba(255,107,107,0.08)'
};
S.analysisTitle = { fontSize: 'clamp(0.8rem,2vw,1rem)', color: '#ff6b6b', fontWeight: 600 as const, margin: 0 };
S.analysisLoading = { marginLeft: 'auto', fontSize: 'clamp(0.6rem,1.5vw,0.75rem)', color: '#ffd93d' };
S.analysisContent = { padding: '8px 14px', maxHeight: 480, overflowY: 'auto' as const };
S.footer = { textAlign: 'center' as const, marginTop: 20, padding: '14px 0', borderTop: '1px solid rgba(255,255,255,0.06)' };
S.footerText = { fontSize: 'clamp(0.55rem,1.2vw,0.7rem)', color: '#666' };
S.loadingFull = {
  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
  minHeight: '100vh', background: 'linear-gradient(135deg,#0a0e27,#1a1a3e)', color: '#eee'
};
S.spinner = {
  width: 50, height: 50, border: '4px solid rgba(255,255,255,0.1)',
  borderTopColor: '#ff6b6b', borderRadius: '50%', animation: 'spin 1s linear infinite'
};
S.loadingText = { marginTop: 16, fontSize: 'clamp(1rem,4vw,1.3rem)' };
S.errorFull = {
  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
  minHeight: '100vh', background: 'linear-gradient(135deg,#0a0e27,#1a1a3e)', color: '#eee'
};
S.errorText = { color: '#ff6b6b', fontSize: 'clamp(1rem,4vw,1.2rem)', marginBottom: 16 };
S.retryBtn = { background: '#ff6b6b', color: '#fff', border: 'none', padding: '10px 28px', borderRadius: 8, cursor: 'pointer', fontWeight: 600 as const, fontSize: 'clamp(0.85rem,2.5vw,1rem)' };

// ============================================================
// APP PRINCIPALE
// ============================================================
export default function Index() {
  const [selected, setSelected] = useState(DECOLLI[0].id);
  const [meteo, setMeteo] = useState<{ hourly: HourData[]; daily: DailyData[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dayIdx, setDayIdx] = useState(0);
  const [hour, setHour] = useState(12);
  const [tab, setTab] = useState<'meteo' | 'venti' | 'termiche' | 'analisi'>('meteo');
  const [aiData, setAiData] = useState<Record<string, string> | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const site = DECOLLI.find(x => x.id === selected)!;

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const d = await fetchMeteo(site.lat, site.lon);
        setMeteo(d);
      } catch (e: any) {
        setError(e.message || 'Errore caricamento dati');
      } finally {
        setLoading(false);
      }
    })();
  }, [selected]);

  const dayData = useMemo(() => {
    if (!meteo) return [];
    const start = new Date();
    start.setDate(start.getDate() + dayIdx);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return meteo.hourly.filter(h => h.time >= start && h.time < end);
  }, [meteo, dayIdx]);

  const current = useMemo(() => dayData.length > 0 ? dayData[Math.min(hour, dayData.length - 1)] : null, [dayData, hour]);

  const thermal = useMemo(() => dayData.length > 0 ? calcThermalProfile(dayData, site.altitude || 1500) : null, [dayData, site.altitude]);

  const windProfile = useMemo(() => {
    if (!current) return null;
    return getWindProfile(current.windSpeed, current.windDir);
  }, [current]);

  useEffect(() => {
    if (!meteo || !dayData.length) return;
    setAiLoading(true);
    const t = setTimeout(() => {
      setAiData(generateAI(dayData, site, thermal, windProfile));
      setAiLoading(false);
    }, 200);
    return () => clearTimeout(t);
  }, [dayData, thermal, windProfile, site]);

  const enrichedDaily = useMemo(() => {
    if (!meteo?.daily) return [];
    return meteo.daily.map((d, i) => {
      const hh = meteo.hourly.filter(h => h.time.getDate() === d.date.getDate() && h.time.getMonth() === d.date.getMonth());
      const temps = hh.map(h => h.temperature).filter(t => t != null);
      const delta = temps.length > 0 ? Math.round(Math.max(...temps) - Math.min(...temps)) : 0;
      return { ...d, delta, idx: i };
    });
  }, [meteo]);

  const dateLabels = enrichedDaily.map(d => d.date.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' }));

  const pressureGrad = useMemo(() => {
    if (dayData.length < 2) return { grad: 0, desc: 'Dati insufficienti' };
    const g = dayData[dayData.length - 1].pressure - dayData[0].pressure;
    return {
      grad: Math.round(g * 10) / 10,
      desc: g > 3 ? '⬆️ In aumento' : g < -3 ? '⬇️ In diminuzione' : '➡️ Stabile'
    };
  }, [dayData]);

  const hours9to19 = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];

  if (loading) return (
    <div style={S.loadingFull as React.CSSProperties}>
      <div style={S.spinner as React.CSSProperties} />
      <p style={S.loadingText as React.CSSProperties}>🪂 Caricamento previsioni...</p>
    </div>
  );

  if (error) return (
    <div style={S.errorFull as React.CSSProperties}>
      <p style={S.errorText as React.CSSProperties}>❌ {error}</p>
      <button style={S.retryBtn as React.CSSProperties} onClick={() => window.location.reload()}>🔄 Riprova</button>
    </div>
  );

  const diffColor = (d: number) => {
    if (d <= 2) return '#4caf50';
    if (d <= 3) return '#ff9800';
    return '#f44336';
  };
  const diffLabel = (d: number) => {
    if (d <= 2) return '🟢 Facile';
    if (d <= 3) return '🟡 Medio';
    return '🔴 Difficile';
  };

  return (
    <div style={S.app as React.CSSProperties}>
      {/* HEADER */}
      <header style={S.header as React.CSSProperties}>
        <div style={S.logoFlex as React.CSSProperties}>
          <span style={S.logoRabbit as React.CSSProperties}>🐰</span>
          <span style={S.logoPara as React.CSSProperties}>🪂</span>
          <span style={S.logoText as React.CSSProperties}>Meteo dei Conigli</span>
        </div>
        <p style={S.sub as React.CSSProperties}>Previsioni per volo libero • Open-Meteo • SHV FSVL Style</p>
      </header>

      {/* GRIGLIA PRINCIPALE */}
      <div style={S.grid as React.CSSProperties}>
        {/* COLONNA SINISTRA - LISTA DECOLLI */}
        <div style={S.leftCol as React.CSSProperties}>
          <h3 style={S.leftTitle as React.CSSProperties}>📍 Decolli</h3>
          <div style={S.leftList as React.CSSProperties}>
            {DECOLLI.map(d => {
              const sel = d.id === selected;
              const cw = sel && current ? getWeatherIcon(current.weatherCode, current.isDay) : '☁️';
              return (
                <button key={d.id} onClick={() => { setSelected(d.id); setHour(12); setDayIdx(0); }} style={(S.siteBtn as Function)(sel)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={S.siteName as React.CSSProperties}>{d.name}</span>
                    <span style={{ fontSize: 'clamp(0.8rem,1.8vw,1.1rem)' }}>{sel ? cw : '☁️'}</span>
                  </div>
                  <div style={S.siteRow as React.CSSProperties}>
                    <span>{d.valley}</span>
                    <span>{d.exposure}</span>
                  </div>
                  <div style={{ ...(S.siteRow as React.CSSProperties), marginTop: 3 }}>
                    <span style={(S.badge as Function)(diffColor(d.difficulty))}>{diffLabel(d.difficulty)}</span>
                    <span style={(S.badge as Function)('#2196f3')}>{d.altitude}m</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* COLONNA DESTRA - DETTAGLI */}
        <div style={S.rightCol as React.CSSProperties}>
          {current && site && (
            <>
              {/* HEADER SITO */}
              <div style={S.siteHeader as React.CSSProperties}>
                <div>
                  <h2 style={S.siteBigName as React.CSSProperties}>{site.name}</h2>
                  <span style={S.siteInfo as React.CSSProperties}>{site.exposure} • {site.valley} • {site.altitude}m</span>
                </div>
                <div style={S.weatherNow as React.CSSProperties}>
                  <span style={{ fontSize: 'clamp(1.4rem,3.5vw,2rem)' }}>{getWeatherIcon(current.weatherCode, current.isDay)}</span>
                  <span style={S.tempBig as React.CSSProperties}>{Math.round(current.temperature)}°C</span>
                </div>
              </div>

              {/* TABS */}
              <div style={S.tabs as React.CSSProperties}>
                {(['meteo', 'venti', 'termiche', 'analisi'] as const).map(t => (
                  <button key={t} onClick={() => setTab(t)} style={(S.tab as Function)(tab === t)}>
                    {t === 'meteo' ? '🌤️ Meteo' : t === 'venti' ? '💨 Venti' : t === 'termiche' ? '🔥 Termiche' : '🤖 Analisi'}
                  </button>
                ))}
              </div>

              {/* TAB METEO */}
              {tab === 'meteo' && (
                <>
                  {/* SELEZIONE GIORNO */}
                  <div style={S.days as React.CSSProperties}>
                    {enrichedDaily.map((d, i) => (
                      <button key={i} onClick={() => { setDayIdx(i); setHour(12); }} style={(S.dayBtn as Function)(dayIdx === i)}>
                        <div style={S.dayLabel as React.CSSProperties}>{dateLabels[i]}</div>
                        <div style={S.dayIcon as React.CSSProperties}>{getWeatherIcon(d.weatherCode, 1)}</div>
                        <div style={S.dayTemp as React.CSSProperties}>{Math.round(d.tempMax)}°/{Math.round(d.tempMin)}°</div>
                        <div style={S.dayDelta as React.CSSProperties}>Δ{d.delta}°C</div>
                      </button>
                    ))}
                  </div>

                  {/* SLIDER ORA */}
                  <div style={S.sliderRow as React.CSSProperties}>
                    <span style={S.sliderLabel as React.CSSProperties}>⏰ Ora</span>
                    <input type="range" min={0} max={23} value={hour} onChange={e => setHour(parseInt(e.target.value))} style={S.slider as React.CSSProperties} />
                    <span style={S.sliderVal as React.CSSProperties}>{String(hour).padStart(2, '0')}:00</span>
                  </div>

                  {/* GRIGLIA 8 PARAMETRI */}
                  <div style={S.grid8 as React.CSSProperties}>
                    <div style={S.card as React.CSSProperties}>
                      <div style={S.cardLabel as React.CSSProperties}>🌡️ Temperatura</div>
                      <div style={S.cardVal as React.CSSProperties}>{Math.round(current.temperature)}°C</div>
                      <div style={S.cardSub as React.CSSProperties}>Δ {thermal?.delta || 0}°C</div>
                    </div>
                    <div style={S.card as React.CSSProperties}>
                      <div style={S.cardLabel as React.CSSProperties}>💧 Umidità</div>
                      <div style={S.cardVal as React.CSSProperties}>{Math.round(current.humidity)}%</div>
                      <div style={S.cardSub as React.CSSProperties}>Rugiada {Math.round(current.dewPoint)}°C</div>
                    </div>
                    <div style={S.card as React.CSSProperties}>
                      <div style={S.cardLabel as React.CSSProperties}>☁️ Nuvolosità</div>
                      <div style={S.cardVal as React.CSSProperties}>{Math.round(current.cloudCover)}%</div>
                      <div style={S.cardSub as React.CSSProperties}>{getCloudText(current.cloudCover)}</div>
                    </div>
                    <div style={S.card as React.CSSProperties}>
                      <div style={S.cardLabel as React.CSSProperties}>🌧️ Precipitazioni</div>
                      <div style={S.cardVal as React.CSSProperties}>{current.precipitation === 0 ? '✅ Assenti' : `${current.precipitation} mm`}</div>
                      <div style={S.cardSub as React.CSSProperties}>{current.precipitation === 0 ? 'Ideale' : '⚠️ Pioggia'}</div>
                    </div>
                    <div style={S.card as React.CSSProperties}>
                      <div style={S.cardLabel as React.CSSProperties}>🏔️ Base Nuvole</div>
                      <div style={S.cardVal as React.CSSProperties}>{thermal ? `${thermal.cloudBase}m` : '--'}</div>
                      <div style={S.cardSub as React.CSSProperties}>Cloud Base</div>
                    </div>
                    <div style={S.card as React.CSSProperties}>
                      <div style={S.cardLabel as React.CSSProperties}>📈 Plafond</div>
                      <div style={S.cardVal as React.CSSProperties}>{thermal ? `${thermal.thermalTop}m` : '--'}</div>
                      <div style={S.cardSub as React.CSSProperties}>Thermal Top</div>
                    </div>
                    <div style={S.card as React.CSSProperties}>
                      <div style={S.cardLabel as React.CSSProperties}>🪂 Galleggiamento</div>
                      <div style={S.cardVal as React.CSSProperties}>{thermal ? `${thermal.soarIdx}/10` : '--'}</div>
                      <div style={S.cardSub as React.CSSProperties}>Soaring Index</div>
                    </div>
                    <div style={S.card as React.CSSProperties}>
                      <div style={S.cardLabel as React.CSSProperties}>💨 Vento</div>
                      <div style={S.cardVal as React.CSSProperties}>{getWindArrow(current.windDir)} {Math.round(current.windSpeed)} km/h</div>
                      <div style={S.cardSub as React.CSSProperties}>{getWindDir(current.windDir)} • ⚡{Math.round(current.windGust)} km/h</div>
                    </div>
                  </div>

                  {/* PRESSIONE */}
                  <div style={S.pressureBox as React.CSSProperties}>
                    <h4 style={S.sectionTitle as React.CSSProperties}>📊 Pressione</h4>
                    <div style={S.pressureGrid as React.CSSProperties}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 'clamp(0.6rem,1.3vw,0.75rem)', color: '#888' }}>Attuale</div>
                        <div style={{ fontSize: 'clamp(1rem,2.5vw,1.2rem)', fontWeight: 700, color: '#fff' }}>{Math.round(current.pressure)} hPa</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 'clamp(0.6rem,1.3vw,0.75rem)', color: '#888' }}>Gradiente</div>
                        <div style={{
                          fontSize: 'clamp(1rem,2.5vw,1.2rem)', fontWeight: 700,
                          color: pressureGrad.grad > 0 ? '#4caf50' : pressureGrad.grad < 0 ? '#f44336' : '#ffd93d'
                        }}>
                          {pressureGrad.grad > 0 ? '⬆️' : pressureGrad.grad < 0 ? '⬇️' : '➡️'} {Math.abs(pressureGrad.grad)} hPa
                        </div>
                        <div style={{ fontSize: 'clamp(0.5rem,1vw,0.65rem)', color: '#888' }}>{pressureGrad.desc}</div>
                      </div>
                    </div>
                  </div>

                  {/* ALLERTA TEMPORALI */}
                  {aiData?.thunderstorm && (
                    <div style={aiData.thunderstorm.includes('ALLERTA') ? (S.stormAlert as React.CSSProperties) : (S.stormSafe as React.CSSProperties)}>
                      <div style={S.aiText as React.CSSProperties}>{aiData.thunderstorm}</div>
                    </div>
                  )}
                </>
              )}

              {/* TAB VENTI */}
              {tab === 'venti' && (
                <>
                  <h4 style={S.sectionTitle as React.CSSProperties}>💨 Vento a differenti quote</h4>
                  <div style={S.windGrid as React.CSSProperties}>
                    <div style={S.windCard as React.CSSProperties}>
                      <div style={S.windLabel as React.CSSProperties}>10m</div>
                      <div style={S.windVal as React.CSSProperties}>{getWindArrow(current.windDir)} {Math.round(current.windSpeed)} km/h</div>
                      <div style={S.windDir as React.CSSProperties}>{getWindDir(current.windDir)}</div>
                      <div style={S.windGust as React.CSSProperties}>⚡{Math.round(current.windGust)} km/h</div>
                    </div>
                    <div style={S.windCard as React.CSSProperties}>
                      <div style={S.windLabel as React.CSSProperties}>80m</div>
                      <div style={S.windVal as React.CSSProperties}>
                        {current.wind80m ? `${getWindArrow(current.windDir80m!)} ${Math.round(current.wind80m)}` : 'N/D'}
                      </div>
                      <div style={S.windDir as React.CSSProperties}>{current.wind80m ? getWindDir(current.windDir80m!) : '--'}</div>
                      <div style={S.windGust as React.CSSProperties}>{current.wind80m ? `⚡${Math.round(current.wind80m * 1.3)} km/h` : ''}</div>
                    </div>
                    <div style={S.windCard as React.CSSProperties}>
                      <div style={S.windLabel as React.CSSProperties}>120m</div>
                      <div style={S.windVal as React.CSSProperties}>
                        {current.wind120m ? `${getWindArrow(current.windDir120m!)} ${Math.round(current.wind120m)}` : 'N/D'}
                      </div>
                      <div style={S.windDir as React.CSSProperties}>{current.wind120m ? getWindDir(current.windDir120m!) : '--'}</div>
                      <div style={S.windGust as React.CSSProperties}>{current.wind120m ? `⚡${Math.round(current.wind120m * 1.35)} km/h` : ''}</div>
                    </div>
                  </div>

                  <h4 style={S.sectionTitle as React.CSSProperties}>📊 Profilo Vento (400m - 4000m)</h4>
                  <div style={S.profileContainer as React.CSSProperties}>
                    {windProfile?.map((p, i) => {
                      const maxSpd = current.windSpeed * 3.5;
                      const bw = Math.min(100, (p.speed / maxSpd) * 100);
                      return (
                        <div key={i} style={S.profileRow as React.CSSProperties}>
                          <span style={S.profileAlt as React.CSSProperties}>{p.alt === 10 ? 'Sup' : `${p.alt}m`}</span>
                          <div style={S.barContainer as React.CSSProperties}>
                            <div style={(S.bar as Function)(bw, getWindColor(p.speed, maxSpd))}>
                              <span style={S.barText as React.CSSProperties}>{p.speed}</span>
                            </div>
                          </div>
                          <span style={{ color: '#aaa', textAlign: 'center' }}>{getWindArrow(p.dir)}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* SHEAR */}
                  {windProfile && (() => {
                    const shear = calcShear(windProfile);
                    return (
                      <div style={(S.shearBox as Function)(shear.risk)}>
                        <strong>🌪️ Wind Shear: {shear.shear}</strong><br />
                        {shear.desc}
                      </div>
                    );
                  })()}

                  <h4 style={{ ...(S.sectionTitle as React.CSSProperties), marginTop: 12 }}>📊 Vento Orario (9:00-19:00)</h4>
                  <div style={S.hourlyWindGrid as React.CSSProperties}>
                    {hours9to19.map(h => {
                      const hd = dayData.find(x => x.time.getHours() === h);
                      if (!hd) return null;
                      return (
                        <div key={h} style={S.hourlyCard as React.CSSProperties}>
                          <div style={S.hourlyTime as React.CSSProperties}>{String(h).padStart(2, '0')}:00</div>
                          <div style={S.hourlySpeed as React.CSSProperties}>{Math.round(hd.windSpeed)}</div>
                          <div style={{ fontSize: 'clamp(0.45rem,1vw,0.55rem)', color: '#666' }}>{getWindDir(hd.windDir)}</div>
                          <div style={{ fontSize: 'clamp(0.5rem,1.2vw,0.65rem)' }}>{getWindArrow(hd.windDir)}</div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              {/* TAB TERMICHE */}
              {tab === 'termiche' && (
                <>
                  {aiData && ['thermal', 'altitude', 'hourly'].map(key => (
                    <div key={key} style={S.aiBlock as React.CSSProperties}>
                      <div style={S.aiText as React.CSSProperties}>{aiData[key]}</div>
                    </div>
                  ))}
                </>
              )}

              {/* TAB ANALISI */}
              {tab === 'analisi' && (
                <div style={S.fullAnalysis as React.CSSProperties}>
                  <div style={S.analysisHeader as React.CSSProperties}>
                    <span style={{ fontSize: 'clamp(1rem,2.5vw,1.3rem)' }}>🤖</span>
                    <h4 style={S.analysisTitle as React.CSSProperties}>Analisi Completa</h4>
                    {aiLoading && <span style={S.analysisLoading as React.CSSProperties}>⏳ Analisi...</span>}
                  </div>
                  <div style={S.analysisContent as React.CSSProperties}>
                    {aiData && !aiLoading && ['general', 'advice', 'pressure', 'thunderstorm'].map(key => (
                      <div key={key} style={S.aiBlock as React.CSSProperties}>
                        <div style={S.aiText as React.CSSProperties}>{aiData[key]}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* FOOTER */}
      <footer style={S.footer as React.CSSProperties}>
        <p style={S.footerText as React.CSSProperties}>Dati da Open-Meteo.com • Ispirato SHV FSVL • Beta v2.0</p>
        <p style={{ ...(S.footerText as React.CSSProperties), marginTop: 4, color: '#444' }}>🐰 Vola sicuro! 🪂</p>
      </footer>

      {/* STILI DINAMICI */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes hop { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
        @keyframes glide { 0%,100% { transform: rotate(-3deg) translateY(0); } 50% { transform: rotate(3deg) translateY(-6px); } }
        @media (max-width: 768px) {
          .meteo-grid { grid-template-columns: 1fr !important; }
        }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: rgba(255,255,255,0.03); border-radius: 10px; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
        * { scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.12) rgba(255,255,255,0.03); }
      `}</style>
    </div>
  );
}