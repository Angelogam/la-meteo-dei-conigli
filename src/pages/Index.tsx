"use client";

import React, { useState, useEffect, useMemo } from "react";
import { DECOLLI } from "@/data/decolli";
import type { HourData } from "@/types/meteo";

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

const windDirText = (deg: number): string => {
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return dirs[Math.round(deg / 22.5) % 16];
};

const difficultyBadge = (d: number) => {
  if (d === 1) return { text: "D1", color: "bg-green-700 text-green-200 border-green-500" };
  if (d === 2) return { text: "D2", color: "bg-yellow-700 text-yellow-200 border-yellow-500" };
  return { text: "D3", color: "bg-red-700 text-red-200 border-red-500" };
};

const getDayLabel = (d: Date): string => {
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return "Oggi";
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (d.toDateString() === tomorrow.toDateString()) return "Domani";
  return d.toLocaleDateString("it-IT", { weekday: "short", day: "numeric" });
};

// ==================== COMPONENTE PRINCIPALE ====================
export default function Index() {
  const [selectedId, setSelectedId] = useState<string>("malanotte");
  const [dayIdx, setDayIdx] = useState(0);
  const [hour, setHour] = useState(new Date().getHours());
  const [hourlyData, setHourlyData] = useState<Record<string, HourData[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const selectedSite = useMemo(() => DECOLLI.find(d => d.id === selectedId) || DECOLLI[0], [selectedId]);

  // Fetch dati per tutti i decolli
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

  // Dati del giorno selezionato
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

  // Calcolo termiche semplici
  const calcThermal = () => {
    if (!current) return { cloudBase: 0, thermalTop: 0, soarIndex: 0 };
    const cb = Math.round(Math.max(0, (current.temperature - current.dewPoint) * 125));
    const tt = cb + 300;
    return { cloudBase: cb, thermalTop: tt, soarIndex: Math.min(10, Math.max(0, Math.round((current.temperature - 10) * 0.5 + (current.humidity < 60 ? 2 : 0)))) };
  };

  const thermal = calcThermal();

  if (loading && Object.keys(hourlyData).length === 0) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">🐰</div>
          <div className="text-xl font-bold text-green-400 animate-pulse">Caricamento...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <div className="text-lg text-red-400 mb-2">Errore</div>
          <div className="text-sm text-slate-400">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* HEADER */}
      <header className="sticky top-0 z-50 bg-slate-900/90 backdrop-blur border-b border-green-600/30 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🐰</span>
            <div>
              <h1 className="text-lg font-bold text-green-400">Meteo dei Conigli</h1>
              <p className="text-[10px] text-slate-400">Previsioni volo libero</p>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="md:hidden px-3 py-1.5 rounded-lg bg-slate-700 border border-slate-600 text-xs">
            {sidebarOpen ? "Chiudi" : "Decolli"}
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-4 flex gap-4">
        {/* SIDEBAR - SEMPRE VISIBILE SU DESKTOP */}
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
                  <button
                    key={site.id}
                    onClick={() => { setSelectedId(site.id); setSidebarOpen(false); }}
                    className={`w-full text-left rounded-lg p-2 transition-all border ${isSelected ? "bg-green-900/30 border-green-500" : "bg-slate-800/40 border-slate-700/50 hover:bg-slate-700/50"}`}
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
                <button onClick={() => setSidebarOpen(false)} className="text-xs text-slate-400">Chiudi</button>
              </div>
              <div className="p-2 space-y-1">
                {DECOLLI.map(site => {
                  const h = (hourlyData[site.id] || []).find(x => x.time.getHours() === hour);
                  const badge = difficultyBadge(site.difficulty);
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
          {/* INFO DECOLLO */}
          {current && (
            <div className="bg-gradient-to-r from-slate-800 to-slate-700 rounded-xl p-4 border border-green-600/20 mb-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-green-300">{selectedSite.name}</h2>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${difficultyBadge(selectedSite.difficulty).color}`}>
                      {difficultyBadge(selectedSite.difficulty).text}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">{selectedSite.valley} · {selectedSite.exposure} · {selectedSite.altitude}m</p>
                </div>
                <div className="text-3xl">{weatherEmoji(current.weatherCode)}</div>
              </div>
              <div className="flex gap-4 mt-2 text-xs text-slate-300">
                <span>💨 {Math.round(current.windSpeed)} km/h {windDirText(current.windDir)}</span>
                <span>🌡️ {Math.round(current.temperature)}°C</span>
                <span>💧 {current.humidity}%</span>
                <span>☁️ {current.cloudCover}%</span>
              </div>
            </div>
          )}

          {/* SELEZIONE GIORNO */}
          <div className="flex gap-2 mb-3 overflow-x-auto">
            {dates.map((d, i) => (
              <button key={i} onClick={() => setDayIdx(i)}
                className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold border-2 transition-all ${dayIdx === i ? "bg-blue-600 text-white border-blue-400" : "bg-slate-700 text-slate-300 border-slate-600 hover:bg-slate-600"}`}
              >
                {getDayLabel(d)}
              </button>
            ))}
          </div>

          {/* SLIDER ORA */}
          <div className="mb-3">
            <div className="flex justify-between text-[10px] text-slate-400 mb-1">
              <span>00:00</span>
              <span className="text-sm font-bold text-white">{String(hour).padStart(2, "0")}:00</span>
              <span>23:00</span>
            </div>
            <input type="range" min={0} max={23} value={hour} onChange={e => setHour(Number(e.target.value))}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
          </div>

          {/* GRIGLIA METEO 8 CARD */}
          {current && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div className="bg-slate-700/50 rounded-xl p-3 text-center">
                <div className="text-[10px] text-slate-400 uppercase">Temperatura</div>
                <div className="text-2xl font-bold text-white">{Math.round(current.temperature)}°</div>
                <div className="text-[10px] text-slate-500">Percepita {Math.round(current.feelsLike)}°</div>
              </div>
              <div className="bg-slate-700/50 rounded-xl p-3 text-center">
                <div className="text-[10px] text-slate-400 uppercase">Umidità</div>
                <div className="text-2xl font-bold text-blue-300">{current.humidity}%</div>
                <div className="text-[10px] text-slate-500">P. rugiada {Math.round(current.dewPoint)}°</div>
              </div>
              <div className="bg-slate-700/50 rounded-xl p-3 text-center">
                <div className="text-[10px] text-slate-400 uppercase">Nuvolosità</div>
                <div className="text-2xl font-bold text-white">{current.cloudCover}%</div>
                <div className="text-[10px] text-slate-500">{current.cloudCover < 20 ? "Sereno" : current.cloudCover < 50 ? "Poco nuvoloso" : "Nuvoloso"}</div>
              </div>
              <div className="bg-slate-700/50 rounded-xl p-3 text-center">
                <div className="text-[10px] text-slate-400 uppercase">Pioggia</div>
                <div className="text-2xl font-bold text-cyan-300">{current.precipitation.toFixed(1)}mm</div>
                <div className="text-[10px] text-slate-500">{current.precipitation > 0 ? "Pioggia" : "Nessuna"}</div>
              </div>
              <div className="bg-slate-700/50 rounded-xl p-3 text-center">
                <div className="text-[10px] text-slate-400 uppercase">Base nuvole</div>
                <div className="text-2xl font-bold text-amber-300">{thermal.cloudBase}m</div>
                <div className="text-[10px] text-slate-500">LCL stimata</div>
              </div>
              <div className="bg-slate-700/50 rounded-xl p-3 text-center">
                <div className="text-[10px] text-slate-400 uppercase">Plafond termico</div>
                <div className="text-2xl font-bold text-emerald-300">{thermal.thermalTop}m</div>
                <div className="text-[10px] text-slate-500">Quota max</div>
              </div>
              <div className="bg-slate-700/50 rounded-xl p-3 text-center">
                <div className="text-[10px] text-slate-400 uppercase">Soaring Index</div>
                <div className="text-2xl font-bold text-purple-300">{thermal.soarIndex}/10</div>
                <div className="text-[10px] text-slate-500">{thermal.soarIndex >= 7 ? "Eccellente" : thermal.soarIndex >= 5 ? "Buono" : thermal.soarIndex >= 3 ? "Limitato" : "Scarso"}</div>
              </div>
              <div className="bg-slate-700/50 rounded-xl p-3 text-center">
                <div className="text-[10px] text-slate-400 uppercase">Vento</div>
                <div className="text-2xl font-bold text-blue-300">{Math.round(current.windSpeed)}</div>
                <div className="text-[10px] text-slate-500">{windDirText(current.windDir)} raffiche {Math.round(current.windGust || 0)} km/h</div>
              </div>
            </div>
          )}

          {!current && (
            <div className="text-center py-8 text-slate-400 text-sm">
              Seleziona un giorno e un'ora per vedere i dati
            </div>
          )}
        </main>
      </div>
    </div>
  );
}