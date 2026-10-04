"use client";

import React, { useState, useEffect } from "react";
import { Activity, CheckCircle, XCircle, Loader2 } from "lucide-react";

export default function ApiHealthCheck() {
  const [status, setStatus] = useState<"checking" | "ok" | "error">("checking");
  const [details, setDetails] = useState<string>("");

  useEffect(() => {
    async function check() {
      try {
        const url = "/api/people";
        const res = await fetch(url);
        const text = await res.text();
        console.log(`[API Health] ${url} → ${res.status} ${text.substring(0, 200)}`);

        if (res.ok) {
          setStatus("ok");
          setDetails(`${res.status} OK — Risposta: ${text.substring(0, 200)}`);
        } else {
          setStatus("error");
          setDetails(`${res.status} ${res.statusText} — ${text.substring(0, 200)}`);
        }
      } catch (err: any) {
        setStatus("error");
        setDetails(`Errore di rete: ${err.message}`);
        console.error("[API Health] Error:", err);
      }
    }
    check();
  }, []);

  return (
    <div className="bg-slate-900/80 border border-slate-700/50 rounded-2xl p-4 space-y-3">
      <h3 className="text-sm font-bold text-white flex items-center gap-2">
        <Activity className="w-4 h-4 text-cyan-400" />
        Status API — Debug
      </h3>
      <div className="flex items-center gap-3">
        {status === "checking" && (
          <Loader2 className="w-5 h-5 text-amber-400 animate-spin" />
        )}
        {status === "ok" && (
          <CheckCircle className="w-5 h-5 text-emerald-400" />
        )}
        {status === "error" && (
          <XCircle className="w-5 h-5 text-red-400" />
        )}
        <span className={`text-sm font-medium ${
          status === "ok" ? "text-emerald-400" :
          status === "error" ? "text-red-400" : "text-amber-400"
        }`}>
          {status === "checking" ? "Verifica in corso..." :
           status === "ok" ? "✅ API Funzionante" : "❌ API Non Disponibile"}
        </span>
      </div>
      {details && (
        <p className="text-xs text-slate-400 font-mono break-all bg-slate-950/50 p-2 rounded-lg">
          {details}
        </p>
      )}
      <p className="text-[10px] text-slate-500">
        Endpoint: <code className="text-cyan-400">/api/people</code>
        &nbsp;|&nbsp; Porta server: <code className="text-slate-400">8080</code>
        &nbsp;|&nbsp; Preview: <code className="text-slate-400">{window.location.port || "32100"}</code>
      </p>
    </div>
  );
}
