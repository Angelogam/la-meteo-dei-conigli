import React, { useMemo } from "react";
import {
  Sun, Thermometer, Wind, Cloud, CloudRain, CloudLightning,
  TrendingUp, ShieldCheck, AlertTriangle, CheckCircle, Activity,
  MapPin, Calendar, Sparkles, Zap, Layers, Clock, Eye, Droplets, Gauge
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

export default function AnalisiMeteo({ dayData, site }: AnalisiMeteoProps) {
  if (!dayData || dayData.length < 3) {
    return (
      <div className="text-center py-12 text-slate-400 text-base">
        <Sun className="w-10 h-10 mx-auto mb-3 text-slate-500" />
        Dati insufficienti per generare l'analisi per {site?.name || "questo decollo"}.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Intestazione decollo e data */}
      <div className="bg-slate-800/60 border border-purple-500/30 rounded-xl px-4 py-3 flex items-center gap-3">
        <MapPin className="w-5 h-5 text-purple-400 shrink-0" />
        <div>
          <div className="text-sm font-bold text-white">{site?.name || "Decollo"} — Analisi completa</div>
          <div className="text-[10px] text-slate-400 flex items-center gap-2">
            <Calendar className="w-3 h-3" />
            <span>{/* dataGiorno */}</span>
            <span className="text-slate-600">·</span>
            <span>{site?.alt || 0}m · Esposizione {site?.exposure || "N/D"}</span>
          </div>
        </div>
      </div>

      {/* Situazione generale (riepilogo rapido) */}
      <div className="bg-gradient-to-br from-slate-900/60 to-slate-800/30 border-2 border-slate-700/30 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Sun className="w-6 h-6 text-orange-400 shrink-0" />
          <h3 className="text-base font-bold text-white">{site?.name} — Situazione generale</h3>
        </div>
        <div className="space-y-2 text-sm text-slate-300">
          <p><span className="text-emerald-400 mr-2">&bull;</span> Max { /* tempMaxGiorno */ }°C, min { /* tempMinGiorno */ }°C, delta { /* deltaTermico */ }°C.</p>
          <p><span className="text-emerald-400 mr-2">&bull;</span> Umidità: { /* umiditaMedia */ }% — { /* getUmiditaDescrizione(umiditaMedia) */ }.</p>
          <p><span className="text-emerald-400 mr-2">&bull;</span> Vento: { /* ventoMedio */ } km/h da { /* ventoDirNome */ } ({ /* ventoDirMedia */ }°).{ /* ventoGustsMax > ventoMedio * 1.5 */ ? ` Raffiche ${ventoGustsMax} km/h.` : ""}</p>
          <p><span className="text-emerald-400 mr-2">&bull;</span> Cielo: { /* getCloudDescription(analisi.nuvoleMedia) */ } ({ /* analisi.nuvoleMedia */ }%).{ /* pioggiaTot === 0 */ ? " Nessuna pioggia." : ` Pioggia: { /* pioggiaTot.toFixed(1) */ } mm.`}</p>
        </div>
      </div>

      {/* Rischio temporali */}
      <div className={"rounded-2xl p-5 border-2 " + /* getRischioBg(analisi.rischioTemporali) */}>
        <div className="flex items-center gap-3 mb-3">
          { /* analisi.rischioTemporali >= 70 || analisi.oreTemporale > 0 ? ( */ <CloudLightning className="w-8 h-8 text-red-400 shrink-0" /> /* ) : analisi.rischioTemporali >= 15 ? ( */ <CloudRain className="w-8 h-8 text-amber-400 shrink-0" /> /* ) : ( */ <Cloud className="w-8 h-8 text-green-400 shrink-0" /> /* ) */
          }
          <div className="min-w-0">
            <h3 className="text-base font-bold text-white">{site?.name} — Rischio temporali</h3>
            <p className={"text-sm font-medium " + /* getRischioText(analisi.rischioTemporali) */}>/* analisi.dettaglioTemporali */</p>
          </div>
        </div>
        <div className="h-4 bg-slate-700/50 rounded-full overflow-hidden">
          <div className={"h-full rounded-full " + /* getRischioBar(analisi.rischioTemporali) */} style={{ width: /* analisi.rischioTemporali + "%" */ }} />
        </div>
        <div className="flex items-center justify-between text-xs text-slate-500 mt-1"><span>0%</span><span>50%</span><span>100%</span></div>
      </div>

      {/* Interpretazione */}
      <div className="bg-gradient-to-br from-green-900/20 to-emerald-900/10 border-2 border-green-700/30 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-6 h-6 text-green-400 shrink-0" />
          <h3 className="text-base font-bold text-green-300">{site?.name} — Interpretazione</h3>
        </div>
        <div className="space-y-2 text-sm text-slate-300">
          <p>{/* analisi.valutazione */}</p>
          <div className="mt-2">
            <div className="text-xs text-emerald-400 font-bold mb-1">Punti positivi:</div>
            {/* analisi.puntiPositivi.map((p, i) => (
              <p key={i}><span className="text-emerald-400 mr-2">&bull;</span>{p}</p>
            )) */}
          </div>
          <div className="mt-2">
            <div className="text-xs text-amber-400 font-bold mb-1">Criticità:</div>
            {/* analisi.puntiNegativi.map((p, i) => (
              <p key={i}><span className="text-amber-400 mr-2">&bull;</span>{p}</p>
            )) */}
          </div>
        </div>
      </div>
    </div>
  );
}