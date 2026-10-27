"use client";

import React from "react";
import { AlertTriangle, RefreshCw, CloudOff } from "lucide-react";

interface ErrorScreenProps {
  error: string;
  onRetry: () => void;
}

export default function ErrorScreen({ error, onRetry }: ErrorScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-rose-950 p-6">
      <div className="bg-red-900/30 border border-red-500/30 rounded-2xl p-8 max-w-md w-full text-center">
        <div className="w-16 h-16 mx-auto rounded-full bg-red-500/15 flex items-center justify-center mb-4">
          <CloudOff className="w-8 h-8 text-red-400" />
        </div>
        <h2 className="text-lg font-bold text-slate-100 mb-2">Errore di caricamento</h2>
        <p className="text-sm text-red-300/80 mb-6 leading-relaxed">{error}</p>
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-all shadow-lg shadow-emerald-500/20"
        >
          <RefreshCw className="w-4 h-4" />
          Riprova
        </button>
      </div>
    </div>
  );
}