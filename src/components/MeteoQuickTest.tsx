"use client";

import React, { useState } from "react";
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
} from "lucide-react";

export default function MeteoQuickTest() {
  // Open-Meteo
  const [omRunning, setOmRunning] = useState(false);
  const [omResults, setOmResults] = useState<TestResult[]>([]);
  const [omSummary, setOmSummary] = useState<string | null>(null);
  const [omProgress, setOmProgress] = useState(0);

  // 7Timer
  const [tRunning, setTRunning] = useState(false);
  const [tResults, setTResults] = useState<{ nome: string; ok: boolean; rt: number }[]>([]);
  const [tSummary, setTSummary] = useState<string | null>(null);
  const [tProgress, setTProgress] = useState(0);

  const [openView, setOpenView] = useState<"om" | "timer" | null>(null);

  // Test Open-Meteo
  const runOm = async () => {
    setOmRunning(true);
    setOmResults([]);
    setOmSummary(null);
    setOpenView("om");

    const sites = DECOLLI.map(d => ({
      id: d.id, name: d.name, lat: d.lat, lon: d.lon, alt: d.altitude, exposure: d.exposure,
    }));

    let ok = 0;
    let totalTime = 0;

    for (let i = 0; i < sites.length; i++) {
      const r = await testSingleSite(sites[i]);
      setOmResults(prev => [...prev, r]);
      setOmProgress(Math.round(((i + 1) / sites.length) * 100));
      if (r.success) ok++;
      totalTime += r.responseTimeMs;
      if (i < sites.length - 1) await new Promise(r => setTimeout(r, 1500));
    }

    const avg = sites.length > 0 ? Math.round(totalTime / sites.length) : 0;
    setOmSummary(`✅ ${ok}/${sites.length} OK · ❌ ${sites.length - ok} falliti · ⏱️ ${avg}ms media`);
    setOmRunning(false);
  };

  // Test 7Timer
  const runTimer = async () => {
    setTRunning(true);
    setTResults([]);
    setTSummary(null);
    setOpenView("timer");

    const siti = DECOLLI.slice(0, 8);
    let ok = 0;
    let totalTime = 0;

    for (let i = 0; i < siti.length; i++) {
      const d = siti[i];
      const start = performance.now();
      try {
        const { alive } = await weatherService7Timer.healthCheck(d.lat, d.lon);
        const rt = Math.round(performance.now() - start);
        if (alive) ok++;
        totalTime += rt;
        setTResults(prev => [...prev, { nome: d.name, ok: alive, rt }]);
      } catch {
        setTResults(prev => [...prev, { nome: d.name, ok: false, rt: Math.round(performance.now() - start) }]);
      }
      setTProgress(Math.round(((i + 1) / siti.length) * 100));
      if (i < siti.length - 1) await new Promise(r => setTimeout(r, 2000));
    }

    const avg = siti.length > 0 ? Math.round(totalTime / siti.length) : 0;
    setTSummary(`✅ ${ok}/${siti.length} OK · ❌ ${siti.length - ok} falliti · ⏱️ ${avg}ms media`);
    setTRunning(false);
  };

  return (
    <div className="space-y-2">
      {/* Pulsante Open-Meteo */}
      <button
        onClick={runOm}
        disabled={omRunning}
        className="w-full flex items-center gap-2.5 px-4 py-3 rounded-xl bg-sky-800/50 hover:bg-sky-700/60 border border-sky-500/40 text-left transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Server className="w-5 h-5 text-sky-400 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-white">Open-Meteo</div>
          <div className="text-[10px] text-sky-300/70">{DECOLLI.length} siti</div>
        </div>
        {omRunning ? (
          <Loader2 className="w-5 h-5 text-sky-400 animate-spin shrink-0" />
        ) : (
          <Play className="w-5 h-5 text-sky-400 shrink-0" />
        )}
      </button>

      {/* Risultati Open-Meteo */}
      {openView === "om" && omSummary && (
        <div className="bg-sky-900/20 border border-sky-500/30 rounded-xl p-3 text-xs space-y-1">
          <div className="text-sky-300 font-bold mb-1">{omSummary}</div>
          {omResults.slice(-10).reverse().map((r, i) => (
            <div key={i} className="flex items-center gap-2 text-slate-400">
              {r.success ? <CheckCircle className="w-3 h-3 text-emerald-400 shrink-0" /> : <XCircle className="w-3 h-3 text-red-400 shrink-0" />}
              <span className="truncate flex-1">{r.siteName}</span>
              <span>{r.responseTimeMs}ms</span>
            </div>
          ))}
        </div>
      )}

      {/* Pulsante 7Timer */}
      <button
        onClick={runTimer}
        disabled={tRunning}
        className="w-full flex items-center gap-2.5 px-4 py-3 rounded-xl bg-purple-800/50 hover:bg-purple-700/60 border border-purple-500/40 text-left transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Radar className="w-5 h-5 text-purple-400 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-white">7Timer!</div>
          <div className="text-[10px] text-purple-300/70">8 siti (GFS)</div>
        </div>
        {tRunning ? (
          <Loader2 className="w-5 h-5 text-purple-400 animate-spin shrink-0" />
        ) : (
          <Play className="w-5 h-5 text-purple-400 shrink-0" />
        )}
      </button>

      {/* Risultati 7Timer */}
      {openView === "timer" && tSummary && (
        <div className="bg-purple-900/20 border border-purple-500/30 rounded-xl p-3 text-xs space-y-1">
          <div className="text-purple-300 font-bold mb-1">{tSummary}</div>
          {tResults.slice(-8).reverse().map((r, i) => (
            <div key={i} className="flex items-center gap-2 text-slate-400">
              {r.ok ? <CheckCircle className="w-3 h-3 text-emerald-400 shrink-0" /> : <XCircle className="w-3 h-3 text-red-400 shrink-0" />}
              <span className="truncate flex-1">{r.nome}</span>
              <span>{r.rt}ms</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}