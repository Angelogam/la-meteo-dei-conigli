"use client";

import React, { useState, useEffect, useMemo } from "react";
import { DECOLLI } from "@/data/decolli";
import type { HourData } from "@/types/meteo";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart, ComposedChart, Legend
} from "recharts";

// ==================== HELPERS ====================
const weatherEmoji = (code: number): string => {
  if (code === 0) return "☀️";
  if (code <= 2) return "🌤️";
  if (code === 3) return "☁️";
  if (code >= 45 && code <= 49) return "🌫️";
  if (code >= 51 && code <= 57) return "🌦️";
  if (code >= 61 && code <= 67) return "🌧️";
  if (code >= 71 && code <= 77) return "🌨️";
  if (code >= 80 && code <= 82) return "🌦️";
  if (code >= 95 && code <= 99) return "⛈️";
  return "☀️";
};

const weatherText = (code: number): string => {
  if (code === 0) return "Sereno";
  if (code <= 2) return "Poco nuvoloso";
  if (code === 3) return "Coperto";
  if (code >= 45 && code <= 49) return "Nebbia";
  if (code >= 51 && code <= 57) return "Pioviggine";
  if (code >= 61 && code <= 67) return "Pioggia";
  if (code >= 71 && code <= 77) return "Neve";
  if (code >= 80 && code <= 82) return "Rovesci";
  if (code >= 95 && code <= 99) return "Temporale";
  return "";
};

const windDirText = (deg: number): string => {
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return dirs[Math.round(deg / 22.5) % 16];
};

const windArrow = (deg: number): string => {
  const arrows = ["↑","↑","↗","↗","→","→","↘","↘","↓","↓","↙","↙","←","←","↖","↖"];
  return arrows[Math.round(deg / 22.5) % 16];
};

const difficultyBadge = (d: number) => {
  if (d === 1) return { text: "D1 Facile", color: "bg-green-700/60 text-green-200 border-green-500" };
  if (d === 2) return { text: "D2 Medio", color: "bg-yellow-700/60 text-yellow-200 border-yellow-500" };
  return { text: "D3 Esperto", color: "bg-red-700/60 text-red-200 border-red-500" };
};

const getDayLabel = (d: Date): string => {
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return "Oggi";
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (d.toDateString() === tomorrow.toDateString()) return "Domani";
  return d.toLocaleDateString("it-IT", { weekday: "short", day: "numeric" });
};

const getCloudBase = (temp: number, dew: number): number => Math.round(Math.max(0, (temp - dew) * 125));

const getThermalTop = (cb: number, temp: number, hum: number): number => {
  const cape = Math.max(0, (temp - 10) * 50 + (hum > 50 ? 200 : 0));
  return Math.round(cb + (cape / 100) * 300);
};

const getSoarIndex = (dayData: HourData[]): number => {
  if (!dayData.length) return 0;
  const avgTemp = dayData.reduce((s, h) => s + h.temperature, 0) / dayData.length;
  const avgHum = dayData.reduce((s, h) => s + h.humidity, 0) / dayData.length;
  const maxTemp = Math.max(...dayData.map(h => h.temperature));
  const minTemp = Math.min(...dayData.map(h => h.temperature));
  const range = maxTemp - minTemp;
  return Math.min(10, Math.max(0, Math.round((range / 15) * 3 + (avgHum < 60 ? 2 : 0) + (avgTemp > 20 ? 2 : 0) + (avgTemp > 25 ? 1 : 0) + (avgHum < 40 ? 2 : 0))));
};

const getCrossEval = (soar: number): { text: string; color: string } => {
  if (soar >= 8) return { text: "Eccellente ⭐", color: "text-green-400 bg-green-900/30 border-green-500/50" };
  if (soar >= 5) return { text: "Buono 👍", color: "text-blue-400 bg-blue-900/30 border-blue-500/50" };
  if (soar >= 3) return { text: "Limitato", color: "text-yellow-400 bg-yellow-900/30 border-yellow-500/50" };
  return { text: "Sconsigliato ❌", color: "text-red-400 bg-red-900/30 border-red-500/50" };
};

const estimateWindAtHeight = (groundSpeed: number, groundDir: number, height: number, cloudCover: number): { speed: number; dir: number } => {
  if (height <= 10) return { speed: groundSpeed, dir: groundDir };
  const shearFactor = Math.pow(1 + (0.03 * (1 + cloudCover / 200)), height / 100);
  const rotation = Math.min(height * 0.03, 45);
  return { speed: Math.round(groundSpeed * shearFactor * 10) / 10, dir: (groundDir + rotation) % 360 };
};

