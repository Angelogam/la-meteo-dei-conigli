"use client";

import React from "react";

interface ThermalData {
  hour: string;
  speed: number;
  base: number;
  top: number;
}

const TermicheNuvola: React.FC<{ data: ThermalData[] }> = ({ data }) => {
  const getColor = (speed: number) => {
    if (speed < 0.8) return "bg-gray-500";
    if (speed < 1.2) return "bg-yellow-500";
    if (speed < 2.0) return "bg-orange-600";
    return "bg-red-600";
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
          className="flex flex-col items-center justify-end bg-[#0f172a] rounded-xl border border-[#22c55e]/30 p-3 shadow-lg"
        >
          {/* Ora */}
          <div className="text-sm text-gray-300 mb-2">{t.hour}</div>

          {/* Colonna termica */}
          <div className="relative w-12 h-48 flex flex-col justify-end">
            <div
              className={`absolute bottom-0 w-full rounded-t-lg ${getColor(t.speed)}`}
              style={{
                height: `${(t.top - t.base) / 30}px`,
              }}
            ></div>
            {/* Nuvola */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-14 h-8 bg-gray-200 rounded-full shadow-md"></div>
          </div>

          {/* Dati */}
          <div className="mt-3 text-center text-xs text-gray-300">
            <div className="text-[#22c55e] font-semibold">{t.speed.toFixed(1)} m/s</div>
            <div>{getLabel(t.speed)}</div>
            <div className="text-[#22c55e]">Base {Math.round(t.base)} m</div>
            <div className="text-red-400">Top {Math.round(t.top)} m</div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default TermicheNuvola;