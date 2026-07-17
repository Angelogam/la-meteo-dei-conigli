"use client";

import React, { useEffect, useState } from "react";
import { eseguiReportCompleto, type ReportConflitti } from "@/utils/eseguiReport";

export default function ReportTest() {
  const [report, setReport] = useState<ReportConflitti | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let attivo = true;
    setLoading(true);
    
    eseguiReportCompleto()
      .then((res) => {
        if (attivo) {
          setReport(res);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (attivo) {
          setError(err instanceof Error ? err.message : "Errore sconosciuto");
          setLoading(false);
        }
      });

    return () => { attivo = false; };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-4 border-emerald-500/20 border-t-emerald-400 animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Esecuzione test diagnostici su tutto il codebase...</p>
          <p className="text-slate-500 text-sm mt-2">Test reali su decolli, API meteo, calcoli e componenti</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="bg-red-900/30 border border-red-500/30 rounded-2xl p-8 max-w-lg text-center">
          <p className="text-red-400 text-lg font-bold mb-2">Errore nell'esecuzione del report</p>
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <p className="text-slate-400">Nessun report generato</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-emerald-400 mb-2">
            📊 REPORT COMPLETO DEI CONFLITTI
          </h1>
          <p className="text-slate-400 text-sm">
            Generato il {new Date(report.timestamp).toLocaleString("it-IT")}
          </p>
          <p className="text-slate-500 text-xs mt-1">
            Test reali su API, decolli, calcoli e componenti
          </p>
        </div>

        {/* Riepilogo */}
        <div className={`rounded-2xl border-2 p-6 mb-6 ${
          report.percentualeSuccesso >= 90
            ? "bg-emerald-900/30 border-emerald-500/40"
            : report.percentualeSuccesso >= 70
            ? "bg-amber-900/30 border-amber-500/40"
            : "bg-red-900/30 border-red-500/40"
        }`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-5xl font-black">{report.percentualeSuccesso}%</div>
              <div className="text-slate-400 text-sm mt-1">Percentuale di successo</div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-white">{report.totaleTest}</div>
              <div className="text-sm text-slate-400">Test eseguiti</div>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="bg-emerald-900/40 rounded-xl px-4 py-2 text-center flex-1">
              <div className="text-lg font-bold text-emerald-300">{report.testPassati}</div>
              <div className="text-xs text-slate-400">Superati ✅</div>
            </div>
            <div className="bg-red-900/40 rounded-xl px-4 py-2 text-center flex-1">
              <div className="text-lg font-bold text-red-300">{report.testFalliti}</div>
              <div className="text-xs text-slate-400">Falliti ❌</div>
            </div>
            <div className="bg-amber-900/40 rounded-xl px-4 py-2 text-center flex-1">
              <div className="text-lg font-bold text-amber-300">{report.warning.length}</div>
              <div className="text-xs text-slate-400">Warning ⚠️</div>
            </div>
          </div>
        </div>

        {/* Problemi critici */}
        {report.problemiCritici.length > 0 && (
          <div className="bg-red-900/20 border border-red-500/30 rounded-2xl p-5 mb-6">
            <h2 className="text-lg font-bold text-red-400 mb-3">🔴 Problemi critici ({report.problemiCritici.length})</h2>
            <ul className="space-y-2">
              {report.problemiCritici.map((p, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-red-300">
                  <span className="mt-0.5">•</span>
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Warning */}
        {report.warning.length > 0 && (
          <div className="bg-amber-900/20 border border-amber-500/30 rounded-2xl p-5 mb-6">
            <h2 className="text-lg font-bold text-amber-400 mb-3">⚠️ Warning ({report.warning.length})</h2>
            <ul className="space-y-1">
              {report.warning.map((w, i) => (
                <li key={i} className="text-sm text-amber-300">• {w}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Dettaglio decolli */}
        {report.dettagliDecolli.length > 0 && (
          <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5 mb-6">
            <h2 className="text-lg font-bold text-white mb-3">🌍 Dettaglio decolli (API reali)</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-xs md:text-sm">
                <thead>
                  <tr className="border-b border-slate-700/50">
                    <th className="text-left py-2 pr-3 text-slate-400">Nome</th>
                    <th className="text-left py-2 px-2 text-slate-400">Alt</th>
                    <th className="text-left py-2 px-2 text-slate-400">Vento</th>
                    <th className="text-left py-2 px-2 text-slate-400">Temp</th>
                    <th className="text-left py-2 pl-3 text-slate-400">Stato</th>
                  </tr>
                </thead>
                <tbody>
                  {report.dettagliDecolli.map((d, i) => (
                    <tr key={i} className="border-b border-slate-800/50">
                      <td className="py-2 pr-3 font-medium text-white">{d.nome}</td>
                      <td className="py-2 px-2 text-slate-300">{d.alt}m</td>
                      <td className="py-2 px-2">
                        <span className={d.ventoOk ? "text-emerald-300" : "text-red-300"}>
                          {d.vento != null ? `${Math.round(d.vento)} km/h` : "N/D"}
                        </span>
                      </td>
                      <td className="py-2 px-2">
                        <span className={d.tempOk ? "text-amber-300" : "text-red-300"}>
                          {d.temperatura != null ? `${Math.round(d.temperatura)}°C` : "N/D"}
                        </span>
                      </td>
                      <td className="py-2 pl-3">
                        {d.ventoOk && d.tempOk ? (
                          <span className="text-emerald-400">✅ OK</span>
                        ) : d.errore ? (
                          <span className="text-red-400" title={d.errore}>❌ {d.errore.slice(0, 30)}</span>
                        ) : (
                          <span className="text-amber-400">⚠️ Anomalo</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Lista completa test */}
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5 mb-6">
          <h2 className="text-lg font-bold text-white mb-3">📋 Dettaglio test ({report.test.length})</h2>
          <div className="space-y-1.5">
            {report.test.map((t, i) => (
              <div
                key={i}
                className={`flex items-start gap-3 rounded-xl px-3 py-2 text-sm ${
                  t.passato ? "bg-emerald-900/15" : "bg-red-900/15"
                }`}
              >
                <span className="shrink-0 mt-0.5">
                  {t.passato ? "✅" : "❌"}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-white">
                    [{t.categoria}] {t.nome}
                  </div>
                  <div className={`text-xs mt-0.5 ${t.passato ? "text-emerald-300" : "text-red-300"}`}>
                    {t.dettaglio}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-slate-500 text-xs py-4 border-t border-slate-800/50">
          Report generato con test reali su API Open-Meteo, decolli, calcoli e componenti
        </div>
      </div>
    </div>
  );
}