import React from "react";
import { AlertTriangle } from "lucide-react";

interface WindEntry {
  quota: number;
  vento: number;
  direzione: string;
}

interface Props {
  mode?: "real" | "test";
  giorno: string;
  data: string;
  decollo: string;
  profilo: WindEntry[];
}

// --- Synthetic profile generator for test mode (Malanotte) ---
function generateTestProfile(): WindEntry[] {
  const result: WindEntry[] = [];
  const directions = [
    "N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
    "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW",
  ];

  for (let q = 1740; q <= 4000; q += 250) {
    let speed: number;
    if (q <= 1750) {
      speed = 10 + Math.random() * 10; // 10–20 km/h at decollo
    } else if (q <= 2500) {
      speed = 20 + Math.random() * 15; // 20–35 km/h
    } else if (q <= 3500) {
      speed = 30 + Math.random() * 15; // 30–45 km/h
    } else {
      speed = 35 + Math.random() * 15; // 35–50 km/h sopra 3500m
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
function isUnrealistic(profilo: WindEntry[]): boolean {
  for (const p of profilo) {
    if (p.vento > 80) return true;
    if (p.quota < 3000 && p.vento > 50) return true;
  }
  return false;
}

// --- Check: zero values above 180m (Open-Meteo limitation) ---
function hasMissingData(profilo: WindEntry[]): boolean {
  const above180 = profilo.filter((p) => p.quota > 180);
  if (above180.length === 0) return false;
  return above180.every((p) => p.vento === 0);
}

const WindProfileUnified: React.FC<Props> = ({
  mode = "real",
  giorno,
  data,
  decollo,
  profilo,
}) => {
  // Use test mode synthetic data
  const profileData = mode === "test" ? generateTestProfile() : profilo;

  // Warning flags
  const dataMissing = mode !== "test" && hasMissingData(profileData);
  const dataUnrealistic = mode !== "test" && !dataMissing && isUnrealistic(profileData);
  const showWarning = dataMissing || dataUnrealistic;

  // Styling based on status
  let borderColor = "border-[#22c55e]/40";
  let shadowColor = "hover:shadow-[#22c55e]/20";
  if (dataUnrealistic) {
    borderColor = "border-orange-500/50";
    shadowColor = "hover:shadow-orange-500/20";
  } else if (dataMissing) {
    borderColor = "border-yellow-500/50";
    shadowColor = "hover:shadow-yellow-500/20";
  }

  const getColor = (v: number) => {
    if (v <= 8) return "bg-[#22c55e]/60";
    if (v <= 15) return "bg-[#facc15]/60";
    if (v <= 22) return "bg-[#fb923c]/60";
    if (v <= 30) return "bg-[#f87171]/60";
    return "bg-[#ef4444]/70";
  };

  // Cap bar width display
  const displaySpeed = (v: number) => {
    if (dataUnrealistic) return Math.min(v, 40);
    return v;
  };

  // Compute raffica max (display only)
  const maxWind = profileData.length > 0
    ? Math.max(...profileData.map((p) => p.vento))
    : 0;

  return (
    <div
      className={`flex flex-col gap-4 p-5 rounded-2xl bg-gradient-to-b from-[#0f172a] to-[#1e293b] border ${borderColor} shadow-lg ${shadowColor} transition-all duration-300`}
    >
      {/* Header: title, day, date, decollo */}
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-white tracking-wide flex items-center gap-2">
          💨 Profilo vento verticale
        </h3>
        <div className="text-sm text-gray-300 text-right">
          📅 {giorno} — {data}
          <br />
          🪂 Decollo: <span className="text-[#22c55e] font-semibold">{decollo}</span>
        </div>
      </div>

      {/* Raffica massima */}
      <div className="text-sm text-gray-300 mt-1">
        🌬️ Vento massimo in quota:{" "}
        <span className="font-semibold">
          {maxWind} km/h
        </span>
      </div>

      {/* Warning: dati mancanti */}
      {dataMissing && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-900/30 border border-yellow-500/30 text-yellow-200 text-sm">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-yellow-400" />
          <span>
            Dati vento in quota superiori a 180m non disponibili da Open-Meteo.
            Verifica manuale consigliata.
          </span>
        </div>
      )}

      {/* Warning: dati non realistici */}
      {dataUnrealistic && (
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
                {p.vento} km/h{" "}
                <span className="text-gray-400">{p.direzione}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 text-xs text-gray-400 flex flex-wrap gap-3 justify-center">
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 bg-[#22c55e]/60 rounded-full" /> ≤8
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 bg-[#facc15]/60 rounded-full" /> 9-15
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 bg-[#fb923c]/60 rounded-full" /> 16-22
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 bg-[#f87171]/60 rounded-full" /> 23-30
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 bg-[#ef4444]/70 rounded-full" /> over 30
        </div>
      </div>

      <div className="mt-3 text-xs text-gray-400 text-center">
        Dati interpolati ogni 250 m da Open-Meteo &bull; Aggiornati alle 16:00
      </div>
    </div>
  );
};

export default WindProfileUnified;
export type { WindEntry };