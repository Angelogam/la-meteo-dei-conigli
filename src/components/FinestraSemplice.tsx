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
  const coloreSfondo =
    titolo.includes("Mattina")
      ? "bg-blue-100"
      : titolo.includes("Pomeriggio")
      ? "bg-yellow-100"
      : "bg-indigo-900 text-white";

  return (
    <div
      className={`rounded-xl border border-gray-300 p-4 text-left space-y-2 shadow-md hover:shadow-lg transition-shadow ${coloreSfondo}`}
    >
      <h3 className="text-lg font-semibold">{titolo}</h3>
      <p className="text-sm font-medium text-green-700">{giudizio}</p>

      <div className="flex flex-col gap-1 text-sm">
        <p className="flex items-center gap-2">
          <Wind size={16} /> <strong>Vento:</strong> {vento}
        </p>
        <p className="flex items-center gap-2">
          <Thermometer size={16} /> <strong>Temperatura:</strong> {temperatura}
        </p>
        <p className="flex items-center gap-2">
          <Sun size={16} /> <strong>Termiche:</strong> {termiche}
        </p>
      </div>

      <p className="text-sm">
        <strong>Finestra consigliata:</strong> {finestra}
      </p>
      <p className="text-xs italic opacity-80">{note}</p>
    </div>
  );
}