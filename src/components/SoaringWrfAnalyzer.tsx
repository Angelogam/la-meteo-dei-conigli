"use client";

import React, { useState, useCallback } from "react";
import { sniffSoaringWrf, parseHtmlForDataSources, WRF_ALTERNATIVES, type SoaringWrfAnalysis } from "@/utils/soaringWrfSniffer";
import { Globe, ExternalLink, MapPin, CheckCircle, XCircle, AlertTriangle, Loader2 } from "lucide-react";

export default function SoaringWrfAnalyzer() {
  const [isOpen, setIsOpen] = useState(false);
  const [analysis, setAnalysis] = useState<SoaringWrfAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [htmlParsed, setHtmlParsed] = useState<ReturnType<typeof parseHtmlForDataSources> | null>(null);

  const runAnalysis = useCallback(async () => {
    setLoading(true);
    setAnalysis(null);
    setHtmlParsed(null);
    try {
      const result = await sniffSoaringWrf();
      setAnalysis(result);
      if (result.htmlContent) {
        setHtmlParsed(parseHtmlForDataSources(result.htmlContent));
      }
    } catch (err) {
      console.error("SoaringWRF sniff error:", err);
    }
    setLoading(false);
  }, []);

  if (!isOpen) {
    return (
      <button
        onClick={() => { setIsOpen(true); runAnalysis(); }}
        className="fixed bottom-4 left-4 z-50 bg-slate-800 hover:bg-slate-700 text-sky-400 border border-sky-500/30 rounded-full p-3 shadow-2xl shadow-sky-500/10"
        title="Analizza SoaringWRF"
      >
        <Globe className="w-5 h-5" />
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950/98 flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50 bg-slate-900/80">
        <div className="flex items-center gap-3">
          <Globe className="w-5 h-5 text-sky-400" />
          <span className="text-sm font-bold text-white">SoaringWRF Analyzer</span>
          {analysis && (
            <span className={`text-xs ${analysis.hasApi ? "text-green-400" : "text-amber-400"}`}>
              {analysis.hasApi ? "API trovata" : "Nessuna API"}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={runAnalysis}
            disabled={loading}
            className="text-xs text-sky-400 hover:text-sky-300 px-2 py-1 rounded disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Rianalizza"}
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
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <Loader2 className="w-10 h-10 animate-spin mb-4" />
            <p className="text-sm text-slate-500">Sondaggio endpoint SoaringWRF...</p>
          </div>
        )}

        {analysis && (
          <>
            {/* Assessment */}
            <div className={`p-4 rounded-xl border ${
              analysis.hasApi
                ? "bg-emerald-900/20 border-emerald-700/30"
                : "bg-amber-900/20 border-amber-700/30"
            }`}>
              <div className="flex items-start gap-3">
                {analysis.hasApi ? (
                  <CheckCircle className="w-8 h-8 text-emerald-400 flex-shrink-0 mt-1" />
                ) : (
                  <AlertTriangle className="w-8 h-8 text-amber-400 flex-shrink-0 mt-1" />
                )}
                <div>
                  <h3 className="text-lg font-bold text-white mb-1">
                    {analysis.hasApi ? "✅ API JSON Trovata!" : "⚠️ Nessuna API JSON Pubblica"}
                  </h3>
                  <p className="text-sm text-slate-300">{analysis.assessment}</p>
                  <p className="text-xs text-slate-500 mt-2">{analysis.summary}</p>
                </div>
              </div>
            </div>

            {/* Endpoint Grid */}
            <div>
              <h4 className="text-sm font-bold text-white mb-2">Endpoint sondati ({analysis.endpoints.length})</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {analysis.endpoints.map((ep, i) => (
                  <div key={i} className={`p-2 rounded-lg text-xs border ${
                    ep.status === 200 ? "bg-slate-800/50 border-slate-700/30" :
                    ep.status === 404 ? "bg-red-900/10 border-red-900/30" :
                    ep.status === 0 ? "bg-slate-800/20 border-slate-700/20" :
                    "bg-amber-900/10 border-amber-900/30"
                  }`}>
                    <div className="flex items-center gap-1.5 mb-0.5">
                      {ep.status === 200 ? <CheckCircle className="w-3 h-3 text-green-400" /> :
                       ep.status === 404 ? <XCircle className="w-3 h-3 text-red-400" /> :
                       <AlertTriangle className="w-3 h-3 text-amber-400" />}
                      <span className="text-white font-mono truncate max-w-[180px]">{ep.url.slice(23)}</span>
                    </div>
                    <div className="text-[10px] text-slate-500">
                      HTTP {ep.status} · {ep.type} · {ep.length > 0 ? `${(ep.length / 1024).toFixed(1)}KB` : "0KB"}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* HTML Analysis */}
            {htmlParsed && (
              <>
                <div className="border-t border-slate-700/30 pt-4">
                  <h4 className="text-sm font-bold text-white mb-2">Dati estratti dalla pagina HTML</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-800/50 rounded-lg p-3">
                      <div className="text-xs text-slate-400 uppercase mb-1">Script esterni</div>
                      {htmlParsed.scripts.length > 0 ? (
                        <ul className="space-y-1">
                          {htmlParsed.scripts.map((s, i) => (
                            <li key={i} className="text-xs text-slate-400 truncate">{s}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-slate-600">Nessuno trovato</p>
                      )}
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-3">
                      <div className="text-xs text-slate-400 uppercase mb-1">Tile Server / WMS</div>
                      {htmlParsed.tileServers.length > 0 ? (
                        <ul className="space-y-1">
                          {htmlParsed.tileServers.map((t, i) => (
                            <li key={i} className="text-xs text-sky-400 truncate">{t}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-slate-600">Nessuno trovato</p>
                      )}
                    </div>
                  </div>
                  {htmlParsed.dataSources.length > 0 && (
                    <div className="mt-3 bg-slate-800/50 rounded-lg p-3">
                      <div className="text-xs text-slate-400 uppercase mb-1">Fonti dati menzionate</div>
                      <div className="flex flex-wrap gap-1">
                        {[...new Set(htmlParsed.dataSources)].map((s, i) => (
                          <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-slate-700/50 text-slate-300">{s}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Alternative WRF */}
                <div className="border-t border-slate-700/30 pt-4">
                  <h4 className="text-sm font-bold text-white mb-2">Alternative WRF pubbliche</h4>
                  <div className="space-y-2">
                    {WRF_ALTERNATIVES.map((alt, i) => (
                      <div key={i} className="bg-slate-800/50 rounded-lg p-3 flex items-start gap-3">
                        <MapPin className="w-4 h-4 text-sky-400 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-white">{alt.name}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-900/40 text-emerald-400">Free</span>
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">{alt.description}</p>
                          <a href={alt.url} target="_blank" rel="noopener noreferrer"
                            className="text-xs text-sky-400 hover:text-sky-300 inline-flex items-center gap-1 mt-1">
                            {alt.url} <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 p-3 bg-indigo-900/20 border border-indigo-700/30 rounded-lg">
                    <h5 className="text-sm font-bold text-white mb-1">💡 Conclusione</h5>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      <strong>SoaringWRF</strong> usa il modello WRF ma <strong>non espone API pubbliche</strong>.
                      I dati sono probabilmente serviti tramite tile WMS per mappe interattive.
                      Per arricchire Open-Meteo possiamo:
                    </p>
                    <ul className="text-xs text-slate-300 mt-2 space-y-1 list-disc list-inside">
                      <li><strong>Usare tile WRF da wrftiles.com</strong> come overlay mappa (sovrapponibili a Leaflet/OpenLayers)</li>
                      <li><strong>Scaricare GRIB da NOAA NOMADS</strong> per parametri WRF non disponibili in Open-Meteo (CAPE, LI, shear, ecc.)</li>
                      <li><strong>Integrare ICON-D2</strong> per l'Europa, che ha risoluzione 2km e include parametri per il volo</li>
                      <li><strong>Open-Meteo ha già CAPE</strong> — lo stiamo già usando! Espone anche lifted_index, convective_inhibition</li>
                    </ul>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
