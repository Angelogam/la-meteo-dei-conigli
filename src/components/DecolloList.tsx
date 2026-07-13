"use client";

import React from "react";
import {
  MapPin,
  Mountain,
  Compass,
  Navigation,
  Sun,
  Cloud,
  CloudRain,
  CloudLightning,
  Wind,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Sparkles,
  TrendingUp,
  Gauge,
  ArrowUp,
} from "lucide-react";
import type { VoloStatusInfo } from "@/utils/volo";

interface DecolloItem {
  id: string;
  name: string;
  valley: string;
  exposure: string;
  alt: number;
}

interface DecolloListProps {
  decolli: DecolloItem[];
  selectedId: string;
  onSelect: (id: string) => void;
  currentData: any;
}

function getStatusColor(volo: VoloStatusInfo): string {
  return volo.color;
}

function getStatusLabel(volo: VoloStatusInfo): string {
  return volo.label;
}

function getStatusIcon(volo: VoloStatusInfo): string {
  return volo.icon;
}

function getVoloStatus(current: any): VoloStatusInfo {
  if (!current) {
    return {
      status: "non_volabile",
      label: "N/D",
      icon: "❓",
      color: "bg-slate-700 text-slate-400 border-slate-500",
      description: "Dati non disponibili",
    };
  }

  const { weatherCode, windSpeed, windGust, precipitation } = current;

  if ([95, 96, 99].includes(weatherCode)) {
    return {
      status: "temporale",
      label: "Temporale",
      icon: "⛈️",
      color: "bg-purple-900/70 text-purple-200 border-purple-500",
      description: "Pericolo temporali",
    };
  }

  if ([80, 81, 82].includes(weatherCode) || (precipitation && precipitation > 2)) {
    return {
      status: "pioggia",
      label: "Pioggia",
      icon: "🌧️",
      color: "bg-blue-900/70 text-blue-200 border-blue-500",
      description: "Precipitazioni",
    };
  }

  if ([51, 53, 55, 56, 57, 61, 63].includes(weatherCode) || (precipitation && precipitation > 0.5)) {
    return {
      status: "non_volabile",
      label: "Non volabile",
      icon: "🌦️",
      color: "bg-slate-700 text-slate-300 border-slate-500",
      description: "Pioggia debole",
    };
  }

  if (windSpeed > 40) {
    return {
      status: "non_volabile",
      label: "Vento forte",
      icon: "💨",
      color: "bg-red-900/70 text-red-200 border-red-500",
      description: `Vento ${Math.round(windSpeed)} km/h`,
    };
  }

  if (windSpeed < 5) {
    return {
      status: "calma",
      label: "Calma",
      icon: "🌀",
      color: "bg-gray-700 text-gray-300 border-gray-500",
      description: "Vento debole",
    };
  }

  if ((windGust && windGust > 35) || windSpeed > 30) {
    return {
      status: "rischioso",
      label: "Rischioso",
      icon: "⚠️",
      color: "bg-orange-900/70 text-orange-200 border-orange-500",
      description: "Raffiche forti",
    };
  }

  if (windSpeed >= 18 && windSpeed <= 25) {
    return {
      status: "discreto",
      label: "Discreto",
      icon: "🪁",
      color: "bg-amber-900/60 text-amber-200 border-amber-500",
      description: `Vento ${Math.round(windSpeed)} km/h`,
    };
  }

  if (windSpeed >= 9 && windSpeed < 18) {
    return {
      status: "buono",
      label: "Buono",
      icon: "🪂",
      color: "bg-emerald-900/60 text-emerald-200 border-emerald-500",
      description: `Vento ${Math.round(windSpeed)} km/h`,
    };
  }

  if (windSpeed >= 5 && windSpeed < 9) {
    return {
      status: "ottimo",
      label: "Ottimo",
      icon: "🌟",
      color: "bg-green-900/60 text-green-200 border-green-500",
      description: `Vento ${Math.round(windSpeed)} km/h`,
    };
  }

  return {
    status: "non_volabile",
    label: "N/D",
    icon: "❓",
    color: "bg-slate-700 text-slate-400 border-slate-500",
    description: "Dati insufficienti",
  };
}

const DecolloList = ({ decolli, selectedId, onSelect, currentData }: DecolloListProps) => {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2 px-3 py-2 mb-2 bg-slate-800/60 rounded-xl border border-emerald-500/20">
        <Navigation className="w-4 h-4 text-emerald-400" />
        <h3 className="text-sm font-bold text-emerald-300 tracking-wide">Decolli</h3>
        <span className="text-[10px] text-slate-500 bg-slate-700/60 px-2 py-0.5 rounded-full ml-auto">
          {decolli.length} siti
        </span>
      </div>

      <div className="space-y-1.5 max-h-[70vh] overflow-y-auto pr-1">
        {decolli.map((site) => {
          const isSelected = site.id === selectedId;
          const volo = getVoloStatus(currentData);

          return (
            <button
              key={site.id}
              onClick={() => onSelect(site.id)}
              className={
                "w-full text-left rounded-xl px-3 py-2.5 transition-all duration-200 border-2 " +
                (isSelected
                  ? "bg-gradient-to-r from-emerald-900/40 to-slate-800/60 border-emerald-400/50 shadow-md shadow-emerald-500/15"
                  : "bg-slate-800/30 border-slate-700/30 hover:bg-slate-700/40 hover:border-slate-600/50")
              }
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className={"text-sm font-bold truncate block leading-snug " + (isSelected ? "text-emerald-100" : "text-slate-200")}>
                      {site.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-400">
                    <span className="flex items-center gap-0.5">
                      <Compass className="w-3 h-3 text-sky-400" />
                      {site.exposure}
                    </span>
                    <span className="w-0.5 h-0.5 rounded-full bg-slate-500" />
                    <span className="flex items-center gap-0.5">
                      <Mountain className="w-3 h-3 text-amber-400" />
                      {site.alt}m
                    </span>
                    <span className="w-0.5 h-0.5 rounded-full bg-slate-500" />
                    <span className="truncate">{site.valley}</span>
                  </div>
                </div>
                {currentData && (
                  <span className={"shrink-0 px-1.5 py-0.5 rounded-md text-[9px] font-bold border " + getStatusColor(volo)}>
                    {getStatusIcon(volo)} {getStatusLabel(volo)}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default DecolloList;