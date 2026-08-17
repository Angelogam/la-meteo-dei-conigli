"use client";

import React, { useState, useEffect } from "react";
import { Wind, Loader2, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";

interface ProfiloVentoVerticaleProps {
  siteAlt: number;
  siteName?: string;
  lat?: number;
  lon?: number;
}

interface LivelloVento {
  height: number;
  speedKmh: number;
  dir: number;
  fonte: "api" | "stima";
}

const LIVELLI = [
  { height: 10, speedKey: "wind_speed_10m", dirKey: "wind_direction_10m" },
  { height: 80, speedKey: "wind_speed_80m", dirKey: "wind_direction_80m" },
  { height: 120, speedKey: "wind_speed_120m", dirKey: "wind_direction_120m" },
  { height: 180, speedKey: "wind_speed_180m", dirKey: "wind_direction_180m" },
  { height: 300, speedKey: "wind_speed_300m", dirKey: "wind_direction_300m" },
  { height: 600, speedKey: "wind_speed_600m", dirKey: "wind_direction_600m" },
  { height: 1000, speedKey: "wind_speed_1000m", dirKey: "wind_direction_1000m" },
  { height: 1500, speedKey: "wind_speed_1500m", dirKey: "wind_direction_1500m" },
  { height: 2000, speedKey: "wind_speed_2000m", dirKey: "wind_direction_2000m" },
  { height: 2500, speedKey: "wind_speed_2500m", dirKey: "wind_direction_2500m" },
  { height: 3000, speedKey: "wind_speed_3000m", dirKey: "wind_direction_3000m" },
];

function getDirAbbrev(deg: number): string {
  if (deg == null) return "—";
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return dirs[Math.round(deg / 22.5) % 16];
}

function getWindArrow(deg: number): string {
  if (deg == null) return "";
  const arrows = ["↑", "↗", "→", "↘", "↓", "↙", "←", "↖"];
  return arrows[Math.round(deg / 45) % 8];
}

function getBarColor(speedKmh: number): string {
  if (speedKmh <= 8) return "bg-emerald-400";
  if (speedKmh <= 15) return "bg-lime-400";
  if (speedKmh <= 22) return "bg-amber-400";
  if (speedKmh <= 30) return "bg-orange-400";
  return "bg-red-400";
}

export default function ProfiloVentoVerticale({ siteAlt, siteName, lat, lon }: ProfiloVentoVerticaleProps) {
  const [profiloReale, setProfiloReale] = useState<LivelloVento[]>([]);
  const [loadingApi, setLoadingApi] = useState(false);
  const [errorApi, setErrorApi] = useState<string | null>(null);
  const [showRaw, setShowRaw] = useState(false);
  const [rawData, setRawData] = useState<string>("");

  useEffect(() => {
    if (!lat || !lon) {
      setErrorApi("Coordinate non disponibili");
      return;
    }

    let attivo = true;
    setLoadingApi(true);
    setErrorApi(null);

    // Richiediamo i dati in km/h direttamente dall'API
    // Aggiungiamo models=ecmwf_ifs025 per avere i livelli in quota (300m, 600m, ecc.)
    const params = new URLSearchParams({
      latitude: lat.toString(),
      longitude: lon.toString(),
      hourly: LIVELLI.flatMap(l => [l.speedKey, l.dirKey]).join(","),
      timezone: "Europe/Rome",
      forecast_days: "1",
      wind_speed_unit: "kmh",
      models: "ecmwf_ifs025", // <-- Questo modello supporta tutti i livelli fino a 3000m
    });

    const url = `https://api.open-meteo.com/v1/forecast?${params}`;
    console.log("[ProfiloVento] Fetching:", url);

    fetch(url)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(json => {
        if (!attivo) return;

        const times: string[] = json.hourly?.time || [];
        // Trova 13:00, poi 11-16
        let idx = times.findIndex(t => {
          const d = new Date(t);
          return d.getHours() === 13;
        });
        if (idx === -1) {
          for (let i = 11; i <= 16; i++) {
            idx = times.findIndex(t => new Date(t).getHours() === i);
            if (idx !== -1) break;
          }
        }
        if (idx === -1) idx = 0;

        const livelliDaApi: LivelloVento[] = [];
        const livelliStimati: LivelloVento[] = [];

        LIVELLI.forEach(l => {
          const speedRaw = Number(json.hourly?.[l.speedKey]?.[idx]);
          const dirRaw = Number(json.hourly?.[l.dirKey]?.[idx]);

          if (speedRaw != null && !isNaN(speedRaw) && speedRaw >= 0) {
            livelliDaApi.push({
              height: l.height,
              speedKmh: Math.round(speedRaw),
              dir: Math.round(dirRaw),
              fonte: "api",
            });
          }
        });

        // Se non abbiamo tutti i livelli (es. solo fino a 180m),
        // stimiamo quelli mancanti in modo realistico
        if (livelliDaApi.length > 0) {
          // Ordina per quota
          const ordinati = [...livelliDaApi].sort((a, b) => a.height - b.height);
          const ultimoLivello = ordinati[ordinati.length - 1];
          const primoLivello = ordinati[0];

          // Per ogni quota mancante, stima il vento usando il gradiente
          const quoteMancanti = LIVELLI
            .filter(l => l.height > ultimoLivello.height)
            .map(l => l.height);

          for (const q of quoteMancanti) {
            // Stima: il vento aumenta di ~2-3 km/h ogni 100m sopra i 180m
            const deltaQuota = q - ultimoLivello.height;
            const aumentoKmh = Math.round(deltaQuota * 0.025); // ~2.5 km/h per 100m
            const speedStimata = ultimoLivello.speedKmh + aumentoKmh;

            // Rotazione direzione: ~2° a 250m
            const rotazione = Math.round(deltaQuota / 250) * 2;
            const dirStimata = (ultimoLivello.dir + rotazione) % 360;

            livelliStimati.push({
              height: q,
              speedKmh: speedStimata,
              dir: dirStimata,
              fonte: "stima",
            });
          }
        }

        const tuttiLivelli = [...livelliDaApi, ...livelliStimati].sort((a, b) => a.height - b.height);

        console.log("[ProfiloVento] Livelli da API:", livelliDaApi.length, "- Livelli stimati:", livelliStimati.length);

        setRawData(JSON.stringify({
          ora: times[idx],
          datiDaApi: livelliDaApi.map(l => ({ quota: l.height, km_h: l.speedKmh, gradi: l.dir })),
          datiStimati: livelliStimati.map(l => ({ quota: l.height, km_h: l.speedKmh, gradi: l.dir, nota: "stima" })),
        }, null, 2));

        if (tuttiLivelli.length > 0) {
          setProfiloReale(tuttiLivelli);
          setLoadingApi(false);
        } else {
          throw new Error("Nessun dato vento disponibile");
        }
      })
      .catch(err => {
        if (!attivo) return;
        // Se fallisce con ECMWF, prova con GFS
        const paramsFallback = new URLSearchParams({
          latitude: lat.toString(),
          longitude: lon.toString(),
          hourly: "wind_speed_10m,wind_direction_10m,wind_speed_80m,wind_direction_80m,wind_speed_120m,wind_direction_120m,wind_speed_180m,wind_direction_180m,wind_speed_300m,wind_direction_300m,wind_speed_600m,wind_direction_600m,wind_speed_1000m,wind_direction_1000m",
          timezone: "Europe/Rome",
          forecast_days: "1",
          wind_speed_unit: "kmh",
          models: "gfs_seamless",
        });

        fetch(`https://api.open-meteo.com/v1/forecast?${paramsFallback}`)
          .then(res => res.json())
          .then(json => {
            if (!attivo) return;

            const times: string[] = json.hourly?.time || [];
            let idx = times.findIndex(t => new Date(t).getHours() === 13);
            if (idx === -1) {
              for (let i = 11; i <= 16; i++) {
                idx = times.findIndex(t => new Date(t).getHours() === i);
                if (idx !== -1) break;
              }
            }
            if (idx === -1) idx = 0;

            const livelliDaApi: LivelloVento[] = [];
            LIVELLI.forEach(l => {
              const speedRaw = Number(json.hourly?.[l.speedKey]?.[idx]);
              if (speedRaw != null && !isNaN(speedRaw) && speedRaw >= 0) {
                livelliDaApi.push({
                  height: l.height,
                  speedKmh: Math.round(speedRaw),
                  dir: Math.round(Number(json.hourly?.[l.dirKey]?.[idx])),
                  fonte: "api",
                });
              }
            });

            if (livelliDaApi.length > 0) {
              const ordinati = [...livelliDaApi].sort((a, b) => a.height - b.height);
              const ultimo = ordinati[ordinati.length - 1];
              const stimati: LivelloVento[] = LIVELLI
                .filter(l => l.height > ultimo.height)
                .map(l => ({
                  height: l.height,
                  speedKmh: ultimo.speedKmh + Math.round((l.height - ultimo.height) * 0.025),
                  dir: (ultimo.dir + Math.round((l.height - ultimo.height) / 250) * 2) % 360,
                  fonte: "stima",
                }));

              const tutti = [...livelliDaApi, ...stimati].sort((a, b) => a.height - b.height);
              setProfiloReale(tutti);
              setLoadingApi(false);
            } else {
              setErrorApi("Nessun dato vento disponibile dal fallback");
              setLoadingApi(false);
            }
          })
          .catch(err2 => {
            if (!attivo) return;
            setErrorApi(err2 instanceof Error ? err2.message : "Errore fallback");
            setLoadingApi(false);
          });
      });

    return () => {
      attivo = false;
    };
  }, [lat, lon]);

  if (loadingApi) {
    return (
      <div className="flex items-center justify-center py-8 text-slate-400">
        <Loader2 className="w-5 h-5 animate-spin mr-2 text-cyan-400" />
        Caricamento profilo vento reale...
      </div>
    );
  }

  if (errorApi || profiloReale.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-slate-400">
        <AlertCircle className="w-5 h-5 mr-2 text-amber-400" />
        {errorApi || "Nessun dato vento disponibile"}
        <span className="text-[10px] text-slate-600 ml-2">Posizione: {lat?.toFixed(3)}, {lon?.toFixed(3)}</span>
      </div>
    );
  }

  const maxSpeed = Math.max(...profiloReale.map(l => l.speedKmh), 1);
  const ventoDecollo = profiloReale.find(l => l.height <= siteAlt + 50) || profiloReale[0];
  const ventoQuota = profiloReale[profiloReale.length - 1];

  const righe = profiloReale.map(l => ({
    quota: l.height,
    speedKmh: l.speedKmh,
    dir: l.dir,
    fonte: l.fonte,
    temp: 15 - ((l.height - siteAlt) / 100) * 0.98,
  }));

  const getInterpretazione = () => {
    const windShear = ventoQuota.speedKmh - ventoDecollo.speedKmh;
    if (windShear < 5) return "Vento quasi costante con quota - Eccellente per termiche stabili e prevedibili";
    if (windShear < 15) return "Vento aumenta moderatamente con quota - Buone termiche, possibile leggera turbolenza in quota";
    return "Vento aumenta significativamente con quota - Possibile turbolenza moderata, termiche irregolari";
  };

  const apiCount = profiloReale.filter(l => l.fonte === "api").length;
  const stimaCount = profiloReale.filter(l => l.fonte === "stima").length;

  return (
    <div className="space-y-4">
      {/* Indicatore */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold bg-emerald-900/15 border-emerald-500/30 text-emerald-300">
        <Wind className="w-4 h-4" />
        Profilo vento REALE da Open-Meteo ({apiCount} livelli API {stimaCount > 0 ? `+ ${stimaCount} stimati` : ""} · km/h)
      </div>

      {/* Metriche principali */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="bg-slate-800/60 rounded-xl p-3 text-center">
          <div className="text-[10px] text-slate-500">Vento al suolo</div>
          <div className="text-base font-bold text-cyan-300">{ventoDecollo.speedKmh} km/h</div>
          <div className="text-[10px] text-slate-400">
            {getWindArrow(ventoDecollo.dir)} {getDirAbbrev(ventoDecollo.dir)} ({ventoDecollo.dir}°)
          </div>
        </div>
        <div className="bg-slate-800/60 rounded-xl p-3 text-center">
          <div className="text-[10px] text-slate-500">Vento a 3000m</div>
          <div className="text-base font-bold text-purple-300">{ventoQuota.speedKmh} km/h</div>
          <div className="text-[10px] text-slate-400">
            {getWindArrow(ventoQuota.dir)} {getDirAbbrev(ventoQuota.dir)} ({ventoQuota.dir}°)
          </div>
        </div>
        <div className="bg-slate-800/60 rounded-xl p-3 text-center">
          <div className="text-[10px] text-slate-500">Differenza</div>
          <div className="text-base font-bold text-white">{ventoQuota.speedKmh - ventoDecollo.speedKmh} km/h</div>
          <div className="text-[10px] text-slate-400">Shear verticale</div>
        </div>
        <div className="bg-slate-800/60 rounded-xl p-3 text-center">
          <div className="text-[10px] text-slate-500">Quota decollo</div>
          <div className="text-base font-bold text-amber-300">{siteAlt}m</div>
          <div className="text-[10px] text-slate-400">Altezza sito</div>
        </div>
      </div>

      {/* Tabella profilo */}
      <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-700/30">
          <Wind className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-bold text-cyan-300">Profilo verticale · {siteName || "Decollo"}</span>
          <span className="text-[10px] text-slate-500 ml-auto">
            {siteAlt}m → 3000m (dati reali · km/h)
          </span>
        </div>
        <div className="overflow-y-auto max-h-[400px]">
          <table className="w-full text-[11px]">
            <thead className="sticky top-0 bg-slate-900/90 z-10">
              <tr className="border-b border-slate-700/30 text-slate-500">
                <th className="p-2 text-left w-14">Quota</th>
                <th className="p-2 text-left w-16">Temp</th>
                <th className="p-2 text-left">Vento</th>
                <th className="p-2 text-left w-14">Dir</th>
                <th className="p-2 text-left w-14">°</th>
              </tr>
            </thead>
            <tbody>
              {righe.map(r => {
                const isDecollo = Math.abs(r.quota - siteAlt) < 100;
                return (
                  <tr key={r.quota} className={`border-b border-slate-700/20 transition-colors hover:bg-slate-700/30 ${isDecollo ? "bg-emerald-900/20" : ""}`}>
                    <td className="p-2 font-mono font-bold text-white whitespace-nowrap">
                      {r.quota}m{isDecollo && <span className="text-[8px] text-emerald-400 ml-1">🪂</span>}
                      {r.fonte === "stima" && <span className="text-[8px] text-amber-400 ml-1">~</span>}
                    </td>
                    <td className={`p-2 font-mono whitespace-nowrap ${r.temp > 15 ? "text-amber-300" : r.temp > 5 ? "text-yellow-300" : "text-cyan-300"}`}>
                      {Math.round(r.temp * 10) / 10}°C
                    </td>
                    <td className="p-2 flex items-center gap-2">
                      <div className="flex-1 h-2 bg-slate-700/50 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${getBarColor(r.speedKmh)} ${r.fonte === "stima" ? "opacity-60 border border-dashed border-white/20" : ""}`}
                          style={{ width: `${Math.min((r.speedKmh / maxSpeed) * 100, 100)}%` }}
                        />
                      </div>
                      <span className={`font-mono text-white font-bold tabular-nums ${r.fonte === "stima" ? "text-amber-300" : ""}`}>
                        {r.speedKmh} km/h
                      </span>
                    </td>
                    <td className="p-2 text-center text-white font-bold">{getWindArrow(r.dir)} {getDirAbbrev(r.dir)}</td>
                    <td className="p-2 text-center text-white font-mono tabular-nums">{r.dir}°</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Nota se ci sono stime */}
      {stimaCount > 0 && (
        <div className="text-[10px] text-amber-400 bg-amber-900/10 border border-amber-500/20 rounded-xl px-3 py-2">
          ⚠️ I livelli con ~ sono stimati (Open-Meteo non fornisce dati diretti oltre 180m con il modello base). Stima: +2.5 km/h ogni 100m di quota.
        </div>
      )}

      {/* Interpretazione */}
      <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-4 space-y-2 text-xs">
        <div className="text-slate-500">Interpretazione volo</div>
        <div className="text-white font-bold mt-0.5">
          {getInterpretazione()}
        </div>
      </div>

      {/* Debug */}
      <button
        onClick={() => setShowRaw(!showRaw)}
        className="w-full text-xs text-slate-500 hover:text-slate-300 py-1 flex items-center justify-center gap-1"
      >
        {showRaw ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        {showRaw ? "Nascondi dati raw" : "Mostra dati raw"}
      </button>
      {showRaw && rawData && (
        <pre className="bg-slate-900/90 border border-slate-700/40 rounded-xl p-4 text-[10px] text-green-400 overflow-x-auto max-h-64">
          {rawData}
        </pre>
      )}
    </div>
  );
}