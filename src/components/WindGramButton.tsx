"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Wind, X, CloudSun } from "lucide-react";

interface WindGramButtonProps {
  dayData: any[];
  siteAltitude: number;
  siteName?: string;
  lat?: number;
  lon?: number;
}

interface WindLevel {
  alt: number;
  speed: number;
  dir: number;
}

interface HourWind {
  hour: number;
  surfaceSpeed: number;
  surfaceDir: number;
  gust: number;
  cloud: number;
  temp: number;
  levels: WindLevel[];
}

const WIND_LEVELS_M = [0, 300, 600, 900, 1500, 2000, 2500, 3000, 3500, 4500];

const WindGramButton = ({ dayData, siteAltitude, siteName, lat, lon }: WindGramButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [windData, setWindData] = useState<HourWind[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchWindProfile = useCallback(async () => {
    if (!lat || !lon) {
      // Fallback: dati dal dayData
      if (!dayData || dayData.length === 0) {
        setError("Nessun dato");
        return;
      }
      const hours = dayData
        .filter((h: any) => {
          const hh = h.time?.getHours?.() ?? h.hour ?? 0;
          return hh >= 8 && hh <= 19;
        })
        .sort((a: any, b: any) => (a.time?.getHours?.() ?? a.hour) - (b.time?.getHours?.() ?? b.hour));
      
      const data: HourWind[] = hours.map((h: any) => {
        const hh = h.time?.getHours?.() ?? h.hour ?? 0;
        return {
          hour: hh,
          surfaceSpeed: h.windSpeed || 0,
          surfaceDir: h.windDir || 0,
          gust: h.windGusts || 0,
          cloud: h.cloudCover || 0,
          temp: h.temperature || 0,
          levels: [
            { alt: 0, speed: h.windSpeed || 0, dir: h.windDir || 0 },
          ],
        };
      });
      setWindData(data);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Chiamata diretta a Open-Meteo per profilo vento verticale
      const params = new URLSearchParams({
        latitude: lat.toString(),
        longitude: lon.toString(),
        hourly: [
          "temperature_2m",
          "wind_speed_10m",
          "wind_direction_10m",
          "wind_gusts_10m",
          "cloud_cover",
          "wind_speed_80m",
          "wind_direction_80m",
          "wind_speed_300m",
          "wind_direction_300m",
          "wind_speed_600m",
          "wind_direction_600m",
          "wind_speed_1000m",
          "wind_direction_1000m",
          "wind_speed_1500m",
          "wind_direction_1500m",
          "wind_speed_2000m",
          "wind_direction_2000m",
          "wind_speed_2500m",
          "wind_direction_2500m",
          "wind_speed_3000m",
          "wind_direction_3000m",
          "wind_speed_4000m",
          "wind_direction_4000m",
        ].join(","),
        timezone: "Europe/Rome",
        forecast_days: "3",
      });

      const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const raw = await res.json();

      const times: string[] = raw.hourly.time || [];
      const speeds80 = raw.hourly.wind_speed_80m || [];
      const dirs80 = raw.hourly.wind_direction_80m || [];
      const speeds300 = raw.hourly.wind_speed_300m || [];
      const dirs300 = raw.hourly.wind_direction_300m || [];
      const speeds600 = raw.hourly.wind_speed_600m || [];
      const dirs600 = raw.hourly.wind_direction_600m || [];
      const speeds1000 = raw.hourly.wind_speed_1000m || [];
      const dirs1000 = raw.hourly.wind_direction_1000m || [];
      const speeds1500 = raw.hourly.wind_speed_1500m || [];
      const dirs1500 = raw.hourly.wind_direction_1500m || [];
      const speeds2000 = raw.hourly.wind_speed_2000m || [];
      const dirs2000 = raw.hourly.wind_direction_2000m || [];
      const speeds2500 = raw.hourly.wind_speed_2500m || [];
      const dirs2500 = raw.hourly.wind_direction_2500m || [];
      const speeds3000 = raw.hourly.wind_speed_3000m || [];
      const dirs3000 = raw.hourly.wind_direction_3000m || [];
      const speeds4000 = raw.hourly.wind_speed_4000m || [];
      const dirs4000 = raw.hourly.wind_direction_4000m || [];

      const levelSpeeds = [speeds80, speeds300, speeds600, speeds1000, speeds1500, speeds2000, speeds2500, speeds3000, speeds4000];
      const levelDirs = [dirs80, dirs300, dirs600, dirs1000, dirs1500, dirs2000, dirs2500, dirs3000, dirs4000];

      const hours: HourWind[] = [];

      for (let i = 0; i < times.length; i++) {
        const t = new Date(times[i]);
        const hh = t.getHours();
        if (hh < 8 || hh > 19) continue;

        const levels: WindLevel[] = [
          { alt: 0, speed: raw.hourly.wind_speed_10m?.[i] ?? 0, dir: raw.hourly.wind_direction_10m?.[i] ?? 0 },
        ];

        for (let l = 0; l < levelSpeeds.length; l++) {
          const alt = WIND_LEVELS_M[l + 1];
          if (alt <= siteAltitude) continue;
          const speed = levelSpeeds[l]?.[i] ?? null;
          const dir = levelDirs[l]?.[i] ?? null;
          if (speed != null && speed > 0) {
            levels.push({ alt, speed, dir });
          }
        }

        hours.push({
          hour: hh,
          surfaceSpeed: raw.hourly.wind_speed_10m?.[i] ?? 0,
          surfaceDir: raw.hourly.wind_direction_10m?.[i] ?? 0,
          gust: raw.hourly.wind_gusts_10m?.[i] ?? 0,
          cloud: raw.hourly.cloud_cover?.[i] ?? 0,
          temp: raw.hourly.temperature_2m?.[i] ?? 0,
          levels,
        });
      }

      setWindData(hours.sort((a, b) => a.hour - b.hour));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore");
    } finally {
      setLoading(false);
    }
  }, [lat, lon, dayData, siteAltitude]);

  useEffect(() => {
    if (isOpen) fetchWindProfile();
  }, [isOpen, fetchWindProfile]);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 shadow-lg shadow-sky-500/20 transition-all"
      >
        <Wind className="w-5 h-5" />
        WindGram · {siteName}
      </button>
    );
  }

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
        <div className="bg-slate-900 rounded-2xl border border-slate-700 p-8 text-center max-w-sm">
          <div className="w-10 h-10 rounded-full border-4 border-emerald-500/20 border-t-emerald-400 animate-spin mx-auto mb-4" />
          <p className="text-slate-400 text-base">Caricamento profilo vento...</p>
        </div>
      </div>
    );
  }

  if (error || windData.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
        <div className="bg-slate-900 rounded-2xl border border-slate-700 p-8 text-center max-w-sm">
          <p className="text-slate-400 text-base">{error || "Nessun dato disponibile"}</p>
          <button onClick={() => setIsOpen(false)} className="mt-4 px-5 py-2 bg-slate-700 rounded-xl text-white text-sm font-bold hover:bg-slate-600">
            Chiudi
          </button>
        </div>
      </div>
    );
  }

  return <WindgramModal data={windData} siteName={siteName || ""} siteAltitude={siteAltitude} onClose={() => setIsOpen(false)} />;
};