// ==================== COMPONENTE PRINCIPALE ====================
export default function Index() {
  const [selectedId, setSelectedId] = useState<string>("malanotte");
  const [tab, setTab] = useState<string>("meteo");
  const [dayIdx, setDayIdx] = useState(0);
  const [hour, setHour] = useState(new Date().getHours());
  const [hourlyData, setHourlyData] = useState<Record<string, HourData[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const selectedSite = useMemo(() => DECOLLI.find(d => d.id === selectedId) || DECOLLI[0], [selectedId]);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      setError(null);
      const results: Record<string, HourData[]> = {};

      for (const site of DECOLLI) {
        try {
          const params = new URLSearchParams({
            latitude: site.lat.toString(),
            longitude: site.lon.toString(),
            hourly: "temperature_2m,apparent_temperature,relative_humidity_2m,dew_point_2m,precipitation,weather_code,cloud_cover,pressure_msl,wind_speed_10m,wind_direction_10m,wind_gusts_10m,uv_index,is_day",
            timezone: "Europe/Rome",
            forecast_days: "4",
          });

          const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const raw = await res.json();

          results[site.id] = raw.hourly.time.map((t: string, i: number) => ({
            time: new Date(t),
            temperature: raw.hourly.temperature_2m[i],
            feelsLike: raw.hourly.apparent_temperature[i],
            humidity: raw.hourly.relative_humidity_2m[i],
            dewPoint: raw.hourly.dew_point_2m[i],
            precipitation: raw.hourly.precipitation[i],
            weatherCode: raw.hourly.weather_code[i],
            cloudCover: raw.hourly.cloud_cover[i],
            pressure: raw.hourly.pressure_msl[i] ?? null,
            windSpeed: raw.hourly.wind_speed_10m[i],
            windDir: raw.hourly.wind_direction_10m[i],
            windGust: raw.hourly.wind_gusts_10m[i] ?? null,
            soilTemp: null,
            soilMoisture: null,
            uvIndex: raw.hourly.uv_index[i] ?? null,
            isDay: raw.hourly.is_day[i] === 1,
          }));
        } catch (err: any) {
          console.error(`Errore fetch ${site.name}:`, err);
          results[site.id] = [];
        }
      }

      setHourlyData(results);
      setLoading(false);
    };

    fetchAll();
    const interval = setInterval(fetchAll, 120000);
    return () => clearInterval(interval);
  }, []);

  const dayData = useMemo(() => {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + dayIdx);
    const data = hourlyData[selectedId] || [];
    return data.filter(h =>
      h.time.getDate() === targetDate.getDate() &&
      h.time.getMonth() === targetDate.getMonth() &&
      h.time.getFullYear() === targetDate.getFullYear()
    );
  }, [hourlyData, selectedId, dayIdx]);

  const current = useMemo(() => dayData.find(h => h.time.getHours() === hour) || dayData[0] || null, [dayData, hour]);

  const dates = useMemo(() => {
    const arr: Date[] = [];
    for (let i = 0; i < 4; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      arr.push(d);
    }
    return arr;
  }, []);

  const soarIndex = useMemo(() => getSoarIndex(dayData), [dayData]);
  const cloudBase = useMemo(() => {
    if (!current) return 0;
    return getCloudBase(current.temperature, current.dewPoint);
  }, [current]);
  const thermalTop = useMemo(() => {
    if (!current) return 0;
    return getThermalTop(cloudBase, current.temperature, current.humidity);
  }, [current, cloudBase]);

  // Dati per grafico termiche orario (10-18)
  const thermalChartData = useMemo(() => {
    return dayData
      .filter(h => h.time.getHours() >= 9 && h.time.getHours() <= 19)
      .map(h => {
        const cb = getCloudBase(h.temperature, h.dewPoint);
        const tt = getThermalTop(cb, h.temperature, h.humidity);
        return {
          ora: `${h.time.getHours()}:00`,
          temp: Math.round(h.temperature),
          cloudBase: cb,
          thermalTop: tt,
          windSpeed: Math.round(h.windSpeed),
          precip: h.precipitation.toFixed(1),
          hum: h.humidity,
          soar: Math.min(10, Math.max(0, Math.round((h.temperature - 10) * 0.5 + (h.humidity < 60 ? 2 : 0)))),
        };
      });
  }, [dayData]);

  // Dati per meteogramma (giornata intera)
  const meteogramData = useMemo(() => {
    return dayData.map(h => ({
      ora: `${String(h.time.getHours()).padStart(2, "0")}:00`,
      temp: Math.round(h.temperature),
      dew: Math.round(h.dewPoint),
      cloud: h.cloudCover,
      precip: h.precipitation,
      wind: Math.round(h.windSpeed),
      hum: h.humidity,
    }));
  }, [dayData]);

  if (loading && Object.keys(hourlyData).length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">🐰</div>
          <div className="text-xl font-bold text-green-400 animate-pulse">Caricamento dati meteo...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <div className="text-lg text-red-400 mb-2">Errore di caricamento</div>
          <div className="text-sm text-slate-400">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* HEADER */}
      <header className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur-md border-b-2 border-green-600/40 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl md:text-4xl animate-bounce">🐰</span>
            <div>
              <h1 className="text-xl md:text-2xl font-black text-green-400">Meteo dei Conigli</h1>
              <p className="text-[11px] md:text-xs text-slate-400">Previsioni per volo libero • Dati Open-Meteo</p>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="md:hidden px-3 py-2 rounded-lg bg-slate-800 border border-slate-600 hover:bg-slate-700">
            {sidebarOpen ? "✕" : "☰"}
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-4 flex gap-4">
        {/* SIDEBAR */}
        <aside className="hidden md:block w-72 shrink-0">
          <div className="sticky top-20 bg-slate-800/50 border border-green-600/20 rounded-xl overflow-hidden max-h-[calc(100vh-8rem)] overflow-y-auto">
            <div className="p-2 bg-slate-800 border-b border-green-600/20">
              <h2 className="text-xs font-bold text-green-300">🪂 Decolli</h2>
            </div>
            <div className="p-1.5 space-y-1">
              {DECOLLI.map(site => {
                const h = (hourlyData[site.id] || []).find(x => x.time.getHours() === hour);
                const badge = difficultyBadge(site.difficulty);
                const isSelected = site.id === selectedId;
                return (
                  <button key={site.id} onClick={() => { setSelectedId(site.id); setSidebarOpen(false); }}
                    className={`w-full text-left rounded-lg p-2 transition-all border ${isSelected ? "bg-gradient-to-r from-green-900/40 to-slate-700 border-green-500 shadow-lg" : "bg-slate-800/40 border-slate-700/50 hover:bg-slate-700/50"}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-semibold text-green-200 truncate">{site.name}</div>
                        <div className="text-[10px] text-slate-400">{site.valley} · {site.altitude}m</div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="text-[9px] text-slate-500">{site.exposure}</span>
                          <span className={`px-1 rounded text-[8px] font-bold border ${badge.color}`}>{badge.text}</span>
                        </div>
                      </div>
                      {h && (
                        <div className="text-right shrink-0">
                          <div className="text-base">{weatherEmoji(h.weatherCode)}</div>
                          <div className="text-xs font-bold">{Math.round(h.temperature)}°</div>
                          <div className="text-[9px] text-blue-300">{Math.round(h.windSpeed)} km/h</div>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        {/* SIDEBAR MOBILE */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-40 md:hidden">
            <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
            <aside className="absolute left-0 top-0 h-full w-72 bg-slate-900 border-r border-green-600/30 overflow-y-auto">
              <div className="p-3 bg-slate-800 border-b border-green-600/30 flex items-center justify-between">
                <h2 className="text-sm font-bold text-green-300">Decolli</h2>
                <button onClick={() => setSidebarOpen(false)} className="text-xs text-slate-400">✕</button>
              </div>
              <div className="p-2 space-y-1">
                {DECOLLI.map(site => {
                  const h = (hourlyData[site.id] || []).find(x => x.time.getHours() === hour);
                  const isSelected = site.id === selectedId;
                  return (
                    <button key={site.id} onClick={() => { setSelectedId(site.id); setSidebarOpen(false); }}
                      className={`w-full text-left rounded-lg p-2.5 border ${isSelected ? "bg-green-900/30 border-green-500" : "bg-slate-800/40 border-slate-700/50"}`}
                    >
                      <div className="text-xs font-bold text-green-200">{site.name}</div>
                      <div className="text-[10px] text-slate-400">{site.valley} · {site.altitude}m</div>
                      {h && <div className="text-xs mt-1">{Math.round(h.temperature)}° · {Math.round(h.windSpeed)} km/h</div>}
                    </button>
                  );
                })}
              </div>
            </aside>
          </div>
        )}

        {/* CONTENUTO PRINCIPALE */}
        <main className="flex-1 min-w-0">
          {/* HEADER DECOLLO */}
          {current && (
            <div className="bg-gradient-to-r from-slate-800/80 to-slate-700/80 rounded-2xl p-4 border border-green-600/30 mb-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-lg font-bold text-green-300">{selectedSite.name}</h2>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${difficultyBadge(selectedSite.difficulty).color}`}>{difficultyBadge(selectedSite.difficulty).text}</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{selectedSite.valley} · {selectedSite.exposure} · {selectedSite.altitude}m</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-slate-300">
                    <span>💨 {Math.round(current.windSpeed)} km/h {windDirText(current.windDir)}</span>
                    <span>🌡️ {Math.round(current.temperature)}°C</span>
                    <span>💧 {current.humidity}%</span>
                    <span>☁️ {current.cloudCover}%</span>
                  </div>
                </div>
                <div className="text-4xl">{weatherEmoji(current.weatherCode)}</div>
              </div>
            </div>
          )}

          {/* TAB NAVIGATION */}
          <div className="flex gap-1 bg-slate-800/60 rounded-xl p-1 border border-slate-700/50 mb-3 overflow-x-auto">
            {[
              { id: "meteo", label: "Meteo", icon: "🌤️" },
              { id: "venti", label: "Venti", icon: "💨" },
              { id: "termiche", label: "Termiche", icon: "🔥" },
              { id: "analisi", label: "Analisi AI", icon: "🤖" },
            ].map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${tab === t.id ? "bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg scale-105" : "text-slate-300 hover:text-white hover:bg-slate-700/50"}`}
              >
                <span>{t.icon}</span>
                <span>{t.label}</span>
              </button>
            ))}
          </div>

          {/* CONTENUTO DINAMICO */}
          <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-4">
            {/* SELEZIONE GIORNO + SLIDER ORA (sempre visibili) */}
            <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
              {dates.map((d, i) => (
                <button key={i} onClick={() => setDayIdx(i)}
                  className={`shrink-0 px-4 py-2 rounded-xl text-xs font-bold border-2 transition-all ${dayIdx === i ? "bg-blue-600 text-white border-blue-400 shadow-lg" : "bg-slate-700/60 text-slate-300 border-slate-600 hover:bg-slate-600"}`}
                >
                  {getDayLabel(d)}
                </button>
              ))}
            </div>

            <div className="mb-4">
              <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                <span>00:00</span>
                <span className="text-sm font-bold text-white">{String(hour).padStart(2, "0")}:00</span>
                <span>23:00</span>
              </div>
              <input type="range" min={0} max={23} value={hour} onChange={e => setHour(Number(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <div className="flex justify-between text-[8px] text-slate-500 mt-0.5">
                {[0, 3, 6, 9, 12, 15, 18, 21].map(h => <span key={h}>{String(h).padStart(2, "0")}:00</span>)}
              </div>
            </div>

            {/* TAB: METEO */}
            {tab === "meteo" && current && (
              <div className="space-y-3">
                {/* Allerta meteo */}
                {(() => {
                  const codes = dayData.map(h => h.weatherCode);
                  let alert = { text: "✅ Nessun temporale previsto", color: "bg-green-800/50 border-green-500" };
                  if (codes.some(c => c >= 95 && c <= 99)) alert = { text: "⛈️ ALLERTA TEMPORALI – Volo sconsigliato", color: "bg-red-800/80 border-red-500" };
                  else if (codes.some(c => c >= 80 && c <= 82)) alert = { text: "⚠️ Possibili temporali/rovesci – Attenzione", color: "bg-yellow-800/60 border-yellow-500" };
                  else if (dayData.reduce((s, h) => s + h.cloudCover, 0) / dayData.length < 20) alert = { text: "☀️ Cielo sereno – Nessun temporale", color: "bg-green-800/50 border-green-500" };
                  return <div className={`${alert.color} border-2 rounded-xl p-3 text-xs font-bold`}>{alert.text}</div>;
                })()}

                {/* Griglia 8 card */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <div className="bg-slate-700/50 rounded-xl p-3 text-center">
                    <div className="text-[10px] text-slate-400 uppercase mb-1">Temperatura</div>
                    <div className="text-2xl font-black text-white">{Math.round(current.temperature)}°</div>
                    <div className="text-[10px] text-slate-500">Percepita {Math.round(current.feelsLike)}°</div>
                  </div>
                  <div className="bg-slate-700/50 rounded-xl p-3 text-center">
                    <div className="text-[10px] text-slate-400 uppercase mb-1">Umidità</div>
                    <div className="text-2xl font-black text-blue-300">{current.humidity}%</div>
                    <div className="text-[10px] text-slate-500">P. rugiada {Math.round(current.dewPoint)}°</div>
                  </div>
                  <div className="bg-slate-700/50 rounded-xl p-3 text-center">
                    <div className="text-[10px] text-slate-400 uppercase mb-1">Nuvolosità</div>
                    <div className="text-2xl font-black text-white">{current.cloudCover}%</div>
                    <div className="text-[10px] text-slate-500">{weatherText(current.weatherCode)}</div>
                  </div>
                  <div className="bg-slate-700/50 rounded-xl p-3 text-center">
                    <div className="text-[10px] text-slate-400 uppercase mb-1">Pioggia</div>
                    <div className="text-2xl font-black text-cyan-300">{current.precipitation.toFixed(1)}mm</div>
                    <div className="text-[10px] text-slate-500">{current.precipitation > 0 ? "Pioggia in corso" : "Nessuna"}</div>
                  </div>
                  <div className="bg-slate-700/50 rounded-xl p-3 text-center">
                    <div className="text-[10px] text-slate-400 uppercase mb-1">Base nuvole</div>
                    <div className="text-2xl font-black text-amber-300">{cloudBase}m</div>
                    <div className="text-[10px] text-slate-500">LCL calcolata</div>
                  </div>
                  <div className="bg-slate-700/50 rounded-xl p-3 text-center">
                    <div className="text-[10px] text-slate-400 uppercase mb-1">Plafond termico</div>
                    <div className="text-2xl font-black text-emerald-300">{thermalTop}m</div>
                    <div className="text-[10px] text-slate-500">Quota massima</div>
                  </div>
                  <div className="bg-slate-700/50 rounded-xl p-3 text-center">
                    <div className="text-[10px] text-slate-400 uppercase mb-1">Soaring Index</div>
                    <div className="text-2xl font-black text-purple-300">{soarIndex}/10</div>
                    <div className="text-[10px] text-slate-500">
                      {soarIndex >= 8 ? "Eccellente ⭐" : soarIndex >= 5 ? "Buono 👍" : soarIndex >= 3 ? "Limitato" : "Scarso"}
                    </div>
                  </div>
                  <div className="bg-slate-700/50 rounded-xl p-3 text-center">
                    <div className="text-[10px] text-slate-400 uppercase mb-1">Vento</div>
                    <div className="text-2xl font-black text-blue-300">{Math.round(current.windSpeed)}</div>
                    <div className="text-[10px] text-slate-500">{windDirText(current.windDir)} raffiche {Math.round(current.windGust || 0)} km/h</div>
                  </div>
                </div>

                {/* Pressione */}
                {current.pressure && (
                  <div className="bg-slate-700/40 rounded-xl p-3 flex items-center justify-between">
                    <span className="text-xs text-slate-300">Pressione atmosferica</span>
                    <span className="text-lg font-bold text-white">{Math.round(current.pressure)} hPa</span>
                  </div>
                )}

                {/* Meteogramma 24h */}
                <div className="bg-slate-700/30 rounded-xl p-3">
                  <h3 className="text-xs font-bold text-slate-300 mb-2">Meteogramma 24h</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <ComposedChart data={meteogramData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="ora" tick={{ fontSize: 9, fill: "#94a3b8" }} interval={2} />
                      <YAxis yAxisId="left" tick={{ fontSize: 9, fill: "#94a3b8" }} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 9, fill: "#94a3b8" }} />
                      <Tooltip contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #475569", borderRadius: 8, fontSize: 11 }} />
                      <Legend wrapperStyle={{ fontSize: 10 }} />
                      <Line yAxisId="left" type="monotone" dataKey="temp" stroke="#f97316" strokeWidth={2} dot={false} name="Temp °C" />
                      <Line yAxisId="left" type="monotone" dataKey="dew" stroke="#38bdf8" strokeWidth={1.5} dot={false} name="P. rugiada °C" />
                      <Area yAxisId="left" type="monotone" dataKey="cloud" fill="#475569" stroke="#64748b" fillOpacity={0.3} name="Nuvolosità %" />
                      <Bar yAxisId="left" dataKey="precip" fill="#22d3ee" opacity={0.6} name="Pioggia mm" />
                      <Line yAxisId="right" type="monotone" dataKey="wind" stroke="#a78bfa" strokeWidth={1.5} dot={false} name="Vento km/h" />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* TAB: VENTI */}
            {tab === "venti" && current && (
              <div className="space-y-3">
                {/* Venti a 3 quote */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  {[
                    { label: "10m (suolo)", height: 10 },
                    { label: "80m (quota termica)", height: 80 },
                    { label: "120m (alta quota)", height: 120 },
                  ].map(q => {
                    const w = estimateWindAtHeight(current.windSpeed, current.windDir, q.height, current.cloudCover);
                    return (
                      <div key={q.height} className="bg-slate-700/50 rounded-xl p-3 text-center">
                        <div className="text-[10px] text-slate-400 uppercase mb-1">{q.label}</div>
                        <div className="text-2xl font-black text-blue-300">{Math.round(w.speed)} km/h</div>
                        <div className="text-xs text-slate-300 mt-1">{windDirText(w.dir)} {windArrow(w.dir)}</div>
                        <div className="text-[10px] text-slate-500">Raffiche: ~{Math.round(w.speed * 1.3)} km/h</div>
                      </div>
                    );
                  })}
                </div>

                {/* Profilo vento completo */}
                <div className="bg-slate-700/30 rounded-xl p-3">
                  <h3 className="text-xs font-bold text-slate-300 mb-2">Profilo vento verticale</h3>
                  <div className="space-y-1 max-h-72 overflow-y-auto">
                    {Array.from({ length: 16 }, (_, i) => (i + 1) * 250).map(h => {
                      const w = estimateWindAtHeight(current.windSpeed, current.windDir, h, current.cloudCover);
                      const barColor = w.speed < 10 ? "bg-green-500" : w.speed < 20 ? "bg-yellow-500" : w.speed < 30 ? "bg-orange-500" : "bg-red-500";
                      return (
                        <div key={h} className="flex items-center gap-2 text-[11px]">
                          <span className="w-14 text-slate-400 font-mono">{h}m</span>
                          <div className="flex-1 h-4 bg-slate-700/80 rounded-full overflow-hidden">
                            <div className={`h-full ${barColor} rounded-full transition-all`} style={{ width: `${Math.min(100, (w.speed / 50) * 100)}%` }} />
                          </div>
                          <span className="w-14 text-right text-white font-bold">{Math.round(w.speed)} km/h</span>
                          <span className="w-10 text-slate-400">{windDirText(w.dir)}</span>
                          <span className="text-sm">{windArrow(w.dir)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Wind shear */}
                <div className="bg-slate-700/40 rounded-xl p-3">
                  <h3 className="text-xs font-bold text-slate-300 mb-1">Analisi Wind Shear</h3>
                  {(() => {
                    const h80 = estimateWindAtHeight(current.windSpeed, current.windDir, 80, current.cloudCover);
                    const h10 = estimateWindAtHeight(current.windSpeed, current.windDir, 10, current.cloudCover);
                    const diff = Math.abs(h80.speed - h10.speed);
                    const level = diff > 15 ? "ALTO" : diff > 8 ? "MEDIO" : "BASSO";
                    const color = diff > 15 ? "text-red-400 bg-red-900/30 border-red-500" : diff > 8 ? "text-orange-400 bg-orange-<dyad-write path="src/pages/Index.tsx" description="Completamento del file Index.tsx con tutti i tab funzionanti">

```tsx
"use client";

import React, { useState, useEffect, useMemo } from "react";
import { DECOLLI } from "@/data/decolli";
import type { HourData } from "@/types/meteo";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart, ComposedChart, Legend
} from "recharts";

// ==================== HELPERS ====================
const weatherEmoji = (code: number): string => {
  if (code === 0) return "☀️";
  if (code <= 2) return "🌤️";
  if (code === 3) return "☁️";
  if (code >= 45 && code <= 49) return "🌫️";
  if (code >= 51 && code <= 57) return "🌦️";
  if (code >= 61 && code <= 67) return "🌧️";
  if (code >= 71 && code <= 77) return "🌨️";
  if (code >= 80 && code <= 82) return "🌦️";
  if (code >= 95 && code <= 99) return "⛈️";
  return "☀️";
};

const weatherText = (code: number): string => {
  if (code === 0) return "Sereno";
  if (code <= 2) return "Poco nuvoloso";
  if (code === 3) return "Coperto";
  if (code >= 45 && code <= 49) return "Nebbia";
  if (code >= 51 && code <= 57) return "Pioviggine";
  if (code >= 61 && code <= 67) return "Pioggia";
  if (code >= 71 && code <= 77) return "Neve";
  if (code >= 80 && code <= 82) return "Rovesci";
  if (code >= 95 && code <= 99) return "Temporale";
  return "";
};

const windDirText = (deg: number): string => {
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return dirs[Math.round(deg / 22.5) % 16];
};

const windArrow = (deg: number): string => {
  const arrows = ["↑","↑","↗","↗","→","→","↘","↘","↓","↓","↙","↙","←","←","↖","↖"];
  return arrows[Math.round(deg / 22.5) % 16];
};

const difficultyBadge = (d: number) => {
  if (d === 1) return { text: "D1 Facile", color: "bg-green-700/60 text-green-200 border-green-500" };
  if (d === 2) return { text: "D2 Medio", color: "bg-yellow-700/60 text-yellow-200 border-yellow-500" };
  return { text: "D3 Esperto", color: "bg-red-700/60 text-red-200 border-red-500" };
};

const getDayLabel = (d: Date): string => {
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return "Oggi";
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (d.toDateString() === tomorrow.toDateString()) return "Domani";
  return d.toLocaleDateString("it-IT", { weekday: "short", day: "numeric" });
};

const getCloudBase = (temp: number, dew: number): number => Math.round(Math.max(0, (temp - dew) * 125));

const getThermalTop = (cb: number, temp: number, hum: number): number => {
  const cape = Math.max(0, (temp - 10) * 50 + (hum > 50 ? 200 : 0));
  return Math.round(cb + (cape / 100) * 300);
};

const getSoarIndex = (dayData: HourData[]): number => {
  if (!dayData.length) return 0;
  const avgTemp = dayData.reduce((s, h) => s + h.temperature, 0) / dayData.length;
  const avgHum = dayData.reduce((s, h) => s + h.humidity, 0) / dayData.length;
  const maxTemp = Math.max(...dayData.map(h => h.temperature));
  const minTemp = Math.min(...dayData.map(h => h.temperature));
  const range = maxTemp - minTemp;
  return Math.min(10, Math.max(0, Math.round((range / 15) * 3 + (avgHum < 60 ? 2 : 0) + (avgTemp > 20 ? 2 : 0) + (avgTemp > 25 ? 1 : 0) + (avgHum < 40 ? 2 : 0))));
};

const estimateWindAtHeight = (groundSpeed: number, groundDir: number, height: number, cloudCover: number): { speed: number; dir: number } => {
  if (height <= 10) return { speed: groundSpeed, dir: groundDir };
  const shearFactor = Math.pow(1 + (0.03 * (1 + cloudCover / 200)), height / 100);
  const rotation = Math.min(height * 0.03, 45);
  return { speed: Math.round(groundSpeed * shearFactor * 10) / 10, dir: (groundDir + rotation) % 360 };
};

// ==================== COMPONENTE PRINCIPALE ====================
export default function Index() {
  const [selectedId, setSelectedId] = useState<string>("malanotte");
  const [tab, setTab] = useState<string>("meteo");
  const [dayIdx, setDayIdx] = useState(0);
  const [hour, setHour] = useState(new Date().getHours());
  const [hourlyData, setHourlyData] = useState<Record<string, HourData[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const selectedSite = useMemo(() => DECOLLI.find(d => d.id === selectedId) || DECOLLI[0], [selectedId]);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      setError(null);
      const results: Record<string, HourData[]> = {};

      for (const site of DECOLLI) {
        try {
          const params = new URLSearchParams({
            latitude: site.lat.toString(),
            longitude: site.lon.toString(),
            hourly: "temperature_2m,apparent_temperature,relative_humidity_2m,dew_point_2m,precipitation,weather_code,cloud_cover,pressure_msl,wind_speed_10m,wind_direction_10m,wind_gusts_10m,uv_index,is_day",
            timezone: "Europe/Rome",
            forecast_days: "4",
          });

          const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const raw = await res.json();

          results[site.id] = raw.hourly.time.map((t: string, i: number) => ({
            time: new Date(t),
            temperature: raw.hourly.temperature_2m[i],
            feelsLike: raw.hourly.apparent_temperature[i],
            humidity: raw.hourly.relative_humidity_2m[i],
            dewPoint: raw.hourly.dew_point_2m[i],
            precipitation: raw.hourly.precipitation[i],
            weatherCode: raw.hourly.weather_code[i],
            cloudCover: raw.hourly.cloud_cover[i],
            pressure: raw.hourly.pressure_msl[i] ?? null,
            windSpeed: raw.hourly.wind_speed_10m[i],
            windDir: raw.hourly.wind_direction_10m[i],
            windGust: raw.hourly.wind_gusts_10m[i] ?? null,
            soilTemp: null,
            soilMoisture: null,
            uvIndex: raw.hourly.uv_index[i] ?? null,
            isDay: raw.hourly.is_day[i] === 1,
          }));
        } catch (err: any) {
          console.error(`Errore fetch ${site.name}:`, err);
          results[site.id] = [];
        }
      }

      setHourlyData(results);
      setLoading(false);
    };

    fetchAll();
    const interval = setInterval(fetchAll, 120000);
    return () => clearInterval(interval);
  }, []);

  const dayData = useMemo(() => {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + dayIdx);
    const data = hourlyData[selectedId] || [];
    return data.filter(h =>
      h.time.getDate() === targetDate.getDate() &&
      h.time.getMonth() === targetDate.getMonth() &&
      h.time.getFullYear() === targetDate.getFullYear()
    );
  }, [hourlyData, selectedId, dayIdx]);

  const current = useMemo(() => dayData.find(h => h.time.getHours() === hour) || dayData[0] || null, [dayData, hour]);

  const dates = useMemo(() => {
    const arr: Date[] = [];
    for (let i = 0; i < 4; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      arr.push(d);
    }
    return arr;
  }, []);

  const soarIndex = useMemo(() => getSoarIndex(dayData), [dayData]);
  const cloudBase = useMemo(() => {
    if (!current) return 0;
    return getCloudBase(current.temperature, current.dewPoint);
  }, [current]);
  const thermalTop = useMemo(() => {
    if (!current) return 0;
    return getThermalTop(cloudBase, current.temperature, current.humidity);
  }, [current, cloudBase]);

  // Dati per grafico termiche orario (9-19)
  const thermalChartData = useMemo(() => {
    return dayData
      .filter(h => h.time.getHours() >= 9 && h.time.getHours() <= 19)
      .map(h => {
        const cb = getCloudBase(h.temperature, h.dewPoint);
        const tt = getThermalTop(cb, h.temperature, h.humidity);
        return {
          ora: `${h.time.getHours()}:00`,
          temp: Math.round(h.temperature),
          cloudBase: cb,
          thermalTop: tt,
          windSpeed: Math.round(h.windSpeed),
          precip: h.precipitation.toFixed(1),
          hum: h.humidity,
          soar: Math.min(10, Math.max(0, Math.round((h.temperature - 10) * 0.5 + (h.humidity < 60 ? 2 : 0)))),
        };
      });
  }, [dayData]);

  // Dati per meteogramma (giornata intera)
  const meteogramData = useMemo(() => {
    return dayData.map(h => ({
      ora: `${String(h.time.getHours()).padStart(2, "0")}:00`,
      temp: Math.round(h.temperature),
      dew: Math.round(h.dewPoint),
      cloud: h.cloudCover,
      precip: h.precipitation,
      wind: Math.round(h.windSpeed),
      hum: h.humidity,
    }));
  }, [dayData]);

  if (loading && Object.keys(hourlyData).length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">🐰</div>
          <div className="text-xl font-bold text-green-400 animate-pulse">Caricamento dati meteo...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <div className="text-lg text-red-400 mb-2">Errore di caricamento</div>
          <div className="text-sm text-slate-400">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* HEADER */}
      <header className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur-md border-b-2 border-green-600/40 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl md:text-4xl animate-bounce">🐰</span>
            <div>
              <h1 className="text-xl md:text-2xl font-black text-green-400">Meteo dei Conigli</h1>
              <p className="text-[11px] md:text-xs text-slate-400">Previsioni per volo libero • Dati Open-Meteo</p>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="md:hidden px-3 py-2 rounded-lg bg-slate-800 border border-slate-600 hover:bg-slate-700">
            {sidebarOpen ? "✕" : "☰"}
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-4 flex gap-4">
        {/* SIDEBAR */}
        <aside className="hidden md:block w-72 shrink-0">
          <div className="sticky top-20 bg-slate-800/50 border border-green-600/20 rounded-xl overflow-hidden max-h-[calc(100vh-8rem)] overflow-y-auto">
            <div className="p-2 bg-slate-800 border-b border-green-600/20">
              <h2 className="text-xs font-bold text-green-300">🪂 Decolli</h2>
            </div>
            <div className="p-1.5 space-y-1">
              {DECOLLI.map(site => {
                const h = (hourlyData[site.id] || []).find(x => x.time.getHours() === hour);
                const badge = difficultyBadge(site.difficulty);
                const isSelected = site.id === selectedId;
                return (
                  <button key={site.id} onClick={() => { setSelectedId(site.id); setSidebarOpen(false); }}
                    className={`w-full text-left rounded-lg p-2 transition-all border ${isSelected ? "bg-gradient-to-r from-green-900/40 to-slate-700 border-green-500 shadow-lg" : "bg-slate-800/40 border-slate-700/50 hover:bg-slate-700/50"}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-semibold text-green-200 truncate">{site.name}</div>
                        <div className="text-[10px] text-slate-400">{site.valley} · {site.altitude}m</div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="text-[9px] text-slate-500">{site.exposure}</span>
                          <span className={`px-1 rounded text-[8px] font-bold border ${badge.color}`}>{badge.text}</span>
                        </div>
                      </div>
                      {h && (
                        <div className="text-right shrink-0">
                          <div className="text-base">{weatherEmoji(h.weatherCode)}</div>
                          <div className="text-xs font-bold">{Math.round(h.temperature)}°</div>
                          <div className="text-[9px] text-blue-300">{Math.round(h.windSpeed)} km/h</div>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        {/* SIDEBAR MOBILE */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-40 md:hidden">
            <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
            <aside className="absolute left-0 top-0 h-full w-72 bg-slate-900 border-r border-green-600/30 overflow-y-auto">
              <div className="p-3 bg-slate-800 border-b border-green-600/30 flex items-center justify-between">
                <h2 className="text-sm font-bold text-green-300">Decolli</h2>
                <button onClick={() => setSidebarOpen(false)} className="text-xs text-slate-400">✕</button>
              </div>
              <div className="p-2 space-y-1">
                {DECOLLI.map(site => {
                  const h = (hourlyData[site.id] || []).find(x => x.time.getHours() === hour);
                  const isSelected = site.id === selectedId;
                  return (
                    <button key={site.id} onClick={() => { setSelectedId(site.id); setSidebarOpen(false); }}
                      className={`w-full text-left rounded-lg p-2.5 border ${isSelected ? "bg-green-900/30 border-green-500" : "bg-slate-800/40 border-slate-700/50"}`}
                    >
                      <div className="text-xs font-bold text-green-200">{site.name}</div>
                      <div className="text-[10px] text-slate-400">{site.valley} · {site.altitude}m</div>
                      {h && <div className="text-xs mt-1">{Math.round(h.temperature)}° · {Math.round(h.windSpeed)} km/h</div>}
                    </button>
                  );
                })}
              </div>
            </aside>
          </div>
        )}

        {/* CONTENUTO PRINCIPALE */}
        <main className="flex-1 min-w-0">
          {/* HEADER DECOLLO */}
          {current && (
            <div className="bg-gradient-to-r from-slate-800/80 to-slate-700/80 rounded-2xl p-4 border border-green-600/30 mb-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-lg font-bold text-green-300">{selectedSite.name}</h2>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${difficultyBadge(selectedSite.difficulty).color}`}>{difficultyBadge(selectedSite.difficulty).text}</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{selectedSite.valley} · {selectedSite.exposure} · {selectedSite.altitude}m</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-slate-300">
                    <span>💨 {Math.round(current.windSpeed)} km/h {windDirText(current.windDir)}</span>
                    <span>🌡️ {Math.round(current.temperature)}°C</span>
                    <span>💧 {current.humidity}%</span>
                    <span>☁️ {current.cloudCover}%</span>
                  </div>
                </div>
                <div className="text-4xl">{weatherEmoji(current.weatherCode)}</div>
              </div>
            </div>
          )}

          {/* TAB NAVIGATION */}
          <div className="flex gap-1 bg-slate-800/60 rounded-xl p-1 border border-slate-700/50 mb-3 overflow-x-auto">
            {[
              { id: "meteo", label: "Meteo", icon: "🌤️" },
              { id: "venti", label: "Venti", icon: "💨" },
              { id: "termiche", label: "Termiche", icon: "🔥" },
              { id: "analisi", label: "Analisi AI", icon: "🤖" },
            ].map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${tab === t.id ? "bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg scale-105" : "text-slate-300 hover:text-white hover:bg-slate-700/50"}`}
              >
                <span>{t.icon}</span>
                <span>{t.label}</span>
              </button>
            ))}
          </div>

          {/* CONTENUTO DINAMICO */}
          <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-4">
            {/* SELEZIONE GIORNO */}
            <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
              {dates.map((d, i) => (
                <button key={i} onClick={() => setDayIdx(i)}
                  className={`shrink-0 px-4 py-2 rounded-xl text-xs font-bold border-2 transition-all ${dayIdx === i ? "bg-blue-600 text-white border-blue-400 shadow-lg" : "bg-slate-700/60 text-slate-300 border-slate-600 hover:bg-slate-600"}`}
                >
                  {getDayLabel(d)}
                </button>
              ))}
            </div>

            {/* SLIDER ORA */}
            <div className="mb-4">
              <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                <span>00:00</span>
                <span className="text-sm font-bold text-white">{String(hour).padStart(2, "0")}:00</span>
                <span>23:00</span>
              </div>
              <input type="range" min={0} max={23} value={hour} onChange={e => setHour(Number(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <div className="flex justify-between text-[8px] text-slate-500 mt-0.5">
                {[0, 3, 6, 9, 12, 15, 18, 21].map(h => <span key={h}>{String(h).padStart(2, "0")}:00</span>)}
              </div>
            </div>

            {/* TAB: METEO */}
            {tab === "meteo" && current && (
              <div className="space-y-3">
                {/* Allerta meteo */}
                {(() => {
                  const codes = dayData.map(h => h.weatherCode);
                  let alert = { text: "✅ Nessun temporale previsto", color: "bg-green-800/50 border-green-500" };
                  if (codes.some(c => c >= 95 && c <= 99)) alert = { text: "⛈️ ALLERTA TEMPORALI – Volo sconsigliato", color: "bg-red-800/80 border-red-500" };
                  else if (codes.some(c => c >= 80 && c <= 82)) alert = { text: "⚠️ Possibili temporali/rovesci – Attenzione", color: "bg-yellow-800/60 border-yellow-500" };
                  else if (dayData.reduce((s, h) => s + h.cloudCover, 0) / dayData.length < 20) alert = { text: "☀️ Cielo sereno – Nessun temporale", color: "bg-green-800/50 border-green-500" };
                  return <div className={`${alert.color} border-2 rounded-xl p-3 text-xs font-bold`}>{alert.text}</div>;
                })()}

                {/* Griglia 8 card */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <div className="bg-slate-700/50 rounded-xl p-3 text-center">
                    <div className="text-[10px] text-slate-400 uppercase mb-1">Temperatura</div>
                    <div className="text-2xl font-black text-white">{Math.round(current.temperature)}°</div>
                    <div className="text-[10px] text-slate-500">Percepita {Math.round(current.feelsLike)}°</div>
                  </div>
                  <div className="bg-slate-700/50 rounded-xl p-3 text-center">
                    <div className="text-[10px] text-slate-400 uppercase mb-1">Umidità</div>
                    <div className="text-2xl font-black text-blue-300">{current.humidity}%</div>
                    <div className="text-[10px] text-slate-500">P. rugiada {Math.round(current.dewPoint)}°</div>
                  </div>
                  <div className="bg-slate-700/50 rounded-xl p-3 text-center">
                    <div className="text-[10px] text-slate-400 uppercase mb-1">Nuvolosità</div>
                    <div className="text-2xl font-black text-white">{current.cloudCover}%</div>
                    <div className="text-[10px] text-slate-500">{weatherText(current.weatherCode)}</div>
                  </div>
                  <div className="bg-slate-700/50 rounded-xl p-3 text-center">
                    <div className="text-[10px] text-slate-400 uppercase mb-1">Pioggia</div>
                    <div className="text-2xl font-black text-cyan-300">{current.precipitation.toFixed(1)}mm</div>
                    <div className="text-[10px] text-slate-500">{current.precipitation > 0 ? "Pioggia in corso" : "Nessuna"}</div>
                  </div>
                  <div className="bg-slate-700/50 rounded-xl p-3 text-center">
                    <div className="text-[10px] text-slate-400 uppercase mb-1">Base nuvole</div>
                    <div className="text-2xl font-black text-amber-300">{cloudBase}m</div>
                    <div className="text-[10px] text-slate-500">LCL calcolata</div>
                  </div>
                  <div className="bg-slate-700/50 rounded-xl p-3 text-center">
                    <div className="text-[10px] text-slate-400 uppercase mb-1">Plafond termico</div>
                    <div className="text-2xl font-black text-emerald-300">{thermalTop}m</div>
                    <div className="text-[10px] text-slate-500">Quota massima</div>
                  </div>
                  <div className="bg-slate-700/50 rounded-xl p-3 text-center">
                    <div className="text-[10px] text-slate-400 uppercase mb-1">Soaring Index</div>
                    <div className="text-2xl font-black text-purple-300">{soarIndex}/10</div>
                    <div className="text-[10px] text-slate-500">
                      {soarIndex >= 8 ? "Eccellente ⭐" : soarIndex >= 5 ? "Buono 👍" : soarIndex >= 3 ? "Limitato" : "Scarso"}
                    </div>
                  </div>
                  <div className="bg-slate-700/50 rounded-xl p-3 text-center">
                    <div className="text-[10px] text-slate-400 uppercase mb-1">Vento</div>
                    <div className="text-2xl font-black text-blue-300">{Math.round(current.windSpeed)}</div>
                    <div className="text-[10px] text-slate-500">{windDirText(current.windDir)} raffiche {Math.round(current.windGust || 0)} km/h</div>
                  </div>
                </div>

                {/* Pressione */}
                {current.pressure && (
                  <div className="bg-slate-700/40 rounded-xl p-3 flex items-center justify-between">
                    <span className="text-xs text-slate-300">Pressione atmosferica</span>
                    <span className="text-lg font-bold text-white">{Math.round(current.pressure)} hPa</span>
                  </div>
                )}

                {/* Meteogramma 24h */}
                <div className="bg-slate-700/30 rounded-xl p-3">
                  <h3 className="text-xs font-bold text-slate-300 mb-2">Meteogramma 24h</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <ComposedChart data={meteogramData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="ora" tick={{ fontSize: 9, fill: "#94a3b8" }} interval={2} />
                      <YAxis yAxisId="left" tick={{ fontSize: 9, fill: "#94a3b8" }} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 9, fill: "#94a3b8" }} />
                      <Tooltip contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #475569", borderRadius: 8, fontSize: 11 }} />
                      <Legend wrapperStyle={{ fontSize: 10 }} />
                      <Line yAxisId="left" type="monotone" dataKey="temp" stroke="#f97316" strokeWidth={2} dot={false} name="Temp °C" />
                      <Line yAxisId="left" type="monotone" dataKey="dew" stroke="#38bdf8" strokeWidth={1.5} dot={false} name="P. rugiada °C" />
                      <Area yAxisId="left" type="monotone" dataKey="cloud" fill="#475569" stroke="#64748b" fillOpacity={0.3} name="Nuvolosità %" />
                      <Bar yAxisId="left" dataKey="precip" fill="#22d3ee" opacity={0.6} name="Pioggia mm" />
                      <Line yAxisId="right" type="monotone" dataKey="wind" stroke="#a78bfa" strokeWidth={1.5} dot={false} name="Vento km/h" />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* TAB: VENTI */}
            {tab === "venti" && current && (
              <div className="space-y-3">
                {/* Venti a 3 quote */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  {[
                    { label: "10m (suolo)", height: 10 },
                    { label: "80m (quota termica)", height: 80 },
                    { label: "120m (alta quota)", height: 120 },
                  ].map(q => {
                    const w = estimateWindAtHeight(current.windSpeed, current.windDir, q.height, current.cloudCover);
                    return (
                      <div key={q.height} className="bg-slate-700/50 rounded-xl p-3 text-center">
                        <div className="text-[10px] text-slate-400 uppercase mb-1">{q.label}</div>
                        <div className="text-2xl font-black text-blue-300">{Math.round(w.speed)} km/h</div>
                        <div className="text-xs text-slate-300 mt-1">{windDirText(w.dir)} {windArrow(w.dir)}</div>
                        <div className="text-[10px] text-slate-500">Raffiche: ~{Math.round(w.speed * 1.3)} km/h</div>
                      </div>
                    );
                  })}
                </div>

                {/* Profilo vento completo */}
                <div className="bg-slate-700/30 rounded-xl p-3">
                  <h3 className="text-xs font-bold text-slate-300 mb-2">Profilo vento verticale</h3>
                  <div className="space-y-1 max-h-72 overflow-y-auto">
                    {Array.from({ length: 16 }, (_, i) => (i + 1) * 250).map(h => {
                      const w = estimateWindAtHeight(current.windSpeed, current.windDir, h, current.cloudCover);
                      const barColor = w.speed < 10 ? "bg-green-500" : w.speed < 20 ? "bg-yellow-500" : w.speed < 30 ? "bg-orange-500" : "bg-red-500";
                      return (
                        <div key={h} className="flex items-center gap-2 text-[11px]">
                          <span className="w-14 text-slate-400 font-mono">{h}m</span>
                          <div className="flex-1 h-4 bg-slate-700/80 rounded-full overflow-hidden">
                            <div className={`h-full ${barColor} rounded-full transition-all`} style={{ width: `${Math.min(100, (w.speed / 50) * 100)}%` }} />
                          </div>
                          <span className="w-14 text-right text-white font-bold">{Math.round(w.speed)} km/h</span>
                          <span className="w-10 text-slate-400">{windDirText(w.dir)}</span>
                          <span className="text-sm">{windArrow(w.dir)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Wind shear */}
                <div className="bg-slate-700/40 rounded-xl p-3">
                  <h3 className="text-xs font-bold text-slate-300 mb-1">Analisi Wind Shear</h3>
                  {(() => {
                    const h80 = estimateWindAtHeight(current.windSpeed, current.windDir, 80, current.cloudCover);
                    const h10 = estimateWindAtHeight(current.windSpeed, current.windDir, 10, current.cloudCover);
                    const diff = Math.abs(h80.speed - h10.speed);
                    const level = diff > 15 ? "ALTO" : diff > 8 ? "MEDIO" : "BASSO";
                    const color = diff > 15 ? "text-red-400 bg-red-900/30 border-red-500" : diff > 8 ? "text-orange-400 bg-orange-900/30 border-orange-500" : "text-green-400 bg-green-900/30 border-green-500";
                    return (
                      <div className={`${color} border rounded-lg p-2 text-xs font-bold text-center`}>
                        Rischio wind shear: {level} (diff {diff.toFixed(1)} km/h tra 80m e 10m)
                      </div>
                    );
                  })()}
                </div>

                {/* Previsione oraria vento 9-19 */}
                <div className="bg-slate-700/30 rounded-xl p-3">
                  <h3 className="text-xs font-bold text-slate-300 mb-2">Previsione oraria vento (9:00-19:00)</h3>
                  <div className="grid grid-cols-11 gap-1">
                    {dayData.filter(h => h.time.getHours() >= 9 && h.time.getHours() <= 19).map(h => (
                      <div key={h.time.getHours()} className="bg-slate-700/50 rounded-lg p-1.5 text-center">
                        <```tsx
                        <div className="text-[9px] text-slate-400">{String(h.time.getHours()).padStart(2, "0")}:00</div>
                        <div className="text-base my-0.5">{windArrow(h.windDir)}</div>
                        <div className="text-[10px] font-bold text-white">{Math.round(h.windSpeed)}</div>
                        <div className="text-[8px] text-slate-500">{windDirText(h.windDir)}</div>
                        <div className="text-sm mt-0.5">{weatherEmoji(h.weatherCode)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB: TERMICHE */}
            {tab === "termiche" && current && (
              <div className="space-y-3">
                {/* Panoramica termiche */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  <div className="bg-slate-700/50 rounded-xl p-3 text-center">
                    <div className="text-[10px] text-slate-400 uppercase mb-1">Temp. media giorno</div>
                    <div className="text-xl font-black text-white">{Math.round(dayData.reduce((s, h) => s + h.temperature, 0) / (dayData.length || 1))}°</div>
                  </div>
                  <div className="bg-slate-700/50 rounded-xl p-3 text-center">
                    <div className="text-[10px] text-slate-400 uppercase mb-1">Delta termico</div>
                    <div className="text-xl font-black text-orange-300">{Math.round(Math.max(...dayData.map(h => h.temperature)) - Math.min(...dayData.map(h => h.temperature)))}°</div>
                  </div>
                  <div className="bg-slate-700/50 rounded-xl p-3 text-center">
                    <div className="text-[10px] text-slate-400 uppercase mb-1">Nuvolosità media</div>
                    <div className="text-xl font-black text-white">{Math.round(dayData.reduce((s, h) => s + h.cloudCover, 0) / (dayData.length || 1))}%</div>
                  </div>
                  <div className="bg-slate-700/50 rounded-xl p-3 text-center">
                    <div className="text-[10px] text-slate-400 uppercase mb-1">Umidità media</div>
                    <div className="text-xl font-black text-blue-300">{Math.round(dayData.reduce((s, h) => s + h.humidity, 0) / (dayData.length || 1))}%</div>
                  </div>
                  <div className="bg-slate-700/50 rounded-xl p-3 text-center">
                    <div className="text-[10px] text-slate-400 uppercase mb-1">Base nuvole</div>
                    <div className="text-xl font-black text-amber-300">{cloudBase}m</div>
                  </div>
                  <div className="bg-slate-700/50 rounded-xl p-3 text-center">
                    <div className="text-[10px] text-slate-400 uppercase mb-1">Plafond max</div>
                    <div className="text-xl font-black text-emerald-300">{thermalTop}m</div>
                  </div>
                </div>

                {/* Soaring index */}
                <div className="bg-slate-700/40 rounded-xl p-3 text-center">
                  <div className="text-[10px] text-slate-400 uppercase mb-1">Soaring Index</div>
                  <div className="text-3xl font-black text-purple-300">{soarIndex}/10</div>
                  <div className="text-xs font-bold mt-1">
                    {soarIndex >= 8 ? <span className="text-green-400">Eccellente ⭐</span> : 
                     soarIndex >= 5 ? <span className="text-blue-400">Buono 👍</span> : 
                     soarIndex >= 3 ? <span className="text-yellow-400">Limitato</span> : 
                     <span className="text-red-400">Scarso</span>}
                  </div>
                </div>

                {/* Grafico sviluppo termiche orario */}
                <div className="bg-slate-700/30 rounded-xl p-3">
                  <h3 className="text-xs font-bold text-slate-300 mb-2">Sviluppo termiche orario (9:00-19:00)</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <ComposedChart data={thermalChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="ora" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                      <YAxis yAxisId="left" tick={{ fontSize: 9, fill: "#94a3b8" }} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 9, fill: "#94a3b8" }} />
                      <Tooltip contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #475569", borderRadius: 8, fontSize: 11 }} />
                      <Legend wrapperStyle={{ fontSize: 10 }} />
                      <Area yAxisId="left" type="monotone" dataKey="cloudBase" fill="#d97706" stroke="#f59e0b" fillOpacity={0.3} name="Base nuvole m" />
                      <Area yAxisId="left" type="monotone" dataKey="thermalTop" fill="#059669" stroke="#10b981" fillOpacity={0.3} name="Plafond termico m" />
                      <Line yAxisId="right" type="monotone" dataKey="temp" stroke="#f97316" strokeWidth={2} dot={{ r: 3 }} name="Temp °C" />
                      <Bar yAxisId="left" dataKey="soar" fill="#a855f7" opacity={0.4} name="Soaring Index" />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>

                {/* Valutazione cross country */}
                <div className={`rounded-xl p-3 border-2 text-xs font-bold text-center ${soarIndex >= 8 ? "text-green-400 bg-green-900/30 border-green-500/50" : soarIndex >= 5 ? "text-blue-400 bg-blue-900/30 border-blue-500/50" : soarIndex >= 3 ? "text-yellow-400 bg-yellow-900/30 border-yellow-500/50" : "text-red-400 bg-red-900/30 border-red-500/50"}`}>
                  {soarIndex >= 8 ? "Eccellente ⭐ – Termiche forti, plafond elevato" : 
                   soarIndex >= 5 ? "Buono 👍 – Buone condizioni per distanza" : 
                   soarIndex >= 3 ? "Limitato – Condizioni limitate per XC" : 
                   "Sconsigliato ❌ – Termiche deboli"}
                </div>
              </div>
            )}

            {/* TAB: ANALISI AI */}
            {tab === "analisi" && current && (
              <div className="space-y-3">
                {/* Panoramica generale */}
                <div className="bg-slate-700/30 rounded-xl p-3">
                  <h3 className="text-sm font-bold text-green-300 mb-1">📋 Panoramica generale</h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Giornata al decollo {selectedSite.name} ({selectedSite.altitude}m, esposto {selectedSite.exposure}).
                    Temperatura media {Math.round(dayData.reduce((s, h) => s + h.temperature, 0) / (dayData.length || 1))}°C, 
                    minima {Math.round(Math.min(...dayData.map(h => h.temperature)))}°C, 
                    massima {Math.round(Math.max(...dayData.map(h => h.temperature)))}°C. 
                    Vento medio {Math.round(dayData.reduce((s, h) => s + h.windSpeed, 0) / (dayData.length || 1))} km/h da {windDirText(current.windDir)}. 
                    Precipitazioni totali: {dayData.reduce((s, h) => s + h.precipitation, 0).toFixed(1)}mm.
                    {soarIndex >= 6 ? " Buone condizioni per il volo libero." : " Condizioni meteo da valutare con attenzione."}
                  </p>
                </div>

                {/* Analisi termiche */}
                <div className="bg-slate-700/30 rounded-xl p-3">
                  <h3 className="text-sm font-bold text-orange-300 mb-1">🔥 Analisi termiche</h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Base nuvole stimata a {cloudBase}m, plafond termico massimo {thermalTop}m. 
                    Delta termico {Math.round(Math.max(...dayData.map(h => h.temperature)) - Math.min(...dayData.map(h => h.temperature)))}°C. 
                    Soaring Index {soarIndex}/10. 
                    {soarIndex >= 8 ? " Termiche eccellenti, ottimo galleggiamento." : 
                     soarIndex >= 5 ? " Termiche buone, condizioni favorevoli." : 
                     soarIndex >= 3 ? " Termiche limitate, volo possibile ma con attenzione." : 
                     " Termiche deboli, sconsigliato il volo libero."}
                  </p>
                </div>

                {/* Analisi vento */}
                <div className="bg-slate-700/30 rounded-xl p-3">
                  <h3 className="text-sm font-bold text-blue-300 mb-1">💨 Analisi vento</h3>
                  {(() => {
                    const h80 = estimateWindAtHeight(current.windSpeed, current.windDir, 80, current.cloudCover);
                    const h10 = estimateWindAtHeight(current.windSpeed, current.windDir, 10, current.cloudCover);
                    const h120 = estimateWindAtHeight(current.windSpeed, current.windDir, 120, current.cloudCover);
                    const windOk = Math.abs(windDirToDeg(selectedSite.exposure) - current.windDir) < 45 || Math.abs(windDirToDeg(selectedSite.exposure) - current.windDir) > 315;
                    return (
                      <p className="text-xs text-slate-300 leading-relaxed">
                        Vento suolo: {Math.round(h10.speed)} km/h da {windDirText(h10.dir)}. 
                        Quota termica (80m): {Math.round(h80.speed)} km/h da {windDirText(h80.dir)}. 
                        Alta quota (120m): {Math.round(h120.speed)} km/h da {windDirText(h120.dir)}. 
                        Esposizione decollo: {selectedSite.exposure}. 
                        {windOk ? " Vento compatibile con esposizione del decollo ✅." : " Vento non ideale per esposizione decollo ⚠️."}
                        {h10.speed > 25 ? " Vento forte, sconsigliato il decollo." : h10.speed > 15 ? " Vento moderato, volo possibile con esperienza." : " Vento debole/moderato, condizioni favorevoli."}
                      </p>
                    );
                  })()}
                </div>

                {/* Allerta temporali */}
                <div className="bg-slate-700/30 rounded-xl p-3">
                  <h3 className="text-sm font-bold text-red-300 mb-1">⛈️ Allerta temporali</h3>
                  {(() => {
                    const codes = dayData.map(h => h.weatherCode);
                    let text = "✅ Nessun temporale previsto – Cielo sereno o poco nuvoloso.";
                    let color = "text-green-400";
                    if (codes.some(c => c >= 95 && c <= 99)) {
                      text = "⛔ ALLERTA ROSSA – Temporali in corso. Volo ASSOLUTAMENTE SCONSIGLIATO.";
                      color = "text-red-400";
                    } else if (codes.some(c => c >= 80 && c <= 82)) {
                      text = "⚠️ ATTENZIONE GIALLA – Possibili rovesci o temporali. Valutare con cautela.";
                      color = "text-yellow-400";
                    } else if (dayData.reduce((s, h) => s + h.cloudCover, 0) / dayData.length < 20) {
                      text = "☀️ Cielo sereno – Nessun rischio temporali.";
                      color = "text-green-400";
                    }
                    return <p className={`text-xs ${color} leading-relaxed`}>{text}</p>;
                  })()}
                </div>

                {/* Consigli per il volo */}
                <div className="bg-slate-700/30 rounded-xl p-3">
                  <h3 className="text-sm font-bold text-green-300 mb-1">🎯 Consigli per il volo</h3>
                  <div className="space-y-1 text-xs text-slate-300">
                    {current.windSpeed > 25 && <p>⚠️ Vento forte ({Math.round(current.windSpeed)} km/h) – Sconsigliato il decollo.</p>}
                    {current.windSpeed <= 25 && current.windSpeed > 10 && <p>✅ Vento ideale ({Math.round(current.windSpeed)} km/h) – Buone condizioni.</p>}
                    {current.windSpeed <= 10 && <p>💨 Vento debole ({Math.round(current.windSpeed)} km/h) – Volo possibile.</p>}
                    {soarIndex >= 7 && <p>🔥 Termiche forti – Ottimo per cross country.</p>}
                    {soarIndex >= 4 && soarIndex < 7 && <p>👍 Termiche medie – Buone per volo locale.</p>}
                    {soarIndex < 4 && <p>❄️ Termiche deboli – Volo sconsigliato, poca portanza.</p>}
                    <p className="mt-1 text-slate-400">
                      {soarIndex >= 6 && current.windSpeed <= 20 
                        ? "🌟 Momento migliore: condizioni ottimali per volo libero."
                        : "📌 Valutare attentamente le condizioni prima di decollare."}
                    </p>
                  </div>
                </div>

                {/* Analisi pressione */}
                {current.pressure && (
                  <div className="bg-slate-700/30 rounded-xl p-3">
                    <h3 className="text-sm font-bold text-cyan-300 mb-1">🔄 Analisi pressione</h3>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Pressione attuale: {Math.round(current.pressure)} hPa. 
                      Media giornaliera: {Math.round(dayData.reduce((s, h) => s + (h.pressure || 0), 0) / dayData.filter(h => h.pressure).length)} hPa. 
                      {current.pressure > 1020 ? " Alta pressione – bel tempo stabile." : 
                       current.pressure > 1010 ? " Pressione normale – condizioni standard." : 
                       " Pressione in calo – possibile peggioramento."}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

// Funzione helper per esposizione
function windDirToDeg(exposure: string): number {
  const map: Record<string, number> = {
    "N": 0, "NNE": 22.5, "NE": 45, "ENE": 67.5, "E": 90, "ESE": 112.5, "SE": 135, "SSE": 157.5,
    "S": 180, "SSW": 202.5, "SW": 225, "WSW": 247.5, "W": 270, "WNW": 292.5, "NW": 315, "NNW": 337.5,
    "S/SE": 157.5, "SO": 225, "S/SW": 202.5, "NE": 45,
  };
  const upper = exposure.toUpperCase().trim();
  return map[upper] || 180;
}