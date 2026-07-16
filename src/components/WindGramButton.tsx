"use client";

import React, { useState, useEffect } from "react";
import { Wind, X } from "lucide-react";

interface WindGramButtonProps {
  dayData: any[];
  siteAltitude: number;
  siteName?: string;
  lat?: number;
  lon?: number;
}

// Le uniche quote per cui Open-Meteo fornisce wind_speed e wind_direction reali
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
  return "#ef4444";
}

function getDirName(deg: number): string {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round(deg / 45) % 8];
}

function getDirArrow(deg: number, speed: number): React.ReactNode {
  const color = getWindColor(speed);
  return (
    <svg className="w-6 h-6" viewBox="0 0 24 24" style={{ transform: `rotate(${deg}deg)` }}>
      <polygon points="12,2 22,20 12,15 2,20" fill={color} opacity="0.8" />
    </svg>
  );
}

const WindGramButton = ({ dayData, siteAltitude, siteName, lat, lon }: WindGramButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [rawHourly, setRawHourly] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedHour, setSelectedHour] = useState(12);

  useEffect(() => {
    if (!isOpen) return;

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      const useLat = lat ?? 44.76;
      const useLon = lon ?? 7.25;

      try {
        // Chiamata UNICA con TUTTI i parametri vento
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
            "wind_speed_80m",
            "wind_direction_80m",
            "wind_speed_120m",
            "wind_direction_120m",
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
            "wind_speed_5000m",
            "wind_direction_5000m",
          ].join(","),
          timezone: "Europe/Rome",
          forecast_days: "3",
        });

        const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        setRawHourly(data.hourly);

        // Trova l'ora corrente
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

  // Trova l'indice dell'ora selezionata
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

  // Costruisci i livelli per l'ora selezionata
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

  // Ore disponibili (8-19)
  const availableHours = [];
  for (let i = 0; i < rawHourly.time.length; i++) {
    const d = new Date(rawHourly.time[i]);
    const hh = d.getHours();
    if (hh >= 8 && hh <= 19 && !availableHours.find(a => a.hour === hh)) {
      availableHours.push({ hour: hh, index: i });
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-3">
      <div className="bg-gradient-to-b from-slate-800 to-slate-950 rounded-2xl border border-slate-700/50 shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700/30 bg-slate-800/50 shrink-0">
          <div>
            <h3 className="text-lg font-bold text-white">WindGram · {siteName}</h3>
            <p className="text-sm text-slate-400">Quota decollo: {siteAltitude}m · Dati reali Open-Meteo</p>
          </div>
          <button onClick={() => setIsOpen(false)} className="p-2 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Selettore ora - orizzontale e compatto */}
        <div className="flex gap-1 px-5 py-2.5 border-b border-slate-700/30 bg-slate-900/40 overflow-x-auto shrink-0">
          {availableHours.map(({ hour }) => (
            <button
              key={hour}
              onClick={() => setSelectedHour(hour)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                hour === selectedHour
                  ? "bg-emerald-600/40 text-emerald-200 border border-emerald-500/40"
                  : "bg-slate-800/60 text-slate-400 hover:text-slate-200 border border-slate-700/30"
              }`}
            >
              {String(hour).padStart(2, "0")}:00
            </button>
          ))}
        </div>

        {/* Profilo vento verticale - UNA SOLA ORA */}
        <div className="overflow-y-auto p-5">
          {/* Info rapide */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="bg-slate-800/60 rounded-xl p-3 text-center">
              <div className="text-xs text-slate-500">Temperatura</div>
              <div className="text-lg font-bold text-white">{Math.round(temp)}°C</div>
            </div>
            <div className="bg-slate-800/60 rounded-xl p-3 text-center">
              <div className="text-xs text-slate-500">Vento suolo</div>
              <div className="text-lg font-bold text-sky-300">{Math.round(surfaceSpeed)}</div>
              <div className="text-xs text-slate-400">{getDirName(surfaceDir)}</div>
            </div>
            <div className="bg-slate-800/60 rounded-xl p-3 text-center">
              <div className="text-xs text-slate-500">Nuvole</div>
              <div className="text-lg font-bold text-slate-200">{cloud}%</div>
            </div>
          </div>

          {/* GRAFICO VENTO VERTICALE - stile meteoblue */}
          <div className="bg-slate-900/60 rounded-2xl border border-slate-700/30 p-4">
            <h4 className="text-sm font-bold text-white mb-4 text-center">
              Profilo verticale del vento · {String(selectedHour).padStart(2, "0")}:00
            </h4>

            <div className="space-y-2">
              {[...levels].reverse().map((level) => {
                if (level.speed == null) return null;
                const pct = (level.speed / maxSpeed) * 100;
                const isDecollo = level.alt === 10;
                
                return (
                  <div key={level.alt} className={`grid grid-cols-[55px_1fr_90px] gap-2 py-2 items-center rounded-lg px-2 ${
                    isDecollo ? "bg-emerald-900/20 border-l-2 border-l-emerald-400" : "hover:bg-slate-800/20"
                  }`}>
                    {/* Quota */}
                    <span className={`text-xs font-mono ${isDecollo ? "text-emerald-300 font-bold" : "text-slate-500"}`}>
                      {level.alt}m
                    </span>

                    {/* Barra vento con triangolo direzione */}
                    <div className="flex items-center gap-2">
                      {/* Triangolo direzione */}
                      <div className="w-6 h-6 shrink-0 flex items-center justify-center" style={{ transform: `rotate(${level.dir}deg)` }}>
                        <svg viewBox="0 0 24 24" className="w-5 h-5">
                          <polygon points="12,2 20,20 12,15 4,20" fill={getWindColor(level.speed)} opacity="0.9" />
                        </svg>
                      </div>
                      
                      {/* Barra intensità */}
                      <div className="flex-1 h-4 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full flex items-center justify-end pr-1.5 transition-all"
                          style={{ width: `${Math.max(pct, 5)}%`, backgroundColor: getWindColor(level.speed) }}
                        >
                          {pct > 18 && (
                            <span className="text-[9px] text-white font-bold">{Math.round(level.speed)}</span>
                          )}
                        </div>
                      </div>
                      {pct <= 18 && (
                        <span className="text-[10px] text-slate-400 font-bold w-6 text-right">{Math.round(level.speed)}</span>
                      )}
                    </div>

                    {/* Direzione */}
                    <span className="text-xs text-slate-400 text-right">{getDirName(level.dir)} ({Math.round(level.dir)}°)</span>
                  </div>
                );
              })}
            </div>

            {/* Legenda */}
            <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-slate-700/30 text-[10px] text-slate-500">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" /> ≤5</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-cyan-500" /> 6-10</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500" /> 11-18</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500" /> 19-25</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> {'>'}25 km/h</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WindGramButton;