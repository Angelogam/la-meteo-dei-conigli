"use client";

import React, { useEffect, useState } from "react";
import { DECOLLI } from "@/data/decolli";
import { weatherService } from "@/services/openMeteoService";
import { Loader2, CheckCircle, XCircle, Clock } from "lucide-react";

export default function ApiTestPage() {
  const [omStatus, setOmStatus] = useState<{ ok: boolean; rt: number; temp?: number } | null>(null);
  const [timerStatus, setTimerStatus] = useState<{ ok: boolean; rt: number; temp?: number } | null>(null);
  const [loadingOM, setLoadingOM] = useState(true);
  const [loading7T, setLoading7T] = useState(true);

  useEffect(() => {
    const site = DECOLLI[0];

    weatherService.fetchCurrent(site.lat, site.lon)
      .then(current => {
        setOmStatus({ ok: true, rt: 0, temp: Math.round(current?.temperature ?? 0) });
        setLoadingOM(false);
      })
      .catch(() => {
        setOmStatus({ ok: false, rt: 0 });
        setLoadingOM(false);
      });

    fetch(
      `https://www.7timer.info/bin/astro.php?lon=${site.lon}&lat=${site.lat}&ac=0&unit=metric&output=json&tzshift=0`
    )
      .then(r => r.json())
      .then(data => {
        const temp = data.dataseries?.[0]?.temp2m;
        setTimerStatus({ ok: true, rt: 0, temp });
        setLoading7T(false);
      })
      .catch(() => {
        setTimerStatus({ ok: false, rt: 0 });
        setLoading7T(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-md mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-emerald-400 text-center">
          🧪 Test API Meteo
        </h1>
        <p className="text-sm text-slate-400 text-center">
          Verifica rapida su <strong>{DECOLLI[0].name}</strong>
        </p>

        <div className={`rounded-2xl p-5 border-2 ${
          loadingOM
            ? "bg-slate-800/40 border-slate-700/40"
            : omStatus?.ok
              ? "bg-emerald-900/20 border-emerald-500/40"
              : "bg-red-900/20 border-red-500/40"
        }`}>
          <div className="flex items-center gap-3 mb-2">
            {loadingOM ? (
              <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
            ) : omStatus?.ok ? (
              <CheckCircle className="w-6 h-6 text-emerald-400" />
            ) : (
              <XCircle className="w-6 h-6 text-red-400" />
            )}
            <div>
              <div className="text-lg font-bold text-white">Open-Meteo</div>
              <div className="text-xs text-slate-400">
                {loadingOM ? "Interrogazione in corso..." : omStatus?.ok ? "✅ API funzionante" : "❌ API non risponde"}
              </div>
            </div>
          </div>
          {omStatus?.ok && omStatus.temp != null && (
            <div className="text-2xl font-bold text-amber-300 text-center mt-2">
              {omStatus.temp}°C
            </div>
          )}
        </div>

        <div className={`rounded-2xl p-5 border-2 ${
          loading7T
            ? "bg-slate-800/40 border-slate-700/40"
            : timerStatus?.ok
              ? "bg-emerald-900/20 border-emerald-500/40"
              : "bg-red-900/20 border-red-500/40"
        }`}>
          <div className="flex items-center gap-3 mb-2">
            {loading7T ? (
              <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
            ) : timerStatus?.ok ? (
              <CheckCircle className="w-6 h-6 text-emerald-400" />
            ) : (
              <XCircle className="w-6 h-6 text-red-400" />
            )}
            <div>
              <div className="text-lg font-bold text-white">7Timer! (GFS)</div>
              <div className="text-xs text-slate-400">
                {loading7T ? "Interrogazione in corso..." : timerStatus?.ok ? "✅ API funzionante" : "❌ API non risponde"}
              </div>
            </div>
          </div>
          {timerStatus?.ok && timerStatus.temp != null && (
            <div className="text-2xl font-bold text-cyan-300 text-center mt-2">
              {timerStatus.temp}°C
            </div>
          )}
        </div>
      </div>
    </div>
  );
}