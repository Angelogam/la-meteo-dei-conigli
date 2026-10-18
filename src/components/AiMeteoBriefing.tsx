"use client";

import { useState } from "react";
import { Bot, CheckCircle2, LoaderCircle, RefreshCw, Sparkles, AlertCircle } from "lucide-react";
import type { HourData } from "@/types/meteo";

interface AiMeteoBriefingProps {
  dayData: HourData[];
  siteName: string;
  altitude: number;
}

type BriefingResponse = {
  ok?: boolean;
  briefing?: string;
  generatedAt?: string;
  disclaimer?: string;
  statusMessage?: string;
  message?: string;
};

function numberOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export default function AiMeteoBriefing({ dayData, siteName, altitude }: AiMeteoBriefingProps) {
  const [briefing, setBriefing] = useState<string | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [disclaimer, setDisclaimer] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    if (!dayData.length) {
      setError("Non ci sono dati orari sufficienti per generare il briefing.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const hours = dayData.slice(0, 24).map((item) => ({
        time: item.time instanceof Date
          ? item.time.toLocaleString("it-IT", { dateStyle: "medium", timeStyle: "short" })
          : String(item.time),
        temperatureC: numberOrNull(item.temperature),
        dewPointC: numberOrNull(item.dewPoint),
        windKmh: numberOrNull(item.windSpeed),
        gustsKmh: numberOrNull(item.windGusts),
        windDirectionDeg: numberOrNull(item.windDir),
        cloudCoverPct: numberOrNull(item.cloudCover),
        precipitationMm: numberOrNull(item.precipitation),
        precipitationProbabilityPct: numberOrNull(item.precipitationProba),
        capeJkg: numberOrNull(item.cape),
        cinJkg: numberOrNull(item.cin),
        radiationWm2: numberOrNull(item.radiation),
        boundaryLayerHeightM: numberOrNull(item.boundaryLayerHeight),
        wind80mKmh: numberOrNull(item.windSpeed80m),
        wind120mKmh: numberOrNull(item.windSpeed120m),
        wind925hPaKmh: numberOrNull(item.windSpeed925hPa ?? item.windSpeed925),
        wind850hPaKmh: numberOrNull(item.windSpeed850hPa ?? item.windSpeed850),
        wind700hPaKmh: numberOrNull(item.windSpeed700hPa ?? item.windSpeed700),
        wind600hPaKmh: numberOrNull(item.windSpeed600hPa ?? item.windSpeed600),
        wind500hPaKmh: numberOrNull(item.windSpeed500hPa ?? item.windSpeed500),
      }));
      const date = dayData[0].time instanceof Date
        ? dayData[0].time.toLocaleDateString("it-IT")
        : String(dayData[0].time);
      const response = await fetch("/api/ai-briefing", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ siteName, altitude, date, hours }),
      });
      const payload = (await response.json().catch(() => ({}))) as BriefingResponse;
      if (!response.ok || !payload.ok || !payload.briefing) {
        throw new Error(payload.statusMessage || payload.message || (
          response.status === 503
            ? "Assistente non configurato: aggiungi OPENROUTER_API_KEY nelle variabili d'ambiente di Vercel."
            : "Non è stato possibile generare il briefing. Riprova più tardi."
        ));
      }
      setBriefing(payload.briefing);
      setGeneratedAt(payload.generatedAt ?? null);
      setDisclaimer(payload.disclaimer ?? null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Errore durante la richiesta al servizio IA.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-[#c9c8be] bg-[#eeece4] text-slate-800 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#d4d2c8] bg-[#e5e4da] px-4 py-4 sm:px-5">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800">
            <Bot className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-800">Assistente IA · gratuito</p>
            <h3 className="mt-1 text-lg font-bold tracking-tight sm:text-xl">Briefing meteo intelligente</h3>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">Una lettura in italiano di vento, raffiche, nuvolosità e indizi convettivi basata sui dati orari caricati.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={generate}
          disabled={loading || !dayData.length}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#426b58] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#355746] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : briefing ? <RefreshCw className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
          {loading ? "Sto analizzando…" : briefing ? "Aggiorna briefing" : "Genera briefing"}
        </button>
      </div>

      <div className="p-4 sm:p-5">
        {!briefing && !error && (
          <p className="text-sm text-slate-600">Premi “Genera briefing” per chiedere al modello gratuito di commentare le previsioni selezionate. La richiesta non parte automaticamente.</p>
        )}
        {error && (
          <div role="alert" className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-3 text-sm text-rose-800">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {briefing && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800">
              <CheckCircle2 className="h-4 w-4" />
              Briefing generato dal modello
              {generatedAt && <span className="font-normal text-slate-500">· {new Date(generatedAt).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}</span>}
            </div>
            <div className="whitespace-pre-wrap text-sm leading-7 text-slate-700">{briefing}</div>
            {disclaimer && <p className="border-t border-[#d4d2c8] pt-3 text-xs leading-5 text-slate-500">{disclaimer}</p>}
          </div>
        )}
        <p className="mt-3 text-[11px] text-slate-500">Il modello interpreta le previsioni, non osserva il cielo in tempo reale e non può dichiarare il volo sicuro.</p>
      </div>
    </section>
  );
}
