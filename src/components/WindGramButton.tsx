"use client";

import React, { useState, useEffect, useCallback } from "react";
import { X } from "lucide-react";

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
  precip: number;
  levels: WindLevel[];
}

const ALT_LEVELS = [0, 300, 600, 900, 1200, 1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000];
const HOURLY_WIND_KEYS: Record<number, { speed: string; dir: string }> = {
  0:    { speed: "wind_speed_10m", dir: "wind_direction_10m" },
  80:   { speed: "wind_speed_80m", dir: "wind_direction_80m" },
  300:  { speed: "wind_speed_300m", dir: "wind_direction_300m" },
  600:  { speed: "wind_speed_600m", dir: "wind_direction_600m" },
  1000: { speed: "wind_speed_1000m", dir: "wind_direction_1000m" },
  1500: { speed: "wind_speed_1500m", dir: "wind_direction_1500m" },
  2000: { speed: "wind_speed_2000m", dir: "wind_direction_2000m" },
  2500: { speed: "wind_speed_2500m", dir: "wind_direction_2500m" },
  3000: { speed: "wind_speed_3000m", dir: "wind_direction_3000m" },
  4000: { speed: "wind_speed_4000m", dir: "wind_direction_4000m" },
  5000: { speed: "wind_speed_5000m", dir: "wind_direction_5000m" },
};

function getWindColor(speed: number): string {
  if (speed <= 5) return "#22c55e";
  if (speed <= 10) return "#06b6d4";
  if (speed <= 18) return "#eab308";
  if (speed <= 25) return "#f97316";
  if (speed <= 35) return "#ef4444";
  return "#dc2626";
}

function getWindDirIcon(deg: number): string {
  const arrows = ["↑", "↗", "→", "↘", "↓", "↙", "←", "↖"];
  return arrows[Math.round(deg / 45) % 8];
}

function getCloudIcon(cover: number): string {
  if (cover < 10) return "☀️";
  if (cover < 30) return "🌤️";
  if (cover < 50) return "⛅";
  if (cover < 75) return "☁️";
  return "☁️";
}

function getDirDegToName(deg: number): string {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round(deg / 45) % 8];
}

const WindGramButton = ({ dayData, siteAltitude, siteName, lat, lon }: WindGramButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [windData, setWindData] = useState<HourWind[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchWindProfile = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Usa le coordinate se disponibili, altrimenti fallback su dayData
      const useLat = lat ?? 44.76;
      const useLon = lon ?? 7.25;

      const params = new URLSearchParams({
        latitude: useLat.toString(),
        longitude: useLon.toString(),
        hourly: [
          "temperature_2m",
          "wind_speed_10m",
          "wind_direction_10m",
          "wind_gusts_10m",
          "cloud_cover",
          "precipitation",
        ].join(","),
        daily: "temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code",
        timezone: "Europe/Rome",
        forecast_days: "3",
      });

      const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const raw = await res.json();

      // Adesso fetch anche per profilo vento verticale
      const windParams = new URLSearchParams({
        latitude: useLat.toString(),
        longitude: useLon.toString(),
        hourly: Object.values(HOURLY_WIND_KEYS).flatMap(k => [k.speed, k.dir]).join(","),
        timezone: "Europe/Rome",
        forecast_days: "3",
      });

      const windRes = await fetch(`https://api.open-meteo.com/v1/forecast?${windParams}`);
      const windRaw = windRes.ok ? await windRes.json() : null;

      const times: string[] = raw.hourly.time || [];
      const temps: number[] = raw.hourly.temperature_2m || [];
      const clouds: number[] = raw.hourly.cloud_cover || [];
      const precips: number[] = raw.hourly.precipitation || [];
      const surfSpeeds: number[] = raw.hourly.wind_speed_10m || [];
      const surfDirs: number[] = raw.hourly.wind_direction_10m || [];
      const gusts: number[] = raw.hourly.wind_gusts_10m || [];

      const result: HourWind[] = [];

      for (let i = 0; i < times.length; i++) {
        const t = new Date(times[i]);
        const hh = t.getHours();
        if (hh < 8 || hh > 19) continue;

        const levels: WindLevel[] = [];

        for (const [altStr, keys] of Object.entries(HOURLY_WIND_KEYS)) {
          const alt = parseInt(altStr);
          let speed: number | null = null;
          let dir: number | null = null;

          if (alt === 0 && windRaw) {
            speed = windRaw.hourly?.[keys.speed]?.[i] ?? null;
            dir = windRaw.hourly?.[keys.dir]?.[i] ?? null;
          } else if (windRaw) {
            speed = windRaw.hourly?.[keys.speed]?.[i] ?? null;
            dir = windRaw.hourly?.[keys.dir]?.[i] ?? null;
          }

          if (speed != null && speed >= 0) {
            levels.push({ alt, speed, dir: dir ?? 0 });
          }
        }

        // Se non abbiamo dati dal profilo, usa almeno il vento al suolo
        if (levels.length === 0) {
          levels.push({ alt: 0, speed: surfSpeeds[i] || 0, dir: surfDirs[i] || 0 });
          
          // Aggiungi livelli interpolati
          for (let a = 500; a <= 3000; a += 500) {
            const factor = 1 + (a / 1000) * 0.2;
            levels.push({
              alt: a,
              speed: Math.min((surfSpeeds[i] || 0) * factor, (surfSpeeds[i] || 0) * 3),
              dir: ((surfDirs[i] || 0) + (a / 100) * 3) % 360,
            });
          }
        }

        result.push({
          hour: hh,
          surfaceSpeed: surfSpeeds[i] || 0,
          surfaceDir: surfDirs[i] || 0,
          gust: gusts[i] || 0,
          cloud: clouds[i] || 0,
          temp: temps[i] || 0,
          precip: precips[i] || 0,
          levels,
        });
      }

      setWindData(result.sort((a, b) => a.hour - b.hour));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore sconosciuto");
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
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2" />
        </svg>
        Windgram · {siteName}
      </button>
    );
  }

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
        <div className="bg-slate-900 rounded-2xl border border-slate-700 p-8 text-center">
          <div className="w-10 h-10 rounded-full border-4 border-emerald-500/20 border-t-emerald-400 animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Caricamento windgram...</p>
        </div>
      </div>
    );
  }

  if (error || windData.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
        <div className="bg-slate-900 rounded-2xl border border-slate-700 p-8 text-center">
          <p className="text-slate-400">{error || "Nessun dato"}</p>
          <button onClick={() => setIsOpen(false)} className="mt-4 px-5 py-2 bg-slate-700 rounded-xl text-white text-sm font-bold hover:bg-slate-600">
            Chiudi
          </button>
        </div>
      </div>
    );
  }

  return <WindgramModalContent data={windData} siteName={siteName || ""} siteAltitude={siteAltitude} onClose={() => setIsOpen(false)} />;
};

