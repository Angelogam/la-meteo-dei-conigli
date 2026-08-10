import React, { useMemo } from "react";
import type { HourData } from "@/types/meteo";
import { DECOLLI } from "@/data/decolli";
import { calcolaTermiche } from "@/utils/termiche";
import { getVoloStatus } from "@/utils/volo";
import { Calendar, Activity } from "lucide-react";

interface VoloReportCardProps {
  currentData: HourData | null;
  dayData: HourData[];
  sito: { name: string; altitude: number; exposure: string; latitude: number; longitude: number };
  termicheOrarie: { ora: number; rateo: number; base: number; top: number; precip: number; temp: number }[];
  totalPrecipitation: number;
  firstRainHour: number | null;
  lastRainHour: number | null;
  LI: number;
  CIN: number;
  zeroTermico: number;
  cloudBase: number;
  stability: { label: string; color: string };
  maxRateo: number;
  inizioFinestra: number;
  fineFinestra: number;
  andamentoTermiche: string;
  precipitazioniTesto: string;
  analisiEmagramma: string;
  interpretazione: string;
  consigli: string;
  riepilogo: string;
}

export default function VoloReportCard({
  currentData,
  dayData,
  sito,
  termicheOrarie,
  totalPrecipitation,
  firstRainHour,
  lastRainHour,
  LI,
  CIN,
  zeroTermico,
  cloudBase,
  stability,
  maxRateo,
  inizioFinestra,
  fineFinestra,
  andamentoTermiche,
  precipitazioniTesto,
  analisiEmagramma,
  interpretazione,
  consigli,
  riepilogo,
}: VoloReportCardProps) {
  // Calculate flight score
  let giudizioScore = 5;
  if (maxRateo >= 2) giudizioScore += 3;
  else if (maxRateo >= 1) giudizioScore += 2;
  else if (maxRateo >= 0.5) giudizioScore += 1;
  if (totalPrecipitation === 0) giudizioScore += 2;
  else if (totalPrecipitation < 1) giudizioScore += 1;
  else if (totalPrecipitation < 3) giudizioScore -= 1;
  else giudizioScore -= 2;
  giudizioScore = Math.min(10, Math.max(0, giudizioScore));
  const giudizioLabel =
    giudizioScore >= 8 ? "Eccellente" : giudizioScore >= 6 ? "Buona" : giudizioScore >= 4 ? "Discreta" : giudizioScore >= 2 ? "Scarsa" : "Pessima";

  return (
    <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-purple-400 shrink-0" />
          <h3 className="text-base font-bold text-white">Analisi approfondita · {sito.name}</h3>
        </div>
        <span className="text-xs text-slate-400">Aggiornato {new Date().toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })} UTC</span>
      </div>

      {/* Main Report Card */}
      <div className="bg-slate-900/50 border border-slate-700/50 rounded-lg p-4">
        <p className="text-slate-100 text-sm font-mono whitespace-pre-line leading-relaxed">
          🌤️ REPORT VOLO A VELA – {sito.name.toUpperCase()} – {new Date().toLocaleDateString("it-IT", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          })} 🌤️
          Quota partenza circa {sito.altitude} m s.l.m. – Dati da AROME + ICON‑EU elaborati da Alpium – Aggiornamento {new Date().toLocaleTimeString("it-IT", {
            hour: "2-digit",
            minute: "2-digit",
          })} UTC

          🧭 GIUDIZIO GENERALE: {giudizioScore}/10 – Giornata volabile ma con forte limitazione temporale a causa di temporali attesi dal primo pomeriggio. Buone termiche tra le 11 e le 13, ma dopo le 15 le condizioni diventano rapidamente critiche per pioggia e turbolenza. Finestra operativa sicura: decollo entro le {String(inizioFinestra).padStart(2, "0")}:00, rientro e atterraggio completati entro le {String(fineFinestra).padStart(2, "0")}:30 tassativo.

          🔥 ANDAMENTO TERMICHE ORARIO: {andamentoTermiche}

          🌧️ PRECIPITAZIONI PREVISTE: {precipitazioniTesto}

          📈 ANALISI DELL'EMAGRAMMA – PARAMETRI CHIAVE: {analisiEmagramma}

          🧭 INTERPRETAZIONE COMPLESSIVA: {interpretazione}

          🛩️ CONSIGLI OPERATIVI PER IL PILOTA: {consigli}

          📌 RIEPILOGO FINALE IN BREVE: {riepilogo}
          
          ⚠️ Avvertenza finale: questo report è basato su modelli numerici e ha valore di supporto alla pianificazione; non sostituisce il bollettino meteorologico ufficiale né l'osservazione diretta delle condizioni reali. La responsabilità della decisione di volare e della sicurezza in volo è sempre e solo del pilota. Detto questo, la giornata offre opportunità interessanti se affrontata con disciplina, prudenza e rispetto dei limiti temporali.
        </p>
      </div>

      {/* Quick Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className={`rounded-lg p-3 border ${getRischioBg(giudizioScore * 10)}`}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-400">GIUDIZIO GIORNATA</span>
            <span className={`text-sm font-bold ${getRischioText(giudizioScore * 10)}`}>{giudizioScore}/10</span>
          </div>
          <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
            <div className={`h-full ${getRischioBar(giudizioScore * 10)} rounded-full transition_all duration-500`} style={{ width: `${giudizioScore * 10}%` }} />
          </div>
          <p className="text-xs text-slate-300">{giudizioLabel}</p>
        </div>

        <div className="bg-slate-800/50 border border-slate-700/30 rounded-lg p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-400">FINESTRA OPERATIVA</span>
            <span className="text-sm font-bold text-white">{String(inizioFinestra).padStart(2, "0")}:00 – {String(fineFinestra).padStart(2, "0")}:30</span>
          </div>
          <p className="text-xs text-slate-300">Decollo entro {String(inizioFinestra).padStart(2, "0")}:00, atterraggio tassativo entro {String(fineFinestra).padStart(2, "0")}:30</p>
        </div>

        <div className="bg-slate-800/50 border border-slate-700/30 rounded-lg p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-400">LI (Lifted Index)</span>
            <span className="text-sm font-bold text-white">LI</span>
          </div>
          <p className="text-xs text-slate-300">{LI <= -4 ? "Alta instabilità – Rischio temporali" : LI <= -2 ? "Instabilità moderata" : "Atmosfera stabile"}</p>
        </div>

        <div className="bg-slate-800/50 border border-slate-700/30 rounded-lg p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-400">BASE NUBI / ZERO TERMICO</span>
            <span className="text-sm font-bold text-white">{cloudBase} m / {zeroTermico} m</span>
          </div>
          <p className="text-xs text-slate-300">Guadagno max: ~{Math.max(0, cloudBase - sito.altitude)} m sopra decollo</p>
        </div>

        <div className="bg-slate-800/50 border border-slate-700/30 rounded-lg p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-400">PRECIPITAZIONI TOTALI</span>
            <span className="text-sm font-bold text-white">{totalPrecipitation.toFixed(1)} mm</span>
          </div>
          <p className="text-xs text-slate-300">Prima pioggia: {firstRainHour ? String(firstRainHour).padStart(2, "0") + ":00" : "Nessuna"}</p>
        </div>

        <div className="bg-slate-800/50 border border-slate-700/30 rounded-lg p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-400">TERMICHE MAX</span>
            <span className="text-sm font-bold text-white">{maxRateo.toFixed(1)} m/s</span>
          </div>
          <p className="text-xs text-slate-300">Picco tra le 11-13, crollo dopo le 16</p>
        </div>
      </div>
    </div>
  );
}

// Helper functions for risk display
function getRischioBg(r: number): string {
  if (r >= 70) return "bg-red-900/30 border-red-500/40";
  if (r >= 40) return "bg-orange-900/30 border-orange-500/40";
  if (r >= 15) return "bg-amber-900/30 border-orange-500/40";
  if (r >= 5) return "bg-yellow-900/20 border-yellow-500/30";
  return "bg-green-900/20 border-green-500/30";
}

function getRischioText(r: number): string {
  if (r >= 70) return "text-red-400";
  if (r >= 40) return "text-orange-400";
  if (r >= 15) return "text-amber-400";
  if (r >= 5) return "text-yellow-400";
  return "text-green-400";
}

function getRischioBar(r: number): string {
  if (r >= 70) return "bg-red-500";
  if (r >= 40) return "bg-orange-500";
  if (r >= 15) return "bg-amber-500";
  if (r >= 5) return "bg-yellow-500";
  return "bg-green-500";
}