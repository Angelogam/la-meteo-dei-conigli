import React, { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";

interface WindLevel {
  quota: number;
  speed: number;
  dir: number;
}

/** ✅ Solo i 4 livelli che Open‑Meteo fornisce davvero */
const QUOTE_ATTESE = [10, 80, 120, 180];

async function fetchWindProfile(lat: number, lon: number): Promise<{
  warning: string | null;
  levels: WindLevel[];
  time: string;
}> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=wind_speed_10m,wind_direction_10m,wind_gusts_10m,wind_speed_80m,wind_direction_80m,wind_speed_120m,wind_direction_120m,wind_speed_180m,wind_direction_180m&timezone=Europe/Rome&forecast_days=1`;

  const res = await fetch(url);
  if (!res.ok) {
    return { warning: `⚠️ Errore HTTP ${res.status}`, levels: [], time: "" };
  }
  const data = await res.json();

  const levels: WindLevel[] = [
    { quota: 10, speed: data.hourly.wind_speed_10m[0], dir: data.hourly.wind_direction_10m[0] },
    { quota: 80, speed: data.hourly.wind_speed_80m[0], dir: data.hourly.wind_direction_80m[0] },
    { quota: 120, speed: data.hourly.wind_speed_120m[0], dir: data.hourly.wind_direction_120m[0] },
    { quota: 180, speed: data.hourly.wind_speed_180m[0], dir: data.hourly.wind_direction_180m[0] },
  ];

  const allZero = levels.every((l) => l.speed === 0);
  const now = new Date().toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });

  if (allZero) {
    return {
      warning:
        "⚠️ Dati vento in quota non disponibili — Open‑Meteo restituisce 0 km/h per tutti i livelli sopra il suolo.",
      levels: [],
      time: now,
    };
  }

  return { warning: null, levels, time: now };
}

function getSpeedColor(speed: number): string {
  if (speed <= 8) return "bg-emerald-400/60";
  if (speed <= 15) return "bg-amber-400/60";
  if (speed <= 22) return "bg-orange-400/60";
  if (speed <= 30) return "bg-red-400/60";
  return "bg-red-500/70";
}

const WindProfileUnified: React.FC<{ lat: number; lon: number; siteName?: string }> = ({
  lat,
  lon,
  siteName = "Decollo",
}) => {
  const [windData, setWindData] = useState<{
    warning: string | null;
    levels: WindLevel[];
    time: string;
  } | null>(null);

  const load = async () => {
    const data = await fetchWindProfile(lat, lon);
    setWindData(data);
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 30 * 60 * 1000); // ogni 30 minuti
    return () => clearInterval(interval);
  }, [lat, lon]);

  if (!windData) {
    return (
      <div className="flex items-center gap-2 p-4 rounded-xl bg-slate-800/50 text-slate-400 text-sm">
        <div className="w-5 h-5 rounded-full border-2 border-emerald-400/30 border-t-emerald-400 animate-spin" />
        ⏳ Caricamento dati vento reale...
      </div>
    );
  }

  if (windData.warning) {
    return (
      <div className="flex items-start gap-2 p-4 rounded-xl bg-yellow-900/30 border border-yellow-500/30 text-yellow-300 text-sm">
        <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
        <span>{windData.warning}</span>
      </div>
    );
  }

  const maxSpeed = Math.max(...windData.levels.map((l) => l.speed), 1);

  return (
    <div className="flex flex-col gap-3 p-5 rounded-2xl bg-gradient-to-b from-[#0f172a] to-[#1e293b] border border-emerald-400/30 shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-white tracking-wide flex items-center gap-2">
          💨 Vento reale — <span className="text-emerald-300">{siteName}</span>
        </h3>
        <span className="text-xs text-slate-500">🕐 {windData.time}</span>
      </div>

      <p className="text-xs text-slate-500">
        Livelli reali da Open‑Meteo (max 180m — oltre Open‑Meteo non fornisce dati)
      </p>

      {/* Barre verticali dei 4 livelli */}
      <div className="flex items-end gap-3 mt-2 h-28">
        {windData.levels.map((l) => {
          const pct = (l.speed / maxSpeed) * 100;
          return (
            <div key={l.quota} className="flex flex-col items-center flex-1">
              <span className="text-sm font-bold text-white mb-1">{l.speed}</span>
              <div className="w-full bg-slate-700/50 rounded-md flex-1 relative">
                <div
                  className={`absolute bottom-0 left-0 right-0 rounded-t-md transition-all ${getSpeedColor(l.speed)}`}
                  style={{ height: `${Math.max(pct, 8)}%` }}
                />
              </div>
              <span className="text-xs text-slate-400 mt-1">{l.quota}m</span>
            </div>
          );
        })}
      </div>

      {/* Legenda */}
      <div className="flex flex-wrap gap-2 text-xs text-slate-400 justify-center mt-1">
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-400/60" /> ≤8</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-400/60" /> 9-15</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-orange-400/60" /> 16-22</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-400/60" /> ≥23</span>
        <span className="text-slate-600 ml-auto">km/h</span>
      </div>
    </div>
  );
};

export default WindProfileUnified;