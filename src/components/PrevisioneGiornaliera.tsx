"use client";

import React, { useState } from "react";
import {
  Sun,
  CloudSun,
  CloudRain,
  Wind,
  Droplets,
  Gauge,
  ArrowUp,
  ArrowDown,
} from "lucide-react";

type GiornalieraProps = {
  giorno: string;
  max: string;
  min: string;
  delta: string;
  vento: string;
  pioggia: string;
  base?: string;
  top?: string;
  umidita?: string;
  pressione?: string;
  cielo: string;
};

export default function PrevisioneGiornaliera({
  giorno,
  max,
  min,
  delta,
  vento,
  pioggia,
  base,
  top,
  umidita,
  pressione,
  cielo,
}: GiornalieraProps) {
  const [aperta, setAperta] = useState(false);

  const iconaCielo =
    cielo.toLowerCase().includes("pioggia")
      ? <CloudRain size={22} className="text-blue-400 animate-pulse" />
      : cielo.toLowerCase().includes("cumuli")
      ? <CloudSun size={22} className="text-sky-300 animate-bounce" />
      : <Sun size={22} className="text-yellow-400" />;

  return (
    <div
      onClick={() => setAperta(!aperta)}
      className={`rounded-xl border border-[#1e293b] bg-[#0f172a] p-4 text-left space-y-2 shadow-md hover:shadow-lg transition-all cursor-pointer ${
        aperta ? "ring-2 ring-emerald-500" : ""
      }`}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">{giorno}</h3>
        {iconaCielo}
      </div>

      <p className="text-sm text-gray-200">
        🌡️ <strong>{max}</strong> / {min} · Δ {delta}
      </p>
      <p className="text-sm text-gray-300 flex items-center gap-2">
        <Wind size={16} className="text-sky-400" /> {vento}
      </p>
      <p className="text-sm text-gray-300 flex items-center gap-2">
        <Droplets size={16} className="text-blue-400" /> {pioggia}
      </p>

      {aperta && (
        <div className="mt-2 border-t border-gray-700 pt-2 text-sm text-gray-300 space-y-1">
          {base && (
            <p className="flex items-center gap-2">
              <ArrowUp size={14} className="text-orange-400" /> Base: {base}
            </p>
          )}
          {top && (
            <p className="flex items-center gap-2">
              <ArrowDown size={14} className="text-purple-400" /> Top: {top}
            </p>
          )}
          {umidita && (
            <p className="flex items-center gap-2">
              <Droplets size={14} className="text-blue-400" /> Umidità: {umidita}
            </p>
          )}
          {pressione && (
            <p className="flex items-center gap-2">
              <Gauge size={14} className="text-indigo-400" /> Pressione: {pressione}
            </p>
          )}
        </div>
      )}
    </div>
  );
}