"use client";

import React, { useMemo } from "react";
import type { HourData } from "@/types/meteo";
import type { Decollo } from "@/data/decolli";
import { calcolaTermiche, type TermicheData } from "@/utils/termiche";

// ------------------------------------------------------------
// PROPS COMUNI
// ------------------------------------------------------------
interface BaseTabProps {
  currentData: HourData | null;
  dayData: HourData[];
  site: Decollo;
}

// ------------------------------------------------------------
// METEO TAB
// ------------------------------------------------------------
interface MeteoTabProps extends BaseTabProps {
  thermalDelta: number;
  stabilityIndex: number | null;
  modelName: string;
  cape: number | null;
  liftedIndex: number | null;
  cin: number | null;
}

export function MeteoTab({
  currentData,
  dayData,
  site,
  thermalDelta,
  stabilityIndex,
  modelName,
  cape,
  liftedIndex,
  cin,
}: MeteoTabProps) {
  const thermal = useMemo<TermicheData | null>(() => {
    if (!currentData) return null;
    return calcolaTermiche(currentData, site.altitude);
  }, [currentData, site.altitude]);

  const oggi = useMemo(() => {
    const now = new Date();
    return dayData.filter(h =>
      h.time.getFullYear() === now.getFullYear() &&
      h.time.getMonth() === now.getMonth() &&
      h.time.getDate() === now.getDate()
    );
  }, [dayData]);

  const maxTemp = oggi.length ? Math.max(...oggi.map(h => h.temperature ?? 0)) : 0;
  const minTemp = oggi.length ? Math.min(...oggi.map(h => h.temperature ?? 0)) : 0;

  return (
    <div className="p-3 space-y-4">
      {currentData && (
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-2xl p-4 shadow-sm border border-blue-200/50 dark:border-blue-700/30">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wider">
              {new Date(currentData.time).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}
            </span>
            <span className="text-xs text-blue-500 dark:text-blue-400 font-medium">
              {modelName || "auto"}
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-5xl font-light tracking-tight">
              {Math.round(currentData.temperature ?? 0)}°
            </span>
            <span className="text-sm text-blue-500 dark:text-blue-400">
              T:{Math.round(currentData.dewPoint ?? 0)}° | UV:{(currentData.uvIndex ?? 0).toFixed(1)}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-3 mt-4">
            <div>
              <div className="text-[10px] text-blue-500 dark:text-blue-400 uppercase">Vento</div>
              <div className="text-sm font-semibold">{Math.round(currentData.windSpeed ?? 0)} km/h</div>
            </div>
            <div>
              <div className="text-[10px] text-blue-500 dark:text-blue-400 uppercase">Raffiche</div>
              <div className="text-sm font-semibold">{Math.round(currentData.windGusts ?? 0)} km/h</div>
            </div>
            <div>
              <div className="text-[10px] text-blue-500 dark:text-blue-400 uppercase">Umidità</div>
              <div className="text-sm font-semibold">{Math.round(currentData.humidity ?? 0)}%</div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <div className="bg-white dark:bg-gray-800/50 rounded-xl p-3 border border-gray-100 dark:border-gray-700/30">
          <div className="text-[10px] text-gray-400 uppercase mb-1">T Max</div>
          <div className="text-lg font-semibold">{Math.round(maxTemp)}°</div>
        </div>
        <div className="bg-white dark:bg-gray-800/50 rounded-xl p-3 border border-gray-100 dark:border-gray-700/30">
          <div className="text-[10px] text-gray-400 uppercase mb-1">T Min</div>
          <div className="text-lg font-semibold">{Math.round(minTemp)}°</div>
        </div>
        <div className="bg-white dark:bg-gray-800/50 rounded-xl p-3 border border-gray-100 dark:border-gray-700/30">
          <div className="text-[10px] text-gray-400 uppercase mb-1">Delta</div>
          <div className="text-lg font-semibold">{thermalDelta.toFixed(1)}°</div>
        </div>
        <div className="bg-white dark:bg-gray-800/50 rounded-xl p-3 border border-gray-100 dark:border-gray-700/30">
          <div className="text-[10px] text-gray-400 uppercase mb-1">Stabilità</div>
          <div className="text-lg font-semibold">
            {stabilityIndex !== null ? stabilityIndex.toFixed(1) : "N/D"}
          </div>
        </div>
      </div>

      {thermal && (
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-2xl p-4 border border-amber-200/50 dark:border-amber-700/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wider">Termiche</span>
            <span className="text-xs text-amber-500 dark:text-amber-400">{thermal.label}</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <div className="text-[10px] text-amber-500 dark:text-amber-400 uppercase">Rateo</div>
              <div className="text-lg font-bold" style={{ color: thermal.colore }}>{thermal.rateo.toFixed(1)} m/s</div>
            </div>
            <div>
              <div className="text-[10px] text-amber-500 dark:text-amber-400 uppercase">Base</div>
              <div className="text-sm font-semibold">{thermal.base} m</div>
            </div>
            <div>
              <div className="text-[10px] text-amber-500 dark:text-amber-400 uppercase">Top</div>
              <div className="text-sm font-semibold">{thermal.top} m</div>
            </div>
          </div>
        </div>
      )}

      {(cape != null || liftedIndex != null || cin != null) && (
        <div className="bg-white dark:bg-gray-800/50 rounded-xl p-3 border border-gray-100 dark:border-gray-700/30">
          <div className="text-[10px] text-gray-400 uppercase mb-2">Instabilità atmosferica</div>
          <div className="grid grid-cols-3 gap-2">
            {cape != null && (
              <div>
                <div className="text-[10px] text-gray-400">CAPE</div>
                <div className="text-sm font-semibold">
                  {cape >= 1000 ? `${(cape / 1000).toFixed(1)}k` : Math.round(cape)} J/kg
                </div>
              </div>
            )}
            {cin != null && (
              <div>
                <div className="text-[10px] text-gray-400">CIN</div>
                <div className="text-sm font-semibold">{Math.round(cin)} J/kg</div>
              </div>
            )}
            {liftedIndex != null && (
              <div>
                <div className="text-[10px] text-gray-400">LI</div>
                <div className="text-sm font-semibold">{liftedIndex.toFixed(1)}°C</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------
// VENTI TAB
// ------------------------------------------------------------
interface VentiTabProps extends BaseTabProps {}

function dirName(dir: number | null | undefined): string {
  const d = typeof dir === "number" ? dir : 0;
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const idx = Math.round(((d % 360) / 45)) % 8;
  return dirs[idx];
}

export function VentiTab({ currentData, dayData, site }: VentiTabProps) {
  const profile = useMemo(() => {
    if (!currentData?.windProfile || !currentData.windProfile.length) return [];
    return currentData.windProfile
      .slice()
      .sort((a, b) => a.height - b.height)
      .map(l => ({ ...l, dirName: dirName(l.dir) }));
  }, [currentData]);

  if (!currentData) {
    return <div className="p-4 text-center text-gray-500">Seleziona un'ora per vedere i venti</div>;
  }

  const baseDirName = dirName(currentData.windDir);
  const baseSpeed = Math.round(currentData.windSpeed ?? 0);
  const baseGusts = Math.round(currentData.windGusts ?? 0);

  return (
    <div className="p-3 space-y-4">
      <div className="bg-white dark:bg-gray-800/60 rounded-2xl p-4 border border-gray-100 dark:border-gray-700/40">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-gray-500 uppercase">Vento decollo</span>
          <span className="text-xs text-gray-400">{site.name} · {site.altitude} m</span>
        </div>
        <div className="flex items-baseline gap-3">
          <span className="text-3xl font-semibold">{baseSpeed} km/h</span>
          <span className="text-sm text-gray-500">Raffiche {baseGusts} km/h</span>
        </div>
        <div className="mt-2 text-sm text-gray-600">
          {baseDirName} ({Math.round(currentData.windDir ?? 0)}°)
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800/60 rounded-2xl p-4 border border-gray-100 dark:border-gray-700/40">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-gray-500 uppercase">Profilo vento in quota</span>
          <span className="text-xs text-gray-400">
            {new Date(currentData.time).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>

        {profile.length === 0 ? (
          <div className="text-xs text-gray-500">Nessun profilo vento disponibile.</div>
        ) : (
          <div className="space-y-1">
            {profile.map(level => (
              <div key={level.height} className="flex items-center justify-between text-xs py-1 border-b border-gray-100 dark:border-gray-700/40 last:border-b-0">
                <span className="text-gray-500">{level.height} m</span>
                <span className="text-gray-700 dark:text-gray-200">
                  {Math.round(level.speed)} km/h · {level.dirName} ({Math.round(level.dir)}°)
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// TERMICHE TAB
// ------------------------------------------------------------
interface TermicheTabProps extends BaseTabProps {}

export function TermicheTab({ currentData, dayData, site }: TermicheTabProps) {
  const thermal = useMemo<TermicheData | null>(() => {
    if (!currentData) return null;
    return calcolaTermiche(currentData, site.altitude);
  }, [currentData, site.altitude]);

  if (!thermal) {
    return <div className="p-4 text-center text-gray-500">Seleziona un'ora per vedere le termiche</div>;
  }

  return (
    <div className="space-y-4 p-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3">
          <div className="text-xs text-gray-500 mb-1">Rateo</div>
          <div className="text-2xl font-bold" style={{ color: thermal.colore }}>
            {thermal.rateo.toFixed(1)} m/s
          </div>
        </div>
        <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3">
          <div className="text-xs text-gray-500 mb-1">Forza</div>
          <div className="text-2xl font-bold">{thermal.forza.toFixed(1)}/10</div>
        </div>
        <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3">
          <div className="text-xs text-gray-500 mb-1">Base</div>
          <div className="text-lg font-semibold">{thermal.base} m</div>
        </div>
        <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3">
          <div className="text-xs text-gray-500 mb-1">Top</div>
          <div className="text-lg font-semibold">{thermal.top} m</div>
        </div>
      </div>

      <div className="flex items-center justify-center">
        <span
          className="px-4 py-1.5 rounded-full text-sm font-medium text-white"
          style={{ backgroundColor: thermal.colore }}
        >
          {thermal.label}
        </span>
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// ANALISI TAB
// ------------------------------------------------------------
interface AnalisiTabProps extends BaseTabProps {}

export function AnalisiTab({ currentData, dayData, site }: AnalisiTabProps) {
  const thermal = currentData ? calcolaTermiche(currentData, site.altitude) : null;

  return (
    <div className="p-4 space-y-4">
      <h3 className="font-semibold text-lg">Analisi giornata</h3>
      {thermal ? (
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Condizioni termiche</span>
            <span className="font-medium">{thermal.label}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Base termica</span>
            <span className="font-medium">{thermal.base} m slm</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Top termico</span>
            <span className="font-medium">{thermal.top} m slm</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Rateo medio</span>
            <span className="font-medium">{thermal.rateo.toFixed(1)} m/s</span>
          </div>
        </div>
      ) : (
        <div className="text-sm text-gray-500">Nessun dato termico disponibile.</div>
      )}
    </div>
  );
}