"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { DECOLLI } from "@/data/decolli";
import { testSingleSite, testAllSites, quickHealthCheck, type TestResult, type SiteCoord } from "@/utils/meteoTester";
import { X, Play, Square, RefreshCw, CheckCircle, XCircle, AlertTriangle, Clock, TrendingUp, Bug } from "lucide-react";

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
  const [continuousMode, setContinuousMode] = useState(false);
  const abortRef = useRef(false);
  const continuousRef = useRef(false);
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

  const runSingleTest = useCallback(async (siteId?: string) => {
    const sites = siteId ? ALL_SITES.filter(s => s.id === siteId) : [ALL_SITES[0]];
    for (const site of sites) {
      if (abortRef.current) break;
      addLog(`Test su ${site.name} (${site.lat}, ${site.lon})...`);
      const result = await testSingleSite(site);
      setResults(prev => {
        const filtered = prev.filter(r => r.siteId !== site.id);
        return [result, ...filtered].slice(0, 50);
      });
      setTestCount(prev => prev + 1);
      if (result.success) {
        addLog(`✅ ${site.name}: OK (${result.responseTimeMs}ms, ${result.warnings.length} warn)`);
      } else {
        addLog(`❌ ${site.name}: FALLITO — ${result.errors.join("; ")}`);
      }
      if (result.warnings.length > 0) {
        result.warnings.forEach(w => addLog(`⚠️  ${site.name}: ${w}`));
      }
    }
  }, [addLog]);

  const runAllSequential = useCallback(async () => {
    abortRef.current = false;
    setIsRunning(true);
    addLog(`=== Test sequenziale su ${ALL_SITES.length} siti ===`);
    
    const onProgress = (result: TestResult, index: number, total: number) => {
      setResults(prev => {
        const filtered = prev.filter(r => r.siteId !== result.siteId);
        return [result, ...filtered].slice(0, 50);
      });
      setTestCount(prev => prev + 1);
      addLog(`[${index}/${total}] ${result.siteName}: ${result.success ? "✅" : "❌"} (${result.responseTimeMs}ms)`);
      if (result.warnings.length > 0) {
        result.warnings.forEach(w => addLog(`  ⚠️ ${w}`));
      }
    };

    const { summary } = await testAllSites(ALL_SITES, onProgress);
    addLog(`=== RIEPILOGO: ${summary.passed}/${summary.total} passati, ${summary.totalErrors} errori, ${summary.totalWarnings} warnings, media ${summary.avgResponseTime}ms ===`);
    setIsRunning(false);
  }, [addLog]);

  const runContinuousLoop = useCallback(async () => {
    continuousRef.current = true;
    setContinuousMode(true);
    addLog("=== MODALITÀ CONTINUA ATTIVATA (test ogni 3s) ===");
    
    while (continuousRef.current) {
      if (abortRef.current) break;
      
      // Test rapido sul primo sito
      const site = ALL_SITES[0];
      const result = await testSingleSite(site);
      setResults(prev => {
        const filtered = prev.filter(r => r.siteId !== site.id);
        return [result, ...filtered].slice(0, 50);
      });
      setTestCount(prev => prev + 1);
      
      const statusIcon = result.success ? "✅" : "❌";
      addLog(`[CICLO] ${site.name}: ${statusIcon} (${result.responseTimeMs}ms, errori:${result.errors.length}, warn:${result.warnings.length})`);
      
      // Ogni 10 test fa un giro completo
      if (testCount % 10 === 0 && testCount > 0) {
        addLog("--- Test completo siti ---");
        for (const s of ALL_SITES.slice(0, 8)) {
          if (abortRef.current || !continuousRef.current) break;
          await new Promise(resolve => setTimeout(resolve, 1500));
          const r = await testSingleSite(s);
          setResults(prev => {
            const filtered = prev.filter(p => p.siteId !== s.id);
            return [r, ...filtered].slice(0, 50);
          });
          setTestCount(prev => prev + 1);
          addLog(`  ${s.name}: ${r.success ? "✅" : "❌"} (${r.responseTimeMs}ms)`);
        }
      }
      
      // Pausa tra cicli
      for (let i = 0; i < 30 && continuousRef.current; i++) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    setContinuousMode(false);
    addLog("=== MODALITÀ CONTINUA TERMINATA ===");
    setIsRunning(false);
  }, [addLog, testCount]);

  const stopAll = useCallback(() => {
    abortRef.current = true;
    continuousRef.current = false;
    setIsRunning(false);
    setContinuousMode(false);
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
          <button
            onClick={clearLog}
            className="text-xs text-slate-500 hover:text-white px-2 py-1 rounded"
            title="Pulisci log"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="text-slate-400 hover:text-white px-2 py-1 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-800/50 bg-slate-900/40">
        <button
          onClick={runHealthCheck}
          disabled={isRunning}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 disabled:opacity-50"
        >
          <Activity className="w-3.5 h-3.5" /> Health
        </button>
        <button
          onClick={() => runSingleTest()}
          disabled={isRunning}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-900/50 hover:bg-blue-800/50 text-xs text-blue-300 disabled:opacity-50"
        >
          <Play className="w-3.5 h-3.5" /> Test 1
        </button>
        <button
          onClick={runAllSequential}
          disabled={isRunning}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-900/50 hover:bg-green-800/50 text-xs text-green-300 disabled:opacity-50"
        >
          <Play className="w-3.5 h-3.5" /> Test tutti ({ALL_SITES.length})
        </button>
        <button
          onClick={runContinuousLoop}
          disabled={isRunning || continuousMode}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-900/50 hover:bg-purple-800/50 text-xs text-purple-300 disabled:opacity-50"
        >
          <TrendingUp className="w-3.5 h-3.5" /> Continuo
        </button>
        {(isRunning || continuousMode) && (
          <button
            onClick={stopAll}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-900/50 hover:bg-red-800/50 text-xs text-red-300"
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
            <div
              key={`${r.siteId}-${i}`}
              className={`p-2 rounded-lg text-xs border ${
                r.success
                  ? "bg-slate-800/30 border-slate-700/30"
                  : "bg-red-900/20 border-red-800/30"
              }`}
            >
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
              {r.errors.length > 0 && (
                <div className="mt-1 text-[10px] text-red-400">{r.errors.join("; ")}</div>
              )}
              {/* Validazione daily */}
              {r.validation.daily.length > 0 && (
                <details className="mt-1">
                  <summary className="text-[10px] text-slate-500 cursor-pointer">Daily</summary>
                  <div className="grid grid-cols-2 gap-1 mt-1">
                    {r.validation.daily.map((v, vi) => (
                      <div key={vi} className="flex items-center gap-1 text-[10px]">
                        <span className={v.ok ? "text-green-400" : "text-red-400"}>{v.ok ? "✓" : "✗"}</span>
                        <span className="text-slate-400">{v.field}:</span>
                        <span className="text-white">{JSON.stringify(v.value)}</span>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          ))}
        </div>

        {/* Log */}
        <div className="flex-1 overflow-auto p-3 font-mono">
          <div className="text-[10px] leading-5 text-slate-400 whitespace-pre-wrap">
            {log.length === 0 && (
              <div className="text-slate-600 text-center py-8">
                Log vuoto. Avvia un test per vedere i risultati.
              </div>
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

function Activity(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}
