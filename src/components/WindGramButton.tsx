25 km/h con >25 km/h">
"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Wind, X, ArrowUp, Calendar, Thermometer } from "lucide-react";
import { calcolaTermiche } from "@/utils/termiche";
import type { HourData } from "@/types/meteo";

interface WindGramButtonProps {
  dayData: HourData[];
  siteAltitude: number;
  siteName?: string;
  lat?: number;
  lon?: number;
  selectedDay?: number; // 0 = oggi, 1 = domani, 2 = dopodomani
}

const ALT_KEYS: { alt: number; speedKey: string; dirKey: string }[] = [
  { alt: 10,   speedKey: "wind_speed_10m",    dirKey: "wind_direction_10m" },
  { alt: 80,   speedKey: "wind_speed_80m",    dirKey: "wind_direction_80m" },
  { alt: 120,  speedKey: "wind_speed_120m",   dirKey: "wind_direction_120m" },
  { alt: 300,  speedKey: "wind_speed_300m",   dirKey: "wind_direction_300m" },
  { alt: 600,  speedKey: "wind_speed_600m",   dirKey: "wind_direction_600m" },
  { alt: 1000, speedKey: "wind_speed_1000m",  dirKey: "wind_direction_1000m" },
  { alt: 1500, speedKey: "wind_speed_1500m",  dirKey: "wind_direction_1500m" },
  { alt: 2000, speedKey: "wind_speed_2000m",  dirKey: "wind_direction_2000m" },
  { alt: 2500, speedKey: "wind_speed_2500m",  dirKey: "wind_direction_2500m" },
  { alt: 3000, speedKey: "wind_speed_3000m",  dirKey: "wind_direction_3000m" },
  { alt: 4000, speedKey: "wind_speed_4000m",  dirKey: "wind_direction_4000m" },
  { alt: 5000, speedKey: "wind_speed_5000m",  dirKey: "wind_direction_5000m" },
];

function getWindColor(speed: number): string {
  if (speed <= 5) return "#22c55e";
  if (speed <= 10) return "#06b6d4";
  if (speed <= 18) return "#eab308";
  if (speed <= 25) return "#f97316";
  if (speed <= 35) return "#ef4444";
  return "#dc2626";
}

function getDirName(deg: number): string {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round(deg / 45) % 8];
}

function getDayLabel(selectedDay: number): string {
  if (selectedDay === 0) return "Oggi";
  if (selectedDay === 1) return "Domani";
  if (selectedDay === 2) return "Dopodomani";
  return `Giorno ${selectedDay + 1}`;
}

