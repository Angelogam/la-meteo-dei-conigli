"use client";

import React, { useState } from "react";
import { DECOLLI } from "@/data/decolli";
import {
  testSingleSite,
  type TestResult,
} from "@/utils/meteoTester";
import {
  Play,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  Server,
} from "lucide-react";

export default function MeteoQuickTest() {
  // Open-Meteo
  const [omRunning, setOmRunning] = useState(false);
  const [omResults, setOmResults] = useState<TestResult[]>([]);
  const [omSummary, setOmSummary] = useState<string | null>(null);
  const [omProgress, setOmProgress] = useState(0);

  // Test Open-Meteo
  const runOm = async () => {
    setOmRunning(true);
    setOmResults([]);
    setOmSummary(null);

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
          <div className="text-sm font-bold text-white">Test API</div>
          <div className="text-[10px] text-sky-300/70">{DECOLLI.length} siti · Open-Meteo</div>
        </div>
        {omRunning && (
          <div className="flex items-center gap-1">
            <Loader2 className="w-4 h-4 text-sky-400 animate-spin shrink-0" />
            <span className="text-xs text-sky-300">{omProgress}%</span>
          </div>
        )}
        {!omRunning && omResults.length === 0 && <Play className="w-5 h-5 text-sky-400 shrink-0" />}
      </button>

      {/* Barra di progresso */}
      {omRunning && (
        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div className="h-full bg-sky-500 transition-all duration-500" style={{ width: `${omProgress}%` }} />
        </div>
      )}

      {/* Riepilogo */}
      {omSummary && (
        <div className="bg-sky-900/20 border border-sky-500/30 rounded-xl p-3 text-xs">
          <div className="text-sky-300 font-bold mb-1">{omSummary}</div>
          <div className="space-y-1 mt-2">
            {omResults.slice(-10).reverse().map((r, i) => (
              <div key={i} className="flex items-center gap-2 text-slate-400">
                {r.success ? <CheckCircle className="w-3 h-3 text-emerald-400 shrink-0" /> : <XCircle className="w-3 h-3 text-red-400 shrink-0" />}
                <span className="truncate flex-1">{r.siteName}</span>
                <span>{r.responseTimeMs}ms</span>
                {r.warnings.length > 0 && <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />}
              </div>
            ))}
          </div>
        </div>
      )}

      {!omRunning && omResults.length > 0 && !omSummary && (
        <div className="text-center py-6 text-slate-500 text-sm">
          <Server className="w-8 h-8 mx-auto mb-2 opacity-40" />
          Clicca "Test API" per iniziare
        </div>
      )}
    </div>
  );
}