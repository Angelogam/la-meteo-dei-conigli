"use client";

import React, { useState, useEffect } from "react";
import { Wind, Loader2, AlertCircle, ChevronDown, ChevronUp, RefreshCw } from "lucide-react";

interface ProfiloVentoVerticaleProps {
  siteAlt: number;
  siteName?: string;
  lat?: number;
  lon?: number;
}

export default function ProfiloVentoVerticale({ siteAlt, siteName, lat = 44.2587, lon = 7.7943 }: ProfiloVentoVerticaleProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Wind className="w-4 h-4 text-cyan-400" />
        <h4 className="text-xs font-bold text-cyan-300 uppercase tracking-wider">
          Profilo vento verticale {siteName ? `· ${siteName}` : ""}
        </h4>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          <span className="text-sm">Caricamento profilo vento...</span>
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 py-6 text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : (
        <div className="text-sm text-slate-400">
          Profilo vento a {siteAlt}m — dati in arrivo dalla stazione {lat.toFixed(2)}, {lon.toFixed(2)}
        </div>
      )}
    </div>
  );
}