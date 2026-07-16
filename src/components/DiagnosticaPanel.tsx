"use client";

import React, { useState, useCallback } from "react";
import {
  Play, X, CheckCircle, XCircle, AlertTriangle, Info,
  Activity, Clock, Thermometer, Wind, Cloud, Gauge, Server,
  ShieldAlert, Bug, Zap, TrendingUp, Droplets,
} from "lucide-react";
import { diagnosticaCompletaApp, type RisultatoDiagnostica, type ProblemaDiagnostica } from "@/utils/diagnosticaApp";

function getSeveritaIcon(severita: string) {
  switch (severita) {
    case "critico": return <XCircle className="w-4 h-4 text-red-400" />;
    case "importante": return <AlertTriangle className="w-4 h-4 text-orange-400" />;
    case "minore": return <Info className="w-4 h-4 text-amber-400" />;
    case "info": return <Info className="w-4 h-4 text-blue-400" />;
    default: return <Info className="w-4 h-4 text-slate-400" />;
  }
}

function getSeveritaBg(severita: string) {
  switch (severita) {
    case "critico": return "bg-red-900/20 border-red-800/40";
    case "importante": return "bg-orange-900/20 border-orange-800/40";
    case "minore": return "bg-amber-900/20 border-amber-800/40";
    case "info": return "bg-blue-900/20 border-blue-800/40";
    default: return "bg-slate-800/20 border-slate-700/40";
  }
}

function getSeveritaBorder(severita: string) {
  switch (severita) {
    case "critico": return "border-l-red-500";
    case "importante": return "border-l-orange-500";
    case "minore": return "border-l-amber-500";
    case "info": return "border-l-blue-500";
    default: return "border-l-slate-500";
  }
}

