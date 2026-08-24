"use client";

import React, { useEffect, useState, useMemo } from "react";
import { 
  Sun, Cloud, CloudRain, CloudLightning, CloudSnow, 
  Wind, Droplets, Thermometer, ArrowUp, 
  CheckCircle, AlertTriangle, XCircle, Info,
  MapPin, Calendar, Clock, FileText, Copy, Check
} from "lucide-react";

// ============================================
// TIPI E COSTANTI
// ============================================

interface HourlyForecast {
  hour: number;
  date: Date;
  // Superficie
  temp: number;
  dewPoint: number;
  humidity: number;
  windSpeed: number;
  windDir: number;
  windGust: number;
  pressure: number;
  cloudCover: number;
  cloudCoverLow: number;
  cloudCoverMid: number;
  cloudCoverHigh: number;
  precipitation: number;
  weatherCode: number;
  cape: number;
  cin: number;
  liftedIndex: number;
  freezingLevel: number;
  // Quota (calcolati)
  wind1500: { speed: number; dir: number };
  wind2000: { speed: number; dir: number };
  wind2500: { speed: number; dir: number };
  wind3000: { speed: number; dir: number };
  // Termiche
  thermalBase: number;
  thermalTop: number;
  climbRate: number;
  thermalQuality: "excellent" | "good" | "moderate" | "weak" | "none";
  // Volo
  flightRating: 0 | 1 | 2 | 3 | 4 | 5;
  flightLabel: string;
}

interface SiteConfig {
  name: string;
  lat: number;
  lon: number;
  altitude: number;
  exposure: string;
}

const DEFAULT_SITE: SiteConfig = {
  name: "Pian Munè – Bric Lombatera",
  lat: 44.657,
  lon: 7.260,
  altitude: 1350,
  exposure: "S"
};

// Codici WMO -> Icona + Descrizione
function getWeatherInfo(code: number, precip: number, cloud: number) {
  if (code >= 95) return { icon: "⛈️", label: "Temporale", color: "text-purple-400", danger: true };
  if (code >= 80) return { icon: "🌧️", label: "Rovesci", color: "text-blue-400", rain: true };
  if (code >= 61) return { icon: "🌧️", label: "Pioggia", color: "text-blue-400", rain: true };
  if (code >= 51) return { icon: "🌦️", label: "Pioviggine", color: "text-blue-300", rain: true };
  if (code >= 71) return { icon: "❄️", label: "Neve", color: "text-cyan-300", danger: true };
  if (code >= 45) return { icon: "🌫️", label: "Nebbia", color: "text-slate-400", danger: true };
  if (cloud > 85) return { icon: "☁️", label: "Coperto", color: "text-slate-400" };
  if (cloud > 60) return { icon: "⛅", label: "Molto nuvoloso", color: "text-slate-300" };
  if (cloud > 30) return { icon: "🌤️", label: "Poco nuvoloso", color: "text-yellow-300" };
  return { icon: "☀️", label: "Sereno", color: "text-amber-300" };
}

function getWindArrow(dir: number): string {
  const arrows = ["↑", "↗", "→", "↘", "↓", "↙", "←", "↖"];
  return arrows[Math.round(((dir % 360) + 360) % 360 / 45) % 8];
}

function getDirName(dir: number): string {
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return dirs[Math.round(((dir % 360) + 360) % 360 / 22.5) % 16];
}

// ============================================
// CALCOLI AEROLOGICI REALI
// ============================================

function calculateThermals(
  temp: number, 
  dewPoint: number, 
  windSpeed: number, 
  cloudCover: number, 
  cape: number, 
  precipitation: number,
  weatherCode: number,
  siteAlt: number
) {
  // Se piove o temporale -> niente termiche
  if (precipitation > 0.5 || weatherCode >= 95) {
    return {
      base: siteAlt + 100,
      top: siteAlt + 200,
      climbRate: 0,
      quality: "none" as const
    };
  }

  const spread = Math.max(0.5, temp - dewPoint);
  
  // Base cumuli (LCL)
  const lclHeight = Math.round(spread * 125);
  const thermalBase = Math.max(siteAlt + 150, Math.min(siteAlt + 3000, siteAlt + lclHeight));

  // Top termico basato su CAPE e gradiente
  let thermalTop = thermalBase + 300;
  if (cape > 1000) thermalTop = thermalBase + Math.min(2500, cape * 1.5);
  else if (cape > 500) thermalTop = thermalBase + Math.min(2000, cape * 1.2);
  else if (cape > 200) thermalTop = thermalBase + Math.min(1500, cape * 1.0);
  else thermalTop = thermalBase + Math.min(1000, spread * 80);
  
  thermalTop = Math.min(4500, thermalTop);

  // Rateo di salita (m/s)
  let climbRate = 0;
  if (cape > 50 && (thermalTop - thermalBase) > 200) {
    const depth = thermalTop - thermalBase;
    climbRate = Math.min(5, Math.sqrt((2 * Math.min(1500, cape)) / depth) * 3);
  } else {
    climbRate = Math.min(3, spread * 0.25);
  }

  // Penalizzazioni
  if (windSpeed > 20) climbRate *= 0.6;
  else if (windSpeed > 15) climbRate *= 0.8;
  if (cloudCover > 70) climbRate *= 0.3;
  else if (cloudCover > 50) climbRate *= 0.6;
  if (precipitation > 0.1) climbRate *= 0.4;

  climbRate = Math.max(0, Math.round(climbRate * 10) / 10);

  let quality: "excellent" | "good" | "moderate" | "weak" | "none" = "none";
  if (climbRate >= 3) quality = "excellent";
  else if (climbRate >= 2) quality = "good";
  else if (climbRate >= 1) quality = "moderate";
  else if (climbRate >= 0.3) quality = "weak";

  return { base: thermalBase, top: thermalTop, climbRate, quality };
}

