"use client";

import React, { useState } from "react";
import { DECOLLI } from "@/data/decolli";
import { weatherService } from "@/services/weatherService";
import { validaVentoPerDecollo, getVentoStatusColor } from "@/utils/validaVentoDecollo";
import {
  Play,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  Server,
  Wind,
} from "lucide-react";

interface RisultatoTestVento {
  nome: string;
  esposizione: string;
  ok: boolean;
  windSpeed: number;
  windDir: number;
  valutazione: string;
  color: string;
}

export default function MeteoQuickTest() {
  const [running, setRunning] = useState(false);
  const [risultatiVento, setRisultatiVento] = useState<RisultatoTestVento[]>([]);
  const [progress, setProgress] = useState(0);
  const [summary, setSummary] = useState<string | null>(null);

  const runTest = async () => {
    setRunning(true);
    setRisultatiVento([]);
    setSummary(null);

    const siti = DECOLLI;
    let okCount = 0;
    let sottoventoCount = 0;
    const risultati: RisultatoTestVento[] = [];

    for (let i = 0; i < siti.length; i++) {
      const d = siti[i];
      try {
        const { data } = await weatherService.fetchCurrent(d.lat, d.lon);
        if (data) {
          const valutazione = valutaVentoPerDecollo(data.windDir, d.exposure);
          const colorClass = getVentoStatusColor(valutazione.status);
          const isOk = valutazione.status === "favorevole" || valutazione.status === "laterale";

          if (isOk) okCount++;
          if (valutazione.status === "sottovento") sottoventoCount++;

          risultati.push({
            nome: d.name,
            esposizione: d.exposure,
            ok: isOk,
            windSpeed: data.windSpeed,
            windDir: data.windDir,
            valutazione: `${valutazione.label} — ${valutazione.descrizione}`,
            color: colorClass,
          });
        }
      } catch {
        risultati.push({
          nome: d.name,
          esposizione: d.exposure,
          ok: false,
          windSpeed: 0,
          windDir: 0,
          valutazione: "Errore nel recupero dati",
          color: "text-slate-400",
        });
      }

      setRisultatiVento([...risultati]);
      setProgress(Math.round(((i + 1) / siti.length) * 100));

      if (i < siti.length - 1) {
        await new Promise(r => setTimeout(r, 1500));
      }
    }

    setSummary(
      `✅ ${okCount}/${siti.length} decolli con vento favorevole o laterale · 🚫 ${sottoventoCount} sottovento · ${siti.length - okCount - sottoventoCount} contrari`
    );
    setRunning(false);
  };

  return (
    <div className="space-y-2">
      <button
        onClick={runTest}
        disabled={running}
        className="w-full flex items-center gap-2.5 px-4 py-3 rounded-xl bg-sky-800/50 hover:bg-sky-700/60 border border-sky-500/40 text-left transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Wind className="w-5 h-5 text-sky-400 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-white">Test vento + esposizione</div>
          <div className="text-[10px] text-sky-300/70">Controlla se il vento è giusto per ogni decollo</div>
        </div>
        {running && (
          <div className="flex items-center gap-1">
            <Loader2 className="w-4 h-4 text-sky-400 animate-spin shrink-0" />
            <span className="text-xs text-sky-300">{progress}%</span>
          </div>
        )}
        {!running && risultatiVento.length === 0 && <Play className="w-5 h-5 text-sky-400 shrink-0" />}
      </button>

      {running && (
        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div className="h-full bg-sky-500 transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
      )}

      {summary && (
        <div className="bg-sky-900/20 border border-sky-500/30 rounded-xl p-3 text-xs">
          <div className="text-sky-300 font-bold mb-1">{summary}</div>
          <div className="space-y-1 mt-2 max-h-48 overflow-y-auto">
            {risultatiVento.map((r, i) => (
              <div key={i} className={`flex items-center gap-2 text-slate-400 rounded-lg px-2 py-1 border ${r.color}`}>
                {r.ok ? <CheckCircle className="w-3 h-3 text-emerald-400 shrink-0" /> : <XCircle className="w-3 h-3 text-red-400 shrink-0" />}
                <span className="truncate flex-1 font-bold">{r.nome}</span>
                <span className="text-slate-500">Esp. {r.esposizione}</span>
                <span className="text-slate-400">→ {Math.round(r.windDir)}°</span>
                <span className="text-sky-300">{Math.round(r.windSpeed)} km/h</span>
                <span className="text-xs">{r.valutazione.split("—")[0]}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}