export default function DiagnosticaPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [risultato, setRisultato] = useState<RisultatoDiagnostica | null>(null);
  const [log, setLog] = useState<string[]>([]);

  const avviaDiagnostica = useCallback(async () => {
    setIsRunning(true);
    setRisultato(null);
    setLog([]);
    addLog("🚀 Avvio diagnostica completa dell'applicazione...");
    addLog("");

    try {
      const res = await diagnosticaCompletaApp();
      setRisultato(res);
      setIsRunning(false);

      addLog("=== DIAGNOSTICA COMPLETATA ===");
      addLog(`✅ ${res.testPassati}/${res.testEseguiti} test passati`);
      addLog(`❌ ${res.testFalliti} test falliti`);
      addLog(`⏱️  Tempo: ${res.tempoEsecuzione}ms`);
      addLog("");
      addLog("=== DATI METEO ===");
      addLog(`🌡️  Temperature realistiche: ${res.datiMeteo.temperatureRealistiche ? "✅ SÌ" : "❌ NO"}`);
      addLog(`💨  Vento realistico: ${res.datiMeteo.ventoRealistico ? "✅ SÌ" : "❌ NO"}`);
      addLog(`📊  Pressione realistica: ${res.datiMeteo.pressioneRealistica ? "✅ SÌ" : "❌ NO"}`);
      addLog(`☁️  Nuvolosità realistica: ${res.datiMeteo.nuvoleRealistiche ? "✅ SÌ" : "❌ NO"}`);
      addLog(`🏔️  Siti testati: ${res.datiMeteo.sitiTestati}, con dati: ${res.datiMeteo.sitiConDati}`);
      addLog("");
      
      if (res.problemi.length === 0) {
        addLog("🎉 NESSUN PROBLEMA RILEVATO! L'app è perfettamente funzionante.");
      } else {
        addLog(`⚠️  ${res.problemi.length} problemi rilevati:`);
        for (const p of res.problemi) {
          addLog(`  [${p.severita.toUpperCase()}] ${p.componente}: ${p.descrizione}`);
        }
      }

    } catch (err) {
      addLog(`❌ ERRORE: ${err instanceof Error ? err.message : String(err)}`);
      setIsRunning(false);
    }
  }, []);

  const addLog = useCallback((msg: string) => {
    setLog(prev => {
      const nuovo = [...prev, msg];
      return nuovo.length > 500 ? nuovo.slice(-500) : nuovo;
    });
  }, []);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-36 right-4 z-50 bg-teal-800 hover:bg-teal-700 text-teal-200 border border-teal-500/40 rounded-full p-3 shadow-2xl shadow-teal-500/10"
        title="Diagnostica completa app"
      >
        <Activity className="w-5 h-5" />
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950/98 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50 bg-slate-900/80 shrink-0">
        <div className="flex items-center gap-3">
          <Activity className="w-5 h-5 text-teal-400" />
          <span className="text-sm font-bold text-white">Diagnostica completa app</span>
          {risultato && (
            <span className={`text-xs ${risultato.testFalliti === 0 ? "text-green-400" : "text-red-400"}`}>
              {risultato.testPassati}/{risultato.testEseguiti} ✅
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={avviaDiagnostica}
            disabled={isRunning}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-600 text-xs text-white disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5" /> {isRunning ? "Esecuzione..." : "Avvia diagnostica"}
          </button>
          <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white px-2 py-1 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Riepilogo (sinistra) */}
        <div className="w-full lg:w-1/3 overflow-auto border-r border-slate-800/50 p-3 space-y-2">
          {risultato && (
            <>
              <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-3 text-center">
                <div className="text-xs text-slate-400 mb-1">Risultato diagnostica</div>
                <div className={`text-3xl font-bold ${risultato.testFalliti === 0 ? "text-green-400" : "text-red-400"}`}>
                  {risultato.testFalliti === 0 ? "✅ OK" : `${risultato.testFalliti} errori`}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-3 text-center">
                  <div className="text-[10px] text-slate-400">Test superati</div>
                  <div className="text-lg font-bold text-green-400">{risultato.testPassati}/{risultato.testEseguiti}</div>
                </div>
                <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-3 text-center">
                  <div className="text-[10px] text-slate-400">Tempo</div>
                  <div className="text-lg font-bold text-sky-300">{risultato.tempoEsecuzione}ms</div>
                </div>
              </div>

              {/* Dati meteo */}
              <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-3 space-y-1.5">
                <div className="text-[11px] font-bold text-slate-300 mb-2">Qualità dati meteo</div>
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-400"><Thermometer className="w-3 h-3 inline mr-1" /> Temperature</span>
                  <span className={risultato.datiMeteo.temperatureRealistiche ? "text-green-400" : "text-red-400"}>{risultato.datiMeteo.temperatureRealistiche ? "Realistiche ✅" : "Anomale ❌"}</span>
                </div>
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-400"><Wind className="w-3 h-3 inline mr-1" /> Vento</span>
                  <span className={risultato.datiMeteo.ventoRealistico ? "text-green-400" : "text-red-400"}>{risultato.datiMeteo.ventoRealistico ? "Realistico ✅" : "Anomalo ❌"}</span>
                </div>
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-400"><Cloud className="w-3 h-3 inline mr-1" /> Nuvolosità</span>
                  <span className={risultato.datiMeteo.nuvoleRealistiche ? "text-green-400" : "text-red-400"}>{risultato.datiMeteo.nuvoleRealistiche ? "Realistica ✅" : "Anomala ❌"}</span>
                </div>
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-400"><Gauge className="w-3 h-3 inline mr-1" /> Pressione</span>
                  <span className={risultato.datiMeteo.pressioneRealistica ? "text-green-400" : "text-red-400"}>{risultato.datiMeteo.pressioneRealistica ? "Realistica ✅" : "Anomala ❌"}</span>
                </div>
              </div>

              {/* Problemi */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-bold text-slate-300 mb-1">Problemi rilevati ({risultato.problemi.length})</div>
                {risultato.problemi.length === 0 && (
                  <div className="bg-green-900/20 border border-green-500/30 rounded-xl p-3 text-center">
                    <span className="text-xs text-green-300 font-bold">🎉 Nessun problema! L'app è perfetta.</span>
                  </div>
                )}
                {risultato.problemi.map((p, i) => (
                  <div key={i} className={`rounded-xl p-2.5 border-l-4 text-xs ${getSeveritaBg(p.severita)} ${getSeveritaBorder(p.severita)}`}>
                    <div className="flex items-center gap-1.5 font-bold" style={{ color: p.severita === "critico" ? "#f87171" : p.severita === "importante" ? "#fb923c" : "#fbbf24" }}>
                      {getSeveritaIcon(p.severita)} [{p.severita.toUpperCase()}]
                    </div>
                    <div className="text-slate-300 mt-0.5">{p.componente}: {p.descrizione}</div>
                    {p.fixSuggerito && (
                      <div className="text-teal-400 mt-0.5">💡 {p.fixSuggerito}</div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          {!risultato && !isRunning && (
            <div className="text-center py-10 text-slate-500 text-sm">
              <Bug className="w-12 h-12 mx-auto mb-3 text-teal-500/40" />
              <p className="font-bold mb-1">Diagnostica applicazione</p>
              <p className="text-xs">Verifica decolli, API meteo, calcoli e componenti</p>
              <p className="text-xs mt-2 text-slate-600">Premi "Avvia diagnostica" per iniziare</p>
            </div>
          )}
        </div>

        {/* Log */}
        <div className="flex-1 overflow-auto p-3 font-mono">
          <div className="text-[10px] leading-5 text-slate-400 whitespace-pre-wrap">
            {log.length === 0 && (
              <div className="text-center py-10 text-slate-600">
                Premi "Avvia diagnostica" per iniziare
              </div>
            )}
            {log.map((line, i) => (
              <div key={i} className={
                line.includes("✅") ? "text-green-400" :
                line.includes("❌") ? "text-red-400" :
                line.includes("⚠️") ? "text-amber-400" :
                line.includes("🚀") ? "text-teal-400 font-bold" :
                line.includes("===") ? "text-cyan-400 font-bold" :
                line.includes("🎉") ? "text-green-300 font-bold" :
                line.includes("[CRITICO]") ? "text-red-400 font-bold" :
                line.includes("[IMPORTANTE]") ? "text-orange-400" :
                line.includes("[MINORE]") ? "text-amber-400" :
                "text-slate-400"
              }>
                {line}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}