function calculateFlightRating(
  windSpeed: number,
  windGust: number,
  precipitation: number,
  weatherCode: number,
  cloudCover: number,
  climbRate: number,
  cape: number
): { rating: 0|1|2|3|4|5; label: string } {
  // Pericolo assoluto
  if (weatherCode >= 95) return { rating: 0, label: "⛈️ TEMPORALE" };
  if (precipitation > 2) return { rating: 0, label: "🌧️ PIOGGIA FORTE" };
  if (windSpeed > 30 || windGust > 40) return { rating: 0, label: "💨 VENTO PERICOLOSO" };
  
  // Sconsigliato
  if (precipitation > 0.5) return { rating: 1, label: "🌦️ PIOGGIA" };
  if (windSpeed > 25 || windGust > 35) return { rating: 1, label: "💨 VENTO FORTE" };
  if (cloudCover > 90) return { rating: 1, label: "☁️ COPERTO" };
  
  // Marginale
  if (windSpeed > 20 || windGust > 30) return { rating: 2, label: "⚠️ MARGINALE" };
  if (cloudCover > 75) return { rating: 2, label: "☁️ MOLTO NUVOLOSO" };
  if (climbRate < 0.5) return { rating: 2, label: "🌡️ TERMICHE DEBOLI" };
  
  // Buono
  if (climbRate >= 2 && windSpeed <= 15 && precipitation === 0) return { rating: 4, label: "🪂 OTTIMO" };
  if (climbRate >= 1.5 && windSpeed <= 18) return { rating: 4, label: "🪂 BUONO" };
  if (climbRate >= 1 && windSpeed <= 20) return { rating: 3, label: "✅ DISCRETO" };
  
  return { rating: 2, label: "⚠️ LIMITATO" };
}

function interpolateWindAtAltitude(
  surfaceWind: number, surfaceDir: number,
  level850: { speed: number; dir: number } | null,
  level700: { speed: number; dir: number } | null,
  level600: { speed: number; dir: number } | null,
  level500: { speed: number; dir: number } | null,
  targetAlt: number
): { speed: number; dir: number } {
  const levels = [
    { alt: 0, speed: surfaceWind, dir: surfaceDir },
    ...(level850 ? [{ alt: 1450, ...level850 }] : []),
    ...(level700 ? [{ alt: 3100, ...level700 }] : []),
    ...(level600 ? [{ alt: 4400, ...level600 }] : []),
    ...(level500 ? [{ alt: 5800, ...level500 }] : []),
  ].filter(l => l.speed != null && l.dir != null);

  if (levels.length < 2) return { speed: surfaceWind, dir: surfaceDir };

  // Trova i due livelli che racchiudono l'altitudine target
  for (let i = 0; i < levels.length - 1; i++) {
    if (levels[i].alt <= targetAlt && levels[i + 1].alt >= targetAlt) {
      const ratio = (targetAlt - levels[i].alt) / (levels[i + 1].alt - levels[i].alt);
      const speed = levels[i].speed + ratio * (levels[i + 1].speed - levels[i].speed);
      
      let dirDiff = levels[i + 1].dir - levels[i].dir;
      if (dirDiff > 180) dirDiff -= 360;
      if (dirDiff < -180) dirDiff += 360;
      const dir = (levels[i].dir + dirDiff * ratio + 360) % 360;
      
      return { speed: Math.round(speed), dir: Math.round(dir) };
    }
  }

  // Sopra l'ultimo livello -> estrapola
  const last = levels[levels.length - 1];
  const prev = levels[levels.length - 2];
  const gradSpeed = (last.speed - prev.speed) / (last.alt - prev.alt);
  let dirDiff = last.dir - prev.dir;
  if (dirDiff > 180) dirDiff -= 360;
  if (dirDiff < -180) dirDiff += 360;
  const gradDir = dirDiff / (last.alt - prev.alt);
  
  return {
    speed: Math.round(last.speed + gradSpeed * (targetAlt - last.alt)),
    dir: Math.round((last.dir + gradDir * (targetAlt - last.alt) + 360) % 360)
  };
}

// ============================================
// COMPONENTE PRINCIPALE
// ============================================

interface AlpiumBriefingProps {
  site?: SiteConfig;
  selectedDay?: number; // 0=oggi, 1=domani, 2=dopodomani
}

