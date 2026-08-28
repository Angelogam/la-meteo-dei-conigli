"use client";

import React, { useState } from "react";
import {
  Thermometer,
  Wind,
  Cloud,
  CloudRain,
  CloudLightning,
  Activity,
  ArrowUp,
  Shield,
  TrendingUp,
  Gauge,
  AlertTriangle,
  Info,
  ChevronDown,
  ChevronUp,
  MapPin,
  Calendar,
  Clock,
} from "lucide-react";
import type { AnalisiApprofondita } from "@/utils/analisiApprofondita";

interface AnalisiApprofonditaCardProps {
  analisi: AnalisiApprofondita;
  siteName?: string;
  dayData?: any[];
}

function getScoreColor(score: number): string {
  if (score >= 80) return "text-emerald-400";
  if (score >= 60) return "text-green-300";
  if (score >= 40) return "text-amber-400";
  if (score >= 20) return "text-orange-400";
  return "text-red-400";
}

function getScoreBg(score: number): string {
  if (score >= 80) return "bg-emerald-900/30 border-emerald-500/40";
  if (score >= 60) return "bg-green-900/30 border-green-500/40";
  if (score >= 40) return "bg-amber-900/30 border-amber-500/40";
  if (score >= 20) return "bg-orange-900/30 border-orange-500/40";
  return "bg-red-900/30 border-red-500/40";
}

function getRischioColor(val: number): string {
  if (val >= 70) return "text-red-400";
  if (val >= 40) return "text-orange-400";
  if (val >= 15) return "text-amber-400";
  return "text-green-400";
}

function getRischioBg(val: number): string {
  if (val >= 70) return "bg-red-900/20 border-red-500/30";
  if (val >= 40) return "bg-orange-900/20 border-orange-500/30";
  if (val >= 15) return "bg-amber-900/20 border-amber-500/30";
  return "bg-green-900/20 border-green-500/30";
}

