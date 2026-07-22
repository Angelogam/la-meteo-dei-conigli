"use client";

import React from "react";

interface ThermalData {
  hour: string;
  speed: number;
  base: number;
  top: number;
}

const TermicheAquila: React.FC<{ data: ThermalData[] }> = ({ data }) => {
  const getColor = (speed: number) => {
    if (speed < 0.8) return "#6b7280"; // grigio
    if (speed < 1.2) return "#facc15"; // giallo
    if (speed < 2.0) return "#f97316"; // arancio
    return "#dc2626"; // rosso
  };

  const getLabel = (speed: number) => {
    if (speed < 0.8) return "Molto debole";
    if (speed < 1.2) return "Debole";
    if (speed < 2.0) return "Moderata";
    return "Forte";
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 p-4">
      {data.map((t, i) => (
        <div
          key={i}
          className="relative flex flex-col items-center bg-[#0f172a] rounded-xl border border-[#22c55e]/30 p-3 shadow-lg overflow-hidden min-h-[320px]"
        >
          {/* Ora in alto */}
          <div className="text-sm font-bold text-gray-300 mb-1 z-10">{t.hour}</div>

          {/* Aquila (più dettagliata, simile alla foto) */}
          <svg viewBox="0 0 120 120" width="55" height="55" className="z-10 mt-1">
            {/* corpo aquila */}
            <ellipse cx="60" cy="50" rx="25" ry="18" fill="#78350f" />
            {/* testa */}
            <circle cx="60" cy="22" r="14" fill="#facc15" />
            {/* occhi */}
            <circle cx="55" cy="20" r="3" fill="#000" />
            <circle cx="65" cy="20" r="3" fill="#000" />
            {/* becco */}
            <polygon points="60,26 55,34 65,34" fill="#f97316" />
            {/* ali spiegate */}
            <path d="M35 50 Q20 35 15 45 Q25 55 35 55Z" fill="#78350f" />
            <path d="M85 50 Q100 35 105 45 Q95 55 85 55Z" fill="#78350f" />
            {/* coda */}
            <path d="M50 65 Q60 85 70 65Z" fill="#78350f" />
          </svg>

          {/* Nuvola */}
          <div className="relative w-24 h-14 bg-gray-200 rounded-full shadow-md z-10 mt-2">
            <div className="absolute -top-3 left-3 w-16 h-10 bg-gray-100 rounded-full"></div>
            <div className="absolute -top-2 right-2 w-14 h-9 bg-gray-100 rounded-full"></div>
          </div>

          {/* Colonna termica (dal basso della nuvola verso il basso) */}
          <div
            className="w-8 rounded-b-lg mt-1 z-10"
            style={{
              height: `${Math.max(30, (t.top - t.base) / 22)}px`,
              backgroundColor: getColor(t.speed),
              boxShadow: "0 0 12px rgba(255,255,255,0.25)",
            }}
          ></div>

          {/* Dati sotto la colonna */}
          <div className="mt-2 text-center text-xs text-gray-300 z-10">
            <div className="text-[#22c55e] font-bold text-sm">{t.speed.toFixed(1)} m/s</div>
            <div className="text-gray-400 text-[11px]">{getLabel(t.speed)}</div>
            <div className="text-[#22c55e] mt-0.5">Base {Math.round(t.base)} m</div>
            <div className="text-red-400">Top {Math.round(t.top)} m</div>
          </div>

          {/* Sfondo prato verde in basso (come nella foto) */}
          <svg
            viewBox="0 0 200 60"
            width="100%"
            height="55"
            className="absolute bottom-0 left-0"
            preserveAspectRatio="none"
          >
            <rect width="200" height="60" fill="#14532d" />
            <path d="M0 35 Q40 15 100 35 T200 35 V60 H0 Z" fill="#166534" />
            <circle cx="25" cy="30" r="10" fill="#22c55e" opacity="0.6" />
            <circle cx="175" cy="30" r="10" fill="#22c55e" opacity="0.6" />
            <circle cx="100" cy="32" r="7" fill="#22c55e" opacity="0.4" />
          </svg>
        </div>
      ))}
    </div>
  );
};

export default TermicheAquila;