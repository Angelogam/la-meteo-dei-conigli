"use client";

import React, { useEffect, useState, useCallback } from "react";
import { DECOLLI } from "@/data/decolli";
import { fuseWeatherData, type FusionResult } from "@/services/weatherFusionService";
import { weatherService7Timer } from "@/services/weatherService7Timer";
import { CheckCircle, XCircle, AlertTriangle, Loader2, Clock, Server, Activity } from "lucide-react";

export default function FusionTestPage() {
  const [result, setResult] = useState<FusionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [dettaglio, setDettaglio] = useState<string[]>([]);
  const [timerOk, setTimerOk] = useState<boolean | null>(null);
  const [timerRt, setTimerRt] = useState(0);
  const [omOk, setOmOk] = useState<boolean | null>(null);
  const [omRt, setOmRt] = useState(0);
  const [fusionTime, setFusionTime] = useState(0);

  const addLog = useCallback((msg: string) => {
    setDettaglio(prev => [...prev, msg]);
  }, []);

  const eseguiTest = useCallback(async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    setDettaglio([]);
    addLog("🚀 Avvio test fusione dati meteo...");

    const site = DECOLLI?.[0];
    if (!site) {
      const msg = "❌ Errore: Nessun decollo trovato nell'array DECOLLI.";
      setError(msg);
      addLog(msg);
      setLoading(false);
      return;
    }

    addLog(`📍 Sito di test: ${site.name} (${site.lat}, ${site.lon})`);

    // 1. Test 7Timer! da solo
    addLog("📡 Test 7Timer!...");
    const start7t = performance.now();
    try {
      const health = await weatherService7Timer.healthCheck(site.lat, site.lon);
      const rt = Math.round(performance.now() - start7t);
      setTimerRt(rt);
      setTimerOk(health.alive);
      addLog(`   ${health.alive ? "✅" : "❌"} 7Timer! risponde in ${rt}ms`);
      if (!health.alive) addLog(`   Errore: ${health.error}`);
    } catch (err) {
      setTimerOk(false);
      addLog(`   ❌ 7Timer! errore: ${err}`);
    }

    // 2. Test Open-Meteo da solo
    addLog("📡 Test Open-Meteo...");
    const startOm = performance.now();
    try {
      const { ok } = await import("@/services/weatherService").then(m => m.weatherService.fetchWithFallback(site.lat, site.lon));
      const rt = Math.round(performance.now() - startOm);
      setOmRt(rt);
      setOmOk(ok);
      addLog(`   ${ok ? "✅" : "❌"} Open-Meteo risponde in ${rt}ms`);
    } catch (err) {
      setOmOk(false);
      addLog(`   ❌ Open-Meteo errore: ${err}`);
    }

    // 3. TEST FUSIONE
    addLog("🔀 Test fusione dati...");
    const startFusione = performance.now();
    try {
      const fusionResult = await fuseWeatherData(site.lat, site.lon, site.altitude);
      const ft = Math.round(performance.now() - startFusione);
      setFusionTime(ft);
      setResult(fusionResult);
      addLog("   ✅ Fusione completata!");
      addLog(`   ⏱️  Tempo: ${ft}ms`);
      addLog(`   📊 Ore fuse: ${fusionResult.hourly.length}`);
      addLog(`   📅 Giorni: ${fusionResult.daily.length}`);
      addLog(`   🔤 Fonti attive: ${fusionResult.fontiAttive.join(", ")}`);
      addLog(`   📈 Confidenza media: ${fusionResult.confidenzaMedia}%`);

      // Mostra alcune ore di esempio
      const esempi = fusionResult.hourly.filter(h => h.confidenza > 0).slice(0, 5);
      for (const h of esempi) {
        addLog(`   🕐 ${h.time.getHours()}:00 → ${h.temperature}°C, ${h.windSpeed} km/h, nuvole ${h.cloudCover}%, CAPE ${h.cape} J/kg (confidenza: ${h.confidenza}%)`);
      }

      if (fusionResult.warning.length > 0) {
        for (const w of fusionResult.warning) addLog(`   ⚠️ ${w}`);
      }

      addLog("✅✅✅ TEST COMPLETATO CON SUCCESSO!");
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setError(errMsg);
      addLog(`   ❌ Errore fusione: ${errMsg}`);
    }

    setLoading(false);
  }, [addLog]);

  useEffect(() => {
    eseguiTest();
  }, [eseguiTest]);

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-emerald-400 mb-2">🧪 Test Fusione Dati Meteo</h1>
        <p className="<p className="text-sm text-slate-400 mb-6">Verifica che Open-Meteo + 7Timer! funzionino e producano dati coerenti</p>

        {/* Statistiche rapide */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className={`rounded-xl p-4 border ${timerOk === true ? "bg-emerald-900/20 border-emerald-500/40" : timerOk === false ? "bg-red-900/20 border-red-500/40" : "bg-slate-800/40 border-slate-700/40"}`}>
            <div className="flex items-center gap-2 text-sm mb-1">
              <Server className="w-4 h-4" />
              <span className="text-slate-400">7Timer!</span>
              {timerOk === true && <CheckCircle className="w-4 h-4 text-emerald-400 ml-auto" />}
              {timerOk === false && <XCircle className="w-4 h-4 text-red-400 ml-auto" />}
            </div>
            <div className="text-lg font-bold">{timerOk === true ? "✅ Online" : timerOk === false ? "❌ Offline" : "..."}</div>
            <div className="text-xs text-slate-500">{timerRt > 0 ? `${timerRt}ms` : ""}</div>
          </div>

          <div className={`rounded-xl p-4 border ${omOk === true ? "bg-emerald-900/20 border-emerald-500/40" : omOk === false ? "bg-red-900/20 border-red-500/40" : "bg-slate-800/40 border-slate-700/40"}`}>
            <div className="flex items-center gap-2 text-sm mb-1">
              <Server className="w-4 h-4" />
              <span className="text-slate-400">Open-Meteo</span>
              {omOk === true && <CheckCircle className="w-4 h-4 text-emerald-400 ml-auto" />}
              {omOk === false && <XCircle className="w-4 h-4 text-red-400 ml-auto" />}
            </div>
            <div className="text-lg font-bold">{omOk === true ? "✅ Online" : omOk === false ? "❌ Offline" : "..."}</div>
            <div className="text-xs text-slate-500">{omRt > 0 ? `${omRt}ms` : ""}</div>
          </div>

          <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-4">
            <div className="flex items-center gap-2 text-sm mb-1">
              <Clock className="w-4 h-4 text-amber-400" />
              <span className="text-slate-400">Fusione</span>
            </div>
            <div className="text-lg font-bold">{fusionTime > 0 ? `${fusionTime}ms` : "..."}</div>
            <div className="text-xs text-slate-500">{result ? `${result.confidenzaMedia}% confidenza` : ""}</div>
          </div>
        </div>

        {/* Log dettagliato */}
        <div className="bg-slate-900/80 border border-slate-700/50 rounded-xl p-4">
          <h2 className="text-sm font-bold text-slate-300 mb-3 flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            Log dettagliato
            {loading && <Loader2 className="w-4 h-4 text-emerald-400 animate-spin ml-auto" />}
          </h2>
          <div className="font-mono text-xs leading-6 space-y-0.5 max-h-80 overflow-y-auto">
            {dettaglio.map((line, i) => {
              const isError = line.includes("❌") || line.includes("Errore");
              const isSuccess = line.includes("✅") || line.includes("completato");
              const isWarning = line.includes("⚠️");
              return (
                <div
                  key={i}
                  className={`${
                    isError ? "text-red-400" : isSuccess ? "text-emerald-400" : isWarning ? "text-amber-400" : "text-slate-400"
                  }`}
                >
                  {line}
                </div>
              );
            })}
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

        <div className="mt-6 text-center">
          <button
            onClick={eseguiTest}
            disabled={loading}
            className="px-6 py-3 bg-emerald-700 hover:bg-emerald-600 text-white font-bold rounded-xl disabled:opacity-50 transition-all cursor-pointer"
          >
            {loading ? "Test in corso..." : "🔄 Esegui nuovo test"}
          </button>
        </div>

        {result && (
          <div className="mt-6 bg-slate-800/40 border border-slate-700/40 rounded-xl p-4">
            <h2 className="text-sm font-bold text-slate-300 mb-3">📊 Anteprima dati fusi (prime 8 ore)</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-700/30 text-slate-500">
                    <th className="p-2 text-left">Ora</th>
                    <th className="p-2 text-left">Temp</th>
                    <th className="p-2 text-left">Vento</th>
                    <th className="p-2 text-left">Nuvole</th>
                    <th className="p-2 text-left">CAPE</th>
                    <th className="p-2 text-left">LI</th>
                    <th className="p-2 text-left">Confidenza</th>
                  </tr>
                </thead>
                <tbody>
                  {result.hourly.slice(0, 8).map((h) => (
                    <tr key={h.time.getTime()} className="border-b border-slate-700/20">
                      <td className="p-2 font-bold text-white">{h.time.getHours()}:00</td>
                      <td className="p-2 text-amber-300">{h.temperature}°C</td>
                      <td className="p-2 text-cyan-300">{h.windSpeed} km/h</td>
                      <td className="p-2 text-slate-300">{h.cloudCover}%</td>
                      <td className="p-2 text-purple-300">{h.cape} J/kg</td>
                      <td className="p-2 text-sky-300">{h.liftedIndex}</td>
                      <td className="p-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          h.confidenza >= 80 ? "bg-emerald-900/40 text-emerald-300" :
                          h.confidenza >= 60 ? "bg-amber-900/40 text-amber-300" :
                          "bg-red-900/40 text-red-300"
                        }`}>
                          {h.confidenza}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}