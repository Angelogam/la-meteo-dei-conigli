"use client";

import React from "react";
import { Wind, Thermometer, Sun } from "lucide-react";

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
  return (
    <div className="rounded-xl border border-[#1e293b] bg-[#0f172a] p-4 text-left space-y-2 shadow-md hover:shadow-lg transition-shadow">
      <h3 className="text-lg font-semibold text-white">{titolo}</h3>
      <p className="text-sm font-medium text-[#22c55e]">{giudizio}</p>

      <div className="flex flex-col gap-1 text-sm text-gray-200">
        <p className="flex items-center gap-2">
          <Wind size={16} className="text-[#38bdf8]" /> <strong>Vento:</strong> {vento}
        </p>
        <p className="flex items-center gap-2">
          <Thermometer size={16} className="text-[#38bdf8]" /> <strong>Temperatura:</strong> {temperatura}
        </p>
        <p className="flex items-center gap-2">
          <Sun size={16} className="text-[#facc15]" /> <strong>Termiche:</strong> {termiche}
        </p>
      </div>

      <p className="text-sm text-gray-100 font-semibold">
        Finestra consigliata: {finestra}
      </p>
      <p className="text-xs italic text-gray-400">{note}</p>
    </div>
  );
}