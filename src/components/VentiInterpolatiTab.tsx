"use client";

import React, { useEffect, useState, useMemo } from "react";
import { Wind, Calendar, MapPin, Info } from "lucide-react";
import { getVentiInterpolati, type VentiInterpolatiData } from "@/utils/getVentiInterpolati";
import WindgramProfessionale from "./WindgramProfessionale";

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
}

export default function VentiInterpolatiTab({
  lat,
  lon,
  quotaDecollo,
  selectedDay,
  oraCorrente = 12,
  onOraChange,
  siteName,
}: VentiInterpolatiTabProps) {
  const [data, setData] = useState<VentiInterpolatiData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!lat || !lon || !quotaDecollo) return;

    const oggi = new Date();
    const targetDate = new Date(oggi);
    targetDate.setDate(oggi.getDate() + selectedDay);
    const dayStr = targetDate.toISOString().split("T")[0];

    setLoading(true);
    setError(null);

    getVentiInterpolati(lat, lon, quotaDecollo, dayStr)
      .then(result => {
        setData(result);
        setLoading(false);
      })
      .catch(err => {
        setError(err instanceof Error ? err.message : "Errore");
        setLoading(false);
      });
  }, [lat, lon, quotaDecollo, selectedDay]);

  const oggi = new Date();
  const targetDate = new Date(oggi);
  targetDate.setDate(oggi.getDate() + selectedDay);
  const dataGiorno = formatDateShort(targetDate);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-400">
        <div className="w-8 h-8 rounded-full border-2 border-emerald-500/20 border-t-emerald-400 animate-spin mr-3" />
        <span>Calcolo windgram per {siteName || "decollo"}...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-400">
        <Wind className="w-16 h-16 text-slate-600 mb-4" />
        <p className="text-lg font-bold">Errore venti</p>
        <p className="text-sm text-slate-500 mt-1">{error}</p>
      </div>
    );
  }

  if (!data || data.ventoOrario.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-400">
        <Wind className="w-16 h-16 text-slate-600 mb-4" />
        <p className="text-lg font-bold">Nessun dato vento per {siteName || "decollo"}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Intestazione */}
      <div className="bg-slate-800/60 border border-blue-500/30 rounded-xl px-4 py-3 flex items-center gap-3">
        <MapPin className="w-5 h-5 text-blue-400 shrink-0" />
        <div>
          <div className="text-sm font-bold text-white">{siteName || "Decollo"} — Windgram</div>
          <div className="text-[10px] text-slate-400 flex items-center gap-2">
            <Calendar className="w-3 h-3" />
            <span>{dataGiorno}</span>
            <span className="text-slate-600">·</span>
            <span>Decollo {quotaDecollo}m</span>
          </div>
        </div>
      </div>

      {/* ⭐ Windgram Professionale stile Alpium */}
      <WindgramProfessionale
        dati={data.ventoOrario}
        quotaDecollo={quotaDecollo}
        siteName={siteName}
        dataGiorno={dataGiorno}
      />

      {/* Nota informativa */}
      <div className="flex items-start gap-2 bg-slate-800/20 rounded-lg px-3 py-2 border border-slate-700/30">
        <Info className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />
        <p className="text-[10px] text-slate-500 leading-relaxed">
          Windgram con dati interpolati dai livelli standard di Open-Meteo (10m, 925hPa, 850hPa, 700hPa, 600hPa).
          Colori: <span className="text-sky-400">N</span> · <span className="text-green-400">E</span> ·{" "}
          <span className="text-orange-400">S</span> · <span className="text-red-400">W</span>.
        </p>
      </div>
    </div>
  );
}