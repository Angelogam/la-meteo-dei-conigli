character and closing tags">
"use client";

import React from "react";
import {
  Thermometer,
  Wind,
  Cloud,
  CloudRain,
  Droplets,
  Gauge,
  ArrowUp,
  Info,
  Calendar,
  Sun,
} from "lucide-react";

interface Props {
  siteName: string;
  altitude: number;
  currentData: any;
  dayData?: any;
  selectedDate?: string;
}

export default function ProfiloVerticalePro({
  siteName,
  altitude,
  currentData,
  dayData,
  selectedDate,
}: Props) {
  if (!currentData) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-400">
        <Thermometer className="w-12 h-12 text-amber-400 mb-4" />
        <p className="text-lg font-bold">Nessun dato disponibile per {siteName}</p>
      </div>
    );
  }

  const tempMax = currentData?.temperatureMax ?? 0;
  const tempMin = currentData?.temperatureMin ?? 0;
  const ventoMax = currentData?.windSpeedMax ?? 0;
  const ventoMedio = currentData?.windSpeed ?? 0;
  const nuvoleMedie = currentData?.cloudCover ?? 0;
  const precipitation = currentData?.precipitationSum ?? 0;
  const umidita = currentData?.humidity ?? 0;
  const pressione = currentData?.pressure ?? 0;
  const nuvolosita = currentData?.cloudCover ?? 0;
  const uvIndex = currentData?.uvIndex ?? 0;

  const deltaTermico = tempMax - tempMin;
  const baseNuvole = 200;
  const topTermico = 3000;

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-slate-800/70 to-slate-900/50 border border-cyan-500/30 rounded-2xl px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-800/60 to-cyan-700/30 border border-cyan-500/40 flex items-center justify-center shrink-0">
            <Sun className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <div className="text-base font-bold text-white">{siteName}</div>
            <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
              <Calendar className="w-3.5 h-3.5" />
              {dayData ? formatDateShort(new Date(dayData[0].time)) : ""}
              <span className="text-slate-600">·</span>
              <span>{altitude}m</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-800/60 rounded-xl p-3 text-center">
          <Thermometer className="w-4 h-4 text-amber-400 mx-auto mb-1" />
          <div className="text-lg font-bold text-white">{tempMax}°</div>
          <div className="text-[10px] text-slate-400">Max / {tempMin}° Min</div>
        </div>
        <div className="bg-slate-800/60 rounded-xl p-3 text-center">
          <Wind className="w-4 h-4 text-cyan-400 mx-auto mb-1" />
          <div className="text-lg font-bold text-white">{ventoMedio} km/h</div>
          <div className="text-[10px] text-slate-400">Max {ventoMax} km/h</div>
        </div>
        {precipitation > 0 && (
          <div className="bg-slate-800/60 rounded-xl p-3 text-center">
            <CloudRain className="w-4 h-4 text-blue-300 mx-auto mb-1" />
            <div className="text-lg font-bold text-white">{precipitation} mm</div>
            <div className="text-[10px] text-slate-400">Pioggia</div>
          </div>
        )}
        <div className="bg-slate-800/60 rounded-xl p-3 text-center">
          <ArrowUp className="w-4 h-4 text-green-400 mx-auto mb-1" />
          <div className="text-lg font-bold text-white">{baseNuvole} m</div>
          <div className="text-[10px] text-slate-400">Base nuvole</div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm text-slate-300">
        <div className="bg-slate-800/60 rounded-xl p-2 text-center">
          <Thermometer className="w-4 h-4 text-amber-400 mx-auto mb-1" />
          <div className="text-lg font-bold text-white">{tempMax}°</div>
          <div className="text-[10px] text-slate-500">max / {tempMin}° min</div>
        </div>
        <div className="bg-slate-800/60 rounded-xl p-2 text-center">
          <Wind className="w-4 h-4 text-cyan-400 mx-auto mb-1" />
          <div className="text-lg font-bold text-white">{ventoMedio} km/h</div>
          <div className="text-[10px] text-slate-400">max {ventoMax} km/h</div>
        </div>
        <div className="bg-slate-800/60 rounded-xl p-2 text-center">
          <ArrowUp className="w-4 h-4 text-green-400 mx-auto mb-1" />
          <div className="text-lg font-bold text-white">{baseNuvole} m</div>
          <div className="text-[10px] text-slate-400">Base nuvole</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm text-slate-300">
        <div className="bg-slate-800/60 rounded-xl p-2 text-center">
          <span className="text-slate-500">Umidità</span>
          <div className="text-white font-bold">{umidita}%</div>
        </div>
        <div className="bg-slate-800/60 rounded-xl p-2 text-center">
          <span className="text-slate-500">Pressione</span>
          <div className="text-white font-bold">{pressione} hPa</div>
        </div>
        <div className="bg-slate-800/60 rounded-xl p-2 text-center">
          <span className="text-slate-500">UV Index</span>
          <div className="text-white font-bold">{uvIndex}</div>
        </div>
        <div className="bg-slate-800/60 rounded-xl p-2 text-center">
          <span className="text-slate-500">Nuvole</span>
          <div className="text-white font-bold">{nuvolosita}%</div>
        </div>
      </div>

      <div className="flex items-start gap-2 bg-slate-800/30 border border-slate-700/30 rounded-2xl p-4">
        <Info className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
        <p className="text-[10px] text-slate-400 leading-relaxed">
          Dati aggiornati ogni 10 minuti. Le previsioni sono basate su Open‑Meteo.
        </p>
      </div>
    </div>
  );
}

function formatDateShort(d: Date): string {
  if (!d || isNaN(d.getTime())) return "";
  const days = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];
  return `${days[d.getDay()]} ${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}