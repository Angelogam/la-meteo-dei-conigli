"use client";

import React, { useMemo } from "react";
import {
  Sun, Thermometer, Wind, Cloud, CloudRain, CloudLightning,
  TrendingUp, ShieldCheck, AlertTriangle, CheckCircle, Activity,
  MapPin, Calendar, Sparkles, Zap, Layers, Clock, Eye, Droplets, Gauge, Info
} from "lucide-react";
import type { HourData } from "@/types/meteo";
import { calcolaAnalisiApprofondita } from "@/utils/analisiApprofondita";
import AnalisiApprofonditaCard from "./AnalisiApprofonditaCard";
import BadgeClima from "@/components/BadgeClima";
import { confrontaClima } from "@/utils/climatologia";

interface AnalisiMeteoProps {
  currentData: HourData | null;
  dayData: HourData[];
  site: { alt: number; lat?: number; lon?: number; name?: string; exposure?: string };
  cape?: number | null;
  liftedIndex?: number | null;
  cin?: number | null;
}

function formatDateShort(date: Date): string {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return "";
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

function getWindDirName(deg: number): string {
  if (deg == null) return "N/D";
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return dirs[Math.round(deg / 22.5) % 16];
}

function getCloudDescription(cover: number): string {
  if (cover < 10) return "sereno";
  if (cover < 25) return "poco nuvoloso";
  if (cover < 45) return "parzialmente nuvoloso";
  if (cover < 65) return "nuvoloso";
  if (cover < 85) return "molto nuvoloso";
  return "coperto";
}

function getRischioBg(r: number): string {
  if (r >= 70) return "bg-gradient-to-br from-red-900/40 to-red-800/20 border-red-500/40";
  if (r >= 40) return "bg-gradient-to-br from-orange-900/40 to-orange-800/20 border-orange-500/40";
<dyad-write path="src/components/AnalisiMeteo.tsx" description="AnalisiMeteo completamente rinnovata con layout moderno e badge colorati">
"use client";

import React, { useMemo } from "react";
import {
  Sun, Thermometer, Wind, Cloud, CloudRain, CloudLightning,
  TrendingUp, ShieldCheck, AlertTriangle, CheckCircle, Activity,
  MapPin, Calendar, Sparkles, Zap, Layers, Clock, Eye, Droplets, Gauge, Info
} from "lucide-react";
import type { HourData } from "@/types/meteo";
import { calcolaAnalisiApprofondita } from "@/utils/analisiApprofondita";
import AnalisiApprofonditaCard from "./AnalisiApprofonditaCard";
import BadgeClima from "@/components/BadgeClima";
import { confrontaClima } from "@/utils/climatologia";

interface AnalisiMeteoProps {
  currentData: HourData | null;
  dayData: HourData[];
  site: { alt: number; lat?: number; lon?: number; name?: string; exposure?: string };
  cape?: number | null;
  liftedIndex?: number | null;
  cin?: number | null;
}

function formatDateShort(date: Date): string {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return "";
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

function getWindDirName(deg: number): string {
  if (deg == null) return "N/D";
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return dirs[Math.round(deg / 22.5) % 16];
}

function getCloudDescription(cover: number): string {
  if (cover < 10) return "sereno";
  if (cover < 25) return "poco nuvoloso";
  if (cover < 45) return "parzialmente nuvoloso";
  if (cover < 65) return "nuvoloso";
  if (cover < 85) return "molto nuvoloso";
  return "coperto";
}

function getRischioBg(r: number): string {
  if (r >= 70) return "bg-gradient-to-br from-red-900/40 to-red-800/20 border-red-500/40";
  if (r >= 40) return "bg-gradient-to-br from-orange-900/40 to-orange-800/20 border-orange-500/40";
  if (r >= 15) return "bg-gradient-to-br from-amber-900/30 to-amber-800/15 border-amber-500/30";
  if (r >= 5) return "bg-gradient-to-br from-yellow-900/20 to-yellow-800/10 border-yellow-500/20";
  return "bg-gradient-to-br from-green-900/20 to-green-800/10 border-green-500/20";
}

function getRischioText(r: number): string {
  if (r >= 70) return "text-red-400";
  if (r >= 40) return "text-orange-400";
  if (r >= 15) return "text-amber-400";
  if (r >= 5) return "text-yellow-400";
  return "text-green-400";
}

function getRischioLabel(r: number): string {
  if (r >= 70) return "ALTO";
  if (r >= 40) return "MODERATO";
  if (r >= 15) return "BASSO";
  if (r >= 5) return "MINIMO";
  return "NESSUNO";
}

export default function AnalisiMeteo({ dayData, site }: AnalisiMeteoProps) {
  const analisi = useMemo(() => {
    if (!dayData || dayData.length < 3) return null;
    const oreGiorno = dayData.filter(h => {
      const hh = h.time.getHours();
      return hh >= 6 && hh <= 21;
    });
    if (oreGiorno.length < 3) return null;

    const media = (arr: number[]) => arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0;
    const max = (arr: number[]) => arr.length ? Math.max(...arr) : 0;
    const minLocal = (arr: number[]) => arr.length ? Math.min(...arr) : 0;

    const tempMaxGiorno = Math.round(max(oreGiorno.map(h => h.temperature)));
    const tempMinGiorno = Math.round(minLocal(oreGiorno.map(h => h.temperature)));
    const deltaTermico = tempMaxGiorno - tempMinGiorno;
    const umiditaMedia = Math.round(media(oreGiorno.map(h => h.humidity)));
    const ventoMedio = Math.round(media(oreGiorno.map(h => h.windSpeed)));
    const ventoGustsMax = Math.round(max(oreGiorno.map(h => h.windGusts || 0)));
    const ventoDirMedia = Math.round(media(oreGiorno.map(h => h.windDir).filter(d => d != null)));
    const nuvoleMedia = Math.round(media(oreGiorno.map(h => h.cloudCover)));
    const pioggiaTot = Math.round(oreGiorno.reduce((s, h) => s + (h.precipitation || 0), 0) * 10) / 10;
    const oreTemporale = oreGiorno.filter(h => h.weatherCode >= 95 || h.weatherCode === 82).length;
    const pressioneMedia = Math.round(media(oreGiorno.map(h => h.pressure).filter(p => p != null)));

    let rischioTemporali = 0;
    if (oreTemporale > 0) rischioTemporali = 85;
    else if (pioggiaTot > 3) rischioTemporali = 45;
    else if (pioggiaTot > 1) rischioTemporali = 25;
    else {
      const haTantoSole = nuvoleMedia < 35;
      const haMoltoVapore = umiditaMedia >= 55 && umiditaMedia <= 80;
      const haAltaEscursione = deltaTermico >= 14;
      const haBassaPressione = pressioneMedia < 1005;
      const condizioniInstabilita = [haTantoSole, haMoltoVapore, haAltaEscursione, haBassaPressione].filter(Boolean).length;
      if (condizioniInstabilita >= 3) rischioTemporali = 25;
      else if (condizioniInstabilita === 2 && deltaTermico >= 16) rischioTemporali = 20;
      else rischioTemporali = 2;
    }
    rischioTemporali = Math.max(0, Math.min(100, Math.round(rischioTemporali)));

    // Giudizio complessivo
    let giudizioColor = "text-green-400 bg-green-900/30 border-green-500/30";
    let giudizioLabel = "OTTIMO";
    if (ventoMedio > 25 || pioggiaTot > 5 || oreTemporale > 0) {
      giudizioColor = "text-red-400 bg-red-900/30 border-red-500/30";
      giudizioLabel = "SCARSO";
    } else if (ventoMedio > 18 || pioggiaTot > 2 || nuvoleMedia > 70) {
      giudizioColor = "text-orange-400 bg-orange-900/30 border-orange-500/30";
      giudizioLabel = "DIFFICILE";
    } else if (ventoMedio < 4 || deltaTermico < 6) {
      giudizioColor = "text-yellow-400 bg-yellow-900/30 border-yellow-500/30";
      giudizioLabel = "DISCRETO";
    } else {
      giudizioColor = "text-green-400 bg-green-900/30 border-green-500/30";
      giudizioLabel = "BUONO";
    }

    return {
      tempMaxGiorno, tempMinGiorno, deltaTermico, umiditaMedia, ventoMedio,
      ventoGustsMax, ventoDirMedia, ventoDirNome: getWindDirName(ventoDirMedia),
      nuvoleMedia, pioggiaTot, oreTemporale, pressioneMedia,
      rischioTemporali, giudizioColor, giudizioLabel,
    };
  }, [dayData]);

  const analisiApprofondita = useMemo(() => {
    return calcolaAnalisiApprofondita(dayData, site);
  }, [dayData, site]);

  const anomalieClima = useMemo(() => {
    if (!dayData || dayData.length === 0) return [];
    const oreGiorno = dayData.filter(h => {
      const hh = h.time.getHours();
      return hh >= 8 && hh <= 18;
    });
    if (oreGiorno.length < 3) return [];

    const tempMax = Math.max(...oreGiorno.map(h => h.temperature));
    const tempMin = Math.min(...oreGiorno.map(h => h.temperature));
    const ventoMedio = oreGiorno.reduce((s, h) => s + h.windSpeed, 0) / oreGiorno.length;
    const pioggiaTot = oreGiorno.reduce((s, h) => s + (h.precipitation || 0), 0);
    const delta = Math.round((tempMax - tempMin) * 10) / 10;

    return confrontaClima(tempMax, tempMin, Math.round(ventoMedio), pioggiaTot, delta);
  }, [dayData]);

  const dataGiorno = useMemo(() => {
    if (dayData && dayData.length > 0) return formatDateShort(dayData[0].time);
    return formatDateShort(new Date());
  }, [dayData]);

  if (!analisi) {
    return (
      <div className="text-center py-12 text-slate-400 text-base">
        <Sun className="w-10 h-10 mx-auto mb-3 text-slate-500" />
        Dati insufficienti per generare l'analisi per {site?.name || "questo decollo"}.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header con giudizio */}
      <div className="bg-gradient-to-br from-slate-800/70 to-slate-900/50 border border-purple-500/30 rounded-2xl px-5 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-800/60 to-purple-700/30 border border-purple-500/40 flex items-center justify-center shrink-0">
              <Sun className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <div className="text-base font-bold text-white">{site?.name || "Decollo"}</div>
              <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                <Calendar className="w-3.5 h-3.5" />
                <span>{dataGiorno}</span>
                <span className="text-slate-600">·</span>
                <span>{site?.alt || 0}m · {site?.exposure || "N/D"}</span>
              </div>
            </div>
          </div>
          <span className={`text-xs font-bold px-3 py-1.5 rounded-full border ${analisi.giudizioColor}`}>
            {analisi.giudizioLabel}
          </span>
        </div>
      </div>

      {/* Badge climatologico */}
      {anomalieClima.length > 0 && <BadgeClima anomalie={anomalieClima} />}

      {/* Analisi approfondita */}
      {analisiApprofondita && (
        <AnalisiApprofonditaCard analisi={analisiApprofondita} siteName={site?.name || "Decollo"} dayData={dayData} />
      )}

      {/* Rischio temporali con barra */}
      <div className={`rounded-2xl p-5 border-2 ${getRischioBg(analisi.rischioTemporali)}`}>
        <div className="flex items-center gap-3 mb-3">
          {analisi.rischioTemporali >= 70 || analisi.oreTemporale > 0 ? (
            <CloudLightning className="w-8 h-8 text-red-400 shrink-0" />
          ) : analisi.rischioTemporali >= 15 ? (
            <CloudRain className="w-8 h-8 text-amber-400 shrink-0" />
          ) : (
            <Cloud className="w-8 h-8 text-green-400 shrink-0" />
          )}
          <div className="min-w-0">
            <h3 className="text-base font-bold text-white">Rischio temporali</h3>
            <p className={`text-sm font-bold ${getRischioText(analisi.rischioTemporali)}`}>
              {getRischioLabel(analisi.rischioTemporali)} ({analisi.rischioTemporali}%)
              {analisi.oreTemporale > 0 && " — Temporali in atto!"}
            </p>
          </div>
        </div>
        <div className="h-3 bg-slate-700/50 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-500" style={{
            width: `${analisi.rischioTemporali}%`,
            background: analisi.rischioTemporali >= 70
              ? "linear-gradient(90deg, #ef4444, #dc2626)"
              : analisi.rischioTemporali >= 40
                ? "linear-gradient(90deg, #f97316, #ea580c)"
                : analisi.rischioTemporali >= 15
                  ? "linear-gradient(90deg, #f59e0b, #d97706)"
                  : "linear-gradient(90deg, #22c55e, #16a34a)"
          }} />
        </div>
        <div className="flex items-center justify-between text-xs text-slate-500 mt-1">
          <span>0%</span>
          <span>50%</span>
          <span>100%</span>
        </div>
      </div>

      {/* Riepilogo condizioni */}
      <div className="bg-gradient-to-br from-green-900/20 to-emerald-900/10 border border-green-700/30 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-green-400" />
          <h3 className="text-sm font-bold text-green-300">Riepilogo — {site?.name || "Decollo"}</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {[
            { icon: <Thermometer className="w-4 h-4 text-amber-400" />, label: "Max / Min", value: `${analisi.tempMaxGiorno}° / ${analisi.tempMinGiorno}°` },
            { icon: <Wind className="w-4 h-4 text-sky-400" />, label: "Vento medio", value: `${analisi.ventoMedio} km/h da ${analisi.ventoDirNome}` },
            { icon: <Gauge className="w-4 h-4 text-red-400" />, label: "Raffiche max", value: `${analisi.ventoGustsMax} km/h` },
            { icon: <Cloud className="w-4 h-4 text-slate-400" />, label: "Nuvolosità", value: `${analisi.nuvoleMedia}% (${getCloudDescription(analisi.nuvoleMedia)})` },
            { icon: <Droplets className="w-4 h-4 text-blue-400" />, label: "Umidità", value: `${analisi.umiditaMedia}%` },
            { icon: <Eye className="w-4 h-4 text-emerald-400" />, label: "Pressione", value: `${analisi.pressioneMedia} hPa` },
            { icon: <Activity className="w-4 h-4 text-purple-400" />, label: "Delta termico", value: `${analisi.deltaTermico}°C` },
            { icon: <CloudRain className="w-4 h-4 text-blue-300" />, label: "Pioggia", value: analisi.pioggiaTot > 0 ? `${analisi.pioggiaTot} mm` : "0 mm" },
            { icon: <Zap className="w-4 h-4 text-orange-400" />, label: "Rischio temp.", value: getRischioLabel(analisi.rischioTemporali) },
          ].map((item, i) => (
            <div key={i} className="bg-slate-900/60 rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-1">
                {item.icon}
                <span className="text-[10px] text-slate-500">{item.label}</span>
              </div>
              <div className="text-sm font-bold text-white">{item.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Legenda */}
      <div className="flex items-start gap-2 bg-slate-800/30 border border-slate-700/30 rounded-xl px-4 py-3">
        <Info className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
        <p className="text-[10px] text-slate-400 leading-relaxed">
          Analisi basata sui dati reali Open-Meteo per il giorno selezionato. Il giudizio considera vento,
          precipitazioni, nuvolosità e stabilità atmosferica. I dati vengono aggiornati ogni 10 minuti.
        </p>
      </div>
    </div>
  );
}