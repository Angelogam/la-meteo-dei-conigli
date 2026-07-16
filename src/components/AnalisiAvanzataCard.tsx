"use client";

import React from "react";
import {
  Thermometer, Wind, Cloud, Droplets, Gauge, TrendingUp, ArrowUp,
  Sun, Moon, AlertTriangle, CheckCircle, XCircle, Zap,
  CloudSun, CloudRain, CloudLightning, CloudFog,
  Activity, Eye, Navigation, Compass, Sparkles, Star,
  Shield, ShieldCheck, ShieldAlert, ShieldX,
} from "lucide-react";
import type { AnalisiCompleta } from "@/services/analisiAvanzata";

interface AnalisiAvanzataCardProps {
  analisi: AnalisiCompleta;
  isSelected?: boolean;
  onSelect?: () => void;
}

function getStabilitàIcon(stabilità: string): React.ReactNode {
  switch (stabilità) {
    case "molto stabile": return <ShieldCheck className="w-5 h-5 text-blue-400" />;
    case "stabile": return <Shield className="w-5 h-5 text-green-400" />;
    case "leggermente instabile": return <ShieldAlert className="w-5 h-5 text-amber-400" />;
    case "instabile": return <ShieldX className="w-5 h-5 text-orange-400" />;
    case "molto instabile": return <ShieldX className="w-5 h-5 text-red-400" />;
    default: return <Shield className="w-5 h-5 text-slate-400" />;
  }
}

function getStabilitàColor(stabilità: string): string {
  switch (stabilità) {
    case "molto stabile": return "text-blue-400 bg-blue-900/20 border-blue-500/30";
    case "stabile": return "text-green-400 bg-green-900/20 border-green-500/30";
    case "leggermente instabile": return "text-amber-400 bg-amber-900/20 border-amber-500/30";
    case "instabile": return "text-orange-400 bg-orange-900/20 border-orange-500/30";
    case "molto instabile": return "text-red-400 bg-red-900/20 border-red-500/30";
    default: return "text-slate-400 bg-slate-800/20 border-slate-500/30";
  }
}

function getTurbolenzaIcon(turbolenza: string): React.ReactNode {
  switch (turbolenza) {
    case "assente": return <Activity className="w-5 h-5 text-green-400" />;
    case "leggera": return <Wind className="w-5 h-5 text-green-300" />;
    case "moderata": return <Wind className="w-5 h-5 text-amber-400" />;
    case "forte": return <Wind className="w-5 h-5 text-orange-400" />;
    case "severa": return <Zap className="w-5 h-5 text-red-400" />;
    default: return <Activity className="w-5 h-5 text-slate-400" />;
  }
}

function getTermicheIcon(forza: number): React.ReactNode {
  if (forza >= 7) return <ArrowUp className="w-5 h-5 text-red-400" />;
  if (forza >= 5) return <ArrowUp className="w-5 h-5 text-orange-400" />;
  if (forza >= 3) return <ArrowUp className="w-5 h-5 text-amber-400" />;
  if (forza >= 1) return <ArrowUp className="w-5 h-5 text-green-400" />;
  return <ArrowUp className="w-5 h-5 text-slate-500" />;
}

function getVoloColor(score: number): string {
  if (score >= 85) return "text-emerald-300";
  if (score >= 70) return "text-green-300";
  if (score >= 55) return "text-amber-300";
  if (score >= 40) return "text-orange-300";
  return "text-red-300";
}

function getVoloBg(score: number): string {
  if (score >= 85) return "bg-emerald-900/30 border-emerald-500/40";
  if (score >= 70) return "bg-green-900/30 border-green-500/40";
  if (score >= 55) return "bg-amber-900/30 border-amber-500/40";
  if (score >= 40) return "bg-orange-900/30 border-orange-500/40";
  return "bg-red-900/30 border-red-500/40";
}

function getRischioColor(rischio: number): string {
  if (rischio >= 70) return "text-red-400";
  if (rischio >= 40) return "text-orange-400";
  if (rischio >= 15) return "text-amber-400";
  return "text-green-400";
}

