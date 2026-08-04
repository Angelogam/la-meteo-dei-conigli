"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  Play,
  X,
  XCircle,
  AlertTriangle,
  Info,
  Activity,
  Clock,
  TrendingUp,
  Thermometer,
  Wind,
  Bug,
  Zap,
} from "lucide-react";
import {
  diagnosticaCompletaApp,
  type RisultatoDiagnostica,
} from "@/utils/diagnosticaApp";

export default function DiagnosticaPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [risultato, setRisultato] = useState<RisultatoDiagnostica | null>(null);

  const avviaDiagnostica = useCallback(async () => {
    setIsRunning(true);
    setRisultato(null);

    try {
      const res = await diagnosticaCompletaApp();
      setRisultato(res);
      setIsRunning(false);
    } catch (err) {
      setIsRunning(false);
    }
  }, []);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-50 bg-teal-800 hover:bg-teal-700 text-teal-200 border border-teal-500/40 rounded-full p-3 shadow-2xl shadow-teal-500/10"
        title="Diagnostica completa app"
      >
        <Activity className="w-5 h-5" />
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950/98 flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50 bg-slate-900/80 shrink-0">
        <div className="flex items-center gap-3">
          <Activity className="w-5 h-5 text-teal-400" />
          <span className="text-sm font-bold text-white">Diagnostica completa app</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={avviaDiagnostica} disabled={isRunning} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-600 text-xs text-white">
            <Play className="w-3.5 h-3.5" />
            {isRunning ? "Esecuzione..." : "Avvia diagnostica"}
          </button>
          <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white px-2 py-1 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-3">
        {!risultato && !isRunning && (
          <div className="text-center py-10 text-slate-500">
            <p className="font-bold mb-2">Diagnostica applicazione</p>
            <p className="text-xs">Verifica decolli, API meteo, calcoli e funzioni</p>
          </div>
        )}
        {risultato && (
          <div className="space-y-2">
            <div className="bg-green-900/20 border border-green-500/30 rounded-xl p-3 text-center">
              <span className="text-xs text-green-400">Test completati</span>
              <div className="text-2xl font-bold text-green-300">{risultato.testPassati}/{risultato.testEseguiti}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}