function formatDateShort(date: Date): string {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return "";
  const giorni = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];
  return `${giorni[d.getDay()]} ${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function AnalisiApprofonditaCard({
  analisi,
  siteName,
  dayData,
}: AnalisiApprofonditaCardProps) {
  const [showGlossary, setShowGlossary] = useState(false);

  if (!analisi) return null;

  const dataGiorno =
    dayData && dayData.length > 0
      ? formatDateShort(dayData[0].time)
      : analisi.data;

  return (
    <div className="space-y-3">
      {/* Intestazione */}
      <div className="bg-slate-800/60 border border-purple-500/30 rounded-xl px-4 py-3 flex items-center gap-3">
        <MapPin className="w-5 h-5 text-purple-400 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-white">
            {siteName || "Decollo"} — Analisi approfondita
          </div>
          <div className="text-[10px] text-slate-400 flex items-center gap-2">
            <Calendar className="w-3 h-3" />
            <span>{dataGiorno}</span>
            <span className="text-slate-600">·</span>
            <span>{analisi.alt}m</span>
          </div>
        </div>
        <div className="shrink-0">
          <div className={`text-2xl font-black ${getScoreColor(analisi.punteggio)}`}>
            {analisi.punteggio}
          </div>
          <div className="text-[9px] text-slate-500 text-center">/100</div>
        </div>
      </div>

      {/* Valutazione complessiva */}
      <div className={`rounded-2xl border-2 p-5 ${getScoreBg(analisi.punteggio)}`}>
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-5 h-5 text-white shrink-0" />
          <h3 className="text-base font-bold text-white">Valutazione</h3>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ml-auto ${getScoreColor(analisi.punteggio)} bg-black/20`}>
            {analisi.punteggio}/100
          </span>
        </div>

        <p className="text-sm text-slate-200 leading-relaxed mb-4">
          {analisi.valutazione}
        </p>

        <div className="h-3 bg-slate-700/50 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              analisi.punteggio >= 80 ? "bg-emerald-500" :
              analisi.punteggio >= 60 ? "bg-green-400" :
              analisi.punteggio >= 40 ? "bg-amber-500" :
              analisi.punteggio >= 20 ? "bg-orange-500" :
              "bg-red-500"
            }`}
            style={{ width: `${analisi.punteggio}%` }}
          />
        </div>

        {/* Punti positivi e negativi */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
          {analisi.puntiPositivi.length > 0 && (
            <div className="bg-emerald-900/20 border border-emerald-500/20 rounded-xl p-3">
              <div className="text-[10px] text-emerald-400 font-bold mb-2 uppercase tracking-wider">
                Punti positivi
              </div>
              <ul className="space-y-1">
                {analisi.puntiPositivi.map((p: string, i: number) => (
                  <li key={i} className="text-xs text-emerald-200 flex items-start gap-1.5">
                    <span className="text-emerald-400 mt-0.5 shrink-0">✦</span>
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {analisi.puntiNegativi.length > 0 && (
            <div className="bg-amber-900/20 border border-amber-500/20 rounded-xl p-3">
              <div className="text-[10px] text-amber-400 font-bold mb-2 uppercase tracking-wider">
                Criticità
              </div>
              <ul className="space-y-1">
                {analisi.puntiNegativi.map((p: string, i: number) => (
                  <li key={i} className="text-xs text-amber-200 flex items-start gap-1.5">
                    <span className="text-amber-400 mt-0.5 shrink-0">⚠</span>
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Parametri principali */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-3 text-center">
          <Thermometer className="w-4 h-4 text-amber-400 mx-auto mb-1" />
          <div className="text-lg font-bold text-white">{analisi.tempAttuale}°C</div>
          <div className="text-[10px] text-slate-500">
            Max {analisi.tempMax}° / Min {analisi.tempMin}°
          </div>
        </div>
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-3 text-center">
          <Wind className="w-4 h-4 text-sky-400 mx-auto mb-1" />
          <div className="text-lg font-bold text-white">{analisi.ventoSuolo} km/h</div>
          <div className="text-[10px] text-slate-500">
            {analisi.ventoDirNome} · raffiche {analisi.rafficheSuolo}
          </div>
        </div>
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-3 text-center">
          <ArrowUp className="w-4 h-4 text-orange-400 mx-auto mb-1" />
          <div className="text-lg font-bold text-orange-300">{analisi.rateoMedio} m/s</div>
          <div className="text-[10px] text-slate-500">
            Top {analisi.topTermiche}m
          </div>
        </div>
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-3 text-center">
          <Cloud className="w-4 h-4 text-slate-400 mx-auto mb-1" />
          <div className="text-lg font-bold text-white">{analisi.nuvoleMedie}%</div>
          <div className="text-[10px] text-slate-500">
            Basse {analisi.nuvoleBasse}% · Alte {analisi.nuvoleAlte}%
          </div>
        </div>
      </div>

      {/* Stabilità e CAPE */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-4 h-4 text-blue-400" />
            <span className="text-xs font-bold text-slate-300">Stabilità</span>
          </div>
          <div className="text-sm font-bold text-white">{analisi["stabilitàAtmosferica"] || "N/D"}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            CAPE {analisi.cape} J/kg · LI {analisi.liftedIndex}°C
          </div>
        </div>
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-1">
            <Activity className="w-4 h-4 text-purple-400" />
            <span className="text-xs font-bold text-slate-300">Termiche</span>
          </div>
          <div className="text-sm font-bold text-white">{analisi.intensitaTermica}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            Forza {analisi.forzaTermica}/10 · Base {analisi.baseNuvole}m
          </div>
        </div>
      </div>

      {/* Dettagli aggiuntivi */}
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="bg-slate-900/40 rounded-lg px-2 py-1.5 text-center">
          <span className="text-slate-500 block">Zero termico</span>
          <span className="font-bold text-white">{analisi.zeroTermico}m</span>
        </div>
        <div className="bg-slate-900/40 rounded-lg px-2 py-1.5 text-center">
          <span className="text-slate-500 block">Gradiente</span>
          <span className={`font-bold ${analisi.gradienteReale > 1.2 ? "text-red-300" : analisi.gradienteReale > 0.98 ? "text-amber-300" : "text-green-300"}`}>
            {analisi.gradienteReale}°
          </span>
        </div>
        <div className="bg-slate-900/40 rounded-lg px-2 py-1.5 text-center">
          <span className="text-slate-500 block">Umidità</span>
          <span className="font-bold text-white">{analisi.umidita}%</span>
        </div>
      </div>

      {/* Rischio temporali */}
      {analisi.rischioTemporali > 0 && (
        <div className={`rounded-xl px-4 py-3 border text-sm flex items-center gap-2 ${getRischioBg(analisi.rischioTemporali)} ${getRischioColor(analisi.rischioTemporali)}`}>
          {analisi.rischioTemporali >= 40 ? (
            <CloudLightning className="w-4 h-4 shrink-0" />
          ) : (
            <CloudRain className="w-4 h-4 shrink-0" />
          )}
          <div>
            <span className="font-bold">Rischio temporali: {analisi.rischioTemporali}%</span>
            <span className="opacity-70">
              {" "}· Pioggia:{" "}
              {analisi.pioggiaTotale > 0 ? `${analisi.pioggiaTotale}mm` : "0mm"}
            </span>
          </div>
        </div>
      )}

      {/* Slot migliori */}
      {analisi.slotMigliori && (
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-3 flex items-center gap-2">
          <Clock className="w-4 h-4 text-emerald-400 shrink-0" />
          <div className="text-xs">
            <span className="text-slate-400">Finestra migliori: </span>
            <span className="font-bold text-emerald-300">{analisi.slotMigliori}</span>
          </div>
        </div>
      )}

      {/* Glossario espandibile */}
      <div className="bg-slate-800/30 border border-slate-700/40 rounded-xl overflow-hidden">
        <button
          onClick={() => setShowGlossary(!showGlossary)}
          className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-slate-700/30 transition-colors"
        >
          <Info className="w-4 h-4 text-slate-400 shrink-0" />
          <span className="text-xs font-bold text-slate-400 flex-1">
            Glossario parametri
          </span>
          {showGlossary ? (
            <ChevronUp className="w-4 h-4 text-slate-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-500" />
          )}
        </button>

        {showGlossary && (
          <div className="px-4 pb-4 space-y-2 border-t border-slate-700/30 pt-3">
            <div className="text-[11px] text-slate-400 leading-relaxed space-y-1.5">
              <div>
                <span className="text-slate-500">CAPE:</span>{" "}
                Convective Available Potential Energy – energia per convezione. {">"}1000 J/kg = temporali probabili.
              </div>
              <div>
                <span className="text-slate-500">Lifted Index (LI):</span>{" "}
                Stabilità. {"<"}0 = instabile, {"<"}-4 = molto instabile, {">"}3 = molto stabile.
              </div>
              <div>
                <span className="text-slate-500">CIN:</span>{" "}
                Convective Inhibition – energia che blocca l'innesco. {">"}100 J/kg = innesco difficile.
              </div>
              <div>
                <span className="text-slate-500">LCL / Base cumuli:</span>{" "}
                Livello di condensazione. Base = quota + (T-Td)×125m.
              </div>
              <div>
                <span className="text-slate-500">Zero termico:</span>{" "}
                Quota dove T=0°C. Calcolato: quota + T/0.0065.
              </div>
              <div>
                <span className="text-slate-500">Wind shear:</span>{" "}
                Variazione vento con quota. {">"}5 km/h per 100m = turbolenza termiche.
              </div>
              <div>
                <span className="text-slate-500">Rateo salita:</span>{" "}
                Velocità verticale termica. {">"}2 m/s = ottimo, 1-2 = buono, {"<"}0.5 = debole.
              </div>
              <div>
                <span className="text-slate-500">Vento frontale/laterale/coda:</span>{" "}
                Rispetto a esposizione decollo. Frontale = ideale, coda = pericoloso.
              </div>
              <div>
                <span className="text-slate-500">Raffiche:</span>{" "}
                Vento istantaneo. Delta {">"}10 km/h vs media = turbolenza meccanica.
              </div>
              <div>
                <span className="text-slate-500">K-Index / Total Totals:</span>{" "}
                Indici temporali. K{">"}30 o TT{">"}50 = alto rischio.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}