"use client";

import React, { useEffect, useState } from "react";
import { Server, CheckCircle, XCircle, Loader2 } from "lucide-react";

type ApiStatus = "loading" | "online" | "offline";

export default function ApiStatusBadge() {
  const [omStatus, setOmStatus] = useState<ApiStatus>("loading");
  const [timerStatus, setTimerStatus] = useState<ApiStatus>("loading");

  useEffect(() => {
    let mounted = true;

    // Test Open-Meteo
    fetch("https://api.open-meteo.com/v1/forecast?latitude=44.2587&longitude=7.7943&hourly=temperature_2m&forecast_days=1&timezone=Europe/Rome")
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
    <div className="flex items-center gap-3 px-3 py-1.5 rounded-lg bg-slate-800/50 border border-slate-700/40 text-[10px]">
      <Server className="w-3 h-3 text-slate-400" />
      <span className="flex items-center gap-1 text-slate-400">
        {icon(omStatus)}
        Open-Meteo
      </span>
      <span className="w-px h-3 bg-slate-700" />
      <span className="flex items-center gap-1 text-slate-400">
        {icon(timerStatus)}
        7Timer!
      </span>
    </div>
  );
}