import { useState } from "react";
import { BrainCircuit, LoaderCircle, Sparkles, AlertTriangle } from "lucide-react";
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
    <section className="rounded-2xl border border-violet-300/60 bg-white p-4 text-slate-800 shadow-sm sm:p-5" aria-labelledby="ai-flight-briefing-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
            <BrainCircuit size={22} aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-violet-700">Assistente meteo AI</p>
            <h2 id="ai-flight-briefing-title" className="mt-1 text-lg font-bold text-slate-900">Briefing per il volo</h2>
            <p className="mt-1 text-sm text-slate-600">{siteName} · {dateLabel} · quota decollo {altitude} m</p>
          </div>
        </div>
        <button type="button" onClick={generateBriefing} disabled={loading || dayData.length === 0}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-violet-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-60">
          {loading ? <LoaderCircle size={16} className="animate-spin" /> : <Sparkles size={16} />}
          {loading ? "Analisi in corso…" : briefing ? "Rigenera briefing" : "Analizza le previsioni"}
        </button>
      </div>

      {dayData.length === 0 && <p className="mt-4 text-sm text-slate-600">Attendo i dati meteo del giorno selezionato.</p>}
      {error && <div role="alert" className="mt-4 flex gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"><AlertTriangle size={18} className="shrink-0" />{error}</div>}
      {briefing && <div className="mt-4 whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-800">{briefing}</div>}
      <p className="mt-4 text-xs leading-5 text-slate-500">L'AI interpreta le previsioni disponibili; può commettere errori. Non certifica la sicurezza del volo: verifica sempre bollettini, condizioni locali e valutazione del pilota.</p>
    </section>
  );
}
