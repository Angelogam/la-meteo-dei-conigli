import { useState } from "react";
import { BrainCircuit, LoaderCircle, Sparkles, AlertTriangle, Mountain, CalendarDays, Wind, ShieldCheck } from "lucide-react";
import type { HourData } from "@/types/meteo";

interface AiFlightBriefingProps {
  siteName: string;
  altitude: number;
  dateLabel: string;
  dayData: HourData[];
}

type BriefingResponse = { briefing?: string; error?: string };

function numberOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export default function AiFlightBriefing({ siteName, altitude, dateLabel, dayData }: AiFlightBriefingProps) {
  const [briefing, setBriefing] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function generateBriefing() {
    setLoading(true);
    setError("");
    setBriefing("");
    try {
      const hours = dayData.slice(0, 24).map((hour) => ({
        time: hour.time instanceof Date ? hour.time.toISOString() : String(hour.time),
        temperatureC: numberOrNull(hour.temperature),
        dewPointC: numberOrNull(hour.dewPoint),
        windKmh: numberOrNull(hour.windSpeed),
        gustsKmh: numberOrNull(hour.windGusts),
        windDirectionDeg: numberOrNull(hour.windDir),
        cloudCoverPercent: numberOrNull(hour.cloudCover),
        precipitationMm: numberOrNull(hour.precipitation),
        precipitationProbabilityPercent: numberOrNull(hour.precipitationProba),
        capeJkg: numberOrNull(hour.cape),
        boundaryLayerHeightM: numberOrNull(hour.boundaryLayerHeight),
        visibilityM: numberOrNull(hour.visibility),
      }));

      const response = await fetch("/api/ai-briefing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteName, altitude, dateLabel, hours }),
      });
      const result = (await response.json()) as BriefingResponse;
      if (!response.ok) throw new Error(result.error || "Il servizio AI non è disponibile.");
      if (!result.briefing) throw new Error("L'AI non ha restituito un briefing leggibile.");
      setBriefing(result.briefing);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Errore durante la richiesta al servizio AI.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="ai-briefing-panel relative isolate overflow-hidden rounded-3xl border border-indigo-200/70 bg-gradient-to-br from-white via-white to-indigo-50/80 p-4 text-slate-800 shadow-[0_16px_45px_rgba(30,41,59,0.10)] sm:p-6" aria-labelledby="ai-flight-briefing-title">
      <div aria-hidden="true" className="pointer-events-none absolute -right-14 -top-20 -z-10 h-56 w-56 rounded-full bg-violet-200/40 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-24 left-1/3 -z-10 h-48 w-48 rounded-full bg-sky-200/30 blur-3xl" />

      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3 sm:gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-700 text-white shadow-lg shadow-indigo-900/20 sm:h-14 sm:w-14">
            <BrainCircuit size={26} aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-white/80 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.16em] text-indigo-700">
              <Sparkles size={12} aria-hidden="true" /> Assistente meteo AI
            </div>
            <h2 id="ai-flight-briefing-title" className="mt-2 text-xl font-extrabold tracking-tight text-slate-950 sm:text-2xl">Briefing per il volo</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">Una lettura ragionata delle previsioni orarie per preparare la tua valutazione meteo.</p>
          </div>
        </div>
        <button type="button" onClick={generateBriefing} disabled={loading || dayData.length === 0}
          className="inline-flex min-h-12 w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-700 to-violet-700 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-900/20 transition duration-200 hover:-translate-y-0.5 hover:from-indigo-800 hover:to-violet-800 hover:shadow-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-300 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-55 disabled:shadow-none sm:w-auto">
          {loading ? <LoaderCircle size={17} className="animate-spin" /> : <Sparkles size={17} />}
          {loading ? "Analisi in corso…" : briefing ? "Rigenera briefing" : "Analizza le previsioni"}
        </button>
      </div>

      <div className="relative mt-5 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <div className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-200/80 bg-white/80 px-3 py-3">
          <Mountain size={17} className="shrink-0 text-indigo-600" aria-hidden="true" />
          <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Decollo</p><p className="truncate text-sm font-semibold text-slate-800">{siteName}</p></div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-slate-200/80 bg-white/80 px-3 py-3">
          <CalendarDays size={17} className="shrink-0 text-indigo-600" aria-hidden="true" />
          <div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Giornata</p><p className="text-sm font-semibold text-slate-800">{dateLabel}</p></div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-slate-200/80 bg-white/80 px-3 py-3">
          <Wind size={17} className="shrink-0 text-indigo-600" aria-hidden="true" />
          <div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Quota decollo</p><p className="text-sm font-semibold text-slate-800">{altitude.toLocaleString("it-IT")} m s.l.m.</p></div>
        </div>
      </div>

      {dayData.length === 0 && <p className="mt-4 rounded-xl border border-slate-200 bg-white/80 p-3 text-sm text-slate-600">Attendo i dati meteo del giorno selezionato.</p>}
      {error && <div role="alert" className="mt-4 flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm leading-6 text-amber-950"><AlertTriangle size={18} className="mt-0.5 shrink-0" /><span>{error}</span></div>}
      {loading && <div className="mt-4 flex items-center gap-3 rounded-xl border border-indigo-100 bg-white/80 p-4 text-sm text-slate-600"><LoaderCircle size={18} className="animate-spin text-indigo-600" /><span>Sto leggendo vento, raffiche, nuvolosità e gli altri dati disponibili…</span></div>}
      {briefing && <div className="mt-4 whitespace-pre-wrap rounded-2xl border border-indigo-100 bg-white/90 p-4 text-sm leading-7 text-slate-800 shadow-inner sm:p-5">{briefing}</div>}

      <div className="relative mt-5 flex items-start gap-2 border-t border-slate-200/80 pt-4 text-xs leading-5 text-slate-500">
        <ShieldCheck size={16} className="mt-0.5 shrink-0 text-slate-400" aria-hidden="true" />
        <p>L'AI può commettere errori e interpreta soltanto i dati disponibili. Non certifica la sicurezza del volo: verifica sempre bollettini ufficiali, condizioni locali e valutazione del pilota.</p>
      </div>
    </section>
  );
}