const WindGramButton = ({ dayData, siteAltitude, siteName, lat, lon, selectedDay = 0 }: WindGramButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [rawHourly, setRawHourly] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedHour, setSelectedHour] = useState(12);

  // Calcola le termiche per ogni ora del giorno selezionato
  const termicheMap = useMemo(() => {
    const mappa: Record<number, { base: number; rateo: number; top: number; label: string }> = {};
    if (!dayData || dayData.length === 0) return mappa;

    const oreVolo = dayData.filter(h => {
      const hh = h.time.getHours();
      return hh >= 8 && hh <= 19;
    });

    for (const h of oreVolo) {
      const ora = h.time.getHours();
      const t = calcolaTermiche(h, siteAltitude);
      mappa[ora] = { base: t.base, rateo: t.rateo, top: t.top, label: t.label };
    }

    return mappa;
  }, [dayData, siteAltitude]);

  useEffect(() => {
    if (!isOpen) return;

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      const useLat = lat ?? 44.76;
      const useLon = lon ?? 7.25;

      try {
        const params = new URLSearchParams({
          latitude: useLat.toString(),
          longitude: useLon.toString(),
          hourly: [
            "temperature_2m",
            "wind_speed_10m", "wind_direction_10m",
            "wind_gusts_10m",
            "cloud_cover",
            "precipitation",
            "wind_speed_80m", "wind_direction_80m",
            "wind_speed_120m", "wind_direction_120m",
            "wind_speed_300m", "wind_direction_300m",
            "wind_speed_600m", "wind_direction_600m",
            "wind_speed_1000m", "wind_direction_1000m",
            "wind_speed_1500m", "wind_direction_1500m",
            "wind_speed_2000m", "wind_direction_2000m",
            "wind_speed_2500m", "wind_direction_2500m",
            "wind_speed_3000m", "wind_direction_3000m",
            "wind_speed_4000m", "wind_direction_4000m",
            "wind_speed_5000m", "wind_direction_5000m",
          ].join(","),
          timezone: "Europe/Rome",
          forecast_days: "3",
        });

        const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        setRawHourly(data.hourly);

        const now = new Date();
        const currentHour = data.hourly.time.findIndex((t: string) => {
          const d = new Date(t);
          return d.getHours() === now.getHours() && d.getDate() === now.getDate();
        });
        if (currentHour >= 0) {
          const hh = new Date(data.hourly.time[currentHour]).getHours();
          setSelectedHour(hh);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Errore");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isOpen, lat, lon]);

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
        <div className="bg-slate-900 rounded-2xl border border-slate-700 p-8 text-center">
          <div className="w-10 h-10 rounded-full border-4 border-emerald-500/20 border-t-emerald-400 animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Caricamento windgram...</p>
        </div>
      </div>
    );
  }

  if (error || !rawHourly) {
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

  const hourIndex = rawHourly.time.findIndex((t: string) => {
    const d = new Date(t);
    return d.getHours() === selectedHour;
  });

  if (hourIndex < 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
        <div className="bg-slate-900 rounded-2xl border border-slate-700 p-8 text-center">
          <p className="text-slate-400">Ora non trovata</p>
          <button onClick={() => setIsOpen(false)} className="mt-4 px-5 py-2 bg-slate-700 rounded-xl text-white text-sm font-bold hover:bg-slate-600">
            Chiudi
          </button>
        </div>
      </div>
    );
  }

  const levels = ALT_KEYS.map(k => ({
    alt: k.alt,
    speed: rawHourly[k.speedKey]?.[hourIndex] ?? null,
    dir: rawHourly[k.dirKey]?.[hourIndex] ?? null,
  })).filter(l => l.speed != null && l.speed >= 0);

  const maxSpeed = Math.max(...levels.map(l => l.speed), 1);
  const temp = rawHourly.temperature_2m?.[hourIndex] ?? 0;
  const cloud = rawHourly.cloud_cover?.[hourIndex] ?? 0;
  const gust = rawHourly.wind_gusts_10m?.[hourIndex] ?? 0;
  const surfaceSpeed = rawHourly.wind_speed_10m?.[hourIndex] ?? 0;
  const surfaceDir = rawHourly.wind_direction_10m?.[hourIndex] ?? 0;

  // Termiche per l'ora selezionata
  const termicheOra = termicheMap[selectedHour];

  // Ore disponibili (8-19)
  const availableHours: { hour: number; index: number }[] = [];
  for (let i = 0; i < rawHourly.time.length; i++) {
    const d = new Date(rawHourly.time[i]);
    const hh = d.getHours();
    if (hh >= 8 && hh <= 19 && !availableHours.find(a => a.hour === hh)) {
      availableHours.push({ hour: hh, index: i });
    }
  }

  // Scala altimetrie dal decollo a 4000m step 500m
  const startAlt = Math.floor(siteAltitude / 500) * 500;
  const altSteps: number[] = [];
  for (let a = startAlt; a <= 4000; a += 500) {
    altSteps.push(a);
  }

  function getInterpolatedLevel(requestedAlt: number) {
    if (levels.length === 0) return null;
    let lower = levels[0];
    let upper = levels[levels.length - 1];
    for (let j = 0; j < levels.length - 1; j++) {
      if (levels[j].alt <= requestedAlt && levels[j + 1].alt >= requestedAlt) {
        lower = levels[j];
        upper = levels[j + 1];
        break;
      }
    }
    if (requestedAlt < lower.alt) return { alt: requestedAlt, speed: lower.speed, dir: lower.dir };
    if (requestedAlt > upper.alt) return { alt: requestedAlt, speed: upper.speed, dir: upper.dir };
    const ratio = lower.alt === upper.alt ? 0 : (requestedAlt - lower.alt) / (upper.alt - lower.alt);
    return {
      alt: requestedAlt,
      speed: Math.round(lower.speed + ratio * (upper.speed - lower.speed)),
      dir: Math.round(lower.dir + ratio * (upper.dir - lower.dir)),
    };
  }

  const interpolatedLevels = altSteps
    .map(alt => getInterpolatedLevel(alt))
    .filter((l): l is { alt: number; speed: number; dir: number } => l != null && l.speed > 0);

  // Colore del rateo termico
  const rateoColor = termicheOra
    ? termicheOra.rateo >= 4 ? "text-red-400" :
      termicheOra.rateo >= 3 ? "text-orange-400" :
      termicheOra.rateo >= 2 ? "text-amber-400" :
      termicheOra.rateo >= 1 ? "text-green-400" :
      termicheOra.rateo >= 0.3 ? "text-emerald-400" : "text-slate-400"
    : "text-slate-400";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-3">
      <div className="bg-gradient-to-b from-slate-800 to-slate-950 rounded-2xl border border-slate-700/50 shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700/30 bg-slate-800/50 shrink-0">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Wind className="w-5 h-5 text-sky-400" />
              WindGram · {siteName}
            </h3>
            <div className="flex items-center gap-3 text-sm text-slate-400">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {getDayLabel(selectedDay)}
              </span>
              <span>Quota decollo: {siteAltitude}m</span>
            </div>
          </div>
          <button onClick={() => setIsOpen(false)} className="p-2 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex gap-1 px-5 py-2.5 border-b border-slate-700/30 bg-slate-900/40 overflow-x-auto shrink-0">
          {availableHours.map(({ hour }) => {
            const th = termicheMap[hour];
            return (
              <button
                key={hour}
                onClick={() => setSelectedHour(hour)}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all flex flex-col items-center gap-0.5 ${
                  hour === selectedHour
                    ? "bg-emerald-600/40 text-emerald-200 border border-emerald-500/40"
                    : "bg-slate-800/60 text-slate-400 hover:text-slate-200 border border-slate-700/30"
                }`}
              >
                <span>{String(hour).padStart(2, "0")}:00</span>
                {th && th.rateo > 0 && (
                  <span className="text-[9px] text-orange-300">{th.rateo.toFixed(1)} m/s</span>
                )}
              </button>
            );
          })}
        </div>

        <div className="overflow-y-auto p-5">
          {/* Info rapide + TERMICHE */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
            <div className="bg-slate-800/60 rounded-xl p-3 text-center">
              <Thermometer className="w-5 h-5 text-amber-400 mx-auto mb-1" />
              <div className="text-xs text-slate-500">Temperatura</div>
              <div className="text-lg font-bold text-white">{Math.round(temp)}°C</div>
            </div>
            <div className="bg-slate-800/60 rounded-xl p-3 text-center">
              <Wind className="w-5 h-5 text-sky-400 mx-auto mb-1" />
              <div className="text-xs text-slate-500">Vento suolo</div>
              <div className="text-lg font-bold text-sky-300">{Math.round(surfaceSpeed)}</div>
              <div className="text-xs text-slate-400">{getDirName(surfaceDir)}</div>
            </div>
            <div className="bg-slate-800/60 rounded-xl p-3 text-center">
              <div className="text-xs text-slate-500">Nuvole</div>
              <div className="text-lg font-bold text-slate-200">{cloud}%</div>
              <div className="text-xs text-slate-400">Raffiche {Math.round(gust)}</div>
            </div>
            <div className="bg-slate-800/60 rounded-xl p-3 text-center">
              <ArrowUp className="w-5 h-5 text-orange-400 mx-auto mb-1" />
              <div className="text-xs text-slate-500">Termiche</div>
              <div className={`text-lg font-bold ${rateoColor}`}>
                {termicheOra ? `${termicheOra.rateo.toFixed(1)} m/s` : "N/D"}
              </div>
              <div className="text-xs text-emerald-400">
                Base {termicheOra ? `${termicheOra.base}m` : "--"}
              </div>
            </div>
          </div>

          {/* Linea base termica sul profilo verticale */}
          <div className="bg-slate-900/60 rounded-2xl border border-slate-700/30 p-4">
            <h4 className="text-sm font-bold text-white mb-4 text-center">
              Profilo verticale del vento · {String(selectedHour).padStart(2, "0")}:00
            </h4>

            <div className="space-y-1.5">
              <div className="grid grid-cols-[55px_1fr_80px] gap-2 pb-1.5 mb-1 border-b border-slate-700/30 text-[9px] text-slate-600 uppercase font-bold">
                <span>Quota</span>
                <span className="text-center">Direzione e intensità</span>
                <span className="text-right">km/h</span>
              </div>

              {[...interpolatedLevels].reverse().map((level) => {
                const pct = (level.speed / maxSpeed) * 100;
                const isDecolloExact = Math.abs(level.alt - siteAltitude) < 50;
                const isBaseTermica = termicheOra && Math.abs(level.alt - termicheOra.base) < 150;

                let bgClass = "hover:bg-slate-800/20";
                if (isDecolloExact) bgClass = "bg-emerald-900/20 border-l-2 border-l-emerald-400";
                else if (isBaseTermica) bgClass = "bg-orange-900/20 border-l-2 border-l-orange-400";

                return (
                  <div
                    key={level.alt}
                    className={`grid grid-cols-[55px_1fr_80px] gap-2 py-2 items-center rounded-lg px-1 ${bgClass}`}
                  >
                    <div className="flex items-center gap-1">
                      <span className={`text-xs font-mono ${
                        isDecolloExact ? "text-emerald-300 font-bold" : isBaseTermica ? "text-orange-300 font-bold" : "text-slate-500"
                      }`}>
                        {level.alt}m
                      </span>
                      {isDecolloExact && <span className="text-[9px]">🪂</span>}
                      {isBaseTermica && <span className="text-[9px]">🔥</span>}
                    </div>

                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" style={{ transform: `rotate(${level.dir}deg)` }}>
                        <polygon
                          points="12,2 20,20 12,15 4,20"
                          fill={getWindColor(level.speed)}
                          opacity="0.85"
                        />
                      </svg>

                      <div className="flex-1 h-4 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full flex items-center justify-end pr-1.5 transition-all"
                          style={{
                            width: `${Math.max(pct, 5)}%`,
                            backgroundColor: getWindColor(level.speed),
                          }}
                        >
                          {pct > 12 && (
                            <span className="text-[8px] text-white font-bold">{Math.round(level.speed)}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-1">
                      <span className="text-xs font-bold text-slate-300">{Math.round(level.speed)}</span>
                      <span className="text-[10px] text-slate-500">{getDirName(level.dir)}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Legenda con base termica */}
            <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-slate-700/30 text-[10px] text-slate-500">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" /> ≤5</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-cyan-500" /> 6-10</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500" /> 11-18</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500" /> 19-25</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> oltre 25 km/h</span>
              <span className="flex items-center gap-1 text-orange-400">🔥 Base termica</span>
              <span className="flex items-center gap-1 text-emerald-400">🪂 Decollo</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WindGramButton;