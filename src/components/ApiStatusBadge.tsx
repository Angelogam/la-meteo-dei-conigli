"use client";

import React, { useEffect, useState } from "react";
import { Server, CheckCircle, XCircle, Loader2, Bug } from "lucide-react";
import { getMeteoBaseUrl } from "@/config/apiConfig";

type ApiStatus = "loading" | "online" | "offline";

interface ApiStatusBadgeProps {
  onOpenTester?: () => void;
}

export default function ApiStatusBadge({ onOpenTester }: ApiStatusBadgeProps) {
  const [omStatus, setOmStatus] = useState<ApiStatus>("loading");
  const [timerStatus, setTimerStatus] = useState<ApiStatus>("loading");

  useEffect(() => {
    let mounted = true;

    // Test Open-Meteo
    const omUrl = new URL(`${getMeteoBaseUrl()}`);
    omUrl.searchParams.set("latitude", "44.2587");
    omUrl.searchParams.set("longitude", "7.7943");
    omUrl.searchParams.set("hourly", "temperature_2m");
    omUrl.searchParams.set("forecast_days", "1");
    omUrl.searchParams.set("timezone", "Europe/Rome");
    fetch(omUrl.toString())
      .then(r => { if (mounted) setOmStatus(r.ok ? "online" : "offline"); })
      .catch(() => { if (mounted) setOmStatus("offline"); });

    // Test 7Timer!
    fetch("https://www.7timer.info/bin/astro.php?lon=7.7943&lat=44.2587&ac=0&unit=metric&output=json&tzshift=0")
      .then(r => { if (mounted) setTimerStatus(r.ok ? "online" : "offline"); })
      .catch(() => { if (mounted) setTimerStatus("offline"); });

    return () => { mounted = false; };
  }, []);

  const icon = (s: ApiStatus) =>
    s === "loading" ? <Loader2 className="w-3 h-3 animate-spin text-slate-400" /> :
    s === "online" ? <CheckCircle className="w-3 h-3 text-emerald-400" /> :
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
        <div className="text-[9px] text-slate-500 flex items-center gap-1">
          <Bug className="w-2.5 h-2.5" />
          Clicca per aprire i tester
        </div>
      </div>
    </button>
  );
}