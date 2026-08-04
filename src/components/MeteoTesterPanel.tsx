import React, { useState, useCallback } from "react";
import { DECOLLI } from "@/data/decolli";
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
  Zap,
} from "lucide-react";

export default function MeteoTesterPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [isRunning, setIsRunning] = useState(false);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 right-4 z-50 bg-purple-800 hover:bg-purple-700 text-purple-200 border border-purple-500/40 rounded-full p-3 shadow-2xl shadow-purple-500/10"
        title="Mega Test: 1000 richieste reali"
      >
        <Zap className="w-5 h-5" />
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950/98 flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50 bg-slate-900/80 shrink-0">
        <div className="flex items-center gap-3">
          <Zap className="w-5 h-5 text-purple-400" />
          <span className="text-sm font-bold text-white">Mega Test · 1000 richieste reali</span>
        </div>
        <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white px-2 py-1 rounded">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-auto p-3">
        <div className="text-center py-10 text-slate-500">
          <Zap className="w-12 h-12 mx-auto mb-3 text-purple-500/40" />
          <p className="font-bold mb-1">Mega Test Meteo</p>
          <p className="text-xs">Esegue 1000 richieste reali a Open-Meteo</p>
        </div>
      </div>
    </div>
  );
}