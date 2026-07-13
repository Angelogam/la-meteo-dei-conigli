"use client";

import React, { useEffect, useRef, useState } from "react";
import { X, Wind, Thermometer, RefreshCw, Droplets, Gauge, Cloud, CloudRain, ChevronDown, ChevronUp, Clock } from "lucide-react";
import AlertVolo from "./AlertVolo";
import GraficoTermiche from "./GraficoTermiche";
import type { HourData } from "@/types/meteo";
import { DECOLLI } from "@/data/decolli";
import { wic } from "@/utils/meteo";
import { getVoloStatus } from "@/utils/volo";
import { generaTermicheOrarie } from "@/utils/termiche";

interface SidebarDecolliProps {
  selectedId: string;
  onSelect: (id: string) => void;
  weatherMap: Record<string, HourData>;
  hourlyData: HourData[];
  siteAltitude: number;
}

export default function SidebarDecolli({ selectedId, onSelect, weatherMap, hourlyData, siteAltitude }: SidebarDecolliProps) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showPopup, setShowPopup] = useState(false);

  const toggleExpand = (id: string) => {
    setExpanded(expanded === id ? null : id);
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2 px-3 py-2 mb-2 bg-slate-800/60 rounded-xl border border-emerald-500/20">
        <Wind className="w-4 h-4 text-emerald-400" />
        <h3 className="text-sm font-bold text-emerald-300 tracking-wide">Sidebar Decolli</h3>
      </div>
      {DECOLLI.map((site) => {
        const w = weatherMap[site.id];
        const isSelected = site.id === selectedId;
        const volo = w ? getVoloStatus(w) : null;
        return (
          <div key={site.id} className={`rounded-xl border-2 transition-all duration-200 ${isSelected ? "border-emerald-400/50 bg-emerald-900/20" : "border-slate-700/30 bg-slate-800/30 hover:border-slate-600/50"}`}>
            <button
              onClick={() => {
                onSelect(site.id);
                toggleExpand(site.id);
              }}
              className="w-full text-left px-3 py-2.5"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold truncate text-slate-200">{site.name}</div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                    <span>{site.exposure}</span>
                    <span className="w-0.5 h-0.5 rounded-full bg-slate-500" />
                    <span>{site.altitude}m</span>
                  </div>
                </div>
                {w && (
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-lg">{wic(w.weatherCode, true)}</span>
                    <span className="text-sm font-bold text-amber-300">{Math.round(w.temperature)}°</span>
                    <div className="flex items-center gap-1">
                      <Wind className="w-3 h-3 text-sky-400" />
                      <span className="text-xs font-semibold text-sky-300">{Math.round(w.windSpeed)}</span>
                    </div>
                    {/* FIX: windGust → windGusts */}
                    {w.windGusts && w.windGusts > 0 && (
                      <span className="text-[10px] text-orange-300 font-semibold">
                        /{Math.round(w.windGusts)}
                      </span>
                    )}
                  </div>
                )}
                {expanded === site.id ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </div>
            </button>
            {expanded === site.id && w && (
              <div className="px-3 pb-3 space-y-2 border-t border-slate-700/30 pt-2">
                <div className="grid grid-cols-2 gap-1.5">
                  <div className="bg-slate-900/60 rounded-lg p-2 text-center">
                    <Droplets className="w-3 h-3 text-blue-400 mx-auto mb-0.5" />
                    <div className="text-[10px] text-slate-400">Umidità</div>
                    <div className="text-xs font-bold text-slate-200">{w.humidity}%</div>
                  </div>
                  <div className="bg-slate-900/60 rounded-lg p-2 text-center">
                    <Gauge className="w-3 h-3 text-purple-400 mx-auto mb-0.5" />
                    <div className="text-[10px] text-slate-400">Pressione</div>
                    <div className="text-xs font-bold text-slate-200">{Math.round(w.pressure)} hPa</div>
                  </div>
                  <div className="bg-slate-900/60 rounded-lg p-2 text-center">
                    <Cloud className="w-3 h-3 text-slate-400 mx-auto mb-0.5" />
                    <div className="text-[10px] text-slate-400">Nuvole</div>
                    <div className="text-xs font-bold text-slate-200">{w.cloudCover}%</div>
                  </div>
                  <div className="bg-slate-900/60 rounded-lg p-2 text-center">
                    <Wind className="w-3 h-3 text-sky-400 mx-auto mb-0.5" />
                    <div className="text-[10px] text-slate-400">Raffica</div>
                    {/* FIX: windGust → windGusts */}
                    <div className="text-xs font-bold text-orange-300">{w.windGusts ? Math.round(w.windGusts) : "--"} km/h</div>
                  </div>
                </div>
                {volo && <AlertVolo weather={w} />}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}