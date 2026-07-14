"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { DECOLLI } from "@/data/decolli";
import { testSingleSite, testAllSites, quickHealthCheck, type TestResult, type SiteCoord } from "@/utils/meteoTester";
import { X, Play, Square, RefreshCw, CheckCircle, XCircle, AlertTriangle, Clock, TrendingUp, Bug, Activity } from "lucide-react";

function SiteCoordFromDecollo(d: typeof DECOLLI[0]): SiteCoord {
  return { id: d.id, name: d.name, lat: d.lat, lon: d.lon, alt: d.altitude, exposure: d.exposure };
}

const ALL_SITES: SiteCoord[] = DECOLLI.map(SiteCoordFromDecollo);

export default function MeteoTesterPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const [health, setHealth] = useState<{ alive: boolean; responseTime: number; status: string } | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [testCount, setTestCount] = useState(0);
  const abortRef = useRef(false);
  const logRef = useRef<string[]>([]);

  const addLog = useCallback((msg: string) => {
    const ts = new Date().toLocaleTimeString("it-IT");
    const line = `[${ts}] ${msg}`;
    logRef.current = [...logRef.current, line];
    if (logRef.current.length > 500) logRef.current = logRef.current.slice(-500);
    setLog([...logRef.current]);
  }, []);

  const runHealthCheck = useCallback(async () => {
    const site = ALL_SITES[0];
    addLog(`Health check su ${site.name}...`);
    const result = await quickHealthCheck(site);
    setHealth(result);
    addLog(`Health: ${result.status} (${result.responseTime}ms)`);
  }, [addLog]);

  /** Test ping-pong: esegue N richieste rapide consecutive sullo STESSO sito */
  const runPingPong = useCallback(async (numTests: number = 10) => {
    abortRef.current = false;
    setIsRunning(true);
    const site = ALL_SITES[0];
    addLog(`=== PING-PONG: ${numTests} richieste su ${site.name} ===`);

    const times: number[] = [];
    const statuses: string[] = [];

    for (let i = 0; i < numTests; i++) {
      if (abortRef.current) break;
      
      const start = performance.now();
      try {
        const r = await quickHealthCheck(site);
        const elapsed = Math.round(performance.now() - start);
        times.push(elapsed);
        statuses.push(r.status);
        addLog(`[${i + 1}/${numTests}] ${r.status} (${elapsed}ms)`);
        
        // Aggiorna results
        setResults(prev => {
          const newR: TestResult = {
            siteId: site.id,
            siteName: site.name,
            timestamp: new Date().toISOString(),
            success: r.alive,
            errors: r.alive ? [] : [r.status],
            warnings: [],
            rawData: null,
            validation: { daily: [], hourly: [], current: [] },
            responseTimeMs: elapsed,
          };
          return [newR, ...prev].slice(0, 50);
        });
        setTestCount(prev => prev + 1);
      } catch (err) {
        addLog(`[${i + 1}/${numTests}] ❌ ERRORE: ${err}`);
        times.push(-1);
        statuses.push(`ERR: ${err}`);
      }

      // Delay tra richieste (1.5s per non superare rate limit)
      if (i < numTests - 1) await new Promise(r => setTimeout(r, 1500));
    }

    // Report statistiche
    const successi = times.filter(t => t > 0);
    if (successi.length > 0) {
      const avg = Math.round(successi.reduce((s, t) => s + t, 0) / successi.length);
      const min = Math.min(...successi);
      const max = Math.max(...successi);
      addLog(`=== PING-PONG COMPLETATO ===`);
      addLog(`  ✅ ${successi.length}/${numTests} successi`);
      addLog(`  ⏱️  Media: ${avg}ms · Min: ${min}ms · Max: ${max}ms`);
      if (max - min > 500) addLog(`  ⚠️  Alta variabilità: ${max - min}ms di differenza`);
      if (avg > 500) addLog(`  ⚠️  Latenza alta: media ${avg}ms`);
    } else {
      addLog(`  ❌ 0 successi su ${numTests} — server potrebbe essere offline`);
    }

    setIsRunning(false);
  }, [addLog]);

  /** Test multi-sito: richieste su siti diversi */
  const runMultiSiteTest = useCallback(async () => {
    abortRef.current = false;
    setIsRunning(true);
    const siti = ALL_SITES.slice(0, 8); // primi 8
    addLog(`=== MULTI-SITO: ${siti.length} siti diversi ===`);

    for (let i = 0; i < siti.length; i++) {
      if (abortRef.current) break;
      const site = siti[i];
      addLog(`Test su ${site.name}...`);
      const result = await testSingleSite(site);
      setResults(prev => {
        const filtered = prev.filter(r => r.siteId !== site.id);
        return [result, ...filtered].slice(0, 50);
      });
      setTestCount(prev => prev + 1);
      addLog(`  ${result.success ? "✅" : "❌"} ${result.responseTimeMs}ms · ${result.errors.length} err · ${result.warnings.length} warn`);
      if (i < siti.length - 1) await new Promise(r => setTimeout(r, 2000));
    }

    addLog(`=== MULTI-SITO COMPLETATO ===`);
    setIsRunning(false);
  }, [addLog]);

  /** Test di stress: 3 cicli su 3 siti diversi = 9 richieste */
  const runStressTest = useCallback(async () => {
    abortRef.current = false;
    setIsRunning(true);
    const siti = [ALL_SITES[0], ALL_SITES[3], ALL_SITES[6], ALL_SITES[9]]; // 4 siti diversi
    addLog(`=== STRESS TEST: ${siti.length} siti × 3 cicli = ${siti.length * 3} richieste ===`);

    for (let ciclo = 0; ciclo < 3; ciclo++) {
      if (abortRef.current) break;
      addLog(`--- Ciclo ${ciclo + 1}/3 ---`);

      for (let i = 0; i < siti.length; i++) {
        if (abortRef.current) break;
        const site = siti[i];
        const result = await testSingleSite(site);
        setResults(prev => {
          const filtered = prev.filter(r => r.siteId !== site.id);
          return [result, ...filtered].slice(0, 50);
        });
        setTestCount(prev => prev + 1);
        addLog(`  [${ciclo + 1}.${i + 1}] ${site.name}: ${result.success ? "✅" : "❌"} (${result.responseTimeMs}ms)`);
        if (i < siti.length - 1 || ciclo < 2) await new Promise(r => setTimeout(r, 1500));
      }
    }

    addLog(`=== STRESS TEST COMPLETATO ===`);
    setIsRunning(false);
  }, [addLog]);

  const stopAll = useCallback(() => {
    abortRef.current = true;
    setIsRunning(false);
    addLog("⛔ Test interrotto dall'utente");
  }, [addLog]);

  const clearLog = useCallback(() => {
    logRef.current = [];
    setLog([]);
  }, []);

  useEffect(() => {
    if (isOpen) {
      runHealthCheck();
    }
  }, [isOpen, runHealthCheck]);

  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const avgTime = results.length > 0 ? Math.round(results.reduce((s, r) => s + r.responseTimeMs, 0) / results.length) : 0;

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-50 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/30 rounded-full p-3 shadow-2xl shadow-emerald-500/10"
        title="Apri tester meteo"
      >
        <Bug className="w-5 h-5" />
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950/98 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50 bg-slate-900/80">
        <div className="flex items-center gap-3">
          <Bug className="w-5 h-5 text-emerald-400" />
          <span className="text-sm font-bold text-white">Meteo Data Tester</span>
          <span className="text-xs text-slate-500">Test: {testCount}</span>
          {health && (
            <span className={`text-xs ${health.alive ? "text-green-400" : "text-red-400"}`}>
              {health.alive ? "🟢" : "🔴"} {health.responseTime}ms
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">
            <span className="text-green-400">{passed}✅</span> <span className="text-red-400">{failed}❌</span> media {avgTime}ms
          </span>
          <button onClick={clearLog} className="text-xs text-slate-500 hover:text-white px-2 py-1 rounded" title="Pulisci log">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white px-2 py-1 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-1.5 px-4 py-2 border-b border-slate-800/50 bg-slate-900/40 overflow-x-auto">
        <button
          onClick={runHealthCheck}
          disabled={isRunning}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 disabled:opacity-50 shrink-0"
        >
          <Activity className="w-3.5 h-3.5" /> Health
        </button>
        <button
          onClick={() => runPingPong(10)}
          disabled={isRunning}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-900/50 hover:bg-blue-800/50 text-xs text-blue-300 disabled:opacity-50 shrink-0"
        >
          <TrendingUp className="w-3.5 h-3.5" /> Ping-Pong (10)
        </button>
        <button
          onClick={() => runPingPong(25)}
          disabled={isRunning}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-900/50 hover:bg-indigo-800/50 text-xs text-indigo-300 disabled:opacity-50 shrink-0"
        >
          <TrendingUp className="w-3.5 h-3.5" /> Ping-Pong (25)
        </button>
        <button
          onClick={runMultiSiteTest}
          disabled={isRunning}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-900/50 hover:bg-green-800/50 text-xs text-green-300 disabled:opacity-50 shrink-0"
        >
          <Play className="w-3.5 h-3.5" /> Multi-sito (8)
        </button>
        <button
          onClick={runStressTest}
          disabled={isRunning}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-900/50 hover:bg-purple-800/50 text-xs text-purple-300 disabled:opacity-50 shrink-0"
        >
          <Activity className="w-3.5 h-3.5" /> Stress (12)
        </button>
        {isRunning && (
          <button
            onClick={stopAll}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-900/50 hover:bg-red-800/50 text-xs text-red-300 shrink-0"
          >
            <Square className="w-3.5 h-3.5" /> Stop
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Results list */}
        <div className="w-full lg:w-1/3 overflow-auto border-r border-slate-800/50 p-2 space-y-1">
          {results.length === 0 && (
            <div className="text-center py-8 text-slate-500 text-xs">
              Nessun test eseguito. Premi un pulsante per iniziare.
            </div>
          )}
          {results.map((r, i) => (
            <div key={`${r.siteId}-${i}`} className={`p-2 rounded-lg text-xs border ${r.success ? "bg-slate-800/30 border-slate-700/30" : "bg-red-900/20 border-red-800/30"}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-white">{r.siteName}</span>
                <span className={`text-[10px] ${r.success ? "text-green-400" : "text-red-400"}`}>
                  {r.success ? "✅ OK" : "❌ FAIL"}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-slate-400">
                <Clock className="w-3 h-3" />
                <span>{r.responseTimeMs}ms</span>
                {r.warnings.length > 0 && (
                  <>
                    <AlertTriangle className="w-3 h-3 text-amber-400" />
                    <span className="text-amber-400">{r.warnings.length} warn</span>
                  </>
                )}
              </div>
              {r.errors.length > 0 && <div className="mt-1 text-[10px] text-red-400">{r.errors.join("; ")}</div>}
            </div>
          ))}
        </div>

        {/* Log */}
        <div className="flex-1 overflow-auto p-3 font-mono">
          <div className="text-[10px] leading-5 text-slate-400 whitespace-pre-wrap">
            {log.length === 0 && (
              <div className="text-slate-600 text-center py-8">Log vuoto. Avvia un test per vedere i risultati.</div>
            )}
            {log.map((line, i) => (
              <div key={i} className={
                line.includes("✅") ? "text-green-400" :
                line.includes("❌") ? "text-red-400" :
                line.includes("⚠️") ? "text-amber-400" :
                line.includes("===") ? "text-cyan-400 font-bold" :
                line.includes("⛔") ? "text-red-300" :
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