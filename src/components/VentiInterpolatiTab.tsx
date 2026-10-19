"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import { Wind, Calendar, MapPin } from "lucide-react";
import { getVentiInterpolati, type VentiInterpolatiData } from "@/utils/getVentiInterpolati";
import ProfessionalWindgram from "@/components/ProfessionalWindgram";
import LaunchForecastWidgets from "@/components/LaunchForecastWidgets";
import SectionErrorBoundary from "@/components/SectionErrorBoundary";

function getDirAbbrev(deg: number): string {
  const abbrevs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return abbrevs[Math.round(deg / 22.5) % 16] || "N";
}

function formatDateShort(date: Date): string {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return "";
  const giorni = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];
  return `${giorni[d.getDay()]} ${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

interface VentiInterpolatiTabProps {
  lat: number;
  lon: number;
  quotaDecollo: number;
  selectedDay: number;
  oraCorrente?: number;
  onOraChange?: (ora: number) => void;
  siteName?: string;
  rawData?: any;
}

export default function VentiInterpolatiTab({
  lat,
  lon,
  quotaDecollo,
  selectedDay,
  oraCorrente = 12,
  onOraChange,
  rawData,
  siteName,
}: VentiInterpolatiTabProps) {
  const [data, setData] = useState<VentiInterpolatiData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [oraSelezionata, setOraSelezionata] = useState(oraCorrente);
  const oraCorrenteRef = useRef(oraCorrente);
  oraCorrenteRef.current = oraCorrente;

  useEffect(() => {
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || !Number.isFinite(quotaDecollo) || quotaDecollo <= 0) {
      setError("Coordinate o quota di decollo non valide.");
      setLoading(false);
      return;
    }
    let cancelled = false;
    const oggi = new Date();
    const targetDate = new Date(oggi);
    targetDate.setDate(oggi.getDate() + selectedDay);
    const dayStr = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, "0")}-${String(targetDate.getDate()).padStart(2, "0")}`;

    setLoading(true);
    setError(null);
    setData(null);
    setOraSelezionata(oraCorrenteRef.current);

    getVentiInterpolati(lat, lon, quotaDecollo, dayStr)
      .then((result) => {
        if (cancelled) return;
        setData(result);
        setLoading(false);
        if (result.ventoOrario.length > 0) {
          const requestedHour = oraCorrenteRef.current;
          const closest = result.ventoOrario.reduce((prev, curr) =>
            Math.abs(curr.ora - requestedHour) < Math.abs(prev.ora - requestedHour) ? curr : prev
          );
          setOraSelezionata(closest.ora);
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Errore nel caricamento dei venti.");
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, [lat, lon, quotaDecollo, selectedDay]);

  const oggi = new Date();
  const targetDate = new Date(oggi);
  targetDate.setDate(oggi.getDate() + selectedDay);
  const dataGiorno = formatDateShort(targetDate);

  const oraData = useMemo(() => {
    if (!data) return null;
    return data.ventoOrario.find((v) => v.ora === oraSelezionata) || data.ventoOrario[0] || null;
  }, [data, oraSelezionata]);

  return (
    <div className="space-y-6">
      {/* 1. INFORMAZIONE DECOLLO */}
      <div className="bg-slate-100 border border-slate-300 rounded-xl px-4 py-3 flex items-center gap-3">
        <MapPin className="w-5 h-5 text-sky-600 shrink-0" />
        <div>
          <div className="text-sm font-bold text-slate-900">{siteName || "Decollo"} — Venti in quota dettagliati</div>
          <div className="text-[10px] text-slate-600 flex items-center gap-2">
            <Calendar className="w-3 h-3" />
            <span>{dataGiorno}</span>
            <span className="text-slate-400">·</span>
            <span>Decollo {quotaDecollo}m s.l.m.</span>
          </div>
        </div>
      </div>

      {/* Mappa XC Therm centrata sulle coordinate reali del decollo API selezionato. */}
      <SectionErrorBoundary title="La mappa meteo esterna non è riuscita a caricarsi">
        <LaunchForecastWidgets
          lat={lat}
          lon={lon}
          altitude={quotaDecollo}
          siteName={siteName || "Decollo selezionato"}
        />
      </SectionErrorBoundary>

      {/* Windgram aerologico dell'app, con i dati disponibili per il sito e il giorno. */}
      <SectionErrorBoundary title="Il grafico dei venti non è riuscito a caricarsi">
        <ProfessionalWindgram
          latitude={lat}
          longitude={lon}
          altitude={quotaDecollo}
          siteName={siteName}
          selectedDay={selectedDay}
          rawData={rawData}
        />
      </SectionErrorBoundary>
    </div>
  );
}
