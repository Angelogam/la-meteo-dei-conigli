"use client";

import React, { useState } from "react";
import { DECOLLI } from "@/data/decolli";
import { weatherService } from "@/services/openMeteoService";
import { validaVentoPerDecollo, getVentoStatusColor } from "@/utils/validaVentoDecollo";
import {
  Play,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  Wind,
  X,
  Search,
} from "lucide-react";

interface RisultatoTestVento {
  nome: string;
  esposizione: string;
  altitudine: number;
  ok: boolean;
  windSpeed: number;
  windDir: number;
  dirLabel: string;
  valutazione: string;
  label: string;
  icon: string;
  color: string;
  status: string;
  ora: number;
}

function getDirName(deg: number): string {
  if (deg == null) return "N/D";
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return dirs[Math.round(((deg % 360) + 360) % 360 / 22.5) % 16];
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
    let contrarioCount = 0;
    let lateraleCount = 0;
    const risultati: RisultatoTestVento[] = [];

    for (let i = 0; i < siti.length; i++) {
      const d = siti[i];
      try {
        const result = await weatherService.fetchCurrent(d.lat, d.lon);
        if (result.ok && result.data) {
          const current = result.data;
          const valutazione = validaVentoPerDecollo(current.windDir, d.exposure);
          const colorClass = getVentoStatusColor(valutazione.status);
          const isOk = valutazione.status === "favorevole" || valutazione.status === "laterale";

          if (isOk) okCount++;
          if (valutazione.status === "sottovento") sottoventoCount++;
          if (valutazione.status === "contrario") contrarioCount++;
          if (valutazione.status === "laterale") lateraleCount++;

          risultati.push({
            nome: d.name,
            esposizione: d.exposure,
            altitudine: d.altitude,
            ok: isOk,
            windSpeed: Math.round(current.windSpeed),
            windDir: Math.round(current.windDir),
            dirLabel: getDirName(current.windDir),
            valutazione: `${valutazione.label} — ${valutazione.descrizione}`,
            label: valutazione.label,
            icon: valutazione.icon,
            color: colorClass,
            status: valutazione.status,
            ora: new Date().getHours(),
          });
        }
      } catch {
        risultati.push({
          nome: d.name,
          esposizione: d.exposure,
          altitudine: d.altitude,
          ok: false,
          windSpeed: 0,
          windDir: 0,
          dirLabel: "N/D",
          valutazione: "Errore nel recupero dati",
          label: "Errore",
          icon: "❓",
          color: "text-slate-400 bg-slate-800/20 border-slate-500/30",
          status: "errore",
          ora: 0,
        });
      }

      setRisultatiVento([...risultati]);
      setProgress(Math.round(((i + 1) / siti.length) * 100));

      if (i < siti.length - 1) {
        await new Promise(r => setTimeout(r, 1500));
      }
    }

    setSummary(
      `✅ ${okCount} sopravv./later. · 🚫 ${sottoventoCount} sottovento · ❌ ${contrarioCount} contrari · ⚠️ ${lateraleCount} laterali · Totale ${siti.length} decolli`
    );
    setRunning(false);
  };

  const resetTest = () => {
    setRisultatiVento([]);
    setSummary(null);
    setProgress(0);
  };

  return (
    <div className="space-y-2">
      <button
        onClick={runTest}
        disabled={running}
        className="w-full flex items-center gap-2.5 px-4 py-3 rounded-xl bg-sky-800/50 hover:bg-sky-700/60 border border-sky-500/40 text-left transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Search className="w-5 h-5 text-sky-400 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-white">Controllo vento TUTTI i decolli</div>
          <div className="text-[10px] text-sky-300/70">Cliccare su Controllo vento TUTTI i decolli per aggiornare le previsioni</div>
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
        <div className="bg-sky-900/20 border border-sky-500/30 rounded-xl p-3 relative">
          <button
            onClick={resetTest}
            className="absolute top-2 right-2 p-1 rounded-lg hover:bg-sky-800/50 border border-sky-500/30 text-sky-400"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="text-sky-300 text-sm font-bold mb-2 pr-8">{summary}</div>

          {(() => {
            const sottovento = risultatiVento.filter(r => r.status === "sottovento");
            const contrari = risultatiVento.filter(r => r.status === "contrario");
            const laterali = risultatiVento.filter(r => r.status === "laterale");
            const favorevoli = risultatiVento.filter(r => r.status === "favorevole");

            return (
              <div className="space-y-2">
                {sottovento.length > 0 && (
                  <details>
                    <summary className="text-xs text-red-300 font-bold cursor-pointer hover:text-red-200">
                      🚫 SOTTOVENTO ({sottovento.length})
                    </summary>
                    <div className="mt-1 space-y-1">
                      {sottovento.map((r, i) => (
                        <div key={i} className="flex items-center gap-2 text-[11px] bg-red-900/20 border border-red-800/40 rounded-lg px-2.5 py-1.5">
                          <AlertTriangle className="w-3 h-3 text-red-400 shrink-0" />
                          <span className="font-bold text-white w-40 truncate">{r.nome}</span>
                          <span className="text-slate-400">{r.esposizione}</span>
                          <span className="text-red-300">{r.windSpeed} km/h da {r.dirLabel} ({r.windDir}°)</span>
                        </div>
                      ))}
                    </div>
                  </details>
                )}

                {contrari.length > 0 && (
                  <details>
                    <summary className="text-xs text-orange-300 font-bold cursor-pointer hover:text-orange-200">
                      ❌ CONTRARI ({contrari.length})
                    </summary>
                    <div className="mt-1 space-y-1">
                      {contrari.map((r, i) => (
                        <div key={i} className="flex items-center gap-2 text-[11px] bg-orange-900/20 border border-orange-800/40 rounded-lg px-2.5 py-1.5">
                          <XCircle className="w-3 h-3 text-orange-400 shrink-0" />
                          <span className="font-bold text-white w-40 truncate">{r.nome}</span>
                          <span className="text-slate-400">{r.esposizione}</span>
                          <span className="text-orange-300">{r.windSpeed} km/h da {r.dirLabel} ({r.windDir}°)</span>
                        </div>
                      ))}
                    </div>
                  </details>
                )}

                {laterali.length > 0 && (
                  <details>
                    <summary className="text-xs text-amber-300 font-bold cursor-pointer hover:text-amber-200">
                      ⚠️ LATERALI ({laterali.length})
                    </summary>
                    <div className="mt-1 space-y-1">
                      {laterali.map((r, i) => (
                        <div key={i} className="flex items-center gap-2 text-[11px] bg-amber-900/20 border border-amber-800/40 rounded-lg px-2.5 py-1.5">
                          <Wind className="w-3 h-3 text-amber-400 shrink-0" />
                          <span className="font-bold text-white w-40 truncate">{r.nome}</span>
                          <span className="text-slate-400">{r.esposizione}</span>
                          <span className="text-amber-300">{r.windSpeed} km/h da {r.dirLabel} ({r.windDir}°)</span>
                        </div>
                      ))}
                    </div>
                  </details>
                )}

                {favorevoli.length > 0 && (
                  <details>
                    <summary className="text-xs text-emerald-300 font-bold cursor-pointer hover:text-emerald-200">
                      ✅ SOPRAVV. ({favorevoli.length})
                    </summary>
                    <div className="mt-1 space-y-1">
                      {favorevoli.map((r, i) => (
                        <div key={i} className="flex items-center gap-2 text-[11px] bg-emerald-900/20 border border-emerald-800/40 rounded-lg px-2.5 py-1.5">
                          <CheckCircle className="w-3 h-3 text-emerald-400 shrink-0" />
                          <span className="font-bold text-white w-40 truncate">{r.nome}</span>
                          <span className="text-slate-400">{r.esposizione}</span>
                          <span className="text-emerald-300">{r.windSpeed} km/h da {r.dirLabel} ({r.windDir}°)</span>
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}