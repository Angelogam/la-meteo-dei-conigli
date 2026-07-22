"use client";

import React, { useState, useCallback } from "react";
import { DECOLLI } from "@/data/decolli";
import { weatherService7Timer } from "@/services/weatherService7Timer";
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
  CloudSun,
  Clock,
  BarChart3,
} from "lucide-react";

interface MeteoTesterPanelProps {
  onClose?: () => void;
}

function Card({
  title,
  icon,
  subtitle,
  results,
  resultsLength,
  summary,
  isRunning,
  progress,
  onStart,
  color,
}: {
  title: string;
  icon: React.ReactNode;
  subtitle: string;
  results: any[];
  resultsLength: number;
  summary: string | null;
  isRunning: boolean;
  progress: number;
  onStart: () => void;
  color: "sky" | "purple";
}) {
  const btnColor = color === "sky"
    ? "bg-sky-700 hover:bg-sky-600"
    : "bg-purple-700 hover:bg-purple-600";
  const bgColor = color === "sky"
    ? "bg-sky-900/20 border-sky-500/40"
    : "bg-purple-900/20 border-purple-500/40";
  const ringColor = color === "sky" ? "ring-sky-400" : "ring-purple-400";

  return (
    <div className="bg-slate-900/80 border border-slate-700/50 rounded-2xl p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl bg-slate-800/80 border border-slate-600/50 flex items-center justify-center ${ringColor} ring-1`}>
            {icon}
          </div>
          <div>
            <h3 className="text-base font-bold text-white">{title}</h3>
            <p className="text-xs text-slate-400">{subtitle}</p>
          </div>
        </div>
        <button
          onClick={onStart}
          disabled={isRunning}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed ${btnColor}`}
        >
          {isRunning ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              {progress}%
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5" />
              Avvia test
            </>
          )}
        </button>
      </div>

      {/* Barra di progresso */}
      {isRunning && (
        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden mb-3">
          <div
            className={`h-full transition-all duration-500 ${color === "sky" ? "bg-sky-500" : "bg-purple-500"}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Riepilogo */}
      {summary && (
        <div className={`rounded-xl px-4 py-2.5 text-sm mb-3 border ${bgColor}`}>
          <div className="flex items-center gap-2">
            {color === "sky" ? (
              <Server className="w-4 h-4 text-sky-300 shrink-0" />
            ) : (
              <Radar className="w-4 h-4 text-purple-300 shrink-0" />
            )}
            <span className={color === "sky" ? "text-sky-300" : "text-purple-300"}>
              {summary}
            </span>
          </div>
        </div>
      )}

      {/* Risultati */}
      {resultsLength > 0 && (
        <div className="space-y-1 max-h-64 overflow-y-auto">
          {results.map((r: any, i: number) => (
            <div
              key={i}
              className={`rounded-xl px-3 py-2.5 border text-xs flex items-center gap-3 transition-all ${
                (r.success ?? r.ok)
                  ? "bg-slate-800/60 border-slate-700/40 hover:bg-slate-700/60"
                  : "bg-red-900/20 border-red-800/40"
              }`}
            >
              {(r.success ?? r.ok) ? (
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <XCircle className="w-4 h-4 text-red-400 shrink-0" />
              )}
              <span className="font-bold text-white flex-1 truncate">
                {r.siteName || r.nome}
              </span>
              <span className="text-slate-500 shrink-0">
                {r.responseTimeMs || r.rt}ms
              </span>
              {r.warnings?.length > 0 && (
                <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
              )}
              {r.err && (
                <span className="text-red-300 text-[10px] truncate max-w-[120px] shrink-0">
                  {r.err}
                </span>
              )}
              {r.temp != null && (
                <span className="text-amber-300 font-bold shrink-0">
                  {r.temp}°
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Nessun dato */}
      {!isRunning && resultsLength === 0 && (
        <div className="text-center py-8 text-slate-500">
          <BarChart3 className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">Clicca "Avvia test" per iniziare</p>
        </div>
      )}
    </div>
  );
}

export default function MeteoTesterPanel({ onClose }: MeteoTesterPanelProps) {
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

    const siti = DECOLLI.slice(0, 8);
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
          <CloudSun className="w-5 h-5 text-amber-400" />
          <span className="text-base font-bold text-white">
            Meteo Tester
          </span>
        </div>
        <button onClick={handleClose} className="text-slate-400 hover:text-white px-2 py-1 rounded">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Card Open-Meteo */}
        <Card
          title="Open-Meteo"
          icon={<Server className="w-5 h-5 text-sky-400" />}
          subtitle={`${DECOLLI.length} siti · API ufficiale`}
          results={omResults}
          resultsLength={omResults.length}
          summary={omSummary}
          isRunning={omRunning}
          progress={omProgress}
          onStart={runOpenMeteoTests}
          color="sky"
        />

        {/* Card 7Timer! */}
        <Card
          title="7Timer! (GFS)"
          icon={<Radar className="w-5 h-5 text-purple-400" />}
          subtitle={`8 siti · Modello GFS`}
          results={timerResults}
          resultsLength={timerResults.length}
          summary={timerSummary}
          isRunning={timerRunning}
          progress={timerProgress}
          onStart={run7TimerTests}
          color="purple"
        />
      </div>
    </div>
  );
}