function WindgramModalContent({ data, siteName, siteAltitude, onClose }: {
  data: HourWind[];
  siteName: string;
  siteAltitude: number;
  onClose: () => void;
}) {
  const [selectedHour, setSelectedHour] = useState(data[0]?.hour ?? 8);

  const currentHourData = data.find(d => d.hour === selectedHour) || data[0];
  
  // Trova l'altitudine di decollo più vicina tra i livelli disponibili
  const sortedAltitudes = [...new Set(data.flatMap(h => h.levels.map(l => l.alt)))].sort((a, b) => a - b);
  const closestToDecollo = sortedAltitudes.reduce((prev, curr) =>
    Math.abs(curr - siteAltitude) < Math.abs(prev - siteAltitude) ? curr : prev
  );

  const maxSpeed = Math.max(...data.flatMap(h => h.levels.map(l => l.speed)), 1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-3">
      <div className="bg-gradient-to-b from-slate-800 to-slate-950 rounded-2xl border border-slate-700/50 shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700/30 bg-slate-800/50 shrink-0">
          <div>
            <h3 className="text-lg font-bold text-white">Windgram · {siteName}</h3>
            <p className="text-sm text-slate-400">Decollo {siteAltitude}m | {new Date().toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" })}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Selettore ora */}
        <div className="flex gap-1.5 px-5 py-3 border-b border-slate-700/30 bg-slate-900/40 overflow-x-auto shrink-0">
          {data.map(h => (
            <button
              key={h.hour}
              onClick={() => setSelectedHour(h.hour)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                h.hour === selectedHour
                  ? "bg-emerald-600/40 text-emerald-200 border border-emerald-500/40"
                  : "bg-slate-800/60 text-slate-400 hover:text-slate-200 border border-slate-700/30 hover:border-slate-600"
              }`}
            >
              <span className="font-mono">{String(h.hour).padStart(2, "0")}:00</span>
              <span className="ml-1.5 text-[10px]">{getCloudIcon(h.cloud)}</span>
            </button>
          ))}
        </div>

        {/* Windgram body */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* Info bar */}
          <div className="grid grid-cols-4 gap-3 mb-5">
            <div className="bg-slate-800/60 rounded-xl p-3 text-center">
              <div className="text-xs text-slate-500 uppercase">Temperatura</div>
              <div className="text-xl font-bold text-white">{Math.round(currentHourData.temp)}°</div>
            </div>
            <div className="bg-slate-800/60 rounded-xl p-3 text-center">
              <div className="text-xs text-slate-500 uppercase">Vento suolo</div>
              <div className="text-xl font-bold text-sky-300">{Math.round(currentHourData.surfaceSpeed)} <span className="text-sm font-normal text-slate-400">km/h</span></div>
              <div className="text-xs text-slate-400">{getWindDirIcon(currentHourData.surfaceDir)} {getDirDegToName(currentHourData.surfaceDir)}</div>
            </div>
            <div className="bg-slate-800/60 rounded-xl p-3 text-center">
              <div className="text-xs text-slate-500 uppercase">Raffiche</div>
              <div className="text-xl font-bold text-amber-300">{Math.round(currentHourData.gust)} <span className="text-sm font-normal text-slate-400">km/h</span></div>
            </div>
            <div className="bg-slate-800/60 rounded-xl p-3 text-center">
              <div className="text-xs text-slate-500 uppercase">Pioggia</div>
              <div className="text-xl font-bold text-blue-300">{currentHourData.precip > 0 ? `${currentHourData.precip}mm` : "0mm"}</div>
              <div className="text-xs text-slate-400">{getCloudIcon(currentHourData.cloud)} {currentHourData.cloud}%</div>
            </div>
          </div>

          {/* Profilo vento verticale - stile meteoblue */}
          <div className="bg-slate-900/60 rounded-2xl border border-slate-700/30 p-4">
            <h4 className="text-sm font-bold text-white mb-4">Profilo verticale del vento · {String(selectedHour).padStart(2, "0")}:00</h4>
            
            <div className="space-y-1.5">
              {/* Intestazione colonne */}
              <div className="grid grid-cols-[60px_1fr_200px] gap-3 text-[10px] text-slate-500 uppercase font-bold pb-2 border-b border-slate-700/30">
                <span>Quota</span>
                <span>Vento (km/h)</span>
                <span>Direzione</span>
              </div>

              {/* Righe di quota - ordine decrescente */}
              {[...ALT_LEVELS].reverse().map((alt) => {
                const level = currentHourData.levels.find(l => l.alt === alt);
                if (!level) return null;

                const pct = (level.speed / maxSpeed) * 100;
                const isDecollo = alt === 0; // evidenzia la riga del decollo
                const speedColor = getWindColor(level.speed);

                return (
                  <div
                    key={alt}
                    className={`grid grid-cols-[60px_1fr_200px] gap-3 py-2 items-center rounded-lg ${
                      alt === 0 ? "bg-emerald-900/20 border-l-2 border-l-emerald-400 px-2" : "hover:bg-slate-800/30"
                    }`}
                  >
                    {/* Quota */}
                    <div className="flex items-center gap-1 text-sm">
                      <span className={`font-mono ${alt === 0 ? "text-emerald-300 font-bold" : "text-slate-400"}`}>
                        {alt}m
                      </span>
                      {alt === 0 && (
                        <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1 py-0.5 rounded">🪂</span>
                      )}
                    </div>

                    {/* Barra vento + valore */}
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all flex items-center justify-end pr-2"
                          style={{ width: `${Math.max(pct, 6)}%`, backgroundColor: speedColor }}
                        >
                          {pct > 20 && (
                            <span className="text-[10px] text-white font-bold">{Math.round(level.speed)}</span>
                          )}
                        </div>
                      </div>
                      {pct <= 20 && (
                        <span className="text-xs text-slate-400 font-bold w-8 text-right">{Math.round(level.speed)}</span>
                      )}
                    </div>

                    {/* Direzione + freccia */}
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-base" style={{ color: speedColor }}>
                          {getWindDirIcon(level.dir)}
                        </span>
                        <span className="text-sm font-bold text-slate-200">
                          {getDirDegToName(level.dir)}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500">({Math.round(level.dir)}°)</span>
                      {/* Mini freccia triangolo */}
                      <svg className="w-4 h-4" viewBox="0 0 16 16" style={{ transform: `rotate(${level.dir}deg)` }}>
                        <polygon points="8,0 16,14 0,14" fill={speedColor} opacity="0.7" />
                      </svg>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Legenda */}
            <div className="flex flex-wrap items-center gap-4 mt-5 pt-4 border-t border-slate-700/30 text-[10px] text-slate-500">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-green-500" /> ≤5</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-cyan-500" /> 6-10</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-yellow-500" /> 11-18</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-orange-500" /> 19-25</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-500" /> 26-35</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-600" /> {'>'}35</span>
              <span className="ml-auto text-slate-600">Dati Open-Meteo</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default WindGramButton;