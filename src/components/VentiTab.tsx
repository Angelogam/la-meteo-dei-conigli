"use client";

import React, { useEffect, useState, useMemo } from "react";
import { Wind, AlertTriangle, CheckCircle, Loader2, Gauge } from "lucide-react";
import { weatherService } from "@/services/weatherService";
import { getVentoStatusColor } from "@/utils/validaVentoDecollo";
import { degreesToCardinal, windArrow } from "@/utils/windDirections";

interface VentiTabProps {
  currentData: any;
  dayData: any[];
  site: { lat: number; lon: number; alt: number; name: string; exposure: string };
  selectedDay: number;
  onSelect: (id: string) => void;
}

export default function VentiTab({
  currentData,
  dayData,
  site,
  selectedDay,
  onSelect,
}: VentiTabProps) {
  const [windInfo, setVentoData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const fetchVento = async () => {
      try {
        const { data } = await weatherService.fetchCurrent(site.lat, site.lon);
        if (!mounted) return;
        
        const windSpeed = data.windSpeed || 0;
        const windDir = data.windDir || 0;
        const windGusts = data.windGusts || 0;
        
        setVentoData({
          speed: windSpeed,
          dir: windDir,
          gust: windGusts,
          directionLabel: degreesToCardinal(windDir),
          directionArrow: windArrow(windDir),
          isFavourable: windSpeed >= 5 && windSpeed <= 15,
          isLaterale: false,
          isSottovento: false,
        });
      } catch (err) {
        if (mounted) setError(err instanceof Error ? err.message : "Errore");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchVento();
    return () => { mounted = false; };
  }, [site.lat, site.lon, selectedDay]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-slate-400">
        <div className="w-8 h-8 rounded-full border-2 border-emerald-500/30 animate-spin">
          <Loader2 className="w-4 h-4 text-emerald-400" />
        </div>
        <span className="text-sm font-medium text-slate-300">Caricamento dati vento...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-400">
        <AlertTriangle className="w-8 h-8 mr-2" />
        <span className="text-sm font-medium">Errore: {error}</span>
      </div>
    );
  }

  const { speed, dir, gust, dirLabel, directionArrow } = windInfo || {
    speed: 0,
    dir: 0,
    gust: 0,
    dirLabel: "N/D",
    directionArrow: "↑",
  };
  const isFavourable = speed >= 5 && speed <= 15;
  const isSottovento = false;
  const isContrario = false;

  const dirName = degreesToCardinal(dir);
  const dirArrow = windArrow(dir);

  return (
    <div className="space-y-3">
      {/* Wind Direction and Speed */}
      <div className="flex items-center gap-3">
        <div className="shrink-0 mt-0.5 text-3xl">
          {directionArrow}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-bold text-white">
              {site.name} — {dirLabel}
            </h3>
            <span className="text-xs font-bold text-white">
              {Math.round(speed)} km/h da {dirLabel}
            </span>
          </div>
        </div>

        {/* Status Badge */}
        <div className={`px-3 py-1 rounded-lg text-xs font-bold ${getVentoStatusColor(isFavourable ? "favorevole" : isSottovento ? "importante" : isContrario ? "rischioso" : "info")}`}>
          {isFavourable ? "Ottimo" : isSottovento ? "Sottovento" : isContrario ? "Rischioso" : "Info"}
        </div>
      </div>

      {/* Additional wind details */}
      <div className="flex flex-col text-sm text-slate-300">
        <div className="flex items-center gap-1">
          <Wind className="w-3 h-3 text-blue-400" />
          <span>{Math.round(speed)} km/h</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-slate-500">Direzione: {dirLabel}</span>
        </div>
        {gust > 0 && (
          <div className="flex items-center gap-1">
            <Gauge className="w-4 h-4 text-red-300" />
            <span className="font-bold text-red-200">{gust} km/h</span>
          </div>
        )}
      </div>
    </div>
  );
}