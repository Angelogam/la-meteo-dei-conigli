import React, { useMemo } from "react";
import {
  Sun, Thermometer, Wind, Cloud, CloudRain, CloudLightning,
  TrendingUp, ShieldCheck, AlertTriangle, CheckCircle, Activity,
  MapPin, Calendar, Sparkles, Zap, Layers, Clock, Eye, Droplets, Gauge,
  FileText, Mountain, ArrowUpRight, ArrowDownRight, AlertCircle, Copy
} from "lucide-react";
import type { HourData } from "@/types/meteo";
import type { MeteoCurrent } from "@/services/openMeteoService";
import { calcolaAnalisiApprofondita } from "@/utils/analisiApprofondita";
import AnalisiApprofonditaCard from "./AnalisiApprofonditaCard";
import BadgeClima from "@/components/BadgeClima";
import { confrontaClima } from "@/utils/climatologia";
import { generateReportMeteo, type GeneratedReport } from "@/utils/generateReportMeteo";

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

export default function AnalisiMeteo({ currentData, dayData, site, cape, liftedIndex, cin }: AnalisiMeteoProps) {
  const report = useMemo<GeneratedReport | null>(() => {
    if (!dayData || dayData.length === 0) return null;
    
    // Convert currentData to the format expected by generateReportMeteo
    const hourlyData = {
      time: dayData.map(d => d.time.toISOString()),
      temperature_2m: dayData.map(d => d.temperature ?? 18),
      relative_humidity_2m: dayData.map(d => d.humidity ?? 60),
      dew_point_2m: dayData.map(d => d.dewPoint ?? (d.temperature ?? 18) - 5),
      precipitation: dayData.map(d => d.precipitation ?? 0),
      cloud_cover: dayData.map(d => d.cloudCover ?? 20),
      wind_speed_10m: dayData.map(d => d.windSpeed ?? 8),
      wind_direction_10m: dayData.map(d => d.windDir ?? 180),
      wind_gusts_10m: dayData.map(d => d.windGusts ?? 0),
      weather_code: dayData.map(d => d.weatherCode ?? 0),
      cape: dayData.map(d => d.cape ?? 300),
      lifted_index: dayData.map(d => d.liftedIndex ?? 1.5),
      convective_inhibition: dayData.map(d => d.cin ?? 0),
      freezing_level_height: dayData.map(d => d.freezingLevel ?? 3600),
      shortwave_radiation: dayData.map(d => d.shortwaveRadiation ?? 400),
      temperature_80m: dayData.map(d => d.temperature80m ?? (d.temperature ?? 18) - 2),
      temperature_120m: dayData.map(d => d.temperature120m ?? (d.temperature ?? 18) - 4),
      wind_speed_80m: dayData.map(d => d.windSpeed80m ?? d.windSpeed ?? 8),
      wind_direction_80m: dayData.map(d => d.windDir80m ?? d.windDir ?? 180),
      wind_speed_120m: dayData.map(d => d.windSpeed120m ?? d.windSpeed ?? 8),
      wind_direction_120m: dayData.map(d => d.windDir120m ?? d.windDir ?? 180),
      wind_speed_180m: dayData.map(d => d.windSpeed180m ?? d.windSpeed ?? 8),
      wind_direction_180m: dayData.map(d => d.windDir180m ?? d.windDir ?? 180),
      wind_speed_925hPa: dayData.map(d => d.windSpeed925hPa ?? d.windSpeed ?? 8),
      wind_direction_925hPa: dayData.map(d => d.windDir925hPa ?? d.windDir ?? 180),
      wind_speed_850hPa: dayData.map(d => d.windSpeed850hPa ?? d.windSpeed ?? 8),
      wind_direction_850hPa: dayData.map(d => d.windDir850hPa ?? d.windDir ?? 180),
      wind_speed_700hPa: dayData.map(d => d.windSpeed700hPa ?? d.windSpeed ?? 8),
      wind_direction_700hPa: dayData.map(d => d.windDir700hPa ?? d.windDir ?? 180),
      wind_speed_600hPa: dayData.map(d => d.windSpeed600hPa ?? d.windSpeed ?? 8),
      wind_direction_600hPa: dayData.map(d => d.windDir600hPa ?? d.windDir ?? 180),
      wind_speed_500hPa: dayData.map(d => d.windSpeed500hPa ?? d.windSpeed ?? 8),
      wind_direction_500hPa: dayData.map(d => d.windDir500hPa ?? d.windDir ?? 180),
    };
    
    return generateReportMeteo({
      siteName: site.name ?? "Decollo",
      altitude: site.alt ?? 1374,
      dateObj: dayData[0].time,
      hourlyData,
    });
  }, [currentData, dayData, site, cape, liftedIndex, cin]);

  const dataGiorno = useMemo(() => {
    if (dayData && dayData.length > 0) {
      return `${dayData[0].time.getDate()}/${String(dayData[0].time.getMonth() + 1).padStart(2, '0')}/${dayData[0].time.getFullYear()}`;
    }
    return "";
  }, [dayData]);

  // K-Index: indicatore rischio temporali
  // Formula approssimata: K = T850 - T500 + Td850 - (T2m - Td2m)
  const kIndex = useMemo(() => {
    if (dayData.length < 3) return null;
    const central = dayData[Math.floor(dayData.length / 2)];
    const t850 = (central as any).windSpeed850 != null ? 15 + (central as any).temperature850 : null;
    const t500 = (central as any).windSpeed500 != null ? -15 - (central as any).temperature500 : null;
    const t2m = central.temperature ?? 15;
    const td2m = central.dewPoint ?? (t2m - 8);

    // Usa temperature reali se disponibili, altrimenti stime
    const temp850 = (central as any).temperature850 ?? (t2m - 8);
    const temp500 = (central as any).temperature500 ?? (t2m - 25);
    const dew850 = (central as any).dewPoint850 ?? (temp850 - 5);

    const k = temp850 - temp500 + dew850 - (t2m - td2m);
    return Math.round(k * 10) / 10;
  }, [dayData]);

  if (!dayData || dayData.length < 3) {
    return (
      <div className="text-center py-12 text-slate-400 text-base">
        <Sun className="w-10 h-10 mx-auto mb-3 text-slate-500" />
        Dati insufficienti per generare l'analisi per {site?.name || "questo decollo"}.
      </div>
    );
  }

  if (!report) {
    return (
      <div className="text-center py-12 text-slate-400 text-base">
        <Sun className="w-10 h-10 mx-auto mb-3 text-slate-500" />
        Impossibile generare il report meteorologico.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Intestazione decollo e data */}
      <div className="bg-slate-800/60 border border-purple-500/30 rounded-xl px-4 py-3 flex items-center gap-3">
        <MapPin className="w-5 h-5 text-purple-400 shrink-0" />
        <div>
          <div className="text-sm font-bold text-white">{site?.name || "Decollo"} — Analisi completa</div>
          <div className="text-[10px] text-slate-400 flex items-center gap-2">
            <Calendar className="w-3 h-3" />
            <span>{dataGiorno}</span>
            <span className="text-slate-600">·</span>
            <span>{site?.alt}m · Esposizione {site?.exposure || "N/D"}</span>
          </div>
        </div>
      </div>

      {/* K-Index Card */}
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl px-4 py-3 flex items-center gap-3">
        <Zap className="w-5 h-5 text-purple-400 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-white flex items-center gap-2">
            <span>K-Index</span>
            <span className="text-[10px] text-slate-500 font-normal">rischio temporali</span>
          </div>
          <div className="text-[10px] text-slate-400">
            {kIndex != null ? (
              kIndex >= 25
                ? <span className="text-rose-400 font-bold">Alto rischio temporali ⚡</span>
                : kIndex >= 20
                ? <span className="text-amber-400 font-bold">Attività convettiva possibile 🌩️</span>
                : kIndex >= 15
                ? <span className="text-sky-400 font-bold">Instabilità moderata 🌤️</span>
                : <span className="text-emerald-400 font-bold">Atmosfera stabile ✅</span>
            ) : (
              <span className="text-slate-500">Dati insufficienti</span>
            )}
          </div>
        </div>
        <div className="text-right shrink-0">
          {kIndex != null ? (
            <span className={`text-2xl font-black tabular-nums ${
              kIndex >= 25 ? "text-rose-400" :
              kIndex >= 20 ? "text-amber-400" :
              kIndex >= 15 ? "text-sky-400" : "text-emerald-400"
            }`}>
              {kIndex}
            </span>
          ) : (
            <span className="text-slate-600 text-xl">—</span>
          )}
        </div>
      </div>

      {/* REPORT METEOROLOGICO DETTAGLIATO */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border-2 border-emerald-500/40 rounded-3xl p-6 space-y-5 text-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-900/40 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-base sm:text-lg font-black text-white tracking-wide flex items-center gap-2">
                {report.titolo}
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Bollettino aerologico analitico &bull; Quota Decollo {site?.alt} m slm
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span
              className={`px-3 py-1 rounded-full text-xs font-black border ${
                report.score >= 7
                  ? "bg-emerald-950/60 text-emerald-300 border-emerald-500/50"
                  : report.score >= 5
                  ? "bg-amber-950/60 text-amber-300 border-amber-500/50"
                  : "bg-rose-950/60 text-rose-300 border-rose-500/50"
              }`}
            >
              Voto: {report.score}/10
            </span>

            <button
              onClick={() => navigator.clipboard.writeText(report.testoCompleto)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 transition-all border border-slate-700"
              title="Copia testo bollettino"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copia</span>
            </button>
          </div>
        </div>

        <div className="space-y-4 text-sm sm:text-base leading-relaxed">
          <div className="mb-3">
            <h4 className="text-amber-300 font-semibold mb-2 flex items-center gap-2">
              <Mountain className="w-4 h-4" />
              1. Quadro Termico & Stabilità
            </h4>
            <p>{report.paragrafoTermico}</p>
          </div>

          <div className="mb-3">
            <h4 className="text-cyan-300 font-semibold mb-2 flex items-center gap-2">
              <Wind className="w-4 h-4" />
              2. Profilo Vento in Quota
            </h4>
            <p>{report.paragrafoVento}</p>
          </div>

          <div className="mb-3">
            <h4 className="text-purple-300 font-semibold mb-2 flex items-center gap-2">
              <Cloud className="w-4 h-4" />
              3. Convezione Pomeridiana & Rischio
            </h4>
            <p>{report.paragrafoInstabilita}</p>
          </div>

          <div className="mb-3">
            <h4 className="text-emerald-300 font-semibold mb-2 flex items-center gap-2">
              <ArrowUpRight className="w-4 h-4" />
              4. Finestra di Decollo & Tattica
            </h4>
            <p>{report.paragrafoStrategia}</p>
          </div>

          <div className="border-t border-slate-800/80 pt-4 space-y-3">
            <div className="flex items-start gap-2 text-xs sm:text-sm bg-rose-950/30 border border-rose-500/30 rounded-xl p-3 text-rose-200">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-rose-300">Segnali di pericolo: </strong>
                {report.segnaliPericolo}
              </div>
            </div>

            <div className="flex items-start gap-2 text-xs sm:text-sm bg-emerald-950/30 border border-emerald-500/30 rounded-xl p-3 text-emerald-200">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-emerald-300">Giudizio finale: </strong>
                {report.giudizioFinale}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}