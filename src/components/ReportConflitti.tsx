DECOLLO_NAMES">
"use client";

import React, { useState, useCallback } from "react";
import {
  Play, X, XCircle, AlertTriangle, Info, CheckCircle, Activity,
  Thermometer, Wind, Cloud, Bug, MapPin, Calendar, Clock, TrendingUp,
  Server, RefreshCw, Gauge, Droplets, ArrowUp, Shield,
  Download,
} from "lucide-react";
import { diagnosticaMeteoCompleta, type ReportConflittoMeteo } from "@/utils/diagnosticaMeteo";

function formatTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

// Import DECOLLI from data/decolli
import { DECOLLI } from "@/data/decolli";

export default function ReportConflitti() {
  const [isOpen, setIsOpen] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [report, setReport] = useState<ReportConflittoMeteo | null>(null);
  const [log, setLog] = useState<string[]>([]);

  const addLog = useCallback((msg: string) => {
    const ts = new Date().toLocaleTimeString("it-IT");
    setLog(prev => [...prev, `[${ts}] ${msg}`].slice(-200));
  }, []);

  const avviaDiagnostica = useCallback(async () => {
    setIsRunning(true);
    setReport(null);
    setLog([]);
    addLog("🚀 Avvio diagnostica meteo completa su TUTTI i decolli...");
    addLog(`📡 ${DECOLLI.length} decolli da verificare con richieste reali a Open-Meteo`);
    addLog("⏱️ Tempo stimato: ~30 secondi (delay 2s tra ogni richiesta)");
    addLog("");

    try {
      const res = await diagnosticaMeteoCompleta();
      setReport(res);
      setIsRunning(false);

      addLog("");
      addLog("=== DIAGNOSTICA COMPLETATA ===");
      addLog(`✅ ${res.decolliConDati}/${res.totaleDecolli} decolli con dati ok`);
      addLog(`❌ ${res.decolliSenzaDati} senza dati · ⚠ ${res.decolliConAnomalie} con anomalie`);
      addLog(`📊 Media API: ${res.statistiche.apiMediaRisposta}ms`);
      addLog(`🌡️ Temperature: ${res.statistiche.temperatureMin}°C ~ ${res.statistiche.temperatureMax}°C`);
      addLog(`💨 Vento max: ${res.statistiche.ventoMax} km/h`);
      addLog(`☁️ Nuvolosità media: ${res.statistiche.nuvoleMedia}%`);
      addLog("");

      // Test calcoli
      for (const t of res.testCalcoli) {
        addLog(t.ok ? `  ✅ ${t.dettaglio}` : `  ❌ ${t.dettaglio}`);
      }
      addLog("");

      if (res.errori.length === 0) {
        addLog("✅✅✅ NESSUN ERRORE RILEVATO!");
      } else {
        addLog(`❌ ${res.errori.length} errori trovati:`);
        for (const e of res.errori) addLog(`  ❌ ${e}`);
      }
      if (res.warning.length > 0) {
        addLog(`⚠️ ${res.warning.length} warning:`);
        for (const w of res.warning) addLog(`  ⚠️ ${w}`);
      }
    } catch (err) {
      addLog(`❌ ERRORE: ${err instanceof Error ? err.message : String(err)}`);
      setIsRunning(false);
    }
  }, [addLog]);

  const scaricaReport = useCallback(() => {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `report-conflitti-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    addLog("📥 Report scaricato");
  }, [report, addLog]);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-8 right-4 z-50 bg-amber-700 hover:bg-amber-600 text-amber-100 border border-amber-400/40 rounded-2xl px-4 py-2.5 shadow-2xl shadow-amber-500/20 flex items-center gap-2 font-bold text-sm"
        title="Report conflitti meteo"
      >
        <Bug className="w-5 h-5" />
        Report Meteo
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950/98 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50 bg-slate-900/80 shrink-0">
        <div className="flex items-center gap-3">
          <Bug className="w-5 h-5 text-amber-400" />
          <span className="text-sm font-bold text-white">Report Conflitti — Dati Meteo</span>
          {report && (
            <span className={`text-xs ${report.ok ? "text-green-400" : "text-red-400"}`}>
              {report.ok ? "✅ OK" : `❌ ${report.errori.length} errori`}
            </span>
          )}
          {report && report.warning.length > 0 && (
            <span className="text-xs text-amber-400">⚠️ {report.warning.length} warning</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={avviaDiagnostica}
            disabled={isRunning}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-700 hover:bg-amber-600 text-xs text-white disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5" />
            {isRunning ? "Analisi in corso..." : "Esegui diagnostica"}
          </button>
          {report && (
            <button
              onClick={scaricaReport}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300"
            >
              <Download className="w-3.5 h-3.5" />
              Report JSON
            </button>
          )}
          <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white px-} from "lucide-react";
import { diagnosticaMeteoCompleta, type ReportConflittoMeteo } from "@/utils/diagnosticaMeteo";

function formatTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

// Import DECOLLI from data/decolli
import { DECOLLI } from "@/data/decolli";

export default function ReportConflitti() {
  const [isOpen, setIsOpen] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [report, setReport] = useState<ReportConflittoMeteo | null>(null);
  const [log, setLog] = useState<string[]>([]);

  const addLog = useCallback((msg: string) => {
    const ts = new Date().toLocaleTimeString("it-IT");
    setLog(prev => [...prev, `[${ts}] ${msg}`].slice(-200));
  }, []);

  const avviaDiagnostica = useCallback(async () => {
    setIsRunning(true);
    setReport(null);
    setLog([]);
    addLog("🚀 Avvio diagnostica meteo completa su TUTTI i decolli...");
    addLog(`📡 ${DECOLLI.length} decolli da verificare con richieste reali a Open-Meteo`);
    addLog("⏱️ Tempo stimato: ~30 secondi (delay 2s tra ogni richiesta)");
    addLog("");

    try {
      const res = await diagnosticaMeteoCompleta();
      setReport(res);
      setIsRunning(false);

      addLog("");
      addLog("=== DIAGNOSTICA COMPLETATA ===");
      addLog(`✅ ${res.decolliConDati}/${res.totaleDecolli} decolli con dati ok`);
      addLog(`❌ ${res.decolliSenzaDati} senza dati · ⚠ ${res.decolliConAnomalie} con anomalie`);
      addLog(`📊 Media API: ${res.statistiche.apiMediaRisposta}ms`);
      addLog(`🌡️ Temperature: ${res.statistiche.temperatureMin}°C ~ ${res.statistiche.temperatureMax}°C`);
      addLog(`💨 Vento max: ${res.statistiche.ventoMax} km/h`);
      addLog(`☁️ Nuvolosità media: ${res.statistiche.nuvoleMedia}%`);
      addLog("");

      // Test calcoli
      for (const t of res.testCalcoli) {
        addLog(t.ok ? `  ✅ ${t.dettaglio}` : `  ❌ ${t.dettaglio}`);
      }
      addLog("");

      if (res.errori.length === 0) {
        addLog("✅✅✅ NESSUN ERRORE RILEVATO!");
      } else {
        addLog(`❌ ${res.errori.length} errori trovati:`);
        for (const e of res.errori) addLog(`  ❌ ${e}`);
      }
      if (res.warning.length > 0) {
        addLog(`⚠️ ${res.warning.length} warning:`);
        for (const w of res.warning) addLog(`  ⚠️ ${w}`);
      }
    } catch (err) {
      addLog(`❌ ERRORE: ${err instanceof Error ? err.message : String(err)}`);
      setIsRunning(false);
    }
  }, [addLog]);

  const scaricaReport = useCallback(() => {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `report-conflitti-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    addLog("📥 Report scaricato");
  }, [report, addLog]);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-8 right-4 z-50 bg-amber-700 hover:bg-amber-600 text-amber-100 border border-amber-400/40 rounded-2xl px-4 py-2.5 shadow-2xl shadow-amber-500/20 flex items-center gap-2 font-bold text-sm"
        title="Report conflitti meteo"
      >
        <Bug className="w-5 h-5" />
        Report Meteo
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950/98 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50 bg-slate-900/80 shrink-0">
        <div className="flex items-center gap-3">
          <Bug className="w-5 h-5 text-amber-400" />
          <span className="text-sm font-bold text-white">Report Conflitti — Dati Meteo</span>
          {report && (
            <span className={`text-xs ${report.ok ? "text-green-400" : "text-red-400"}`}>
              {report.ok ? "✅ OK" : `❌ ${report.errori.length} errori`}
            </span>
          )}
          {report && report.warning.length > 0 && (
            <span className="text-xs text-amber-400">⚠️ {report.warning.length} warning</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={avviaDiagnostica}
            disabled={isRunning}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-700 hover:bg-amber-600 text-xs text-white disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5" />
            {isRunning ? "Analisi in corso..." : "Esegui diagnostica"}
          </button>
          {report && (
            <button
              onClick={scaricaReport}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300"
            >
              <Download className="w-3.5 h-3.5" />
              Report JSON
            </button>
          )}
          <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white px-2 py-1 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Pannello sinistro: riepilogo */}
        <div className="w-full lg:w-2/5 overflow-auto border-r border-slate-800/50 p-3 space-y-2">
          {report && (
            <>
              {/* Sezione riepilogo */}
              <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-white">Riepilogo diagnostica</h3>
                  <span className="text-[10px] text-slate-500">
                    {report.timestamp ? formatDate(report.timestamp) : ""}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="bg-slate-900/60 rounded-lg p-3 text-center">
                    <div className="text-xs text-slate-400 mb-1">Decolli testati</div>
                    <div className="text-lg font-bold text-white">{report.totaleDecolli}</div>
                  </div>
                  <div className="bg-slate-900/60 rounded-lg p-3 text-center">
                    <div className="text-xs text-slate-400 mb-1">Con dati OK</div>
                    <div className="text-lg font-bold text-green-400">{report.decolliConDati}</div>
                  </div>
                  <div className="bg-slate-900/60 rounded-lg p-3 text-center">
                    <div className="text-xs text-slate-400 mb-1">Senza dati</div>
                    <div className="text-lg font-bold text-red-400">{report.decolliSenzaDati}</div>
                  </div>
                  <div className="bg-slate-900/60 rounded-lg p-3 text-center">
                    <div className="text-xs text-slate-400 mb-1">Con anomalie</div>
                    <div className="text-lg font-bold text-amber-400">{report.decolliConAnomalie}</div>
                  </div>
                </div>

                {/* Barra stato */}
                <div className="mb-3">
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                    <span>Copertura dati</span>
                    <span>{report.totaleDecolli > 0 ? Math.round((report.decolliConDati / report.totaleDecolli) * 100) : 0}%</span>
                  </div>
                  <div className="h-2.5 bg-slate-700/50 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all"
                      style={{ width: `${report.totaleDecolli > 0 ? (report.decolliConDati / report.totaleDecolli) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                {/* Statistiche meteo */}
                <div className="bg-slate-900/40 rounded-lg p-3 space-y-1.5">
                  <div className="text-xs text-slate-500 font-bold mb-1">Statistiche dati</div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Server className="w-3 h-3 text-emerald-400" /> API risposta
                    </span>
                    <span className="font-bold text-white">{report.statistiche.apiMediaRisposta}ms media</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Thermometer className="w-3 h-3 text-amber-400" /> Temperature
                    </span>
                    <span className="font-bold text-white">
                      {report.statistiche.temperatureMin}°C ~ {report.statistiche.temperatureMax}°C
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Wind className="w-3 h-3 text-sky-400" /> Vento max
                    </span>
                    <span className="font-bold text-white">{report.statistiche.ventoMax} km/h</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Cloud className="w-3 h-3 text-slate-400" /> Nuvole media
                    </span>
                    <span className="font-bold text-white">{report.statistiche.nuvoleMedia}%</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Activity className="w-3 h-3" /> API OK/KO
                    </span>
                    <span className="font-bold text-white">
                      <span className="text-green-400">{report.statistiche.apiOk}</span>
                      /
                      <span className="text-red-400">{report.statistiche.apiKo}</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Test calcoli */}
              <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-3">
                <h4 className="text-xs font-bold text-slate-300 mb-2 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-emerald-400" /> Test calcoli
                </h4>
                {report.testCalcoli.map((t, i) => (
                  <div key={i} className={`flex items-center gap-2 py-1 text-xs ${t.ok ? "text-green-300" : "text-red-300"}`}>
                    {t.ok ? <CheckCircle className="w-3 h-3 shrink-0" /> : <XCircle className="w-3 h-3 shrink-0" />}
                    <span className="font-medium">{t.nome}</span>
                    <span className="text-slate-500 ml-auto">{t.dettaglio}</span>
                  </div>
                ))}
              </div>

              {/* Dettaglio decolli */}
              <div className="space-y-1.5">
                <h4 className="text-xs font-bold text-slate-300 px-1">Dettaglio decolli</h4>
                {report.dettaglioDecolli.map((d, i) => (
                  <div
                    key={i}
                    className={`rounded-xl p-2.5 border text-xs ${
                      d.datiOk
                        ? "bg-slate-800/30 border-slate-700/30"
                        : "bg-red-900/20 border-red-800/40"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        {d.datiOk
                          ? <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                          : <XCircle className="w-3.5 h-3.5 text-red-400" />
                        }
                        <span className="font-bold text-white">{d.nome}</span>
                      </div>
                      <span className="text-slate-500">{d.alt}m</span>
                    </div>
                    <div className="grid grid-cols-4 gap-1">
                      <span className={d.temperaturaOk ? "text-green-300" : "text-red-300"}>
                        <Thermometer className="w-3 h-3 inline mr-0.5" />T
                      </span>
                      <span className={d.ventoOk ? "text-sky-300" : "text-red-300"}>
                        <Wind className="w-3 h-3 inline mr-0.5" />V
                      </span>
                      <span className={d.nuvoleOk ? "text-slate-300" : "text-red-300"}>
                        <Cloud className="w-3 h-3 inline mr-0.5" />C
                      </span>
                      <span className={d.pressioneOk ? "text-purple-300" : "text-red-300"}>
                        <Gauge className="w-3 h-3 inline mr-0.5" />P
                      </span>
                    </div>
                    {d.ultimoAggiornamento && (
                      <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        {formatTime(d.ultimoAggiornamento)}
                      </div>
                    )}
                    {d.errore && (
                      <div className="text-[10px] text-red-400 mt-1">{d.errore}</div>
                    )}
                  </div>
                ))}
              </div>

              {/* Errori e warning */}
              {(report.errori.length > 0 || report.warning.length > 0) && (
                <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-3">
                  {report.errori.length > 0 && (
                    <>
                      <h4 className="text-xs font-bold text-red-400 mb-1.5 flex items-center gap-1">
                        <XCircle className="w-3.5 h-3.5" /> Errori ({report.errori.length})
                      </h4>
                      {report.errori.map((e, i) => (
                        <p key={i} className="text-[11px] text-red-300 py-0.5">• {e}</p>
                      ))}
                    </>
                  )}
                  {report.warning.length > 0 && (
                    <>
                      <h4 className="text-xs font-bold text-amber-400 mt-2 mb-1.5 flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" /> Warning ({report.warning.length})
                      </h4>
                      {report.warning.map((w, i) => (
                        <p key={i} className="text-[11px] text-amber-300 py-0.5">• {w}</p>
                      ))}
                    </>
                  )}
                </div>
              )}
            </>
          )}

          {!report && !isRunning && (
            <div className="text-center py-12 text-slate-500 text-sm">
              <Bug className="w-14 h-14 mx-auto mb-3 text-amber-500/40" />
              <p className="font-bold mb-1">Report Conflitti Dati Meteo</p>
              <p className="text-xs">Verifica che tutti i decolli abbiano dati aggiornati</p>
              <p className="text-xs mt-2 text-slate-600">
                Premi "Esegui diagnostica" per iniziare
              </p>
            </div>
          )}

          {isRunning && (
            <div className="text-center py-12">
              <div className="w-10 h-10 rounded-full border-4 border-amber-500/20 border-t-amber-400 animate-spin mx-auto mb-4" />
              <p className="text-amber-300 text-sm font-bold">Analisi in corso...</p>
              <p className="text-slate-500 text-xs mt-1">Verifico tutti i decolli con dati reali Open-Meteo</p>
            </div>
          )}
        </div>

        {/* Pannello destro: log */}
        <div className="flex-1 overflow-auto p-3 font-mono">
          <div className="text-[10px] leading-5 whitespace-pre-wrap">
            {log.length === 0 && (
              <div className="text-center py-12 text-slate-600 text-xs">
                Log vuoto. Premi "Esegui diagnostica" per iniziare.
              </div>
            )}
            {log.map((line, i) => (
              <div
                key={i}
                className={
                  line.includes("✅") ? "text-green-400" :
                  line.includes("❌") ? "text-red-400" :
                  line.includes("⚠️") ? "text-amber-400" :
                  line.includes("===") ? "text-cyan-400 font-bold" :
                  line.includes("🚀") ? "text-amber-400 font-bold" :
                  line.includes("📡") ? "text-amber-300" :
                  line.includes("NON") ? "text-red-400 font-bold" :
                  line.includes("OK") ? "text-green-400 font-bold" :
                  "text-slate-400"
                }
              >
                {line}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}