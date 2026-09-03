import React, { useMemo } from "react";
import {
  Sun, Thermometer, Wind, Cloud, CloudRain, CloudLightning,
  TrendingUp, ShieldCheck, AlertTriangle, CheckCircle, Activity,
  MapPin, Calendar, Sparkles, Zap, Layers, Clock, Eye, Droplets, Gauge
} from "lucide-react";
import type { HourData } from "@/types/meteo";
import type { MeteoCurrent } from "@/services/openMeteoService";
import { calcolaAnalisiApprofondita } from "@/utils/analisiApprofondita";
import AnalisiApprofonditaCard from "./AnalisiApprofonditaCard";
import BadgeClima from "@/components/BadgeClima";
import { confrontaClima } from "@/utils/climatologia";

interface AnalisiMeteoProps {
  currentData: HourData | MeteoCurrent | null;
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
    if (dayData && dayData.length > 0) {
      return formatDateShort(dayData[0].time);
    }
    return formatDateShort(new Date());
  }, [dayData]);

  if (!dayData || dayData.length < 3) {
    return (
      <div className="text-center py-12 text-slate-400 text-base">
        <Sun className="w-10 h-10 mx-auto mb-3 text-slate-500" />
        Dati insufficienti per generare l'analisi per {site?.name || "questo decollo"}.
      </div>
    );
  }

  // Calcola metriche reali dai dati
  const oreGiorno = dayData.filter(h => {
    const hh = h.time.getHours();
    return hh >= 8 && hh <= 18;
  });

  const tempMaxGiorno = Math.max(...oreGiorno.map(h => h.temperature));
  const tempMinGiorno = Math.min(...oreGiorno.map(h => h.temperature));
  const deltaTermico = Math.round((tempMaxGiorno - tempMinGiorno) * 10) / 10;
  const umiditaMedia = Math.round(oreGiorno.reduce((s, h) => s + h.humidity, 0) / oreGiorno.length);
  const ventoMedio = Math.round(oreGiorno.reduce((s, h) => s + h.windSpeed, 0) / oreGiorno.length);
  const ventoDirMedia = Math.round(oreGiorno.reduce((s, h) => s + h.windDir, 0) / oreGiorno.length);
  const ventoDirNome = getWindDirName(ventoDirMedia);
  const ventoGustsMax = Math.max(...oreGiorno.map(h => h.windGusts || 0));
  const pioggiaTot = Math.round(oreGiorno.reduce((s, h) => s + (h.precipitation || 0), 0) * 10) / 10;
  const nuvoleMedia = Math.round(oreGiorno.reduce((s, h) => s + h.cloudCover, 0) / oreGiorno.length);

  // Rischio temporali
  const rischioTemporali = analisiApprofondita?.rischioTemporali || 0;
  const getRischioBg = (val: number) => {
    if (val >= 70) return "bg-red-900/30 border-red-500/40";
    if (val >= 40) return "bg-orange-900/30 border-orange-500/40";
    if (val >= 15) return "bg-amber-900/30 border-amber-500/40";
    return "bg-green-900/30 border-green-500/40";
  };
  const getRischioText = (val: number) => {
    if (val >= 70) return "text-red-300 font-bold";
    if (val >= 40) return "text-orange-300 font-bold";
    if (val >= 15) return "text-amber-300 font-bold";
    return "text-green-300 font-bold";
  };
  const getRischioBar = (val: number) => {
    if (val >= 70) return "bg-red-500";
    if (val >= 40) return "bg-orange-500";
    if (val >= 15) return "bg-amber-500";
    return "bg-green-500";
  };
  const getCloudDescription = (cover: number) => {
    if (cover < 20) return "Sereno";
    if (cover < 40) return "Poco nuvoloso";
    if (cover < 60) return "Nuvoloso";
    if (cover < 80) return "Molto nuvoloso";
    return "Coperto";
  };
  const getUmiditaDescrizione = (um: number) => {
    if (um < 30) return "molto secca";
    if (um < 50) return "secca";
    if (um < 70) return "moderata";
    if (um < 85) return "umida";
    return "molto umida";
  };

  return (
    <div className="space-y-4">
      {/* Intestazione decollo e data */}
      <div className="bg-slate-800/60 border border-purple-500/30 rounded-xl px-4 py-3 flex items-center gap-3">
        <MapPin className="w-5 h-5 text-purple-400 shrink-0" />
        <div>
          <div className="text-sm font-bold text-white">{site?.name || "Decollo"} — Analisi completa</div>
          <div className="text-[10px] text-slate-400 flex items-center gap-2">
            <Calendar className="w-3 h-3" />
            <span>{dataGiorno}</span>
            <span className="text-slate-600">·</span>
            <span>{site?.alt || 0}m · Esposizione {site?.exposure || "N/D"}</span>
          </div>
        </div>
      </div>

      {/* Badge climatologico */}
      {anomalieClima.length > 0 && <BadgeClima anomalie={anomalieClima} />}

      {/* ANALISI APPROFONDITA */}
      {analisiApprofondita && (
        <AnalisiApprofonditaCard analisi={analisiApprofondita} siteName={site?.name || "Decollo"} dayData={dayData} />
      )}

      {/* Situazione generale (riepilogo rapido) */}
      <div className="bg-gradient-to-br from-slate-900/60 to-slate-800/30 border-2 border-slate-700/30 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Sun className="w-6 h-6 text-orange-400 shrink-0" />
          <h3 className="text-base font-bold text-white">{site?.name} — Situazione generale</h3>
        </div>
        <div className="space-y-2 text-sm text-slate-300">
          <p>
            <span className="text-emerald-400 mr-2">&bull;</span>
            Max {Math.round(tempMaxGiorno)}°C, min {Math.round(tempMinGiorno)}°C, delta {deltaTermico}°C.
          </p>
          <p>
            <span className="text-emerald-400 mr-2">&bull;</span>
            Umidità: {umiditaMedia}% — {getUmiditaDescrizione(umiditaMedia)}.
          </p>
          <p>
            <span className="text-emerald-400 mr-2">&bull;</span>
            Vento: {ventoMedio} km/h da {ventoDirNome} ({ventoDirMedia}°).
            {ventoGustsMax > ventoMedio * 1.5 ? ` Raffiche ${ventoGustsMax} km/h.` : ""}
          </p>
          <p>
            <span className="text-emerald-400 mr-2">&bull;</span>
            Cielo: {getCloudDescription(nuvoleMedia)} ({nuvoleMedia}%).
            {pioggiaTot === 0 ? " Nessuna pioggia." : ` Pioggia: ${pioggiaTot.toFixed(1)} mm.`}
          </p>
        </div>
      </div>

      {/* Rischio temporali */}
      <div className={`rounded-2xl p-5 border-2 ${getRischioBg(rischioTemporali)}`}>
        <div className="flex items-center gap-3 mb-3">
          {rischioTemporali >= 70 || (analisiApprofondita?.rischioTemporali && analisiApprofondita?.rischioTemporali > 0) ? (
            <CloudLightning className="w-8 h-8 text-red-400 shrink-0" />
          ) : rischioTemporali >= 15 ? (
            <CloudRain className="w-8 h-8 text-amber-400 shrink-0" />
          ) : (
            <Cloud className="w-8 h-8 text-green-400 shrink-0" />
          )}
          <div className="min-w-0">
            <h3 className="text-base font-bold text-white">{site?.name} — Rischio temporali</h3>
            <p className={`text-sm font-medium ${getRischioText(rischioTemporali)}`}>
              {analisiApprofondita?.dettaglioTemporali || "Nessun rischio significativo"}
            </p>
          </div>
        </div>
        <div className="h-4 bg-slate-700/50 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${getRischioBar(rischioTemporali)}`}
            style={{ width: `${rischioTemporali}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-xs text-slate-500 mt-1">
          <span>0%</span>
          <span>50%</span>
          <span>100%</span>
        </div>
      </div>

      {/* Interpretazione */}
      <div className="bg-gradient-to-br from-green-900/20 to-emerald-900/10 border-2 border-green-700/30 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-6 h-6 text-green-400 shrink-0" />
          <h3 className="text-base font-bold text-green-300">{site?.name} — Interpretazione</h3>
        </div>
        <div className="space-y-2 text-sm text-slate-300">
          <p>{analisiApprofondita?.valutazione || "Analisi in corso..."}</p>
          {analisiApprofondita && analisiApprofondita.puntiPositivi && analisiApprofondita.puntiPositivi.length > 0 && (
            <div className="mt-2">
              <div className="text-xs text-emerald-400 font-bold mb-1">Punti positivi:</div>
              {analisiApprofondita.puntiPositivi.map((p: string, i: number) => (
                <p key={i}>
                  <span className="text-emerald-400 mr-2">&bull;</span>
                  {p}
                </p>
              ))}
            </div>
          )}
          {analisiApprofondita && analisiApprofondita.puntiNegativi && analisiApprofondita.puntiNegativi.length > 0 && (
            <div className="mt-2">
              <div className="text-xs text-amber-400 font-bold mb-1">Criticità:</div>
              {analisiApprofondita.puntiNegativi.map((p: string, i: number) => (
                <p key={i}>
                  <span className="text-amber-400 mr-2">&bull;</span>
                  {p}
                </p>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}