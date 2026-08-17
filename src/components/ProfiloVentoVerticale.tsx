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

const ORE_LABEL = ["06", "07", "08", "09", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19"];

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
  const [datiOrari, setDatiOrari] = useState<{ ora: number; livelli: LivelloVento[] }[]>([]);
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

    const params = new URLSearchParams({
      latitude: lat.toString(),
      longitude: lon.toString(),
      hourly: LIVELLI.flatMap(l => [l.speedKey, l.dirKey]).join(","),
      timezone: "Europe/Rome",
      forecast_days: "1",
      wind_speed_unit: "kmh",
      models: "ecmwf_ifs025",
    });

    const url = `https://api.open-meteo.com/v1/forecast?${params}`;

    fetch(url)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(json => {
        if (!attivo) return;

        // Estrai TUTTE le ore
        const times: string[] = json.hourly?.time || [];
        // Array di tutte le ore valide (6-19)
        const oreValide: { ora: number; livelli: LivelloVento[] }[] = [];

        let idxSalvato = -1;

        times.forEach((timeStr, idx) => {
          const ora = new Date(timeStr).getHours();
          if (ora >= 6 && ora <= 19) {
            idxSalvato = idx;

            const livelli: LivelloVento[] = LIVELLI.map(l => {
              const speedRaw = Number(json.hourly?.[l.speedKey]?.[idx]);
              const dirRaw = Number(json.hourly?.[l.dirKey]?.[idx]);
              return {
                height: l.height,
                speedKmh: Math.round(speedRaw || 0),
                dir: Math.round(dirRaw || 0),
              };
            });

            oreValide.push({ ora, livelli });
          }
        });

        setRawData(JSON.stringify({
          oreValide: oreValide.map(o => ({
            ora: o.ora + ":00",
            livelli: o.livelli.map(l => ({ quota: l.height, km_h: l.speedKmh, gradi: l.dir })),
          })),
        }, null, 2));

        if (oreValide.length > 0) {
          setDatiOrari(oreValide);
          setLoadingApi(false);
        } else {
          throw new Error("Nessun dato vento disponibile");
        }
      })
      .catch(err => {
        if (!attivo) return;
        setErrorApi(err instanceof Error ? err.message : "Errore caricamento dati");
        setLoadingApi(false);
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

  if (errorApi || datiOrari.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-slate-400">
        <AlertCircle className="w-5 h-5 mr-2 text-amber-400" />
        {errorApi || "Nessun dato vento disponibile"}
        <span className="text-[10px] text-slate-600 ml-2">Posizione: {lat?.toFixed(3)}, {lon?.toFixed(3)}</span>
      </div>
    );
  }

  // Prendi solo le quote da mostrare (fino a 2000m per non sovraccaricare)
  const quoteDaMostrare = [10, 80, 300, 600, 1000, 1500, 2000];
  const oraCorrente = new Date().getHours();

  return (
    <div className="space-y-4">
      {/* Indicatore */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold bg-emerald-900/15 border-emerald-500/30 text-emerald-300">
        <Wind className="w-4 h-4" />
        Previsione vento oraria · {siteName || "Decollo"} · velocità in km/h
      </div>

      {/* Tabella principale: ORE come righe, QUOTE come colonne */}
      <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-700/30">
          <Wind className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-bold text-cyan-300">Vento per quota e ora</span>
          <span className="text-[10px] text-slate-500 ml-auto">Quota decollo: {siteAlt}m</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead className="sticky top-0 bg-slate-900/90 z-10">
              <tr className="border-b border-slate-700/30 text-slate-500">
                <th className="p-2 text-left">Ora</th>
                {quoteDaMostrare.map(q => (
                  <th key={q} className="p-2 text-center font-mono">
                    {q}m
                    {q <= siteAlt && q + 200 >= siteAlt && <span className="text-emerald-400 ml-1">🪂</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {datiOrari.map((h) => {
                const isCurrent = h.ora === oraCorrente;
                return (
                  <tr key={h.ora} className={`border-b border-slate-700/20 hover:bg-slate-700/30 ${isCurrent ? "bg-emerald-900/20" : ""}`}>
                    {/* Ora */}
                    <td className="p-2 text-center">
                      <span className={`font-mono font-bold ${isCurrent ? "text-emerald-300" : "text-white"}`}>
                        {String(h.ora).padStart(2, "0")}:00
                      </span>
                      {isCurrent && <span className="text-[8px] text-emerald-400 block">ADESSO</span>}
                    </td>

                    {/* Quote */}
                    {quoteDaMostrare.map(q => {
                      const lvl = h.livelli.find(l => l.height === q);
                      if (!lvl || lvl.speedKmh === 0) return <td key={q} className="p-2 text-center text-slate-600">—</td>;

                      return (
                        <td key={q} className="p-2">
                          <div className="flex flex-col items-center">
                            <span className={`font-mono font-bold tabular-nums ${getBarColor(lvl.speedKmh) === "bg-red-400" ? "text-red-300" : "text-white"}`}>
                              {lvl.speedKmh}
                            </span>
                            <span className="text-[8px] text-slate-500 flex items-center gap-0.5">
                              {getWindArrow(lvl.dir)} {getDirAbbrev(lvl.dir)}
                            </span>
                            {/* Barra mini */}
                            <div className="w-full max-w-[40px] h-1 bg-slate-700/30 rounded-full mt-0.5 overflow-hidden">
                              <div className={`h-full ${getBarColor(lvl.speedKmh)}`} style={{ width: `${Math.min((lvl.speedKmh / 50) * 100, 100)}%` }} />
                            </div>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legenda colori */}
      <div className="flex flex-wrap gap-2 text-[10px] text-slate-400 px-2">
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-400" /> ≤8 km/h</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-lime-400" /> 9-15</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> 16-22</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-orange-400" /> 23-30</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-400" /> 30+</span>
      </div>

      {/* Riepilogo velocità per quota (valori medi) */}
      <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-4">
        <div className="text-xs font-bold text-cyan-300 mb-3 flex items-center gap-2">
          <Wind className="w-4 h-4" />
          Riepilogo vento per quota (media ore 9-19, km/h)
        </div>
        <div className="space-y-2">
          {[10, 300, 600, 1000, 1500, 2000].map(q => {
            const valori = datiOrari
              .filter(h => h.ora >= 9)
              .map(h => h.livelli.find(l => l.height === q)?.speedKmh || 0)
              .filter(v => v > 0);
            if (valori.length === 0) return null;
            const media = Math.round(valori.reduce((s, v) => s + v, 0) / valori.length);
            const max = Math.max(...valori);
            const min = Math.min(...valori);

            return (
              <div key={q} className="grid grid-cols-[4rem_1fr_8rem] gap-2 items-center">
                <span className="text-xs font-mono font-bold text-slate-300">{q}m</span>
                <div className="h-4 bg-slate-700/30 rounded-full overflow-hidden">
                  <div className={`h-full ${getBarColor(media)}`} style={{ width: `${Math.min((media / 50) * 100, 100)}%` }} />
                </div>
                <span className="text-xs font-mono font-bold text-white tabular-nums">
                  {media} km/h <span className="text-[9px] text-slate-500 font-normal">({min}-{max})</span>
                </span>
              </div>
            );
          })}
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