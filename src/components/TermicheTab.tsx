"use client";

import React, { useEffect, useState, useMemo } from "react";
import { HourData } from "@/types/meteo";
import type { MeteoCurrent } from "@/services/openMeteoService";
import { calcolaTermiche } from "@/utils/termiche";
import { Wind, Cloud, Droplets, TrendingUp, AlertTriangle, MapPin, Calendar } from "lucide-react";
import WindyPluginCard from "@/components/WindyPluginCard";

interface TermicheTabProps {
  currentData: HourData | MeteoCurrent | null;
  dayData: HourData[];
  site: { alt: number; lat: number; lon: number; name: string };
  selectedDay?: number;
}

interface WindyPluginResult {
  site: string;
  url: string;
  description: string;
  success: boolean;
  content?: string;
  error?: string;
}

function WindyPluginSection() {
  const [plugin, setPlugin] = useState<WindyPluginResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPlugin() {
      try {
        console.log("[WindyPlugin] Fetching...");
        const res = await fetch("/api/scrape-parapendio?site=windy_pg_soundings");
        console.log("[WindyPlugin] Status:", res.status, "ok:", res.ok);
        if (!res.ok) {
          setError(`HTTP ${res.status}: ${res.statusText}`);
          return;
        }
        const data = await res.json();
        console.log("[WindyPlugin] Data:", data);
        setPlugin(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        console.error("[WindyPlugin] Error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchPlugin();
    const timer = setTimeout(() => {
      if (!plugin && !error) {
        setError("Timeout — tentativo fallito");
        setLoading(false);
      }
    }, 10000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="bg-slate-900/90 border border-slate-700/50 rounded-2xl overflow-hidden shadow-xl mt-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800/80 to-slate-900/80 px-4 py-3 border-b border-slate-700/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base">🪂</span>
            <span className="text-sm font-black text-white">Windy Plugin PG Soundings</span>
          </div>
          <span className="text-xs text-slate-500 font-semibold">1.6.2</span>
        </div>
        <div className="mt-1 flex items-center gap-2">
          {loading && (
            <>
              <div className="w-3 h-3 rounded-full border-2 border-sky-500/20 border-t-sky-400 animate-spin" />
              <span className="text-[10px] text-sky-400 font-semibold">Caricamento…</span>
            </>
          )}
          {!loading && error && (
            <span className="text-[10px] text-rose-400 font-semibold">⚠ Errore</span>
          )}
          {!loading && plugin?.success && (
            <span className="text-[10px] text-emerald-400 font-semibold">✓ Caricato</span>
          )}
          {!loading && !plugin && !error && (
            <span className="text-[10px] text-slate-500 font-semibold">In attesa…</span>
          )}
        </div>
      </div>

      {/* Corpo */}
      <div className="p-4">
        {loading && !plugin && (
          <div className="text-center py-4">
            <div className="w-6 h-6 rounded-full border-2 border-sky-500/20 border-t-sky-400 animate-spin mx-auto mb-2" />
            <p className="text-xs text-sky-300 font-semibold">Recupero plugin da windy-plugins.com…</p>
          </div>
        )}

        {error && !plugin && (
          <div className="bg-rose-950/40 border border-rose-500/30 rounded-xl px-3 py-3">
            <p className="text-xs text-rose-300 font-semibold">⚠️ {error}</p>
            <button
              onClick={() => { window.location.reload(); }}
              className="mt-2 text-xs text-rose-400 hover:text-rose-300 underline font-semibold"
            >
              Ricarica pagina per riprovare
            </button>
          </div>
        )}

        {plugin && plugin.success && (
          <WindyPluginCard
            plugin={plugin}
            onDownload={(content: string) => {
              const blob = new Blob([content], { type: "application/javascript" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "windy-plugin-pg-soundings.js";
              a.click();
              URL.revokeObjectURL(url);
            }}
          />
        )}

        {!loading && !plugin && !error && (
          <div className="bg-amber-950/40 border border-amber-500/30 rounded-xl px-3 py-3 text-center">
            <p className="text-xs text-amber-300 font-semibold mb-2">Server non disponibile</p>
            <button
              onClick={() => { window.location.reload(); }}
              className="text-xs text-amber-400 hover:text-amber-300 underline font-semibold"
            >
              Ricarica pagina per riprovare
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function TermicheTab({ dayData, site, selectedDay = 0 }: TermicheTabProps) {
  const selectedDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + selectedDay);
    return d;
  }, [selectedDay]);

  const formattedDate = useMemo(() => {
    const days = ["dom", "lun", "mar", "mer", "gio", "ven", "sab"];
    const months = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"];
    return `${days[selectedDate.getDay()]} ${selectedDate.getDate()} ${months[selectedDate.getMonth()]}`;
  }, [selectedDate]);

  const fullDateStr = useMemo(() => selectedDate.toLocaleDateString("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  }), [selectedDate]);

  const oreConDati = useMemo(() => {
    const ore = Array.from({ length: 14 }, (_, i) => i + 8);
    return ore
      .map(ora => {
        const h = dayData.find(d => new Date(d.time).getHours() === ora);
        if (!h) return null;
        const t = calcolaTermiche(h, site.alt);
        return { ora: `${String(ora).padStart(2, "0")}:00`, rateo: t.rateo, base: t.base, top: t.top, forza: t.forza, attendibilita: t.attendibilita, temp: h.temperature, vento: h.windSpeed, nuvole: h.cloudCover, umidita: h.humidity };
      })
      .filter(Boolean);
  }, [dayData, site.alt]);

  const maxRateo = useMemo(() => Math.max(...oreConDati.map(o => o!.rateo), 0.1), [oreConDati]);
  const mediaRateo = useMemo(() => {
    const vals = oreConDati.map(o => o!.rateo);
    return vals.length > 0 ? (vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
  }, [oreConDati]);

  if (oreConDati.length === 0) {
    return (
      <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-8 text-center">
        <AlertTriangle className="w-10 h-10 text-slate-500 mx-auto mb-3" />
        <p className="text-slate-400">Nessun dato termico disponibile per oggi.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-slate-800/60 border border-emerald-500/30 rounded-xl px-4 py-3 flex items-center gap-3">
        <MapPin className="w-5 h-5 text-emerald-400 shrink-0" />
        <div>
          <div className="text-sm font-bold text-white">{site.name}</div>
          <div className="text-[10px] text-slate-400">{site.alt}m · Dati Open-Meteo</div>
        </div>
      </div>

      <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-5">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-orange-400" />
          Previsione termiche — {site.name} · {formattedDate}
        </h3>
        <p className="text-[10px] text-slate-500 mb-4">{fullDateStr}</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-900/60 rounded-xl p-3 text-center">
            <p className="text-xs text-slate-400 mb-1">Media termiche</p>
            <p className="text-xl font-bold text-orange-400">{mediaRateo.toFixed(1)} m/s</p>
          </div>
          <div className="bg-slate-900/60 rounded-xl p-3 text-center">
            <p className="text-xs text-slate-400 mb-1">Picco massimo</p>
            <p className="text-xl font-bold text-amber-300">{maxRateo.toFixed(1)} m/s</p>
          </div>
          <div className="bg-slate-900/60 rounded-xl p-3 text-center">
            <p className="text-xs text-slate-400 mb-1">Ore attive</p>
            <p className="text-xl font-bold text-emerald-400">{oreConDati.filter(o => o!.rateo >= 0.5).length}</p>
          </div>
          <div className="bg-slate-900/60 rounded-xl p-3 text-center">
            <p className="text-xs text-slate-400 mb-1">Giudizio</p>
            <p className="text-xl font-bold" style={{ color: mediaRateo >= 1.0 ? "#34d399" : mediaRateo >= 0.5 ? "#fbbf24" : "#f87171" }}>
              {mediaRateo >= 1.0 ? "Ottimo" : mediaRateo >= 0.5 ? "Discreto" : "Debole"}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3 border-b border-slate-700/30">
          <TrendingUp className="w-4 h-4 text-orange-400" />
          <span className="text-sm font-bold text-slate-200">Dettaglio orario termiche</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-700/30 text-slate-500">
                <th className="p-3 text-left">Ora</th>
                <th className="p-3 text-left">Rateo</th>
                <th className="p-3 text-left">Base</th>
                <th className="p-3 text-left">Top</th>
                <th className="p-3 text-left">Temp</th>
                <th className="p-3 text-left">Vento</th>
                <th className="p-3 text-left">Nuvole</th>
                <th className="p-3 text-left">Umidità</th>
              </tr>
            </thead>
            <tbody>
              {oreConDati.map((r) => r && (
                <tr key={r.ora} className="border-b border-slate-700/20 hover:bg-slate-700/30 transition-colors">
                  <td className="p-3 font-bold text-white">{r.ora}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${Math.min(100, (r.rateo / 4.5) * 100)}%`,
                            backgroundColor: r.rateo >= 1.5 ? "#34d399" : r.rateo >= 0.5 ? "#fbbf24" : "#f87171",
                          }}
                        />
                      </div>
                      <span className="font-bold text-orange-300 tabular-nums">{r.rateo.toFixed(1)} m/s</span>
                    </div>
                  </td>
                  <td className="p-3 text-slate-300">{r.base} m</td>
                  <td className="p-3 text-sky-300">{r.top} m</td>
                  <td className="p-3 text-amber-300">{Math.round(r.temp)}°C</td>
                  <td className="p-3 text-sky-300">
                    <Wind className="w-3 h-3 inline mr-1" />
                    {Math.round(r.vento)} km/h
                  </td>
                  <td className="p-3 text-slate-300">
                    <Cloud className="w-3 h-3 inline mr-1" />
                    {Math.round(r.nuvole)}%
                  </td>
                  <td className="p-3 text-blue-300">
                    <Droplets className="w-3 h-3 inline mr-1" />
                    {Math.round(r.umidita)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Windy Plugin Card */}
      <WindyPluginSection />
    </div>
  );
}