function getRischioBg(rischio: number): string {
  if (rischio >= 70) return "bg-red-900/20 border-red-500/30";
  if (rischio >= 40) return "bg-orange-900/20 border-orange-500/30";
  if (rischio >= 15) return "bg-amber-900/20 border-amber-500/30";
  return "bg-green-900/20 border-green-500/30";
}

export default function AnalisiAvanzataCard({ analisi, isSelected, onSelect }: AnalisiAvanzataCardProps) {
  if (!analisi) return null;

  return (
    <button
      onClick={onSelect}
      className={`w-full text-left rounded-2xl p-4 transition-all border-2 ${
        isSelected
          ? "bg-slate-800/80 border-sky-500 shadow-lg"
          : "bg-slate-800/40 border-slate-700/50 hover:bg-slate-800/60"
      }`}
    >
      {/* Header ora + volo score */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg font-black text-white">
            {String(analisi.ora).padStart(2, "0")}:00
          </span>
          <span className="text-sm text-slate-400">{analisi.data}</span>
        </div>
        <div className={`px-3 py-1 rounded-lg border text-sm font-bold ${getVoloBg(analisi.voloScore)} ${getVoloColor(analisi.voloScore)}`}>
          {analisi.voloGiudizio.split(" ")[0]}
        </div>
      </div>

      {/* Volo score bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-slate-400">Volo Score</span>
          <span className={`font-bold ${getVoloColor(analisi.voloScore)}`}>{analisi.voloScore}/100</span>
        </div>
        <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              analisi.voloScore >= 85 ? "bg-emerald-500" :
              analisi.voloScore >= 70 ? "bg-green-500" :
              analisi.voloScore >= 55 ? "bg-amber-500" :
              analisi.voloScore >= 40 ? "bg-orange-500" :
              "bg-red-500"
            }`}
            style={{ width: `${analisi.voloScore}%` }}
          />
        </div>
      </div>

      {/* Descrizione volo */}
      <p className="text-sm text-slate-300 mb-3 leading-relaxed">{analisi.voloDescrizione}</p>

      {/* Griglia metriche principali */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
        {/* Temperatura */}
        <div className="bg-slate-900/60 rounded-xl p-2.5 text-center">
          <Thermometer className="w-4 h-4 text-amber-400 mx-auto mb-1" />
          <div className="text-lg font-bold text-white">{analisi.temperatura}°</div>
          <div className="text-[10px] text-slate-500">max {analisi.tempMax}° / min {analisi.tempMin}°</div>
        </div>
        {/* Vento */}
        <div className="bg-slate-900/60 rounded-xl p-2.5 text-center">
          <Wind className="w-4 h-4 text-sky-400 mx-auto mb-1" />
          <div className="text-lg font-bold text-white">{analisi.ventoMedio}</div>
          <div className="text-[10px] text-slate-500">{analisi.direzioneDominante} · max {analisi.ventoMax}</div>
        </div>
        {/* Termiche */}
        <div className="bg-slate-900/60 rounded-xl p-2.5 text-center">
          {getTermicheIcon(analisi.forzaTermica)}
          <div className={`text-lg font-bold ${analisi.forzaTermica >= 5 ? "text-orange-300" : analisi.forzaTermica >= 3 ? "text-amber-300" : "text-green-300"}`}>
            {analisi.rateoSalita.toFixed(1)}
          </div>
          <div className="text-[10px] text-slate-500">m/s · {analisi.intensitaTermica}</div>
        </div>
        {/* Base nuvole */}
        <div className="bg-slate-900/60 rounded-xl p-2.5 text-center">
          <Cloud className="w-4 h-4 text-slate-400 mx-auto mb-1" />
          <div className="text-lg font-bold text-white">{analisi.baseNuvole}</div>
          <div className="text-[10px] text-slate-500">m · {analisi.copertura}</div>
        </div>
      </div>

      {/* Stabilità e turbolenza */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className={`rounded-xl px-3 py-2 border text-xs flex items-center gap-2 ${getStabilitàColor(analisi.stabilitàAtmosferica)}`}>
          {getStabilitàIcon(analisi.stabilitàAtmosferica)}
          <div>
            <div className="font-bold">{analisi.stabilitàAtmosferica}</div>
            <div className="opacity-70">CAPE {analisi.cape} J/kg · LI {analisi.liftedIndex}°C</div>
          </div>
        </div>
        <div className={`rounded-xl px-3 py-2 border text-xs flex items-center gap-2 ${
          analisi.turbolenza === "assente" ? "text-green-400 bg-green-900/20 border-green-500/30" :
          analisi.turbolenza === "leggera" ? "text-green-300 bg-green-900/15 border-green-500/20" :
          analisi.turbolenza === "moderata" ? "text-amber-400 bg-amber-900/20 border-amber-500/30" :
          analisi.turbolenza === "forte" ? "text-orange-400 bg-orange-900/20 border-orange-500/30" :
          "text-red-400 bg-red-900/20 border-red-500/30"
        }`}>
          {getTurbolenzaIcon(analisi.turbolenza)}
          <div>
            <div className="font-bold">Turbolenza {analisi.turbolenza}</div>
            <div className="opacity-70">Shear {analisi.windShear} m/s</div>
          </div>
        </div>
      </div>

      {/* Dettaglio: zero termico, top termico, gradiente, pressione, umidità, UV */}
      <div className="grid grid-cols-3 gap-1.5 text-[11px]">
        <div className="bg-slate-900/40 rounded-lg px-2 py-1.5 text-center">
          <span className="text-slate-500 block">Zero termico</span>
          <span className="font-bold text-white">{analisi.zeroTermico}m</span>
        </div>
        <div className="bg-slate-900/40 rounded-lg px-2 py-1.5 text-center">
          <span className="text-slate-500 block">Top termico</span>
          <span className="font-bold text-white">{analisi.topTermico}m</span>
        </div>
        <div className="bg-slate-900/40 rounded-lg px-2 py-1.5 text-center">
          <span className="text-slate-500 block">Gradiente</span>
          <span className={`font-bold ${
            analisi.gradienteReale > 1.2 ? "text-red-300" :
            analisi.gradienteReale > 0.98 ? "text-amber-300" :
            "text-green-300"
          }`}>{analisi.gradienteReale}°</span>
        </div>
        <div className="bg-slate-900/40 rounded-lg px-2 py-1.5 text-center">
          <span className="text-slate-500 block">Pressione</span>
          <span className="font-bold text-white">{analisi.pressione}hPa</span>
        </div>
        <div className="bg-slate-900/40 rounded-lg px-2 py-1.5 text-center">
          <span className="text-slate-500 block">Umidità</span>
          <span className="font-bold text-white">{analisi.umidita}%</span>
        </div>
        <div className="bg-slate-900/40 rounded-lg px-2 py-1.5 text-center">
          <span className="text-slate-500 block">UV</span>
          <span className={`font-bold ${
            analisi.uvIndex >= 6 ? "text-red-300" :
            analisi.uvIndex >= 3 ? "text-amber-300" :
            "text-green-300"
          }`}>{analisi.uvIndex}</span>
        </div>
      </div>

      {/* Rischio temporali */}
      {analisi.rischioTemporali > 0 && (
        <div className={`mt-2 rounded-xl px-3 py-2 border text-xs flex items-center gap-2 ${getRischioBg(analisi.rischioTemporali)} ${getRischioColor(analisi.rischioTemporali)}`}>
          {analisi.rischioTemporali >= 40 ? (
            <CloudLightning className="w-4 h-4 shrink-0" />
          ) : analisi.rischioTemporali >= 15 ? (
            <CloudRain className="w-4 h-4 shrink-0" />
          ) : (
            <CloudSun className="w-4 h-4 shrink-0" />
          )}
          <div>
            <span className="font-bold">Rischio temporali: {analisi.rischioTemporali}%</span>
            <span className="opacity-70"> · Pioggia: {analisi.pioggiaTotale > 0 ? `${analisi.pioggiaTotale}mm` : "0mm"}</span>
          </div>
        </div>
      )}

      {/* Confidenza */}
      <div className="mt-2 flex items-center justify-end gap-1 text-[10px] text-slate-500">
        <Activity className="w-3 h-3" />
        <span>Confidenza: {Math.round(analisi.confidenza * 100)}%</span>
      </div>
    </button>
  );
}