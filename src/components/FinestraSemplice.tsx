"use client";

import React from "react";
import { Wind, Thermometer, Sun, Clock } from "lucide-react";

type FinestraProps = {
  titolo: string;
  giudizio: string;
  finestra: string;
  vento: string;
  temperatura: string;
  termiche: string;
  note: string;
};

export default function FinestraSemplice({
  titolo,
  giudizio,
  finestra,
  vento,
  temperatura,
  termiche,
  note,
}: FinestraProps) {
  const isBuono = giudizio.toLowerCase().includes("buono");
  const isOttimo = giudizio.toLowerCase().includes("ottimo");
  const isIncerto = giudizio.toLowerCase().includes("incerto");

  const borderColor = isOttimo
    ? "border-green-400"
    : isBuono
    ? "border-emerald-500"
    : isIncerto
    ? "border-yellow-400"
    : "border-red-500";

  return (
    <div
      className={`rounded-xl border ${borderColor} bg-[#0f172a] p-4 text-left space-y-2 shadow-md hover:shadow-lg transition-shadow`}
    >
      <h3 className="text-lg font-semibold text-white">{titolo}</h3>
      <p className="text-sm font-medium text-emerald-400">{giudizio}</p>

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

      <p className="text-xs italic text-gray-400">{note}</p>
    </div>
  );
}