function WindgramModal({ data, siteName, siteAltitude, onClose }: {
  data: HourWind[];
  siteName: string;
  siteAltitude: number;
  onClose: () => void;
}) {
  const allLevels = [...new Set(data.flatMap(h => h.levels.map(l => l.alt)))].sort((a, b) => a - b);
  const minAlt = Math.min(siteAltitude, ...allLevels);
  const maxAlt = Math.max(4500, ...allLevels);
  const altRange = maxAlt - minAlt;

  const maxSpeed = Math.max(...data.flatMap(h => h.levels.map(l => l.speed)), 1);

  function getDirArrow(deg: number): string {
    const arrows = ["↑", "↗", "→", "↘", "↓", "↙", "←", "↖"];
    return arrows[Math.round(deg / 45) % 8];
  }

  function getWindColor(speed: number): string {
    if (speed <= 5) return "#22c55e";
    if (speed <= 10) return "#06b6d4";
    if (speed <= 18) return "#eab308";
    if (speed <= 25) return "#f97316";
    return "#ef4444";
  }

  const displayLevels = WIND_LEVELS_M.filter(a => a >= minAlt && a <= maxAlt);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-2 sm:p-6">
      <div className="bg-slate-900 rounded-2xl border border-slate-700/50 shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700/30 bg-slate-800/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500/20 to-indigo-500/10 border border-sky-400/30 flex items-center justify-center">
              <Wind className="w-5 h-5 text-sky-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">WindGram · {siteName}</h3>
              <p className="text-sm text-slate-400">{data.length} ore · {siteAltitude}m slm</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenuto windgram */}
        <div className="overflow-auto p-4 sm:p-6">
          <div className="min-w-[700px]">
            {/* Intestazione colonne */}
            <div className="grid grid-cols-[70px_1fr] gap-2 mb-2 text-xs text-slate-500 font-bold uppercase tracking-wider">
              <span>Quota</span>
              <div className="grid grid-cols-[repeat(auto-fit,minmax(80px,1fr))] gap-1">
                {data.map(h => (
                  <span key={h.hour} className="text-center">
                    {String(h.hour).padStart(2, "0")}:00
                    <span className="block text-[10px] font-normal text-slate-600 mt-0.5">
                      {h.temp}°C {h.cloud}%
                    </span>
                  </span>
                ))}
              </div>
            </div>

            {/* Righe di quota */}
            <div className="space-y-1">
              {[0, 300, 600, 900, 1500, 2000, 2500, 3000, 3500, 4500].map((alt) => {
                const isDecollo = Math.abs(alt - siteAltitude) < 50 || (alt === 0 && siteAltitude < 100);
                return (
                  <div key={alt} className={`grid grid-cols-[70px_1fr] gap-2 py-1.5 rounded-lg ${
                    isDecollo ? "bg-emerald-900/20 border border-emerald-500/20" : ""
                  }`}>
                    <div className={`text-xs font-mono flex items-center gap-1 ${
                      isDecollo ? "text-emerald-300 font-bold" : "text-slate-500"
                    }`}>
                      {alt}m
                      {isDecollo && <span className="text-[10px] text-emerald-400">🪂</span>}
                    </div>
                    <div className="grid grid-cols-[repeat(auto-fit,minmax(80px,1fr))] gap-1">
                      {data.map(h => {
                        const level = h.levels.find(l => l.alt === alt);
                        if (!level) {
                          return <div key={h.hour} className="text-center text-slate-700 text-xs">-</div>;
                        }
                        const pct = (level.speed / maxSpeed) * 100;
                        const isGust = h.gust > level.speed * 1.4;
                        return (
                          <div key={h.hour} className="flex items-center gap-1.5 justify-center">
                            <div className="w-12 h-4 bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full flex items-center justify-center"
                                style={{ width: `${Math.max(pct, 8)}%`, backgroundColor: getWindColor(level.speed) }}
                              >
                                {pct > 25 && <span className="text-[8px] text-white font-bold">{Math.round(level.speed)}</span>}
                              </div>
                            </div>
                            <span className="text-xs text-slate-400 w-4 text-center shrink-0">{getDirArrow(level.dir)}</span>
                            {isGust && <span className="text-[9px] text-red-400 w-6 text-right">{Math.round(h.gust)}</span>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Legenda vento */}
            <div className="flex flex-wrap gap-3 mt-4 text-xs text-slate-500">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-green-500" /> ≤5</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-cyan-500" /> 6-10</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-yellow-500" /> 11-18</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-orange-500" /> 19-25</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-500" /> over 25 km/h</span>
              <span className="ml-auto text-slate-600">Dati da Open-Meteo</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default WindGramButton;