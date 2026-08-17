"use client";

import React, { useEffect, useState } from "react";
import { DECOLLI } from "@/data/decolli";

export default function DebugMeteo() {
  const [logs, setLogs] = useState<string[]>([]);
  const [rawData, setRawData] = useState<any>(null);

  useEffect(() => {
    const fetchDebug = async () => {
      // Prendo Bric Lombatera (Pian Munè)
      const site = DECOLLI.find(d => d.id === "pian-mune-bric-lombatera") || DECOLLI[0];
      
      const params = new URLSearchParams({
        latitude: site.lat.toString(),
        longitude: site.lon.toString(),
        hourly: "temperature_2m,precipitation,weather_code,cloud_cover,wind_speed_10m",
        daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum",
        timezone: "Europe/Rome",
        forecast_days: "3",
      });

      try {
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
        const data = await res.json();
        setRawData(data);

        const lines: string[] = [];
        
        // Stampa daily
        lines.push("=== DATI GIORNALIERI ===");
        for (let i = 0; i < data.daily.time.length; i++) {
          const d = new Date(data.daily.time[i]);
          lines.push(`Giorno ${i}: ${d.toLocaleDateString("it-IT")} | weather_code=${data.daily.weather_code[i]} | max=${data.daily.temperature_2m_max[i]}°C | min=${data.daily.temperature_2m_min[i]}°C | pioggia=${data.daily.precipitation_sum[i]}mm`);
        }

        lines.push("");
        lines.push("=== DATI ORARI (solo 8:00-19:00) ===");
        for (let i = 0; i < data.hourly.time.length; i++) {
          const t = new Date(data.hourly.time[i]);
          const hh = t.getHours();
          if (hh >= 8 && hh <= 19) {
            lines.push(`${t.toLocaleDateString("it-IT")} ${String(hh).padStart(2,"0")}:00 | temp=${data.hourly.temperature_2m[i]}°C | weather_code=${data.hourly.weather_code[i]} | nuvole=${data.hourly.cloud_cover[i]}% | pioggia=${data.hourly.precipitation[i]}mm | vento=${data.hourly.wind_speed_10m[i]}km/h`);
          }
        }

        setLogs(lines);
      } catch (err) {
        setLogs([`ERRORE: ${err}`]);
      }
    };

    fetchDebug();
  }, []);

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950/95 overflow-auto p-4 text-xs font-mono">
      <h2 className="text-lg font-bold text-green-400 mb-4">DEBUG DATI OPEN-METEO GREZZI</h2>
      <div className="space-y-1 text-slate-300">
        {logs.map((line, i) => (
          <div key={i}>{line}</div>
        ))}
      </div>
      {rawData && (
        <details className="mt-4">
          <summary className="text-green-400 cursor-pointer">JSON raw</summary>
          <pre className="text-[10px] text-slate-400 mt-2 whitespace-pre-wrap break-all">
            {JSON.stringify(rawData, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}