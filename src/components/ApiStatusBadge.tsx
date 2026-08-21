"use client";

import React, { useEffect, useState } from "react";
import { Server, CheckCircle, XCircle, Loader2, Bug, Database, RefreshCw } from "lucide-react";
import { weatherService } from "@/services/weatherService";

type ApiStatus = "loading" | "online" | "offline" | "cached";

interface ApiStatusBadgeProps {
  onOpenTester?: () => void;
}

export default function ApiStatusBadge({ onOpenTester }: ApiStatusBadgeProps) {
  const [omStatus, setOmStatus] = useState<ApiStatus>("loading");
  const [timerStatus, setTimerStatus] = useState<ApiStatus>("loading");
  const [cacheStats, setCacheStats] = useState<{ entries: number; size: number } | null>(null);

  useEffect(() => {
    let mounted = true;

    // Test Open-Meteo
    const testOM = async () => {
      try {
        const res = await fetch("https://api.open-meteo.com/v1/forecast?latitude=44.2587&longitude=7.7943&hourly=temperature_2m&forecast_days=1&timezone=Europe/Rome");
        if (mounted) setOmStatus(res.ok ? "online" : "offline");
      } catch {
        if (mounted) setOmStatus("offline");
      }
    };

    // Test 7Timer!
    const test7T = async () => {
      try {
        const res = await fetch("https://www.7timer.info/bin/astro.php?lon=7.7943&lat=44.2587&ac=0&unit=metric&output=json&tzshift=0");
        if (mounted) setTimerStatus(res.ok ? "online" : "offline");
      } catch {
        if (mounted) setTimerStatus("offline");
      }
    };

    // Get cache stats
    const getCache = async () => {
      try {
        const stats = await weatherService.getCacheStats();
        if (mounted) setCacheStats(stats);
      } catch {}
    };

    testOM();
    test7T();
    getCache();

    const interval = setInterval(() => {
      testOM();
      test7T();
      getCache();
    }, 60000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const icon = (s: ApiStatus) =>
    s === "loading" ? <Loader2 className="w-3 h-3 animate-spin text-slate-400" /> :
    s === "online" ? <CheckCircle className="w-3 h-3 text-emerald-400" /> :
    s === "cached" ? <Database className="w-3 h-3 text-amber-400" /> :
    <XCircle className="w-3 h-3 text-red-400" />;

  return (
    <button
      onClick={onOpenTester}
      className="w-full flex items-center gap-3 px-3 py-2 rounded-xl bg-slate-800/50 border border-slate-700/40 text-[10px] hover:bg-slate-700/50 hover:border-emerald-500/40 transition-all cursor-pointer text-left"
    >
      <Server className="w-4 h-4 text-slate-400 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="flex items-center gap-1 text-slate-400">
            {icon(omStatus)}
            <span className="font-medium">Open-Meteo</span>
          </span>
          <span className="w-px h-3 bg-slate-700" />
          <span className="flex items-center gap-1 text-slate-400">
            {icon(timerStatus)}
            <span className="font-medium">7Timer!</span>
          </span>
        </div>
        <div className="text-[9px] text-slate-500 flex items-center gap-2">
          <Bug className="w-2.5 h-2.5" />
          Clicca per tester
          {cacheStats && (
            <>
              <span className="w-px h-3 bg-slate-700" />
              <Database className="w-2.5 h-2.5 text-amber-400" />
              <span>{cacheStats.entries} voci</span>
            </>
          )}
        </div>
      </div>
      <RefreshCw className="w-4 h-4 text-slate-500 hover:text-emerald-400 transition-colors" />
    </button>
  );
}