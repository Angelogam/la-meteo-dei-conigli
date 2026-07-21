import React from "react";
import { AlertTriangle } from "lucide-react";

interface ProfiloEntry {
  quota: number;
  vento: number;
  direzione: string;
}

interface Props {
  data: {
    giorno: string;
    data: string;
    decollo: string;
    raffica: number;
    profilo: ProfiloEntry[];
  };
  mode?: "real" | "test";
}

// --- Synthetic profile generator for test mode (Malanotte) ---
function generateTestProfile(): ProfiloEntry[] {
  const result: ProfiloEntry[] = [];
  const directions = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];

  for (let q = 1740; q <= 4000; q += 250) {
    let speed: number;
    if (q <= 1750) {
      speed = 10 + Math.random() * 10;          // 10–20 km/h at decollo
    } else if (q <= 2500) {
      speed = 20 + Math.random() * 15;          // 20–35 km/h
    } else if (q <= 3500) {
      speed = 30 + Math.random() * 15;          // 30–45 km/h
    } else {
      speed = 35 + Math.random() * 15;          // 35–50 km/h sopra 3500m
    }

    const dirDeg = Math.round(((q - 1700) % 3600) / 3600 * 360);
    const dirIndex = Math.round(dirDeg / 22.5) % 16;

    result.push({
      quota: q,
      vento: Math.round(speed),
      direzione: directions[dirIndex],
    });
  }

  return result;
}

// --- Validation: are wind values realistic for free flight? ---
function isDataUnrealistic(profilo: ProfiloEntry[]): boolean {
  for (const p of profilo) {
    // Over 80 km/h at any altitude → unrealistic
    if (p.vento > 80) return true;
    // Over 50 km/h under 3000m → unrealistic
    if (p.quota < 3000 && p.vento > 50) return true;
  }
  return false;
}

const VentoProfilo: React.FC<Props> = ({ data, mode = "real" }) => {
  const { giorno, data: dataGiorno, decollo, raffica, profilo } = data;

  // If test mode, override profile with synthetic data
  const profileData = mode === "test" ? generateTestProfile() : profilo;
  const gustData = mode === "test" ? 42 : raffica;

  const isUnrealistic = mode !== "test" && isDataUnrealistic(profileData);
  const borderColor = isUnrealistic
    ? "border-orange-500/50"
    : "border-[#22c55e]/40";
  const shadowColor = isUnrealistic
    ? "hover:shadow-orange-500/20"
    : "hover:shadow-[#22c55e]/20";

  const getColor = (v: number) => {
    if (v <= 8) return "bg-[#22c55e]/60";
    if (v <= 15) return "bg-[#facc15]/60";
    if (v <= 22) return "bg-[#fb923c]/60";
    if (v <= 30) return "bg-[#f87171]/60";
    return "bg-[#ef4444]/70";
  };

  // Cap bar width display at 40 km/h when unrealistic
  const displaySpeed = (v: number) => {
    if (isUnrealistic) return Math.min(v, 40);
    return v;
  };

  return (
    <div
      className={`flex flex-col gap-4 p-5 rounded-2xl bg-gradient-to-b from-[#0f172a] to-[#1e293b] border ${borderColor} shadow-lg ${shadowColor} transition-all duration-300`}
    >
      {/* Day, date, decollo — always visible */}
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-white tracking-wide flex items-center gap-2">
          💨 Profilo vento verticale
        </h3>
        <div className="text-sm text-gray-300 text-right">
          📅 {giorno} — {dataGiorno}
          <br />
          🪂 Decollo: <span className="text-[#22c55e] font-semibold">{decollo}</span>
        </div>
      </div>

      {/* Gust */}
      <div className="text-sm text-gray-300 mt-1">
        🌬️ Raffica massima: <span className="font-semibold">{gustData} km/h</span>
      </div>

      {/* Unrealistic data warning */}
      {isUnrealistic && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-orange-900/30 border border-orange-500/30 text-orange-200 text-sm">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-orange-400" />
          <span>
            Dati vento in quota potenzialmente non realistici — eseguire test e verifica manuale.
          </span>
        </div>
      )}

      {/* Test mode banner */}
      {mode === "test" && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-cyan-900/30 border border-cyan-500/30 text-cyan-200 text-sm">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-cyan-400" />
          <span>
            Modalità test — dati vento simulati per verifica grafica.
          </span>
        </div>
      )}

      {/* Profile bars */}
      <div className="mt-3 flex flex-col gap-2">
        {profileData.map((p, i) => {
          const displayV = displaySpeed(p.vento);
          return (
            <div key={i} className="flex items-center justify-between text-sm text-gray-300">
              <div className="w-20">{p.quota}m</div>
              <div className="flex-1 h-3 rounded-full overflow-hidden mx-2">
                <div
                  className={`${getColor(p.vento)} h-full`}
                  style={{ width: `${Math.min(displayV * 2, 100)}%` }}
                />
              </div>
              <div className="w-24 text-right font-semibold">
                {p.vento} km/h <span className="text-gray-400">{p.direzione}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 text-xs text-gray-400 flex flex-wrap gap-3 justify-center">
        <div className="flex items-center gap-1"><span className="w-3 h-3 bg-[#22c55e]/60 rounded-full" /> ≤8</div>
        <div className="flex items-center gap-1"><span className="w-3 h-3 bg-[#facc15]/60 rounded-full" /> 9-15</div>
        <div className="flex items-center gap-1"><span className="w-3 h-3 bg-[#fb923c]/60 rounded-full" /> 16-22</div>
        <div className="flex items-center gap-1"><span className="w-3 h-3 bg-[#f87171]/60 rounded-full" /> 23-30</div>
        <div className="flex items-center gap-1"><span className="w-3 h-3 bg-[#ef4444]/70 rounded-full" /> over 30</div>
      </div>

      <div className="mt-3 text-xs text-gray-400 text-center">
        Dati interpolati ogni 250 m da Open-Meteo &bull; Aggiornati alle 16:00
      </div>
    </div>
  );
};

export default VentoProfilo;