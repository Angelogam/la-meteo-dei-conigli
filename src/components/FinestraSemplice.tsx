import React, { useState } from "react";
import {
  Wind,
  Thermometer,
  Sun,
  Cloud,
  CloudSun,
  CloudRain,
  Gauge,
  Droplets,
  Clock,
  ArrowUp,
  ArrowDown,
} from "lucide-react";

type FinestraProps = {
  titolo: string;
  giudizio: string;
  finestra: string;
  vento: string;
  temperatura: string;
  termiche: string;
  base: string;
  top: string;
  umidita: string;
  pressione: string;
  cielo: string;
  note: string;
};

export default function FinestraSemplice({
  titolo,
  giudizio,
  finestra,
  vento,
  temperatura,
  termiche,
  base,
  top,
  umidita,
  pressione,
  cielo,
  note,
}: FinestraProps) {
  const [aperta, setAperta] = useState(false);

  const iconaCielo =
    cielo.toLowerCase().includes("sereno")
      ? <Sun size={22} className="text-yellow-400 animate-pulse" />
      : cielo.toLowerCase().includes("cumuli")
      ? <CloudSun size={22} className="text-sky-300 animate-bounce" />
      : cielo.toLowerCase().includes("coperto")
      ? <Cloud size={22} className="text-gray-400" />
      : cielo.toLowerCase().includes("pioggia")
      ? <CloudRain size={22} className="text-blue-400 animate-pulse" />
      : <Cloud size={22} className="text-gray-300" />;

  return (
    <div
      onClick={() => setAperta(!aperta)}
      className={`rounded-xl border border-[#1e293b] bg-[#0f172a] p-4 text-left space-y-2 shadow-md hover:shadow-lg transition-all cursor-pointer ${
        aperta ? "ring-2 ring-emerald-500" : ""
      }`}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">{titolo}</h3>
        {iconaCielo}
      </div>

      <p className="text-sm font-medium text-[#22c55e]">{giudizio}</p>

      <div className="flex flex-col gap-1 text-sm text-gray-200">
        <p className="flex items-center gap-2">
          <Wind size={16} className="text-sky-400" /> {vento}
        </p>
        <p className="flex items-center gap-2">
          <Thermometer size={16} className="text-sky-400" /> {temperatura}
        </p>
        <p className="flex items-center gap-2">
          <Sun size={16} className="text-yellow-400" /> {termiche}
        </p>
        <p className="flex items-center gap-2">
          <Clock size={16} className="text-gray-300" /> Finestra: {finestra}
        </p>
      </div>

      {aperta && (
        <div className="mt-2 border-t border-gray-700 pt-2 text-sm text-gray-300 space-y-1">
          <p className="flex items-center gap-2">
            <ArrowUp size={14} className="text-orange-400" /> Base: {base}
          </p>
          <p className="flex items-center gap-2">
            <ArrowDown size={14} className="text-purple-400" /> Top: {top}
          </p>
          <p className="flex items-center gap-2">
            <Droplets size={14} className="text-blue-400" /> Umidità: {umidita}
          </p>
          <p className="flex items-center gap-2">
            <Gauge size={14} className="text-indigo-400" /> Pressione: {pressione}
          </p>
          <p className="flex items-center gap-2 italic text-gray-400">
            <Cloud size={14} /> {note}
          </p>
        </div>
      )}
    </div>
  );
}