export default function AlpiumBriefing({ 
  site = DEFAULT_SITE, 
  selectedDay = 0 
}: AlpiumBriefingProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const dateObj = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + selectedDay);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [selectedDay]);

  const dateStr = useMemo(() => dateObj.toISOString().split("T")[0], [dateObj]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);

    const params = [
      "temperature_2m", "relative_humidity_2m", "dew_point_2m",
      "precipitation", "rain", "showers", "weather_code",
      "cloud_cover", "cloud_cover_low", "cloud_cover_mid", "cloud_cover_high",
      "wind_speed_10m", "wind_direction_10m", "wind_gusts_10m",
      "wind_speed_850hPa", "wind_direction_850hPa",
      "wind_speed_700hPa", "wind_direction_700hPa",
      "wind_speed_600hPa", "wind_direction_600hPa",
      "wind_speed_500hPa", "wind_direction_500hPa",
      "pressure_msl", "surface_pressure",
      "shortwave_radiation", "direct_radiation",
      "freezing_level_height", "cape", "convective_inhibition", "lifted_index",
      "visibility", "uv_index"
    ].join(",");

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${site.lat}&longitude=${site.lon}&hourly=${params}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,uv_index_max&timezone=Europe/Rome&start_date=${dateStr}&end_date=${dateStr}`;

    fetch(url)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(json => { if (mounted) { setData(json); setLoading(false); } })
      .catch(err => { if (mounted) { setError(err.message); setLoading(false); } });

    return () => { mounted = false; };
  }, [site.lat, site.lon, dateStr]);

  // ============================================
  // ELABORAZIONE DATI ORARI
  // ============================================
  const forecasts = useMemo((): HourlyForecast[] => {
    if (!data?.hourly?.time) return [];
    
    const h = data.hourly;
    const times: string[] = h.time;
    const results: HourlyForecast[] = [];

    for (let hour = 8; hour <= 19; hour++) {
      const idx = times.findIndex(t => parseInt(t.split("T")[1].split(":")[0]) === hour);
      if (idx === -1) continue;

      const temp = h.temperature_2m[idx] ?? 15;
      const dewPoint = h.dew_point_2m[idx] ?? (temp - 8);
      const humidity = h.relative_humidity_2m[idx] ?? 60;
      const windSpeed = h.wind_speed_10m[idx] ?? 5;
      const windDir = h.wind_direction_10m[idx] ?? 180;
      const windGust = h.wind_gusts_10m[idx] ?? (windSpeed * 1.4);
      const pressure = h.pressure_msl[idx] ?? 1013;
      const cloudCover = h.cloud_cover[idx] ?? 50;
      const cloudLow = h.cloud_cover_low[idx] ?? 0;
      const cloudMid = h.cloud_cover_mid[idx] ?? 0;
      const cloudHigh = h.cloud_cover_high[idx] ?? 0;
      const precipitation = h.precipitation[idx] ?? 0;
      const weatherCode = h.weather_code[idx] ?? 0;
      const cape = h.cape[idx] ?? 0;
      const cin = h.convective_inhibition[idx] ?? 0;
      const liftedIndex = h.lifted_index[idx] ?? 0;
      const freezingLevel = h.freezing_level_height[idx] ?? (site.altitude + 2000);

      // Venti in quota da dati reali
      const level850 = h.wind_speed_850hPa?.[idx] != null ? { speed: h.wind_speed_850hPa[idx], dir: h.wind_direction_850hPa[idx] } : null;
      const level700 = h.wind_speed_700hPa?.[idx] != null ? { speed: h.wind_speed_700hPa[idx], dir: h.wind_direction_700hPa[idx] } : null;
      const level600 = h.wind_speed_600hPa?.[idx] != null ? { speed: h.wind_speed_600hPa[idx], dir: h.wind_direction_600hPa[idx] } : null;
      const level500 = h.wind_speed_500hPa?.[idx] != null ? { speed: h.wind_speed_500hPa[idx], dir: h.wind_direction_500hPa[idx] } : null;

      const wind1500 = interpolateWindAtAltitude(windSpeed, windDir, level850, level700, level600, level500, 1500);
      const wind2000 = interpolateWindAtAltitude(windSpeed, windDir, level850, level700, level600, level500, 2000);
      const wind2500 = interpolateWindAtAltitude(windSpeed, windDir, level850, level700, level600, level500, 2500);
      const wind3000 = interpolateWindAtAltitude(windSpeed, windDir, level850, level700, level600, level500, 3000);

      // Termiche
      const thermals = calculateThermals(temp, dewPoint, windSpeed, cloudCover, cape, precipitation, weatherCode, site.altitude);
      
      // Rating volo
      const flight = calculateFlightRating(windSpeed, windGust, precipitation, weatherCode, cloudCover, thermals.climbRate, cape);

      const weather = getWeatherInfo(weatherCode, precipitation, cloudCover);

      results.push({
        hour,
        date: new Date(times[idx]),
        temp, dewPoint, humidity, windSpeed, windDir, windGust, pressure,
        cloudCover, cloudCoverLow: cloudLow, cloudCoverMid: cloudMid, cloudCoverHigh: cloudHigh,
        precipitation, weatherCode, cape, cin, liftedIndex, freezingLevel,
        wind1500, wind2000, wind2500, wind3000,
        thermalBase: thermals.base,
        thermalTop: thermals.top,
        climbRate: thermals.climbRate,
        thermalQuality: thermals.quality,
        flightRating: flight.rating,
        flightLabel: flight.label
      });
    }
    return results;
  }, [data, site.altitude]);

  // ============================================
  // RENDER
  // ============================================
  if (loading) {
    return (
      <div className="bg-slate-900/50 border border-slate-700/50 rounded-2xl p-8 flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-3 border-emerald-500/30 border-t-emerald-400 rounded-full animate-spin" />
        <p className="text-slate-400">Caricamento briefing Alpium per {site.name}...</p>
      </div>
    );
  }

  if (error || forecasts.length === 0) {
    return (
      <div className="bg-red-900/30 border border-red-500/40 rounded-2xl p-6 text-center text-red-300">
        <XCircle className="w-10 h-10 mx-auto mb-2" />
        <p className="font-bold">Impossibile caricare i dati</p>
        <p className="text-sm text-slate-400 mt-1">{error || "Nessun dato orario disponibile"}</p>
      </div>
    );
  }

  const dayLabel = dateObj.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" });
  const hasRain = forecasts.some(f => f.precipitation > 0.1);
  const hasStorm = forecasts.some(f => f.weatherCode >= 95);
  const maxClimb = Math.max(...forecasts.map(f => f.climbRate));
  const avgWind = Math.round(forecasts.reduce((s, f) => s + f.windSpeed, 0) / forecasts.length);

  return (
    <div className="space-y-6">
      {/* ===== HEADER ===== */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 border border-emerald-500/30 rounded-2xl p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <MapPin className="w-6 h-6 text-emerald-400" />
            <div>
              <h2 className="text-xl font-bold text-white">{site.name}</h2>
              <p className="text-sm text-slate-400">
                {site.altitude}m slm · Esposizione {site.exposure} · {dayLabel}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="px-3 py-1 rounded-full bg-slate-800 border border-slate-600 text-slate-300">
              Open-Meteo ECMWF/GFS
            </span>
            {hasStorm && <span className="px-3 py-1 rounded-full bg-red-900/50 border border-red-500 text-red-300">⛈️ ALLERTA TEMPORALI</span>}
            {hasRain && !hasStorm && <span className="px-3 py-1 rounded-full bg-amber-900/50 border border-amber-500 text-amber-300">🌧️ PRECIPITAZIONI</span>}
          </div>
        </div>
      </div>

      {/* ===== TABELLA ORARIA DETTAGLIATA (stile Alpium) ===== */}
      <div className="bg-slate-900/50 border border-slate-700/50 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead className="bg-slate-900/80 border-b border-slate-700">
              <tr>
                <th className="p-2 text-left text-slate-400">Ora</th>
                <th className="p-2 text-left text-slate-400">Meteo</th>
                <th className="p-2 text-left text-slate-400">Temp</th>
                <th className="p-2 text-left text-slate-400">Umid</th>
                <th className="p-2 text-left text-slate-400">Vento Suolo</th>
                <th className="p-2 text-left text-slate-400">1500m</th>
                <th className="p-2 text-left text-slate-400">2000m</th>
                <th className="p-2 text-left text-slate-400">2500m</th>
                <th className="p-2 text-left text-slate-400">3000m</th>
                <th className="p-2 text-left text-slate-400">Base</th>
                <th className="p-2 text-left text-slate-400">Top</th>
                <th className="p-2 text-left text-slate-400">m/s</th>
                <th className="p-2 text-left text-slate-400">Nuvole</th>
                <th className="p-2 text-left text-slate-400">Pioggia</th>
                <th className="p-2 text-left text-slate-400">Volo</th>
              </tr>
            </thead>
            <tbody>
              {forecasts.map((f, i) => {
                const weather = getWeatherInfo(f.weatherCode, f.precipitation, f.cloudCover);
                const isRain = f.precipitation > 0.1;
                const isStorm = f.weatherCode >= 95;
                
                return (
                  <tr 
                    key={f.hour} 
                    className={`border-b border-slate-700/30 hover:bg-slate-800/50 transition-colors ${
                      isStorm ? "bg-red-900/20" : isRain ? "bg-blue-900/15" : ""
                    }`}
                  >
                    <td className="p-2 font-bold text-white whitespace-nowrap">
                      {String(f.hour).padStart(2, "0")}:00
                    </td>
                    <td className="p-2">
                      <span className="text-lg">{weather.icon}</span>
                      <span className={`ml-1 text-[10px] ${weather.color}`}>{weather.label}</span>
                    </td>
                    <td className="p-2 font-bold text-amber-300">{Math.round(f.temp)}°</td>
                    <td className="p-2 text-slate-300">{f.humidity}%</td>
                    
                    {/* Vento suolo */}
                    <td className="p-2">
                      <div className="flex items-center gap-1 text-sky-300">
                        <span className="font-bold">{f.windSpeed}</span>
                        <span className="text-slate-500">{getWindArrow(f.windDir)}</span>
                        <span className="text-[10px] text-slate-400">{getDirName(f.windDir)}</span>
                        {f.windGust > f.windSpeed * 1.3 && (
                          <span className="text-red-400 text-[10px]">G{f.windGust}</span>
                        )}
                      </div>
                    </td>
                    
                    {/* Venti quota */}
                    <td className="p-2 text-sky-300 text-[11px]">
                      {f.wind1500.speed} {getWindArrow(f.wind1500.dir)}{getDirName(f.wind1500.dir)}
                    </td>
                    <td className="p-2 text-sky-300 text-[11px]">
                      {f.wind2000.speed} {getWindArrow(f.wind2000.dir)}{getDirName(f.wind2000.dir)}
                    </td>
                    <td className="p-2 text-sky-300 text-[11px]">
                      {f.wind2500.speed} {getWindArrow(f.wind2500.dir)}{getDirName(f.wind2500.dir)}
                    </td>
                    <td className="p-2 text-sky-300 text-[11px]">
                      {f.wind3000.speed} {getWindArrow(f.wind3000.dir)}{getDirName(f.wind3000.dir)}
                    </td>
                    
                    {/* Termiche */}
                    <td className="p-2 font-bold text-emerald-300">{f.thermalBase}m</td>
                    <td className="p-2 font-bold text-purple-300">{f.thermalTop}m</td>
                    <td className="p-2">
                      <span className={`font-bold ${
                        f.climbRate >= 3 ? "text-red-300" :
                        f.climbRate >= 2 ? "text-orange-300" :
                        f.climbRate >= 1 ? "text-amber-300" :
                        f.climbRate >= 0.3 ? "text-green-300" : "text-slate-500"
                      }`}>
                        {f.climbRate.toFixed(1)}
                      </span>
                    </td>
                    
                    {/* Nuvole */}
                    <td className="p-2 text-slate-300">
                      {f.cloudCover}% 
                      <span className="text-[9px] text-slate-500">
                        L{f.cloudCoverLow} M{f.cloudCoverMid} H{f.cloudCoverHigh}
                      </span>
                    </td>
                    
                    {/* Pioggia */}
                    <td className="p-2">
                      {f.precipitation > 0 ? (
                        <span className="text-blue-400 font-bold">{f.precipitation.toFixed(1)}mm</span>
                      ) : (
                        <span className="text-emerald-400">—</span>
                      )}
                    </td>
                    
                    {/* Rating volo */}
                    <td className="p-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${
                        f.flightRating === 0 ? "bg-red-900/40 text-red-300 border-red-500" :
                        f.flightRating === 1 ? "bg-rose-900/40 text-rose-300 border-rose-500" :
                        f.flightRating === 2 ? "bg-amber-900/40 text-amber-300 border-amber-500" :
                        f.flightRating === 3 ? "bg-lime-900/40 text-lime-300 border-lime-500" :
                        f.flightRating === 4 ? "bg-emerald-900/40 text-emerald-300 border-emerald-500" :
                        "bg-blue-900/40 text-blue-300 border-blue-500"
                      }`}>
                        {f.flightLabel}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ===== WINDGRAM VERTICALE PROFESSIONALE ===== */}
      <AlpiumWindgram 
        forecasts={forecasts} 
        siteAlt={site.altitude} 
        siteName={site.name}
        dateStr={dateStr}
      />

      {/* ===== ANALISI TESTUALE DETTAGLIATA ===== */}
      <AlpiumAnalysis 
        forecasts={forecasts} 
        site={site}
        dateStr={dateStr}
        dayLabel={dayLabel}
      />
    </div>
  );
}

