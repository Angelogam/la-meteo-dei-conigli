"use client";

import React, { useState, useCallback } from "react";
import { DECOLLI } from "@/data/decolli";
import { weatherService7Timer } from "@/services/weatherService7Timer";
import { weatherService } from "@/services/weatherService";
import {
  testSingleSite,
  type TestResult,
} from "@/utils/meteoTester";
import {
  Play,
  X,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  Server,
  Radar,
} from "lucide-react";

interface MeteoTesterPanelProps {
  onClose?: () => void;
}

function MeteoTesterPanel({ onClose }: MeteoTesterPanelProps) {
  const [isOpen, setIsOpen] = useState(true);
  // Stato per Open-Meteo
  const [omRunning, setOmRunning] = useState(false);
  const [omResults, setOmResults] = useState<TestResult[]>([]);
  const [omSummary, setOmSummary] = useState<string>("");
  const [omProgress, setOmProgress] = useState(0);
  // Stato per 7Timer!
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerResults, setTimerResults] = useState<{ nome: string; ok: boolean; temp?: number; rt: number; err?: string }[]>([]);
  const [timerSummary, setTimerSummary] = useState<string>("");
  const [timerProgress, setTimerProgress] = useState(0);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    onClose?.();
  }, [onClose]);

  // Test TUTTI i decolli con Open-Meteo
  const runOpenMeteoTests = useCallback(async () => {
    setOmRunning(true);
    setOmResults([]);
    setOmSummary("");

    const sites = DECOLLI.map((d) => ({
      id: d.id,
      name: d.name,
      lat: d.lat,
      lon: d.lon,
      alt: d.altitude,
      exposure: d.exposure,
    }));

    let okCount = 0;
    let totalTime = 0;
    let totalErrors = 0;

    for (let i = 0; i < sites.length; i++) {
      const site = sites[i];
      try {
        const result = await testSingleSite(site);
        setOmResults((prev) => [...prev, result]);
        setOmProgress(Math.round(((i + 1) / sites.length) * 100));
        if (result.success) okCount++;
        totalTime += result.responseTimeMs;
        totalErrors += result.errors.length;
      } catch (err) {
        setOmResults((prev) => [...prev, {
          siteId: site.id,
          siteName: site.name,
          timestamp: new Date().toISOString(),
          success: false,
          errors: [err instanceof Error ? err.message : String(err)],
          warnings: [],
          rawData: null,
          validation: { daily: [], hourly: [], current: [] },
          responseTimeMs: 0,
        }]);
      }

      if (i < sites.length - 1) {
        await new Promise(r => setTimeout(r, 1500));
      }
    }

    const avg = sites.length > 0 ? Math.round(totalTime / sites.length) : 0;
    setOmSummary(`✅ ${okCount}/${sites.length} OK · ❌ ${sites.length - okCount} falliti · ⚠️ ${totalErrors} errori · ⏱️ ${avg}ms media`);
    setOmRunning(false);
  }, []);

  // Test TUTTI i decolli con 7Timer!
  const run7TimerTests = useCallback(async () => {
    setTimerRunning(true);
    setTimerResults([]);
    setTimerSummary("");

    const siti = DECOLLI.slice(0, 8); // limitiamo a 8 per non stressare 7Timer!
    let okCount = 0;
    let totalTime = 0;

    for (let i = 0; i < siti.length; i++) {
      const d = siti[i];
      const start = performance.now();
      try {
        const { alive, responseTime, status } = await weatherService7Timer.healthCheck(d.lat, d.lon);
        const rt = Math.round(performance.now() - start);
        if (alive) okCount++;
        totalTime += rt;
        setTimerResults((prev) => [...prev, {
          nome: d.name,
          ok: alive,
          rt,
          err: status.startsWith("OK") ? undefined : status,
        }]);
      } catch (err) {
        setTimerResults((prev) => [...prev, {
          nome: d.name,
          ok: false,
          rt: Math.round(performance.now() - start),
          err: err instanceof Error ? err.message : String(err),
        }]);
      }
      setTimerProgress(Math.round(((i + 1) / siti.length) * 100));

      if (i < siti.length - 1) {
        await new Promise(r => setTimeout(r, 2000));
      }
    }

    const avg = siti.length > 0 ? Math.round(totalTime / siti.length) : 0;
    setTimerSummary(`✅ ${okCount}/${siti.length} OK · ❌ ${siti.length - okCount} falliti · ⏱️ ${avg}ms media`);
    setTimerRunning(false);
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950/98 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50 bg-slate-900/80 shrink-0">
        <div className="flex items-center gap-3">
          <Radar className="w-5 h-5 text-emerald-400" />
          <span className="text-sm font-bold text-white">
            Meteo Tester
          </span>
        </div>
        <button onClick={handleClose} className="text-slate-400 hover:text-white px-2 py-1 rounded">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-6">
        {/* === SEZIONE OPEN-METEO === */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Server className="w-5 h-5 text-sky-400" />
              <h2 className="text-base font-bold text-white">Open-Meteo</h2>
              <span className="text-[10px] text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">{DECOLLI.length} siti</span>
            </div>
            <button
              onClick={runOpenMeteoTests}
              disabled={omRunning}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-sky-700 hover:bg-sky-600 text-xs font-bold text-white disabled:opacity-50"
            >
              {omRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
              {omRunning ? `${omProgress}%...` : "Test tutti i siti"}
            </button>
          </div>

          {omRunning && (
            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden mb-2">
              <div className="h-full bg-sky-500 transition-all duration-500" style={{ width: `${omProgress}%` }} />
            </div>
          )}

          {omSummary && (
            <div className="bg-sky-900/20 border border-sky-500/40 rounded-xl px-4 py-2 text-sm text-sky-300 mb-2">
              {omSummary}
            </div>
          )}

          {omResults.length > 0 && (
            <div className="space-y-1">
              {omResults.map((r, i) => (
                <div key={i} className={`rounded-lg px-3 py-2 border text-xs flex items-center gap-3 ${
                  r.success ? "bg-slate-800/40 border-slate-700/30" : "bg-red-900/20 border-red-800/40"
                }`}>
                  {r.success ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> : <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />}
                  <span className="font-bold text-white truncate flex-1">{r.siteName}</span>
                  <span className="text-slate-500">{r.responseTimeMs}ms</span>
                  {r.warnings.length > 0 && <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* === SEZIONE 7TIMER! === */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Radar className="w-5 h-5 text-purple-400" />
              <h2 className="text-base font-bold text-white">7Timer!</h2>
              <span className="text-[10px] text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">8 siti</span>
            </div>
            <button
              onClick={run7TimerTests}
              disabled={timerRunning}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-purple-700 hover:bg-purple-600 text-xs font-bold text-white disabled:opacity-50"
            >
              {timerRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
              {timerRunning ? `${timerProgress}%...` : "Test siti"}
            </button>
          </div>

          {timerRunning && (
            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden mb-2">
              <div className="h-full bg-purple-500 transition-all duration-500" style={{ width: `${timerProgress}%` }} />
            </div>
          )}

          {timerSummary && (
            <div className="bg-purple-900/20 border border-purple-500/40 rounded-xl px-4 py-2 text-sm text-purple-300 mb-2">
              {timerSummary}
            </div>
          )}

          {timerResults.length > 0 && (
            <div className="space-y-1">
              {timerResults.map((r, i) => (
                <div key={i} className={`rounded-lg px-3 py-2 border text-xs flex items-center gap-3 ${
                  r.ok ? "bg-slate-800/40 border-slate-700/30" : "bg-red-900/20 border-red-800/40"
                }`}>
                  {r.ok ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> : <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />}
                  <span className="font-bold text-white truncate flex-1">{r.nome}</span>
                  <span className="text-slate-500">{r.rt}ms</span>
                  {!r.ok && r.err && <span className="text-red-300 text-[10px] truncate max-w-[150px]">{r.err}</span>}
                  {r.ok && r.temp != null && <span className="text-amber-300">{r.temp}°C</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default MeteoTesterPanel;