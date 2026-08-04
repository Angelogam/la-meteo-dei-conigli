import React, { useEffect, useState } from "react";
import { DECOLLI } from "@/data/decolli";
import { CheckCircle, XCircle, AlertTriangle, Loader2, Bug, Activity, Clock, TrendingUp } from "lucide-react";

export default function ValidazionePrevisioni() {
  return (
    <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-4">
      <h3 className="text-sm font-bold text-white mb-3">Validazione previsioni</h3>
      <p className="text-slate-400 text-sm">Validazione previsioni meteo</p>
    </div>
  );
}