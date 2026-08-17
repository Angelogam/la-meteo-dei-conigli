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

interface RigaProfilo {
  quota: number;
  speedKmh: number;
  dir: number;
  temp: number;
  fonte: "api" | "interpolato";
  isDecollo: boolean;
}

const LIVELLI_API = [
  { height: 10, speedKey: "wind_speed_10m", dirKey: "wind_direction_10m", tempKey: "temperature_2m" },
  { height: 80, speedKey: "wind_speed_80m", dirKey: "wind_direction_80m", tempKey: "temperature_80m" },
  { height: 120, speedKey: "wind_speed_120m", dirKey: "wind_direction_120m", tempKey: "temperature_120m" },
  { height: 180, speedKey: "wind_speed_180m", dirKey: "wind_direction_180m", tempKey: "temperature_180m" },
  { height: 300, speedKey: "wind_speed_300m", dirKey: "wind_direction_300m", tempKey: "temperature_300m" },
  { height: 600, speedKey: "wind_speed_600m", dirKey: "wind_direction_600m", tempKey: "temperature_600m" },
  { height: 1000, speedKey: "wind_speed_1000m", dirKey: "wind_direction_1000m", tempKey: "temperature_1000m" },
  { height: 1500, speedKey: "wind_speed_1500m", dirKey: "wind_direction_1500m", tempKey: "temperature_1500m" },
  { height: 2000, speedKey: "wind_speed_2000m", dirKey: "wind_direction_2000m", tempKey: "temperature_2000m" },
  { height: 2500, speedKey: "wind_speed_2500m", dirKey: "wind_direction_2500m", tempKey: "temperature_2500m" },
  { height: 3000, speedKey: "wind_speed_3000m", dirKey: "wind_direction_3000m", tempKey: "temperature_3000m" },
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

function getSpeedColor(speedKmh: number): string {
  if (speedKmh <= 8) return "text-emerald-300";
  if (speedKmh <= 15) return "text-lime-300";
  if (speedKmh <= 22) return "text-amber-300";
  if (speedKmh <= 30) return "text-orange-300";
  if (speedKmh <= 40) return "text-red-300";
  return "text-red-400";
}

function getBarColor(speedKmh: number): string {
  if (speedKmh <= 8) return "bg-emerald-400";
  if (speedKmh <= 15) return "bg-lime-400";
  if (speedKmh <= 22) return "bg-amber-400";
  if (speedKmh <= 30) return "bg-orange-400";
  if (speedKmh <= 40) return "bg-red-400";
  return "bg-red-500";
}

// Interpolazione lineare tra due livelli
function interpolate(quota: number, sotto: LivelloVento, sopra: LivelloVento): { speed: number; dir: number } {
  const ratio = (quota - sotto.height) / (sopra.height - sotto.height);

  // Velocità (lineare)
  const speed = sotto.speedKmh + (sopra.speedKmh - sotto.speedKmh) * ratio;

  // Direzione (gestisce il wrap 360°)
  let diffDir = sopra.dir - sotto.dir;
  if (diffDir > 180) diffDir -= 360;
  if (diffDir < -180) diffDir += 360;
  const dir = ((sotto.dir + diffDir * ratio) % 360 + 360) % 360;

  return { speed: Math.round(speed), dir: Math.round(dir) };
}

// Stima temperatura usando gradiente adiabatico secco (0.98°C/100m)
function stimaTemp(quota: number, tempSuolo: number, altDecollo: number): number {
  const deltaAlt = quota - altDecollo;
  return Math.round((tempSuolo - (deltaAlt / 100) * 0.98) * 10) / 10;
}

export default function ProfiloVentoVerticale({ siteAlt, siteName, lat, lon }: ProfiloVentoVerticaleProps) {
  const [profilo, setProfilo] = useState<RigaProfilo[]>([]);
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

    // Richiedi tutti i livelli API + temperature
    const hourlyParams = [
      ...LIVELLI_API.flatMap(l => [l.speedKey, l.dirKey, l.tempKey]),
      "temperature_2m,relative_humidity_2m"
    ].join(",");

    const params = new URLSearchParams({
      latitude: lat.toString(),
      longitude: lon.toString(),
      hourly: hourlyParams,
      timezone: "Europe/Rome",
      forecast_days: "1",
      wind_speed_unit: "kmh",
      models: "ecmwf_ifs025",
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

        // Trova l'ora più vicina all'attuale (per mostrare dati aggiornati)
        const times: string[] = json.hourly?.time || [];
        const now = new Date();
        let bestIdx = 0;
        let minDiff = Infinity;

        times.forEach((t, i) => {
          const d = new Date(t);
          const diff = Math.abs(d.getTime() - now.getTime());
          if (diff < minDiff) {
            minDiff = diff;
            bestIdx = i;
          }
        });

        // Estrai i livelli reali disponibili dall'API
        const livelliReali: LivelloVento[] = [];
        const tempSuolo = Number(json.hourly?.temperature_2m?.[bestIdx]) || 15;

        LIVELLI_API.forEach(l => {
          const speedRaw = Number(json.hourly?.[l.speedKey]?.[bestIdx]);
          if (speedRaw != null && !isNaN(speedRaw) && speedRaw >= 0) {
            livelliReali.push({
              height: l.height,
              speedKmh: Math.round(speedRaw),
              dir: Math.round(Number(json.hourly?.[l.dirKey]?.[bestIdx]) || 0),
            });
          }
        });

        console.log("[ProfiloVento] Livelli reali da API:", livelliReali.length, livelliReali.map(l => l.height + "m"));

        // Ordina per quota
        livelliReali.sort((a, b) => a.height - b.height);

        if (livelliReali.length === 0) {
          throw new Error("Nessun dato vento disponibile");
        }

        // Genera quote con step di 250m dalla quota decollo (arrotondata al 250 più vicino) fino a 4000m
        const partenza = Math.floor(siteAlt / 250) * 250;
        const quoteTarget: number[] = [];
        for (let q = partenza; q <= 4000; q += 250) {
          quoteTarget.push(q);
        }
        // Assicura che la quota decollo esatta sia inclusa
        if (!quoteTarget.includes(siteAlt)) {
          quoteTarget.push(siteAlt);
          quoteTarget.sort((a, b) => a - b);
        }

        // Per ogni quota target, interpola dai livelli API
        const righeProfilo: RigaProfilo[] = quoteTarget.map(q => {
          // Trova il livello sotto e sopra
          const sotto = livelliReali.filter(l => l.height <= q).pop();
          const sopra = livelliReali.find(l => l.height >= q);

          let speed: number;
          let dir: number;
          let fonte: "api" | "interpolato";

          if (sotto && sopra && sotto.height === q) {
            // Quota esatta dal livello API
            speed = sotto.speedKmh;
            dir = sotto.dir;
            fonte = "api";
          } else if (sotto && sopra && sotto !== sopra) {
            // Interpola tra due livelli
            const interp = interpolate(q, sotto, sopra);
            speed = interp.speed;
            dir = interp.dir;
            fonte = "interpolato";
          } else if (sotto && !sopra) {
            // Sopra l'ultimo livello disponibile: estrapola con gradiente
            const ultimo = sotto;
            const penultimo = livelliReali[livelliReali.length - 2] || ultimo;
            const gradient = (ultimo.speedKmh - penultimo.speedKmh) / (ultimo.height - penultimo.height);
            speed = Math.max(0, Math.round(ultimo.speedKmh + gradient * (q - ultimo.height)));
            dir = ultimo.dir;
            fonte = "interpolato";
          } else {
            // Sotto il primo livello disponibile
            const primo = sopra || livelliReali[0];
            speed = primo.speedKmh;
            dir = primo.dir;
            fonte = "interpolato";
          }

          const temp = stimaTemp(q, tempSuolo, siteAlt);
          const isDecollo = Math.abs(q - siteAlt) < 150;

          return {
            quota: q,
            speedKmh: Math.max(0, speed),
            dir: ((dir % 360) + 360) % 360,
            temp,
            fonte,
            isDecollo,
          };
        });

        setRawData(JSON.stringify({
          ora: times[bestIdx],
          siteAlt,
          livelliReali: livelliReali.map(l => ({ quota: l.height, km_h: l.speedKmh, gradi: l.dir })),
          profilo: righeProfilo.map(r => ({ quota: r.quota, km_h: r.speedKmh, gradi: r.dir, temp: r.temp, fonte: r.fonte })),
        }, null, 2));

        setProfilo(righeProfilo);
        setLoadingApi(false);
      })
      .catch(err => {
        if (!attivo) return;
        setErrorApi(err instanceof Error ? err.message : "Errore caricamento dati");
        setLoadingApi(false);
      });

    return () => {
      attivo = false;
    };
  }, [lat, lon, siteAlt]);

  if (loadingApi) {
    return (
      <div className="flex items-center justify-center py-8 text-slate-400">
        <Loader2 className="w-5 h-5 animate-spin mr-2 text-cyan-400" />
        Caricamento profilo vento reale...
      </div>
    );
  }

  if (errorApi || profilo.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-slate-400">
        <AlertCircle className="w-5 h-5 mr-2 text-amber-400" />
        {errorApi || "Nessun dato vento disponibile"}
        <span className="text-[10px] text-slate-600 ml-2">Posizione: {lat?.toFixed(3)}, {lon?.toFixed(3)}</span>
      </div>
    );
  }

  const maxSpeed = Math.max(...profilo.map(r => r.speedKmh), 1);
  const apiCount = profilo.filter(r => r.fonte === "api").length;
  const interpolatiCount = profilo.length - apiCount;

  return (
    <div className="space-y-4">
      {/* Indicatore */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold bg-emerald-900/15 border-emerald-500/30 text-emerald-300">
        <Wind className="w-4 h-4" />
        Profilo vento verticale · {siteName || "Decollo"} · {siteAlt}m → 4000m · step 250m · km/h
      </div>

      {/* Metriche principali */}
      {profilo.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="bg-slate-800/60 rounded-xl p-3 text-center">
            <div className="text-[10px] text-slate-500">Vento al decollo ({siteAlt}m)</div>
            <div className="text-base font-bold text-cyan-300">{profilo.find(r => r.isDecollo)?.speedKmh ?? "—"} km/h</div>
            <div className="text-[10px] text-slate-400">
              {getWindArrow(profilo.find(r => r.isDecollo)?.dir ?? 0)} {getDirAbbrev(profilo.find(r => r.isDecollo)?.dir ?? 0)}
            </div>
          </div>
          <div className="bg-slate-800/60 rounded-xl p-3 text-center">
            <div className="text-[10px] text-slate-500">Vento a 4000m</div>
            <div className="text-base font-bold text-purple-300">{profilo[profilo.length - 1]?.speedKmh ?? "—"} km/h</div>
            <div className="text-[10px] text-slate-400">
              {getWindArrow(profilo[profilo.length - 1]?.dir ?? 0)} {getDirAbbrev(profilo[profilo.length - 1]?.dir ?? 0)}
            </div>
          </div>
          <div className="bg-slate-800/60 rounded-xl p-3 text-center">
            <div className="text-[10px] text-slate-500">Interpolati</div>
            <div className="text-base font-bold text-white">{interpolatiCount} livelli</div>
            <div className="text-[10px] text-slate-400">da {apiCount} livelli API</div>
          </div>
          <div className="bg-slate-800/60 rounded-xl p-3 text-center">
            <div className="text-[10px] text-slate-500">Quota decollo</div>
            <div className="text-base font-bold text-amber-300">{siteAlt}m</div>
            <div className="text-[10px] text-slate-400">Esposizione {siteName}</div>
          </div>
        </div>
      )}

      {/* Tabella profilo verticale */}
      <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-700/30">
          <Wind className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-bold text-cyan-300">Profilo verticale completo · {siteName || "Decollo"}</span>
          <span className="text-[10px] text-slate-500 ml-auto">
            {siteAlt}m → 4000m · step 250m · aggiornato
          </span>
        </div>
        <div className="overflow-y-auto max-h-[500px]">
          <table className="w-full text-[11px]">
            <thead className="sticky top-0 bg-slate-900/90 z-10">
              <tr className="border-b border-slate-700/30 text-slate-500">
                <th className="p-2 text-left w-20">Quota</th>
                <th className="p-2 text-left w-20">Temp</th>
                <th className="p-2 text-left">Vento (km/h)</th>
                <th className="p-2 text-left w-16">Dir</th>
                <th className="p-2 text-left w-14">Fonte</th>
              </tr>
            </thead>
            <tbody>
              {profilo.map(r => (
                <tr
                  key={r.quota}
                  className={`border-b border-slate-700/20 transition-colors hover:bg-slate-700/30 ${r.isDecollo ? "bg-emerald-900/30" : ""}`}
                >
                  {/* Quota */}
                  <td className="p-2 font-mono font-bold text-white whitespace-nowrap">
                    {r.quota}m
                    {r.isDecollo && <span className="text-[8px] text-emerald-400 ml-1">🪂 DECOLLO</span>}
                  </td>

                  {/* Temp */}
                  <td className={`p-2 font-mono whitespace-nowrap ${
                    r.temp > 25 ? "text-red-300" :
                    r.temp > 15 ? "text-amber-300" :
                    r.temp > 5 ? "text-yellow-300" :
                    r.temp > -5 ? "text-cyan-300" :
                    "text-blue-300"
                  }`}>
                    {r.temp}°C
                  </td>

                  {/* Velocità con barra */}
                  <td className="p-2">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2.5 bg-slate-700/50 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${getBarColor(r.speedKmh)} ${r.fonte === "interpolato" ? "opacity-60" : ""}`}
                          style={{ width: `${Math.min((r.speedKmh / maxSpeed) * 100, 100)}%` }}
                        />
                      </div>
                      <span className={`font-mono font-bold tabular-nums w-16 text-right ${getSpeedColor(r.speedKmh)}`}>
                        {Math.round(r.speedKmh)} km/h
                      </span>
                    </div>
                  </td>

                  {/* Direzione */}
                  <td className="p-2 text-center font-mono text-white font-bold">
                    {getWindArrow(r.dir)} {getDirAbbrev(r.dir)}
                  </td>

                  {/* Fonte */}
                  <td className="p-2 text-center">
                    {r.fonte === "api" ? (
                      <span className="text-[8px] text-emerald-400 font-bold">API</span>
                    ) : (
                      <span className="text-[8px] text-amber-400 font-bold">INT</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legenda */}
      <div className="flex flex-wrap gap-2 text-[10px] text-slate-400 px-2">
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-400" /> ≤8</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-lime-400" /> 9-15</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> 16-22</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-orange-400" /> 23-30</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-400" /> 30-40</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-500" /> >40</span>
        <span className="text-slate-500 ml-auto">km/h · API = reale · INT = interpolato</span>
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