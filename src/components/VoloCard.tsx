"use client";

import React from "react";
import { useWeatherData } from "@/hooks/useWeatherData";

interface VoloCardProps {
  /** Optional: if you want to force a specific site, otherwise uses selected site from hook */
  siteId?: string;
}

export default function VoloCard({ siteId }: VoloCardProps = {}) {
  const {
    selectedId,
    site,
    dayData,
    hourlyData,
    selectedDay,
    dateLabels,
    lastUpdate,
    enrichedDaily,
  } = useWeatherData();

  const currentSite = siteId ? 
    (DECOLLI.find(d => d.id === siteId) ?? site) : 
    site;

  // If no site data, show loading placeholder
  if (!currentSite || !dayData || dayData.length === 0) {
    return (
      <div className="bg-slate-900/30 border border-slate-700/50 rounded-xl p-4">
        <p className="text-slate-400 text-center">Caricamento dati per il volo...</p>
      </div>
    );
  }

  // Use the first day of data (already filtered by selectedDay in hook)
  const giorno = dayData;
  const dataGiorno = useMemo(() => {
    if (dayData && dayData.length > 0) return dayData[0].time;
    return new Date();
  }, [dayData]);

  const nomeDecollo = currentSite?.name ?? "Decollo";
  const dataReport = dateLabels[selectedDay] ?? dataGiorno.toLocaleDateString("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const oraAggiornamento = lastUpdate
    ? lastUpdate.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })
    : "--:--";

  return (
    <div className="bg-slate-950/80 border border-slate-700/50 rounded-xl p-4 shadow-md">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-bold text-white">
          🌤️ REPORT VOLO A VELA – ${nomeDecollo.toUpperCase()} – ${dataReport} 🌤️
        </h3>
        <p className="text-xs text-slate-400">
          Quota partenza circa ${currentSite.altitude} m s.l.m. – Dati da AROME + ICON-EU elaborati da Alpium – Aggiornamento ${oraAggiornamento} UTC
        </p>
      </div>

      <div className="flex items-center justify-between mt-4">
        <div className="bg-slate-800/60 rounded-xl p-3 text-center">
          <div className="text-sm text-slate-500">Top termiche</div>
          <div className="text-3xl font-bold text-orange-400">{4400}m</div>
        </div>
        <div className="bg-slate-800/60 rounded-xl p-3 text-center">
          <div className="text-sm text-slate-500">Rateo medio</div>
          <div className="text-2xl font-bold text-yellow-400">{2.5} m/s</div>
        </div>
      </div>

      <div className="mt-6 text-slate-300 text-sm">
        <p className="flex items-center gap-2">
          <span className="text-emerald-400">📍</span>
          <span className="font-bold">{nomeDecollo}</span>
        </p>
        <div className="flex items-center gap-2 text-[11px] text-slate-400">
          <span className="w-4 h-4 rounded-full bg-emerald-400"></span>
          <span>{currentSite.altitude}m</span>
          <span className="ml-2">·</span>
          <span>{currentSite.exposure}</span>
        </div>
      </div>
    </div>
  );
}