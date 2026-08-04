"use client";

import React, { useEffect, useState } from "react";
import { DECOLLI } from "@/data/decolli";
import { fuseWeatherData } from "@/services/weatherFusionService";
import { weatherService7Timer } from "@/services/weatherService7Timer";
import { CheckCircle, XCircle, AlertTriangle, Loader2, Server } from "lucide-react";

export default function FusionTestPage() {
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ om: null as boolean | null, timer: null as boolean | null });

  const addLog = (msg: string) => setLogs(prev => [...prev, msg]);

  useEffect(() => {
    const run = async () => {
      const site = DECOLLI[0];
      if (!site) {
        setError("Nessun decollo trovato");
        setLoading(false);
        return;
      }

      addLog("Test Open-Meteo...");
      try {
        const { ok } = await import("@/services/weatherService").then(m => m.weatherService.fetchWithFallback(site.lat, site.lon));
        setStats(s => ({ ...s, om: ok }));
        addLog(ok ? "  ✅ Open-Meteo OK" : "  ❌ Open-Meteo fallito");
      } catch (e) {
        setStats(s => ({ ...s, om: false }));
        addLog(`  ❌ Open-Meteo errore: ${e}`);
      }

      addLog("Test 7Timer!...");
      try {
        const health = await weatherService7Timer.healthCheck(site.lat, site.lon);
        setStats(s => ({ ...s, timer: health.alive }));
        addLog(health.alive ? "  ✅ 7Timer! OK" : `  ❌ 7Timer! fallito (${health.error})`);
      } catch (e) {
        setStats(s => ({ ...s, timer: false }));
        addLog(`  ❌ 7Timer! errore: ${e}`);
      }

      addLog("Test fusione...");
      try {
        const res = await fuseWeatherData(site.lat, site.lon, site.altitude);
        addLog(`  ✅ Fusione: ${res.hourly.length} ore, confidenza ${res.confidenzaMedia}%`);
        addLog(`  📌 Fonti: ${res.fontiAttive.join(", ")}`);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        addLog(`  ❌ Fusione errore: ${e}`);
      }

      setLoading(false);
    };

    run();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-emerald-400 mb-2">🧪 Test Fusione Dati Meteo</h1>
        <p className="text-sm text-slate-400 mb-4">Verifica che Open-Meteo + 7Timer! funzionino e producano dati coerenti</p>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className={`rounded-xl p-4 border ${stats.om === true ? "bg-emerald-900/20 border-emerald-500/40" : stats.om === false ? "bg-red-900/20 border-red-500/40" : "bg-slate-800/40 border-slate-700/40"}`}>
            <div className="flex items-center gap-2 text-sm mb-1">
              <Server className="w-4 h-4" />
              <span className="text-slate-400">Open-Meteo</span>
              {stats.om === true && <CheckCircle className="w-4 h-4 text-emerald-400 ml-auto" />}
              {stats.om === false && <XCircle className="w-4 h-4 text-red-400 ml-auto" />}
            </div>
            <div className="text-lg font-bold">{stats.om === true ? "✅ Online" : stats.om === false ? "❌ Offline" : <Loader2 className="w-4 h-4 animate-spin" />}</div>
          </div>

          <div className={`rounded-xl p-4 border ${stats.timer === true ? "bg-emerald-900/20 border-emerald-500/40" : stats.timer === false ? "bg-red-900/20 border-red-500/40" : "bg-slate-800/40 border-slate-700/40"}`}>
            <div className="flex items-center gap-2 text-sm mb-1">
              <Server className="w-4 h-4" />
              <span className="text-slate-400">7Timer!</span>
              {stats.timer === true && <CheckCircle className="w-4 h-4 text-emerald-400 ml-auto" />}
              {stats.timer === false && <XCircle className="w-4 h-4 text-red-400 ml-auto" />}
            </div>
            <div className="text-lg font-bold">{stats.timer === true ? "✅ Online" : stats.timer === false ? "❌ Offline" : <Loader2 className="w-4 h-4 animate-spin" />}</div>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-700/50 rounded-xl p-4">
          <h2 className="text-sm font-bold text-slate-300 mb-3">Log dettagliato {loading && <Loader2 className="w-4 h-4 text-emerald-400 animate-spin inline ml-2" />}</h2>
          <div className="font-mono text-xs leading-6 max-h-80 overflow-y-auto space-y-0.5">
            {logs.map((line, i) => (
              <div key={i} className={line.includes("❌") || line.includes("Errore") ? "text-red-400" : line.includes("✅") ? "text-emerald-400" : line.includes("⚠️") ? "text-amber-400" : "text-slate-400"}>
                {line}
              </div>
            ))}
          </div>
        </div>

        {error && (
          <div className="mt-4 bg-red-900/30 border border-red-500/40 rounded-xl p-4 text-red-300 flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold mb-1">Errore globale:</div>
              {error}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}