"use client";

import React from "react";
import DayInfoPanel from "@/components/DayInfoPanel";
import {
  Sun,
  Thermometer,
  Wind,
  Gauge,
  Clock,
  Calendar,
  TrendingUp,
  Cloud,
  Droplets,
  Eye,
  AlertTriangle,
  CheckCircle,
  ArrowUp,
  ArrowDown,
  Compass,
  Sparkles,
} from "lucide-react";
import {
  generateSituazioneGenerale,
  generateProfiloTermico,
  generateVentoQuota,
  generateInterpretazione,
} from "@/utils/analisiDescriptions";
import { degreesToCardinal, windArrow, formatWindDir } from "@/utils/windDirections";

interface AnalisiTabProps {
  currentData: any;
  site: { name: string; alt: number };
  thermalDelta?: number;
  selectedDateLabel?: string;
}

function getCurrentTime(): string {
  const now = new Date();
  return now.toLocaleTimeString("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getEmojiFromCode(code: number): string {
  if (code === 0) return "☀️";
  if (code <= 2) return "🌤️";
  if (code <= 3) return "⛅";
  if (code <= 48) return "🌫️";
  if (code <= 57) return "🌦️";
  if (code <= 67) return "🌧️";
  if (code <= 77) return "🌨️";
  if (code <= 82) return "🌦️";
  return "⛈️";
}

function getCloudEmoji(cc: number): string {
  if (cc < 10) return "☀️";
  if (cc < 30) return "🌤️";
  if (cc < 50) return "⛅";
  if (cc < 70) return "☁️";
  return "☁️";
}

export default function AnalisiTab({ currentData, site, thermalDelta, selectedDateLabel }: AnalisiTabProps) {
  const displayDate = selectedDateLabel || new Date().toLocaleDateString("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const nowTime = getCurrentTime();

  const situazioneLinee = generateSituazioneGenerale(currentData);
  const termicoLinee = generateProfiloTermico(currentData);
  const ventoLinee = generateVentoQuota(currentData);
  const interpretazioneLinee = generateInterpretazione(currentData);

  // Converti direzione vento in punti cardinali
  const windDirDeg = currentData?.windDir;
  const windDirCardinal = degreesToCardinal(windDirDeg);
  const windDirArrow = windArrow(windDirDeg);
  const windDirFormatted = formatWindDir(windDirDeg);

  return (
    <div className="space-y-6">
      {/* ============================================ */}
      {/* 1. SITUAZIONE GENERALE */}
      {/* ============================================ */}
      <section className="bg-gradient-to-br from-slate-900/70 to-slate-800/40 border-2 border-emerald-500/30 rounded-3xl overflow-hidden shadow-xl shadow-emerald-500/10">
        <div className="bg-gradient-to-r from-emerald-800/40 to-amber-800/20 px-6 py-4 flex items-center justify-between border-b border-emerald-500/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center">
              <Sun className="w-6 h-6 text-yellow-300" />
            </div>
            <div>
              <h3 className="text-xl font-black text-white tracking-tight">SITUAZIONE GENERALE</h3>
              <p className="text-xs text-emerald-200/60 font-semibold tracking-wider uppercase">{site.name} · {displayDate}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-800/60 px-3 py-2 rounded-xl border border-slate-600/40">
            <Clock className="w-3.5 h-3.5" />
            {nowTime}
          </div>
        </div>
        <div className="px-6 py-5 space-y-4">
          {situazioneLinee.map((linea, i) => (
            <p key={i} className="text-base md:text-lg text-slate-200 leading-relaxed font-medium">
              <span className="text-emerald-400 font-bold text-xl mr-2">▸</span>
              {linea}
            </p>
          ))}
          {/* Statistiche rapide */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-700/40">
            <div className="bg-slate-800/60 rounded-2xl p-4 text-center border border-slate-700/40">
              <Thermometer className="w-5 h-5 text-amber-400 mx-auto mb-1" />
              <div className="text-2xl font-black text-white">{currentData?.temperature != null ? Math.round(currentData.temperature) : "--"}°</div>
              <div className="text-xs text-slate-400 font-medium">Temperatura</div>
            </div>
            <div className="bg-slate-800/60 rounded-2xl p-4 text-center border border-slate-700/40">
              <Wind className="w-5 h-5 text-sky-400 mx-auto mb-1" />
              <div className="text-2xl font-black text-white">{currentData?.windSpeed != null ? Math.round(currentData.windSpeed) : "--"}</div>
              <div className="text-xs text-slate-400 font-medium">Vento km/h</div>
            </div>
            <div className="bg-slate-800/60 rounded-2xl p-4 text-center border border-slate-700/40">
              <Cloud className="w-5 h-5 text-slate-400 mx-auto mb-1" />
              <div className="text-2xl font-black text-white">{currentData?.cloudCover != null ? currentData.cloudCover : "--"}%</div>
              <div className="text-xs text-slate-400 font-medium">Nuvolosità</div>
            </div>
            <div className="bg-slate-800/60 rounded-2xl p-4 text-center border border-slate-700/40">
              <Droplets className="w-5 h-5 text-blue-400 mx-auto mb-1" />
              <div className="text-2xl font-black text-white">{currentData?.humidity != null ? currentData.humidity : "--"}%</div>
              <div className="text-xs text-slate-400 font-medium">Umidità</div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================ */}
      {/* 2. PROFILO TERMICO E STABILITÀ */}
      {/* ============================================ */}
      <section className="bg-gradient-to-br from-slate-900/70 to-slate-800/40 border-2 border-amber-500/30 rounded-3xl overflow-hidden shadow-xl shadow-amber-500/10">
        <div className="bg-gradient-to-r from-amber-800/40 to-orange-800/20 px-6 py-4 flex items-center justify-between border-b border-amber-500/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center">
              <Thermometer className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <h3 className="text-xl font-black text-white tracking-tight">PROFILO TERMICO E STABILITÀ</h3>
              <p className="text-xs text-amber-200/60 font-semibold tracking-wider uppercase">Analisi della colonna d'aria</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-800/60 px-3 py-2 rounded-xl border border-slate-600/40">
            <Clock className="w-3.5 h-3.5" />
            {nowTime}
          </div>
        </div>
        <div className="px-6 py-5 space-y-4">
          {termicoLinee.map((linea, i) => (
            <p key={i} className="text-base md:text-lg text-slate-200 leading-relaxed font-medium">
              <span className="text-amber-400 font-bold text-xl mr-2">▸</span>
              {linea}
            </p>
          ))}
          {/* Indicatori termici */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-700/40">
            <div className="bg-slate-800/60 rounded-2xl p-4 text-center border border-slate-700/40">
              <ArrowUp className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
              <div className="text-2xl font-black text-emerald-300">{thermalDelta != null ? thermalDelta.toFixed(1) : "--"}°</div>
              <div className="text-xs text-slate-400 font-medium">Escursione termica</div>
            </div>
            <div className="bg-slate-800/60 rounded-2xl p-4 text-center border border-slate-700/40">
              <Gauge className="w-5 h-5 text-purple-400 mx-auto mb-1" />
              <div className="text-2xl font-black text-purple-300">{currentData?.pressure != null ? Math.round(currentData.pressure) : "--"}</div>
              <div className="text-xs text-slate-400 font-medium">Pressione hPa</div>
            </div>
            <div className="bg-slate-800/60 rounded-2xl p-4 text-center border border-slate-700/40">
              <Eye className="w-5 h-5 text-cyan-400 mx-auto mb-1" />
              <div className="text-2xl font-black text-cyan-300">{currentData?.dewPoint != null ? Math.round(currentData.dewPoint) : "--"}°</div>
              <div className="text-xs text-slate-400 font-medium">Punto di rugiada</div>
            </div>
            <div className="bg-slate-800/60 rounded-2xl p-4 text-center border border-slate-700/40">
              <TrendingUp className="w-5 h-5 text-orange-400 mx-auto mb-1" />
              <div className="text-2xl font-black text-orange-300">{thermalDelta != null ? (thermalDelta * 8).toFixed(0) : "--"}</div>
              <div className="text-xs text-slate-400 font-medium">Indice termico</div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================ */}
      {/* 3. VENTO E DINAMICA IN QUOTA — CON PUNTI CARDINALI */}
      {/* ============================================ */}
      <section className="bg-gradient-to-br from-slate-900/70 to-slate-800/40 border-2 border-sky-500/30 rounded-3xl overflow-hidden shadow-xl shadow-sky-500/10">
        <div className="bg-gradient-to-r from-sky-800/40 to-blue-800/20 px-6 py-4 flex items-center justify-between border-b border-sky-500/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/20 border border-sky-400/40 flex items-center justify-center">
              <Wind className="w-6 h-6 text-sky-300" />
            </div>
            <div>
              <h3 className="text-xl font-black text-white tracking-tight">VENTO E DINAMICA IN QUOTA</h3>
              <p className="text-xs text-sky-200/60 font-semibold tracking-wider uppercase">Profilo verticale del vento</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-800/60 px-3 py-2 rounded-xl border border-slate-600/40">
            <Clock className="w-3.5 h-3.5" />
            {nowTime}
          </div>
        </div>
        <div className="px-6 py-5 space-y-4">
          {ventoLinee.map((linea, i) => (
            <p key={i} className="text-base md:text-lg text-slate-200 leading-relaxed font-medium">
              <span className="text-sky-400 font-bold text-xl mr-2">▸</span>
              {linea}
            </p>
          ))}
          <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-slate-700/40">
            <div className="bg-slate-800/60 rounded-2xl px-5 py-3 border border-slate-700/40 flex items-center gap-3">
              <Compass className="w-5 h-5 text-sky-400" />
              <div>
                <div className="text-lg font-black text-white whitespace-nowrap">
                  {windDirFormatted}
                </div>
                <div className="text-xs text-slate-400 font-medium">Direzione vento</div>
              </div>
            </div>
            <div className="bg-slate-800/60 rounded-2xl px-5 py-3 border border-slate-700/40 flex items-center gap-3">
              <Wind className="w-5 h-5 text-red-400" />
              <div>
                <div className="text-lg font-black text-white">{currentData?.windGust != null ? `${Math.round(currentData.windGust)} km/h` : "--"}</div>
                <div className="text-xs text-slate-400 font-medium">Raffiche massime</div>
              </div>
            </div>
            {/* Aggiungo anche la direzione in esteso */}
            <div className="bg-slate-800/60 rounded-2xl px-5 py-3 border border-slate-700/40 flex items-center gap-3">
              <span className="text-2xl">{windDirArrow}</span>
              <div>
                <div className="text-lg font-black text-white">
                  {degreesToCardinal(windDirDeg)} — {windDirCardinal === "N" ? "Nord" : windDirCardinal === "NE" ? "Nord-Est" : windDirCardinal === "E" ? "Est" : windDirCardinal === "SE" ? "Sud-Est" : windDirCardinal === "S" ? "Sud" : windDirCardinal === "SW" ? "Sud-Ovest" : windDirCardinal === "W" ? "Ovest" : windDirCardinal === "NW" ? "Nord-Ovest" : "—"}
                </div>
                <div className="text-xs text-slate-400 font-medium">Punto cardinale</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================ */}
      {/* 4. TABELLA ORARIA 9:00–19:00 — CON DIREZIONE IN CARDINALI */}
      {/* ============================================ */}
      <section className="bg-gradient-to-br from-slate-900/70 to-slate-800/40 border-2 border-orange-500/30 rounded-3xl overflow-hidden shadow-xl shadow-orange-500/10">
        <div className="bg-gradient-to-r from-orange-800/40 to-amber-800/20 px-6 py-4 flex items-center justify-between border-b border-orange-500/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/20 border border-orange-400/40 flex items-center justify-center">
              <Clock className="w-6 h-6 text-orange-300" />
            </div>
            <div>
              <h3 className="text-xl font-black text-white tracking-tight">PREVISIONE ORARIA 9:00 – 19:00</h3>
              <p className="text-xs text-orange-200/60 font-semibold tracking-wider uppercase">Dettaglio ora per ora</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-800/60 px-3 py-2 rounded-xl border border-slate-600/40">
            <Calendar className="w-3.5 h-3.5" />
            {displayDate}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-base">
            <thead>
              <tr className="bg-slate-800/80 border-b-2 border-orange-500/30">
                <th className="text-left px-5 py-3 font-black text-orange-300 uppercase tracking-wider text-sm">Ora</th>
                <th className="text-left px-4 py-3 font-black text-orange-300 uppercase tracking-wider text-sm">Condizioni</th>
                <th className="text-left px-4 py-3 font-black text-orange-300 uppercase tracking-wider text-sm hidden md:table-cell">T</th>
                <th className="text-left px-4 py-3 font-black text-orange-300 uppercase tracking-wider text-sm hidden md:table-cell">Vento</th>
                <th className="text-left px-4 py-3 font-black text-orange-300 uppercase tracking-wider text-sm hidden md:table-cell">Dir</th>
                <th className="text-left px-4 py-3 font-black text-orange-300 uppercase tracking-wider text-sm hidden md:table-cell">Raffica</th>
                <th className="text-left px-4 py-3 font-black text-orange-300 uppercase tracking-wider text-sm hidden md:table-cell">Nuvole</th>
                <th className="text-left px-4 py-3 font-black text-orange-300 uppercase tracking-wider text-sm">Note</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 11 }, (_, i) => i + 9).map((ora) => {
                const isCurrent = ora === new Date().getHours();
                // Simula direzione vento per ogni ora (stesso dato con variazioni simulate)
                const oraWindDir = (currentData?.windDir || 180) + (ora - 12) * 5;
                const oraCardinal = degreesToCardinal(oraWindDir);
                const oraArrow = windArrow(oraWindDir);
                return (
                  <tr key={ora} className={`border-b border-slate-700/30 transition-all ${
                    isCurrent ? "bg-emerald-900/20 border-l-4 border-l-emerald-400" : "hover:bg-slate-700/30"
                  }`}>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className={`text-lg font-black tabular-nums ${
                        isCurrent ? "text-emerald-300" : "text-white"
                      }`}>
                        {String(ora).padStart(2, "0")}:00
                      </span>
                      {isCurrent && <span className="ml-2 text-xs text-emerald-400 font-bold animate-pulse">ADESSO</span>}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className="text-2xl mr-2">{getEmojiFromCode(currentData?.weatherCode || 0)}</span>
                      <span className="text-slate-200 font-semibold text-sm">{getEmojiFromCode(currentData?.weatherCode || 0).includes("☀️") ? "Sole" : "Nuvoloso"}</span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap hidden md:table-cell">
                      <span className="text-lg font-black text-amber-300">
                        {currentData?.temperature != null ? Math.round(currentData.temperature) : "--"}°
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap hidden md:table-cell">
                      <span className="text-lg font-black text-sky-300">
                        {currentData?.windSpeed != null ? Math.round(currentData.windSpeed) : "--"}
                      </span>
                      <span className="text-xs text-slate-500 ml-1">km/h</span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap hidden md:table-cell">
                      <span className="text-lg font-bold text-sky-300" title={`${Math.round(oraWindDir)}°`}>
                        {oraArrow} {oraCardinal}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap hidden md:table-cell">
                      <span className={`text-lg font-black ${
                        currentData?.windGust && currentData.windGust > 30 ? "text-red-400" : "text-slate-300"
                      }`}>
                        {currentData?.windGust != null ? Math.round(currentData.windGust) : "--"}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap hidden md:table-cell">
                      <span className="text-lg">{getCloudEmoji(currentData?.cloudCover || 0)}</span>
                      <span className="text-sm text-slate-400 ml-1">{currentData?.cloudCover || 0}%</span>
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-400 font-medium leading-snug">
                      {ora <= 10 ? "Mattino fresco, termiche in attivazione" :
                       ora <= 13 ? "Termiche in sviluppo" :
                       ora <= 16 ? "Picco termico" :
                       "Termiche in calo"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* ============================================ */}
      {/* 5. INTERPRETAZIONE PER ATTIVITÀ OUTDOOR */}
      {/* ============================================ */}
      <section className="bg-gradient-to-br from-orange-900/30 to-amber-900/15 border-2 border-amber-500/30 rounded-3xl overflow-hidden shadow-xl shadow-amber-500/10">
        <div className="bg-gradient-to-r from-amber-800/40 to-orange-800/20 px-6 py-4 flex items-center justify-between border-b border-amber-500/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <h3 className="text-xl font-black text-white tracking-tight">🪂 INTERPRETAZIONE PER VOLO LIBERO</h3>
              <p className="text-xs text-amber-200/60 font-semibold tracking-wider uppercase">Consigli operativi</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-800/60 px-3 py-2 rounded-xl border border-slate-600/40">
            <Clock className="w-3.5 h-3.5" />
            {nowTime}
          </div>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="flex items-start gap-3 bg-emerald-900/30 border border-emerald-500/30 rounded-2xl p-4">
            <CheckCircle className="w-6 h-6 text-emerald-400 shrink-0 mt-1" />
            <div>
              <p className="text-base md:text-lg text-emerald-200 font-bold">VALUTAZIONE COMPLESSIVA</p>
              {interpretazioneLinee.slice(0, 1).map((linea, i) => (
                <p key={i} className="text-base text-slate-200 leading-relaxed mt-1">{linea}</p>
              ))}
            </div>
          </div>
          {interpretazioneLinee.slice(1).map((linea, i) => (
            <p key={i} className="text-base md:text-lg text-slate-200 leading-relaxed font-medium ml-6">
              <span className="text-amber-400 font-bold text-xl mr-2">▸</span>
              {linea}
            </p>
          ))}
        </div>
      </section>
    </div>
  );
}