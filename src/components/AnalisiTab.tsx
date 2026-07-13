"use client";

import React from "react";
import {
  BrainCircuit,
  AlertTriangle,
  CheckCircle2,
  ThermometerSun,
  Wind,
  Mountain,
  CloudSun,
  CloudRain,
  CloudLightning,
} from "lucide-react";

interface AnalisiTabProps {
  currentData: any;
  site: { name: string; alt: number };
  thermalDelta: number;
  thermalStrength: { label: string; color: string };
}

export default function AnalisiTab({
  currentData,
  site,
  thermalDelta,
  thermalStrength,
}: AnalisiTabProps) {
  if (!currentData) return null;

  const cloudBase = Math.round(
    (currentData.temperature - currentData.dewPoint) * 120 + site.alt
  );
  const thermalPlafond = Math.round(site.alt + thermalDelta * 100);

  const sections = [
    {
      icon: <BrainCircuit className="w-5 h-5 text-emerald-400" />,
      title: "Panoramica Generale",
      content: (
        <div className="space-y-2 text-sm text-slate-300 leading-relaxed">
          <p>
            La giornata al decollo di <strong className="text-slate-100">{site.name}</strong> si
            presenta con temperatura di <strong className="text-amber-300">{Math.round(currentData.temperature)}°C</strong>,
            umidità al <strong className="text-sky-300">{Math.round(currentData.humidity)}%</strong> e
            nuvolosità al <strong className="text-slate-300">{Math.round(currentData.cloudCover)}%</strong>.
          </p>
          <div className="flex flex-wrap gap-2">
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
              currentData.windSpeed > 20 ? "bg-orange-500/10 border border-orange-500/30 text-orange-300" : "bg-emerald-500/10 border border-emerald-500/30 text-emerald-300"
            }`}>
              <Wind className="w-3 h-3" />
              Vento: {Math.round(currentData.windSpeed)} km/h
            </span>
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
              currentData.precipitation > 0 ? "bg-blue-500/10 border border-blue-500/30 text-blue-300" : "bg-emerald-500/10 border border-emerald-500/30 text-emerald-300"
            }`}>
              {currentData.precipitation > 0 ? <CloudRain className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
              Pioggia: {currentData.precipitation > 0 ? `${Math.round(currentData.precipitation * 10) / 10} mm` : "Assente"}
            </span>
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
              thermalDelta > 8 ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-300" : "bg-amber-500/10 border border-amber-500/30 text-amber-300"
            }`}>
              <ThermometerSun className="w-3 h-3" />
              Δ termico: {thermalDelta}°C
            </span>
          </div>
        </div>
      ),
    },
    {
      icon: <ThermometerSun className="w-5 h-5 text-amber-400" />,
      title: "Consigli per il Volo",
      content: (
        <div className="space-y-3 text-sm text-slate-300">
          <div className={`px-3 py-2 rounded-lg border ${
            currentData.windSpeed > 25 || currentData.precipitation > 0.5
              ? "bg-red-500/10 border-red-500/30"
              : currentData.windSpeed > 18
              ? "bg-amber-500/10 border-amber-500/30"
              : "bg-emerald-500/10 border-emerald-500/30"
          }`}>
            <div className="flex items-center gap-2 text-xs font-semibold mb-1">
              {currentData.windSpeed > 25 || currentData.precipitation > 0.5 ? (
                <><AlertTriangle className="w-3.5 h-3.5 text-red-400" /><span className="text-red-300">ALTO - Condizioni pericolose</span></>
              ) : currentData.windSpeed > 18 ? (
                <><AlertTriangle className="w-3.5 h-3.5 text-amber-400" /><span className="text-amber-300">MEDIO - Richiesta esperienza</span></>
              ) : (
                <><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /><span className="text-emerald-300">BASSO - Condizioni favorevoli</span></>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-slate-800/50 rounded-lg p-2.5">
              <div className="text-[10px] text-slate-500">Vento</div>
              <div className="text-xs font-bold text-slate-100 mt-0.5">
                {currentData.windSpeed < 8 ? "🍃 Debole" : currentData.windSpeed < 20 ? "✅ Ideale" : "⚠️ Sostenuto"}
              </div>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-2.5">
              <div className="text-[10px] text-slate-500">Termiche</div>
              <div className="text-xs font-bold mt-0.5" style={{ color: thermalStrength.color }}>
                {thermalStrength.label}
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      icon: <Mountain className="w-5 h-5 text-amber-400" />,
      title: "Quote e Plafond",
      content: (
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="bg-slate-800/50 rounded-lg p-2.5">
            <div className="text-[10px] text-slate-500">Base decollo</div>
            <div className="text-sm font-bold text-slate-100">{site.alt} m</div>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-2.5">
            <div className="text-[10px] text-slate-500">Base nuvole</div>
            <div className="text-sm font-bold text-slate-100">{cloudBase} m</div>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-2.5">
            <div className="text-[10px] text-slate-500">Plafond termico</div>
            <div className="text-sm font-bold text-emerald-300">{thermalPlafond} m</div>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-2.5">
            <div className="text-[10px] text-slate-500">Cross Country</div>
            <div className={`text-sm font-bold ${thermalDelta > 8 && currentData.windSpeed < 20 ? "text-emerald-300" : "text-amber-300"}`}>
              {thermalDelta > 8 && currentData.windSpeed < 20 ? "✅ Favorevole" : "🫤 Limitato"}
            </div>
          </div>
        </div>
      ),
    },
    {
      icon: currentData.weatherCode >= 95 ? <CloudLightning className="w-5 h-5 text-red-400" /> : <CheckCircle2 className="w-5 h-5 text-emerald-400" />,
      title: "Allerta Temporali",
      content: (
        <div className={`px-3 py-2 rounded-lg border ${
          currentData.weatherCode >= 95
            ? "bg-red-500/10 border-red-500/30"
            : currentData.weatherCode >= 80
            ? "bg-amber-500/10 border-amber-500/30"
            : "bg-emerald-500/10 border-emerald-500/30"
        }`}>
          <p className="text-sm font-medium">
            {currentData.weatherCode >= 95
              ? "🔴 ALLERTA TEMPORALI IN CORSO! Volo sconsigliato."
              : currentData.weatherCode >= 80
              ? "🟡 ATTENZIONE: Possibili rovesci. Monitorare l'evoluzione."
              : "✅ Nessun temporale previsto. Cielo sereno o poco nuvoloso."}
          </p>
        </div>
      ),
    },
  ];

  return (
    <div className="animate-fadeIn space-y-3">
      {sections.map((section, i) => (
        <div
          key={i}
          className="bg-slate-800/50 border border-slate-700/30 rounded-xl p-4"
        >
          <div className="flex items-center gap-2 mb-3">
            {section.icon}
            <h4 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
              {section.title}
            </h4>
          </div>
          {section.content}
        </div>
      ))}
    </div>
  );
}