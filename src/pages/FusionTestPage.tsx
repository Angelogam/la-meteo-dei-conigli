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

    // Test 7Timer!
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

    // Test Open-Meteo
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

    // Test fusione
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
        <p className="text-sm text-slate-400 mb-6">Verifica che Open-Meteo + 7Timer! funzionino e producano dati coerenti</p>

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

          <div className="bg-slate-800/40 border border-slate-700/40<dyad-write path="src/pages/FusionTestPage.tsx" description="Complete concise rewrite of FusionTestPage with valid JSX">
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

    // Test 7Timer!
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

    // Test Open-Meteo
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

    // Test fusione
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
        <p className="text-sm text-slate-400 mb-6">Verifica che Open-Meteo + 7Timer! funzionino e producano dati coerenti</p>

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

          <div className="bg-slateYou're right, the file was too long and kept getting truncated. Here's a much shorter, complete version:

<dyad-write path="src/pages/FusionTestPage.tsx" description="Compact fixed version of FusionTestPage">
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
      const site = DECOLLI?.[0];
      if (!site) {
        setError("Nessun decollo trovato");
        setLoading(false);
        return;
      }

      addLog("🚀 Test Open-Meteo...");
      try {
        const { ok } = await import("@/services/weatherService").then(m => m.weatherService.fetchWithFallback(site.lat, site.lon));
        setStats(s => ({ ...s, om: ok }));
        addLog(ok ? "  ✅ Open-Meteo OK" : "  ❌ Open-Meteo fallito");
      } catch (e) {
        setStats(s => ({ ...s, om: false }));
        addLog(`  ❌ Open-Meteo errore: ${e}`);
      }

      addLog("🚀 Test 7Timer!...");
      try {
        const health = await weatherService7Timer.healthCheck(site.lat, site.lon);
        setStats(s => ({ ...s, timer: health.alive }));
        addLog(health.alive ? "  ✅ 7Timer! OK" : `  ❌ 7Timer! fallito (${health.error})`);
      } catch (e) {
        setStats(s => ({ ...s, timer: false }));
        addLog(`  ❌ 7Timer! errore: ${e}`);
      }

      addLog("🔀 Test fusione...");
      try {
        const res = await fuseWeatherData(site.lat, site.lon, site.altitude);
        addLog(`  ✅ Fusione completata: ${res.hourly.length} ore, confidenza ${res.confidenzaMedia}%`);
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