// ============================================
// WINDGRAM VERTICALE (stile Alpium/RASP)
// ============================================

interface WindgramProps {
  forecasts: HourlyForecast[];
  siteAlt: number;
  siteName: string;
  dateStr: string;
}

function AlpiumWindgram({ forecasts, siteAlt, siteName, dateStr }: WindgramProps) {
  const [selectedHour, setSelectedHour] = useState(12);
  
  const f = forecasts.find(x => x.hour === selectedHour) || forecasts[0];
  if (!f) return null;

  const width = 800;
  const height = 480;
  const margin = { top: 60, right: 80, bottom: 50, left: 70 };
  const plotW = width - margin.left - margin.right;
  const plotH = height - margin.top - margin.bottom;
  const minAlt = Math.max(500, siteAlt - 200);
  const maxAlt = 6000;

  const yFromAlt = (alt: number) => margin.top + plotH - ((Math.min(maxAlt, Math.max(minAlt, alt)) - minAlt) / (maxAlt - minAlt)) * plotH;
  const xFromHour = (idx: number) => margin.left + (idx / 11) * plotW;

  // Livelli isobarici per griglia
  const levels = [
    { hpa: 500, alt: 5800 }, { hpa: 600, alt: 4400 }, 
    { hpa: 700, alt: 3100 }, { hpa: 800, alt: 1950 }, 
    { hpa: 850, alt: 1450 }, { hpa: 925, alt: 760 }
  ];

  // Barbette vento
  const renderBarb = (x: number, y: number, speed: number, dir: number) => {
    if (speed < 1) return null;
    const knots = speed * 0.539957;
    const angle = ((dir - 90) * Math.PI) / 180;
    const len = 16;
    const ex = x + len * Math.cos(angle);
    const ey = y + len * Math.sin(angle);
    const color = "#d946ef"; // viola RASP
    
    const barbs = [];
    let rem = Math.round(knots / 5) * 5;
    let pos = 1.0;
    const barbAng = angle + (115 * Math.PI) / 180;
    
    while (rem >= 50 && pos >= 0.25) {
      const bx = x + pos * (ex - x), by = y + pos * (ey - y);
      barbs.push(<polygon key={`p50-${x}-${y}-${pos}`} points={`${bx},${by} ${bx+9*Math.cos(barbAng)},${by+9*Math.sin(barbAng)} ${bx+4.5*Math.cos(angle)},${by+4.5*Math.sin(angle)}`} fill={color} stroke={color} strokeWidth="1"/>);
      rem -= 50; pos -= 0.25;
    }
    while (rem >= 10 && pos >= 0.18) {
      const bx = x + pos * (ex - x), by = y + pos * (ey - y);
      barbs.push(<line key={`l10-${x}-${y}-${pos}`} x1={bx} y1={by} x2={bx+8*Math.cos(barbAng)} y2={by+8*Math.sin(barbAng)} stroke={color} strokeWidth="1.6" strokeLinecap="round"/>);
      rem -= 10; pos -= 0.16;
    }
    if (rem >= 5 && pos >= 0.18) {
      const bx = x + pos * (ex - x), by = y + pos * (ey - y);
      barbs.push(<line key={`l5-${x}-${y}-${pos}`} x1={bx} y1={by} x2={bx+5*Math.cos(barbAng)} y2={by+5*Math.sin(barbAng)} stroke={color} strokeWidth="1.6" strokeLinecap="round"/>);
    }
    
    return (
      <g key={`wb-${x}-${y}`}>
        <line x1={x} y1={y} x2={ex} y2={ey} stroke={color} strokeWidth="1.6" strokeLinecap="round"/>
        {barbs}
      </g>
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-300 shadow-xl p-4 space-y-4">
      {/* Header windgram */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h3 className="text-lg font-bold text-slate-900 lowercase">{siteName.toLowerCase()}</h3>
          <p className="text-xs text-slate-500 font-mono">plotted {dateStr} 00:00 UTC · model ground {siteAlt + 5}m · SRTM {siteAlt}m</p>
        </div>
        <div className="flex items-center gap-2">
          {forecasts.map(h => (
            <button
              key={h.hour}
              onClick={() => setSelectedHour(h.hour)}
              className={`px-2 py-1 rounded text-xs font-mono font-bold transition-all ${
                h.hour === selectedHour 
                  ? "bg-emerald-600 text-white shadow" 
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {String(h.hour).padStart(2, "0")}:00
            </button>
          ))}
        </div>
      </div>

      {/* SVG Windgram */}
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto min-w-[700px]" style={{ shapeRendering: "geometricPrecision" }}>
          {/* Sfondo grigio chiaro quota */}
          <rect x={margin.left} y={margin.top} width={plotW} height={plotH} fill="#e2e8f0" opacity="0.6"/>
          
          {/* Griglia livelli isobarici */}
          {levels.map(l => {
            const y = yFromAlt(l.alt);
            return (
              <g key={`lvl-${l.hpa}`}>
                <line x1={margin.left} y1={y} x2={margin.left+plotW} y2={y} stroke="#64748b" strokeWidth="0.6" strokeDasharray="3 3" opacity="0.5"/>
                <text x={margin.left - 10} y={y+4} fill="#1e293b" fontSize="10" fontWeight="700" textAnchor="end">{l.hpa} hPa</text>
                <text x={margin.left+plotW+8} y={y+4} fill="#1e293b" fontSize="10" fontWeight="700" textAnchor="start">{l.alt}m</text>
              </g>
            );
          })}
          
          {/* Linee verticali orarie */}
          {forecasts.map((h, i) => (
            <line key={`vl-${h.hour}`} x1={xFromHour(i)} y1={margin.top} x2={xFromHour(i)} y2={margin.top+plotH} stroke="#94a3b8" strokeWidth="0.5" strokeDasharray="2 3" opacity="0.4"/>
          ))}
          
          {/* Barbette vento per ora selezionata */}
          {[
            { alt: 1500, w: f.wind1500 },
            { alt: 2000, w: f.wind2000 },
            { alt: 2500, w: f.wind2500 },
            { alt: 3000, w: f.wind3000 },
            { alt: siteAlt, w: { speed: f.windSpeed, dir: f.windDir } }
          ].map(({ alt, w }) => renderBarb(margin.left + plotW/2, yFromAlt(alt), w.speed, w.dir))}
          
          {/* Zero termico - linea blu tratteggiata con fiocchi */}
          <polyline 
            points={forecasts.map((h, i) => `${xFromHour(i)},${yFromAlt(h.freezingLevel)}`).join(" ")} 
            fill="none" stroke="#0284c7" strokeWidth="2" strokeDasharray="6 3" strokeLinecap="round"
          />
          {forecasts.map((h, i) => (
            <g key={`zf-${h.hour}`} transform={`translate(${xFromHour(i)}, ${yFromAlt(h.freezingLevel)})`}>
              <circle cx="0" cy="0" r="6" fill="white" stroke="#0284c7" strokeWidth="1.5"/>
              <text x="0" y="3" fill="#0284c7" fontSize="9" fontWeight="900" textAnchor="middle">❄</text>
            </g>
          ))}
          
          {/* Top termico - curva viola con parapendio */}
          <path 
            d={forecasts.map((h, i) => `${i===0?"M":"L"} ${xFromHour(i)},${yFromAlt(h.thermalTop)}`).join(" ")} 
            fill="none" stroke="#9333ea" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
          />
          {forecasts.map((h, i) => (
            <g key={`pg-${h.hour}`} transform={`translate(${xFromHour(i)}, ${yFromAlt(h.thermalTop)})`}>
              <path d="M -14,-4 C -11,-15 11,-15 14,-4 C 9,-7 -9,-7 -14,-4 Z" fill="#c084fc" stroke="#6b21a8" strokeWidth="1.5"/>
              <line x1="-11" y1="-5" x2="0" y2="0" stroke="#6b21a8" strokeWidth="1"/>
              <line x1="11" y1="-5" x2="0" y2="0" stroke="#6b21a8" strokeWidth="1"/>
              <circle cx="0" cy="0.5" r="3" fill="white" stroke="#6b21a8" strokeWidth="1.5"/>
            </g>
          ))}
          
          {/* Base cumuli - nuvolette con % */}
          {forecasts.map((h, i) => {
            const cloudY = yFromAlt(h.thermalBase + 200);
            const isRain = h.precipitation > 0.2;
            return (
              <g key={`cu-${h.hour}`} transform={`translate(${xFromHour(i)}, ${cloudY})`}>
                <path d="M -14,1 A 5,5 0 0,1 -6,-4 A 8,8 0 0,1 6,-5 A 5,5 0 0,1 14,0 A 4,4 0 0,1 11,5 L -11,5 A 4,4 0 0,1 -14,1 Z" 
                  fill={isRain ? "#94a3b8" : "white"} stroke="#475569" strokeWidth="1.2" filter="drop-shadow(0 1px 2px rgba(0,0,0,0.1))"/>
                <text x="0" y="3" fill={isRain ? "#0284c7" : "#1e293b"} fontSize="8" fontWeight="800" textAnchor="middle" fontFamily="monospace">
                  {isRain ? "🌧" : `${h.cloudCover}%`}
                </text>
              </g>
            );
          })}
          
          {/* Badge quota base + rateo */}
          {forecasts.map((h, i) => (
            <g key={`badge-${h.hour}`} transform={`translate(${xFromHour(i)}, ${yFromAlt(h.thermalTop) + 10})`}>
              <rect x="-24" y="0" width="48" height="24" rx="4" fill="white" stroke="#ea580c" strokeWidth="1.2" filter="drop-shadow(0 1px 3px rgba(0,0,0,0.1))"/>
              <text x="0" y="9" fill="#1e293b" fontSize="8" fontWeight="800" textAnchor="middle" fontFamily="monospace">{h.thermalBase}m</text>
              <text x="0" y="19" fill={h.climbRate > 1.5 ? "#dc2626" : "#64748b"} fontSize="8" fontWeight="800" textAnchor="middle" fontFamily="monospace">
                {h.climbRate > 0 ? `↑ ${h.climbRate.toFixed(1)}` : "—"}
              </text>
            </g>
          ))}
          
          {/* Assi orari */}
          {forecasts.map((h, i) => (
            <text key={`lbl-${h.hour}`} x={xFromHour(i)} y={margin.top+plotH+20} fill="#1e293b" fontSize="11" fontWeight="800" textAnchor="middle" fontFamily="monospace">
              {String(h.hour).padStart(2, "0")}:00
            </text>
          ))}
          
          <rect x={margin.left} y={margin.top} width={plotW} height={plotH} fill="none" stroke="#1e293b" strokeWidth="1.2"/>
        </svg>
      </div>

      {/* Scala stabilità */}
      <div className="pt-2 border-t border-slate-200">
        <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1">
          <span>Stabile ←</span>
          <span className="font-mono">ΔT/100m</span>
          <span>→ Instabile</span>
        </div>
        <div className="h-3 rounded flex overflow-hidden border border-slate-400">
          {[
            {v:-0.20,c:"#8a5bb8"},{v:0.00,c:"#4f7fd9"},{v:0.16,c:"#45b3cd"},
            {v:0.32,c:"#4ec099"},{v:0.48,c:"#8bc953"},{v:0.65,c:"#d8c728"},
            {v:0.82,c:"#eeb319"},{v:0.98,c:"#e86c1f"},{v:1.20,c:"#c92e1e"}
          ].map((s,i) => (
            <div key={i} className="flex-1 h-full" style={{backgroundColor:s.c}}/>
          ))}
        </div>
        <div className="flex justify-between text-[9px] font-mono text-slate-600 mt-1">
          {[-0.20,0.00,0.16,0.32,0.48,0.65,0.82,0.98,1.20].map(v => <span key={v}>{v.toFixed(2)}</span>)}
        </div>
      </div>
    </div>
  );
}

// ============================================
// ANALISI TESTUALE STILE ALPIUM
// ============================================

interface AnalysisProps {
  forecasts: HourlyForecast[];
  site: SiteConfig;
  dateStr: string;
  dayLabel: string;
}

function AlpiumAnalysis({ forecasts, site, dateStr, dayLabel }: AnalysisProps) {
  const f12 = forecasts.find(x => x.hour === 12) || forecasts[0];
  const f15 = forecasts.find(x => x.hour === 15) || forecasts[0];
  
  const tempMin = Math.min(...forecasts.map(f => f.temp));
  const tempMax = Math.max(...forecasts.map(f => f.temp));
  const avgWind = Math.round(forecasts.reduce((s, f) => s + f.windSpeed, 0) / forecasts.length);
  const maxWind = Math.max(...forecasts.map(f => f.windSpeed));
  const maxGust = Math.max(...forecasts.map(f => f.windGust));
  const totalRain = forecasts.reduce((s, f) => s + f.precipitation, 0);
  const hasStorm = forecasts.some(f => f.weatherCode >= 95);
  const hasRain = forecasts.some(f => f.precipitation > 0.2);
  const avgCloud = Math.round(forecasts.reduce((s, f) => s + f.cloudCover, 0) / forecasts.length);
  const maxClimb = Math.max(...forecasts.map(f => f.climbRate));
  const avgClimb = forecasts.reduce((s, f) => s + f.climbRate, 0) / forecasts.length;
  const maxCape = Math.max(...forecasts.map(f => f.cape));
  const minLI = Math.min(...forecasts.map(f => f.liftedIndex));

  // Vento dominante
  const dirs = forecasts.map(f => f.windDir);
  const sinSum = dirs.reduce((s, d) => s + Math.sin(d * Math.PI/180), 0);
  const cosSum = dirs.reduce((s, d) => s + Math.cos(d * Math.PI/180), 0);
  const avgDir = (Math.atan2(sinSum, cosSum) * 180/Math.PI + 360) % 360;

  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border-2 border-emerald-500/30 rounded-2xl p-6 space-y-5 text-slate-200">
      <h3 className="text-lg font-bold text-emerald-300 flex items-center gap-2">
        <FileText className="w-5 h-5" />
        Analisi Meteorologica Dettagliata — {dayLabel}
      </h3>

      {/* 1. Quadro Termico */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 space-y-2">
        <h4 className="text-sm font-bold text-amber-300 flex items-center gap-2">
          <Thermometer className="w-4 h-4" /> 1. Quadro Termico & Stabilità
        </h4>
        <p className="text-sm leading-relaxed">
          Temperature al suolo tra <strong>{tempMin}°C</strong> e <strong>{tempMax}°C</strong> (ΔT {tempMax-tempMin}°C). 
          Punto di rugiada medio ~{Math.round(forecasts.reduce((s,f)=>s+f.dewPoint,0)/forecasts.length)}°C.
          <br/>
          CAPE max <strong>{maxCape} J/kg</strong> · Lifted Index <strong>{minLI.toFixed(1)}</strong> 
          ({minLI < -4 ? "molto instabile ⚠️" : minLI < -2 ? "instabile" : minLI < 0 ? "leggermente instabile" : "stabile"}).
          <br/>
          Zero termico a <strong>{Math.round(f12.freezingLevel)}m</strong>. 
          Base cumuli stimata <strong>{f12.thermalBase}m</strong> · Top termico <strong>{f12.thermalTop}m</strong>.
          <br/>
          Rateo salita medio <strong>{avgClimb.toFixed(1)} m/s</strong> (picco {maxClimb.toFixed(1)} m/s) — 
          {avgClimb >= 2 ? "termiche forti 🔥" : avgClimb >= 1 ? "termiche buone 🪂" : avgClimb >= 0.5 ? "termiche moderate" : "termiche deboli/assenti ❄️"}.
        </p>
      </div>

      {/* 2. Profilo Vento */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 space-y-2">
        <h4 className="text-sm font-bold text-cyan-300 flex items-center gap-2">
          <Wind className="w-4 h-4" /> 2. Profilo Vento Verticale
        </h4>
        <p className="text-sm leading-relaxed">
          Suolo: <strong>{f12.windSpeed} km/h</strong> da <strong>{getDirName(f12.windDir)} ({f12.windDir}°)</strong> 
          (raffiche {f12.windGust} km/h). 
          <br/>
          1500m: <strong>{f12.wind1500.speed} km/h</strong> da {getDirName(f12.wind1500.dir)} · 
          2000m: <strong>{f12.wind2000.speed} km/h</strong> da {getDirName(f12.wind2000.dir)} · 
          2500m: <strong>{f12.wind2500.speed} km/h</strong> da {getDirName(f12.wind2500.dir)} · 
          3000m: <strong>{f12.wind3000.speed} km/h</strong> da {getDirName(f12.wind3000.dir)}.
          <br/>
          Shear verticale: {f12.wind3000.speed - f12.windSpeed > 15 ? "⚠️ FORTE (turbolenza probabile)" : f12.wind3000.speed - f12.windSpeed > 8 ? "moderato" : "debole"}.
          <br/>
          Direzione dominante giornata: <strong>{getDirName(avgDir)}</strong> — 
          {["S","SSW","SW","WSW"].includes(getDirName(avgDir)) ? "✅ Favorevole per esposizione " + site.exposure : "⚠️ Verificare compatibilità con decollo"}.
        </p>
      </div>

      {/* 3. Nuvolosità & Precipitazioni */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 space-y-2">
        <h4 className="text-sm font-bold text-blue-300 flex items-center gap-2">
          <Cloud className="w-4 h-4" /> 3. Nuvolosità & Precipitazioni
        </h4>
        <p className="text-sm leading-relaxed">
          Copertura media: <strong>{avgCloud}%</strong> (Basse: {Math.round(forecasts.reduce((s,f)=>s+f.cloudCoverLow,0)/forecasts.length)}% · 
          Medie: {Math.round(forecasts.reduce((s,f)=>s+f.cloudCoverMid,0)/forecasts.length)}% · 
          Alte: {Math.round(forecasts.reduce((s,f)=>s+f.cloudCoverHigh,0)/forecasts.length)}%).
          <br/>
          {hasStorm ? (
            <span className="text-red-300 font-bold">⛈️ TEMPORALI PREVISTI — Rischio fulmini, grandine, raffiche discendenti. VOLO VIETATO.</span>
          ) : hasRain ? (
            <span className="text-amber-300 font-bold">🌧️ Precipitazioni totali {totalRain.toFixed(1)}mm — Ala bagnata = stallo profondo. Sconsigliato decollo.</span>
          ) : (
            <span className="text-emerald-300">✅ Nessuna pioggia significativa. Cielo idoneo per sviluppo termico.</span>
          )}
        </p>
      </div>

      {/* 4. Finestra di Volo & Strategia */}
      <div className="bg-gradient-to-r from-emerald-900/30 to-emerald-800/20 border border-emerald-500/40 rounded-xl p-4 space-y-2">
        <h4 className="text-sm font-bold text-emerald-300 flex items-center gap-2">
          <ArrowUp className="w-4 h-4" /> 4. Finestra di Volo & Strategia Tattica
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div className="bg-slate-900/50 rounded-lg p-3">
            <p className="font-bold text-emerald-300 mb-1">🕐 Ore Migliori</p>
            <p>
              {forecasts.filter(f => f.flightRating >= 3 && f.climbRate > 0.5).length > 0 
                ? forecasts.filter(f => f.flightRating >= 3 && f.climbRate > 0.5)
                    .map(f => `${String(f.hour).padStart(2,"0")}:00`).join(" – ")
                : "Nessuna finestra ottimale"}
            </p>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-3">
            <p className="font-bold text-amber-300 mb-1">⚠️ Attenzioni</p>
            <ul className="space-y-1 text-[11px]">
              {maxWind > 20 && <li>• Vento sostenuto: decollo solo se allineato a {site.exposure}</li>}
              {maxGust > 30 && <li>• Raffiche >30 km/h: turbolenza in quota e atterraggio</li>}
              {avgCloud > 70 && <li>• Cielo molto coperto: termiche ritardate/deboli</li>}
              {f12.liftedIndex < -4 && <li>• Atmosfera instabile: monitorare sviluppo cumulonembi</li>}
              {totalRain > 0 && <li>• Pioggia: terreno viscido, ala bagnata = pericolo stallo</li>}
              {(!hasRain && !hasStorm && maxWind <= 20 && avgClimb > 1) && <li className="text-emerald-300">• Condizioni favorevoli per volo locale e cross</li>}
            </ul>
          </div>
        </div>
      </div>

      {/* 5. Dati Tecnici Grezzi */}
      <details className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
        <summary className="text-xs font-bold text-slate-400 cursor-pointer flex items-center gap-2">
          <Info className="w-4 h-4" />
          Dati Tecnici Grezzi (per analisi avanzata)
        </summary>
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] font-mono text-slate-300">
          {[
            ["Pressione", `${f12.pressure} hPa`],
            ["Visibilità", `${Math.round((f12.visibility||10000)/1000)} km`],
            ["UV Index", `${Math.round(f12.uvIndex||0)}`],
            ["CIN", `${Math.round(f12.cin)} J/kg`],
            ["Radiazione", `${Math.round(f12.shortwave_radiation||0)} W/m²`],
            ["Punto rugiada", `${Math.round(f12.dewPoint)}°C`],
            ["Spread T-Td", `${Math.round(f12.temp - f12.dewPoint)}°C`],
            ["Gradiente", `${((f12.temp - (f12.temp-2)) / 0.1).toFixed(1)}°C/100m`]
          ].map(([k,v], i) => (
            <div key={i} className="bg-slate-900/50 rounded p-2">
              <div className="text-slate-500">{k}</div>
              <div className="font-bold text-white">{v}</div>
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}

export { AlpiumBriefing as default };