"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { megaTestMeteo, type RisultatoMegaTest, type TestRisultato } from "@/utils/megaTestMeteo";
import {
  Play, Square, X, CheckCircle, XCircle, AlertTriangle,
  Activity, Clock, TrendingUp, Thermometer, Wind, Bug,
  Gauge, Cloud, Droplets, Server, Zap,
} from "lucide-react";

export default function MegaTestPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [risultato, setRisultato] = useState<RisultatoMegaTest | null>(null);
  const [progresso, setProgresso] = useState(0);
  const [log, setLog] = useState<string[]>([]);
  const abortRef = useRef(false);
  const logRef = useRef<string[]>([]);

  const addLog = useCallback((msg: string) => {
    const ts = new Date().toLocaleTimeString("it-IT");
    const line = `[${ts}] ${msg}`;
    logRef.current = [...logRef.current, line];
    if (logRef.current.length > 1000) logRef.current = logRef.current.slice(-1000);
    setLog([...logRef.current]);
  }, []);

  const avviaTest = useCallback(async () => {
    abortRef.current = false;
    setIsRunning(true);
    setRisultato(null);
    setProgresso(0);
    logRef.current = [];
    setLog([]);
    addLog("🚀 Avvio MEGA TEST: 1000 richieste reali a Open-Meteo...");
    addLog("⏱️  Tempo stimato: ~25 minuti (1 richiesta ogni 1.5s)");
    addLog("");

    try {
      const res = await megaTestMeteo(1000, (completati, totale, parziale) => {
        setProgresso(completati);
        
        if (completati % 50 === 0 || !parziale.successo) {
          const pct = Math.round((completati / totale) * 100);
          const msg = parziale.successo
            ? `✅ [${completati}/${totale}] (${pct}%) · ${parziale.lat.toFixed(4)}, ${parziale.lon.toFixed(4)} · ${parziale.tempoMs}ms · T:${parziale.metriche.tempMedia}°C · V:${parziale.metriche.ventoMedio}km/h`
            : `❌ [${completati}/${totale}] (${pct}%) · ${parziale.lat.toFixed(4)}, ${parziale.lon.toFixed(4)} · ERR: ${parziale.errore}`;
          addLog(msg);
        }
      });
      
      setRisultato(res);
      setIsRunning(false);
      
      addLog("");
      addLog("=== MEGA TEST COMPLETATO ===");
      addLog(`✅ ${res.successi}/${res.totale} successi · ❌ ${res.fallimenti} fallimenti`);
      addLog(`⚠️  ${res.anomalieTotali} anomalie totali`);
      addLog(`⏱️  Tempo totale: ${Math.round(res.tempoTotale / 1000)}s · Media: ${res.tempoMedio}ms/richiesta`);
      addLog(`🌡️  Temperature: media ${res.statistiche.tempMediaMedia}°C [${res.statistiche.tempMediaMin}°C ~ ${res.statistiche.tempMediaMax}°C]`);
      addLog(`💨  Vento: media ${res.statistiche.ventoMedioMedia} km/h [${res.statistiche.ventoMedioMin} ~ ${res.statistiche.ventoMedioMax}]`);
      addLog(`☁️  Nuvole medie: ${res.statistiche.nuvoleMedia}% · Pioggia media: ${res.statistiche.pioggiaMedia}mm`);
      addLog(`📊  Pressione media: ${res.statistiche.pressioneMedia} hPa · CAPE medio: ${res.statistiche.capeMedio} J/kg`);
      addLog(`🔥  Temp massima assoluta: ${res.statistiche.tempMaxAssoluta}°C · Minima assoluta: ${res.statistiche.tempMinAssoluta}°C`);
      addLog(`💨  Vento massimo assoluto: ${res.statistiche.ventoMaxAssoluto} km/h`);

    } catch (err) {
      addLog(`❌ ERRORE GLOBALE: ${err instanceof Error ? err.message : String(err)}`);
      setIsRunning(false);
    }
  }, [addLog]);

  const stopTest = useCallback(() => {
    abortRef.current = true;
    setIsRunning(false);
    addLog("⛔ Test interrotto dall'utente");
  }, [addLog]);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 right-4 z-50 bg-purple-800 hover:bg-purple-700 text-purple-200 border border-purple-500/40 rounded-full p-3 shadow-2xl shadow-purple-500/10"
        title="Mega Test: 1000 richieste reali"
      >
        <Zap className="w-5 h-5" />
      </button>
    );
  }

  const pct = progresso > 0 ? Math.round((progresso / 1000) * 100) : 0;

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950/98 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50 bg-slate-900/80 shrink-0">
        <div className="flex items-center gap-3">
          <Zap className="w-5 h-5 text-purple-400" />
          <span className="text-sm font-bold text-white">Mega Test · 1000 richieste reali</span>
          {isRunning && (
            <span className="text-xs text-purple-300">{progresso}/1000 ({pct}%)</span>
          )}
          {risultato && !isRunning && (
            <span className="text-xs text-green-400">
              ✅ {risultato.successi}/{risultato.totale}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!isRunning ? (
            <button
              onClick={avviaTest}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-700 hover:bg-purple-600 text-xs text-white"
            >
              <Play className="w-3.5 h-3.5" /> Avvia 1000 test
            </button>
          ) : (
            <button
              onClick={stopTest}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-700 hover:bg-red-600 text-xs text-white"
            >
              <Square className="w-3.5 h-3.5" /> Stop
            </button>
          )}
          <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white px-2 py-1 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Barra progresso */}
      {isRunning && (
        <div className="h-2 bg-slate-800">
          <div className="h-full bg-purple-500 transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>
      )}

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Statistiche (sinistra) */}
        <div className="w-full lg:w-1/3 overflow-auto border-r border-slate-800/50 p-3 space-y-2">
          {risultato && !isRunning && (
            <>
              <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-3 text-center">
                <div className="text-xs text-slate-400 mb-1">Test completati</div>
                <div className="text-3xl font-bold text-white">{risultato.totale}</div>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-3 text-center">
                  <div className="text-[10px] text-slate-400">Successi</div>
                  <div className="text-lg font-bold text-green-400">{risultato.successi}</div>
                </div>
                <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-3 text-center">
                  <div className="text-[10px] text-slate-400">Fallimenti</div>
                  <div className="text-lg font-bold text-red-400">{risultato.fallimenti}</div>
                </div>
                <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-3 text-center">
                  <div className="text-[10px] text-slate-400">Anomalie</div>
                  <div className="text-lg font-bold text-amber-400">{risultato.anomalieTotali}</div>
                </div>
                <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-3 text-center">
                  <div className="text-[10px] text-slate-400">Tempo medio</div>
                  <div className="text-lg font-bold text-sky-300">{risultato.tempoMedio}ms</div>
                </div>
              </div>

              <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-3 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400"><Thermometer className="w-3 h-3 inline mr-1" /> Temp media</span>
                  <span className="font-bold text-white">{risultato.statistiche.tempMediaMedia}°C</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400"><Wind className="w-3 h-3 inline mr-1" /> Vento medio</span>
                  <span className="font-bold text-white">{risultato.statistiche.ventoMedioMedia} km/h</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400"><Cloud className="w-3 h-3 inline mr-1" /> Nuvole medie</span>
                  <span className="font-bold text-white">{risultato.statistiche.nuvoleMedia}%</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400"><Gauge className="w-3 h-3 inline mr-1" /> Pressione media</span>
                  <span className="font-bold text-white">{risultato.statistiche.pressioneMedia} hPa</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400"><Droplets className="w-3 h-3 inline mr-1" /> CAPE medio</span>
                  <span className="font-bold text-purple-300">{risultato.statistiche.capeMedio} J/kg</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Temp max assoluta</span>
                  <span className="font-bold text-red-300">{risultato.statistiche.tempMaxAssoluta}°C</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Temp min assoluta</span>
                  <span className="font-bold text-blue-300">{risultato.statistiche.tempMinAssoluta}°C</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Vento max assoluto</span>
                  <span className="font-bold text-orange-300">{risultato.statistiche.ventoMaxAssoluto} km/h</span>
                </div>
              </div>
            </>
          )}

          {!risultato && !isRunning && (
            <div className="text-center py-10 text-slate-500 text-sm">
              <Zap className="w-12 h-12 mx-auto mb-3 text-purple-500/40" />
              <p className="font-bold mb-1">Mega Test Meteo</p>
              <p className="text-xs">Esegue 1000 richieste reali a Open-Meteo</p>
              <p className="text-xs mt-2 text-slate-600">Tempo stimato: ~25 minuti</p>
            </div>
          )}
        </div>

        {/* Log */}
        <div className="flex-1 overflow-auto p-3 font-mono">
          <div className="text-[10px] leading-5 text-slate-400 whitespace-pre-wrap">
            {log.length === 0 && (
              <div className="text-center py-10 text-slate-600">
                Premi "Avvia 1000 test" per iniziare
              </div>
            )}
            {log.map((line, i) => (
              <div key={i} className={
                line.includes("✅") ? "text-green-400" :
                line.includes("❌") ? "text-red-400" :
                line.includes("⚠️") ? "text-amber-400" :
                line.includes("🚀") ? "text-purple-400 font-bold" :
                line.includes("===") ? "text-cyan-400 font-bold" :
                line.includes("🔥") ? "text-orange-400 font-bold" :
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