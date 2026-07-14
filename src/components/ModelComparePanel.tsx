"use client";

import React, { useState, useCallback } from "react";
import { multiModelService, type MultiModelResult } from "@/services/multiModelService";
import { DECOLLI } from "@/data/decolli";
import { Layers, Loader2, CheckCircle, XCircle, TrendingUp, Wind, AlertTriangle, ArrowUp } from "lucide-react";

export default function ModelComparePanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MultiModelResult | null>(null);
  const [selectedSiteId, setSelectedSiteId] = useState(DECOLLI[0]?.id || "");
  const [compareMode, setCompareMode] = useState<"single" | "all">("single");

  const runComparison = useCallback(async () => {
    setLoading(true);
    setResult(null);
    try {
      const site = DECOLLI.find(d => d.id === selectedSiteId) || DECOLLI[0];
      const r = await multiModelService.fetchAllModels(site.lat, site.lon);
      setResult(r);
    } catch (err) {
      console.error("Model compare error:", err);
    }
    setLoading(false);
  }, [selectedSiteId]);

  const runAllSites = useCallback(async () => {
    setLoading(true);
    setResult(null);
    setCompareMode("all");

    const sites = DECOLLI.slice(0, 5);
    for (const site of sites) {
      try {
        const r = await multiModelService.fetchAllModels(site.lat, site.lon);
        setResult(r);
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (err) {
        console.error(`Error for ${site.id}:`, err);
      }
    }
    setCompareMode("single");
    setLoading(false);
  }, []);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 left-[5.5rem] z-50 bg-slate-800 hover:bg-slate-700 text-indigo-400 border border-indigo-500/30 rounded-full p-3 shadow-2xl shadow-indigo-500/10"
        title="Confronta modelli WRF"
      >
        <Layers className="w-5 h-5" />
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950/98 flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50 bg-slate-900/80">
        <div className="flex items-center gap-3">
          <Layers className="w-5 h-5 text-indigo-400" />
          <span className="text-sm font-bold text-white">WRF Multi-Model</span>
          {result && (
            <span className="text-xs text-slate-400">
              {result.allModels.filter(m => m.ok).length}/{result.allModels.length} modelli attivi
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedSiteId}
            onChange={e => setSelectedSiteId(e.target.value)}
            className="text-xs bg-slate-800 border border-slate-600/50 rounded px-2 py-1 text-slate-300"
          >
            {DECOLLI.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
          <button
            onClick={runComparison}
            disabled={loading}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-900/50 hover:bg-indigo-800/50 text-xs text-indigo-300 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
            Confronta modelli
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="text-slate-400 hover:text-white px-2 py-1 rounded"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4">
        {loading && (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="w-10 h-10 animate-spin text-indigo-400 mb-4" />
            <p className="text-sm text-slate-500">Caricamento modelli WRF...</p>
          </div>
        )}

        {result && (
          <>
            {/* Stato modelli */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
              {result.allModels.map(m => (
                <div key={m.model} className={`p-3 rounded-xl border text-center ${
                  m.ok
                    ? "bg-emerald-900/20 border-emerald-700/30"
                    : "bg-red-900/20 border-red-800/30"
                }`}>
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    {m.ok ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <XCircle className="w-4 h-4 text-red-400" />}
                    <span className="text-sm font-bold text-white capitalize">{m.model.replace("_", " ")}</span>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {m.ok ? `${m.responseTime}ms` : `ERR ${m.status}`}
                  </div>
                </div>
              ))}
            </div>

            {/* CAPE Comparison */}
            <div className="bg-slate-800/50 border border-slate-700/30 rounded-xl p-4">
              <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-orange-400" />
                CAPE e Stabilità (da: <span className="text-emerald-400">{result.merged.capeModel}</span>)
              </h3>
              {result.merged.cape.length > 0 ? (
                <div className="overflow-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-slate-400 border-b border-slate-700/30">
                        <th className="text-left py-1">Ora</th>
                        <th className="text-right py-1">CAPE (J/kg)</th>
                        <th className="text-right py-1">LI (°C)</th>
                        <th className="text-right py-1">CIN (J/kg)</th>
                        <th className="text-right py-1">Stabilità</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.merged.cape.slice(0, 16).map((v, i) => {
                        const li = result.merged.liftedIndex[i];
                        const cin = result.merged.cin[i];
                        const stabilità = li < -5 ? "🟡 Instabile" : li < 0 ? "🟢 Leggero" : "🔵 Stabile";
                        return (
                          <tr key={i} className="border-b border-slate-800/30 hover:bg-slate-800/30">
                            <td className="py-1 text-slate-300">h {String(i).padStart(2, "0")}:00</td>
                            <td className={`text-right py-1 font-mono ${v > 1000 ? "text-red-400" : v > 500 ? "text-amber-400" : "text-slate-300"}`}>{Math.round(v)}</td>
                            <td className="text-right py-1 font-mono text-slate-300">{li != null ? li.toFixed(1) : "--"}</td>
                            <td className="text-right py-1 font-mono text-slate-300">{cin != null ? Math.round(cin) : "--"}</td>
                            <td className="text-right py-1">{stabilità}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-slate-500">Nessun dato CAPE disponibile dai modelli</p>
              )}
            </div>

            {/* Wind Profile Comparison */}
            <div className="bg-slate-800/50 border border-slate-700/30 rounded-xl p-4">
              <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <Wind className="w-4 h-4 text-sky-400" />
                Profilo vento in quota (merge multi-modello)
              </h3>
              {result.merged.windProfile.length > 0 ? (
                <div className="overflow-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-slate-400 border-b border-slate-700/30">
                        <th className="text-left py-1">Quota</th>
                        <th className="text-right py-1">Velocità (km/h)</th>
                        <th className="text-right py-1">Direzione (°)</th>
                        <th className="text-right py-1">Modello</th>
                        <th className="text-left py-1">Intensità</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.merged.windProfile.map((wp, i) => {
                        const intensità = wp.speed < 10 ? "Debole" : wp.speed < 20 ? "Moderato" : wp.speed < 30 ? "Sostenuto" : "Forte";
                        const intensitàColor = wp.speed < 10 ? "text-blue-400" : wp.speed < 20 ? "text-amber-400" : wp.speed < 30 ? "text-orange-400" : "text-red-400";
                        return (
                          <tr key={i} className="border-b border-slate-800/30 hover:bg-slate-800/30">
                            <td className="py-1 font-bold text-white">{wp.alt}m</td>
                            <td className="text-right py-1 font-mono text-sky-300">{Math.round(wp.speed)}</td>
                            <td className="text-right py-1 font-mono text-slate-300">{Math.round(wp.dir)}°</td>
                            <td className="text-right py-1 text-slate-400 capitalize">{wp.model.replace("_", " ")}</td>
                            <td className={`py-1 pl-2 ${intensitàColor}`}>{intensità}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-slate-500">Nessun profilo vento disponibile</p>
              )}
            </div>

            {/* Confronto per modello individuale */}
            <div className="bg-slate-800/50 border border-slate-700/30 rounded-xl p-4">
              <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-400" />
                Performance per modello
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {result.allModels.filter(m => m.ok).map(m => {
                  // Dati da ogni modello
                  const data = (result as any)[m.model];
                  const hourlyLen = data?.hourly?.time?.length || 0;
                  const hasCape = data?.hourly?.cape?.length > 0;
                  const hasLi = data?.hourly?.lifted_index?.length > 0;
                  const hasCin = data?.hourly?.convective_inhibition?.length > 0;
                  const windAloft = data?.hourly?.["wind_speed_2000m"]?.length > 0;

                  return (
                    <div key={m.model} className="bg-slate-800/40 rounded-lg p-3 border border-slate-700/20">
                      <div className="text-sm font-bold text-white capitalize mb-2">{m.model.replace("_", " ")}</div>
                      <div className="grid grid-cols-2 gap-2 text-[10px]">
                        <div className={`${hasCape ? "text-green-400" : "text-red-400"}`}>
                          {hasCape ? "✓" : "✗"} CAPE
                        </div>
                        <div className={`${hasLi ? "text-green-400" : "text-red-400"}`}>
                          {hasLi ? "✓" : "✗"} LI
                        </div>
                        <div className={`${hasCin ? "text-green-400" : "text-red-400"}`}>
                          {hasCin ? "✓" : "✗"} CIN
                        </div>
                        <div className={`${windAloft ? "text-green-400" : "text-red-400"}`}>
                          {windAloft ? "✓" : "✗"} Vento 2000m
                        </div>
                        <div className="text-slate-400">{hourlyLen} ore</div>
                        <div className="text-slate-400">{m.responseTime}ms</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ICON-D2 specific info */}
            <div className="bg-blue-900/20 border border-blue-700/30 rounded-xl p-4">
              <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                <ArrowUp className="w-4 h-4 text-blue-400" />
                ICON-D2 — Il migliore per il volo in Europa
              </h3>
              <div className="text-xs text-slate-300 leading-relaxed">
                <p className="mb-2">
                  <strong>ICON-D2</strong> (DWD, 2.2km risoluzione) è il modello meteorologico 
                  <strong> più adatto per il volo libero in Europa</strong>. 
                  Aggiornato ogni 3 ore (00, 03, 06, 09, 12, 15, 18, 21 UTC).
                </p>
                <ul className="space-y-1 list-disc list-inside">
                  <li>Risoluzione <strong>2.2 km</strong> — cattura le termiche locali</li>
                  <li>Copre <strong>tutta l'Italia</strong> e l'Europa centrale</li>
                  <li>Include <strong>CAPE, Lifted Index, CIN</strong> per stabilità atmosferica</li>
                  <li>Profilo vento <strong>fino a 3000m</strong> con gradiente reale</li>
                  <li><strong>Gratuito</strong> via Open-Meteo</li>
                </ul>
                {result.iconD2 && (
                  <div className="mt-3 text-emerald-400">
                    ✅ ICON-D2 attivo per {DECOLLI.find(d => d.id === selectedSiteId)?.name}
                  </div>
                )}
                {!result.iconD2 && (
                  <div className="mt-3 text-amber-400">
                    ⚠️ ICON-D2 non disponibile per questo sito (potrebbe essere fuori dall'area di copertura Europa centrale)
                  </div>
                )}
              </div>
            </div>

            {/* Consigli */}
            <div className="bg-emerald-900/20 border border-emerald-700/30 rounded-xl p-4">
              <h3 className="text-sm font-bold text-white mb-2">💡 Raccomandazione</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Il sistema <strong>multi-modello</strong> unisce automaticamente:
              </p>
              <ul className="text-xs text-slate-300 mt-2 space-y-1">
                <li>• <strong>ICON-D2</strong> (2.2km) per CAPE, termiche, stabilità e vento fino a 3000m</li>
                <li>• <strong>ICON</strong> (6.5km) come fallback quando ICON-D2 non copre</li>
                <li>• <strong>GFS</strong> (13km) per venti in alta quota oltre 3000m</li>
                <li>• <strong>ECMWF IFS</strong> (4km) per validazione incrociata</li>
              </ul>
              <p className="text-xs text-slate-400 mt-2">
                Rispetto a SoaringWRF (sito privato senza API), ora abbiamo dati WRF reali 
                da <strong>3 modelli gratuiti</strong> con API pubbliche.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
