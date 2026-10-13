"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import { Wind, Calendar, MapPin, TrendingUp } from "lucide-react";
import { getVentiInterpolati, type VentiInterpolatiData } from "@/utils/getVentiInterpolati";
import ProfessionalWindgram from "@/components/ProfessionalWindgram";
import SectionErrorBoundary from "@/components/SectionErrorBoundary";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

function getSpeedColor(speed: number): string {
  if (speed <= 8) return "text-emerald-300";
  if (speed <= 15) return "text-lime-300";
  if (speed <= 22) return "text-amber-300";
  if (speed <= 30) return "text-orange-300";
  return "text-red-400";
}

function getSpeedBarColor(speed: number): string {
  if (speed <= 8) return "bg-emerald-400";
  if (speed <= 15) return "bg-lime-400";
  if (speed <= 22) return "bg-amber-400";
  if (speed <= 30) return "bg-orange-400";
  return "bg-red-400";
}

function getDirAbbrev(deg: number): string {
  const abbrevs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return abbrevs[Math.round(deg / 22.5) % 16] || "N";
}

function getDirArrow(deg: number): string {
  const arrows = ["↑", "↗", "→", "↘", "↓", "↙", "←", "↖"];
  return arrows[Math.round(((deg % 360) + 360) % 360 / 45) % 8];
}

function formatDateShort(date: Date): string {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return "";
  const giorni = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];
  return `${giorni[d.getDay()]} ${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

interface VentiInterpolatiTabProps {
  lat: number;
  lon: number;
  quotaDecollo: number;
  selectedDay: number;
  oraCorrente?: number;
  onOraChange?: (ora: number) => void;
  siteName?: string;
  rawData?: any; // JSON grezzo Open-Meteo — condiviso per evitare chiamate duplicate
}

export default function VentiInterpolatiTab({
  lat,
  lon,
  quotaDecollo,
  selectedDay,
  oraCorrente = 12,
  onOraChange,
  rawData,
  siteName,
}: VentiInterpolatiTabProps) {
  const [data, setData] = useState<VentiInterpolatiData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [oraSelezionata, setOraSelezionata] = useState(oraCorrente);
  const oraCorrenteRef = useRef(oraCorrente);
  oraCorrenteRef.current = oraCorrente;

  useEffect(() => {
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || !Number.isFinite(quotaDecollo) || quotaDecollo <= 0) {
      setError("Coordinate o quota di decollo non valide.");
      setLoading(false);
      return;
    }
    let cancelled = false;
    const oggi = new Date();
    const targetDate = new Date(oggi);
    targetDate.setDate(oggi.getDate() + selectedDay);
    // Mantieni il giorno locale: toISOString() converte in UTC e può selezionare
    // il giorno precedente/successivo rispetto alle ore del sito.
    const dayStr = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, "0")}-${String(targetDate.getDate()).padStart(2, "0")}`;

    setLoading(true);
    setError(null);
    setData(null);
    setOraSelezionata(oraCorrenteRef.current);

    getVentiInterpolati(lat, lon, quotaDecollo, dayStr)
      .then((result) => {
        if (cancelled) return;
        setData(result);
        setLoading(false);
        if (result.ventoOrario.length > 0) {
          const requestedHour = oraCorrenteRef.current;
          const closest = result.ventoOrario.reduce((prev, curr) =>
            Math.abs(curr.ora - requestedHour) < Math.abs(prev.ora - requestedHour) ? curr : prev
          );
          setOraSelezionata(closest.ora);
        }
        if (result.ventoOrario.length === 0) {
          setError("Nessun dato di vento disponibile per questo giorno.");
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Errore nel caricamento dei venti.");
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, [lat, lon, quotaDecollo, selectedDay]);

  useEffect(() => {
    if (!data?.ventoOrario.length) return;
    const closest = data.ventoOrario.reduce((prev, curr) =>
      Math.abs(curr.ora - oraCorrente) < Math.abs(prev.ora - oraCorrente) ? curr : prev
    );
    if (closest.ora !== oraSelezionata) setOraSelezionata(closest.ora);
  }, [oraCorrente, data, oraSelezionata]);

  const oggi = new Date();
  const targetDate = new Date(oggi);
  targetDate.setDate(oggi.getDate() + selectedDay);
  const dataGiorno = formatDateShort(targetDate);

  // Wave Index: differenza direzione vento al suolo vs 850hPa (~1450m)
  const waveIndex = useMemo(() => {
    if (!data || data.ventoOrario.length === 0) return null;
    const ref = data.ventoOrario.find(v => v.ora === oraSelezionata) || data.ventoOrario[0];
    if (!ref) return null;
    const dir10 = ref.quote?.[quotaDecollo]?.dir ?? ref.quote?.[quotaDecollo + 10]?.dir ?? 0;
    const dir850 = ref.quote?.[1450]?.dir ?? 0;
    if (dir10 === 0 && dir850 === 0) return null;
    const diff = Math.abs(dir850 - dir10);
    const normalized = diff > 180 ? 360 - diff : diff;
    return { diff: Math.round(normalized), level: normalized < 30 ? "forte" : normalized < 60 ? "medio" : normalized < 90 ? "debole" : "assente" as const };
  }, [data, oraSelezionata, quotaDecollo]);

  const oraData = useMemo(() => {
    if (!data) return null;
    return data.ventoOrario.find((v) => v.ora === oraSelezionata) || data.ventoOrario[0] || null;
  }, [data, oraSelezionata]);

  const quoteVisibili = useMemo(() => {
    if (!oraData) return [];

    const quote: { quota: number; speed: number; dir: number }[] = [];
    const partenza = Math.floor(quotaDecollo / 250) * 250;
    for (let q = partenza; q <= 4000; q += 250) {
      if (oraData.quote[q]) {
        quote.push({ quota: q, speed: oraData.quote[q].speed, dir: oraData.quote[q].dir });
      }
    }

    if (!quote.find((q) => Math.abs(q.quota - quotaDecollo) < 100)) {
      const closest = Object.entries(oraData.quote)
        .map(([q, v]) => ({ quota: parseInt(q), ...v }))
        .sort((a, b) => Math.abs(a.quota - quotaDecollo) - Math.abs(b.quota - quotaDecollo))[0];
      if (closest) quote.push(closest);
    }

    return quote.sort((a, b) => a.quota - b.quota);
  }, [oraData, quotaDecollo]);

  const maxSpeed = useMemo(() => Math.max(...quoteVisibili.map((q) => q.speed), 1), [quoteVisibili]);

  return (
    <div className="space-y-6">
      {/* Windgram Professionale integrato con dati reali */}
      <SectionErrorBoundary title="Il grafico dei venti non è riuscito a caricarsi">
        <ProfessionalWindgram
          latitude={lat}
          longitude={lon}
          altitude={quotaDecollo}
          siteName={siteName}
          selectedDay={selectedDay}
          rawData={rawData}
        />
      </SectionErrorBoundary>

      {oraData && (() => {
        const ventoAnimato = oraData.quote?.[quotaDecollo] ?? oraData.quote?.[quotaDecollo + 10] ?? Object.values(oraData.quote ?? {})[0];
        if (!ventoAnimato) return null;
        const direzione = ((ventoAnimato.dir % 360) + 360) % 360;
        const durata = Math.max(1.4, Math.min(5, 5 - ventoAnimato.speed / 12));
        return (
          <section
            aria-label="Visualizzazione animata del vento selezionato"
            className="wind-flow-panel relative overflow-hidden rounded-2xl border border-cyan-400/20 bg-gradient-to-br from-slate-900 via-slate-900 to-cyan-950/50 p-4 md:p-5"
          >
            <style>{`
              @keyframes wind-dash-flow { to { stroke-dashoffset: -180; } }
              @keyframes wind-particle-flow { 0% { transform: translateX(-20px); opacity: 0; } 15% { opacity: .9; } 85% { opacity: .9; } 100% { transform: translateX(28px); opacity: 0; } }
              .wind-flow-line { animation: wind-dash-flow var(--wind-duration, 3s) linear infinite; }
              .wind-flow-particle { animation: wind-particle-flow var(--wind-duration, 3s) ease-in-out infinite; }
              @media (prefers-reduced-motion: reduce) { .wind-flow-line, .wind-flow-particle { animation: none !important; } }
            `}</style>
            <div className="relative z-10 flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[.22em] text-cyan-300">Flusso del vento · animazione</div>
                <div className="mt-1 text-sm text-slate-300">Profilo selezionato alle {String(oraSelezionata).padStart(2, "0")}:00</div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-2xl font-semibold tabular-nums text-white">{Math.round(ventoAnimato.speed)} <span className="text-xs font-normal text-slate-400">km/h</span></div>
                  <div className="text-xs text-cyan-200">{getDirAbbrev(direzione)} · {Math.round(direzione)}°</div>
                </div>
                <div
                  aria-hidden="true"
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-cyan-300/30 bg-cyan-300/10 text-xl text-cyan-200"
                  style={{ transform: `rotate(${direzione}deg)` }}
                >↑</div>
              </div>
            </div>
            <svg className="mt-3 block h-28 w-full md:h-36" viewBox="0 0 720 140" role="img" aria-label={`Linee animate illustrative del vento, velocità ${Math.round(ventoAnimato.speed)} chilometri orari, direzione ${Math.round(direzione)} gradi`}>
              <defs>
                <linearGradient id="wind-flow-gradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.08" />
                  <stop offset="50%" stopColor="#67e8f9" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="#34d399" stopOpacity="0.15" />
                </linearGradient>
              </defs>
              {[28, 58, 88, 118].map((y, i) => (
                <g key={y} style={{ "--wind-duration": `${durata + i * 0.22}s` } as React.CSSProperties}>
                  <path d={`M -30 ${y} C 90 ${y - 24}, 150 ${y + 24}, 260 ${y} S 440 ${y - 24}, 560 ${y} S 680 ${y + 18}, 760 ${y - 2}`} fill="none" stroke="url(#wind-flow-gradient)" strokeWidth={i === 1 ? 2.5 : 1.5} strokeLinecap="round" strokeDasharray={i === 1 ? "18 12" : "9 16"} className="wind-flow-line" />
                  <circle cx={120 + i * 125} cy={y - 3} r={i === 1 ? 3 : 2} fill={i === 2 ? "#34d399" : "#67e8f9"} className="wind-flow-particle" style={{ animationDelay: `${i * -0.7}s` }} />
                </g>
              ))}
            </svg>
            <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-500">
              <span>Visualizzazione illustrativa basata sui dati orari selezionati</span>
              <span>Quota di riferimento: {quotaDecollo} m</span>
            </div>
          </section>
        );
      })()}

      <div className="bg-slate-800/60 border border-blue-500/30 rounded-xl px-4 py-3 flex items-center gap-3">
        <MapPin className="w-5 h-5 text-blue-400 shrink-0" />
        <div>
          <div className="text-sm font-bold text-white">{siteName || "Decollo"} — Venti in quota dettagliati</div>
          <div className="text-[10px] text-slate-400 flex items-center gap-2">
            <Calendar className="w-3 h-3" />
            <span>{dataGiorno}</span>
            <span className="text-slate-600">·</span>
            <span>Decollo {quotaDecollo}m</span>
          </div>
        </div>
      </div>

      {loading && (
        <div role="status" className="rounded-xl border border-cyan-400/20 bg-slate-900/70 px-4 py-5 text-sm text-cyan-100">
          <span className="inline-block mr-2 animate-spin" aria-hidden="true">◌</span>
          Caricamento del profilo dei venti…
        </div>
      )}
      {error && (
        <div role="alert" className="rounded-xl border border-amber-400/30 bg-amber-950/20 px-4 py-4 text-sm text-amber-100">
          <div className="font-semibold">Dati dei venti non disponibili</div>
          <p className="mt-1 text-amber-100/80">{error}</p>
        </div>
      )}

      {data && (
        <>
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-3 flex items-center gap-4">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Wind className="w-4 h-4 text-violet-400 shrink-0" />
              <span className="text-xs text-slate-400">Wave Index</span>
            </div>
            {waveIndex ? (
              <span className={`text-sm font-bold tabular-nums ${
                waveIndex.level === "forte" ? "text-violet-300" :
                waveIndex.level === "medio" ? "text-sky-300" :
                waveIndex.level === "debole" ? "text-amber-300" : "text-slate-500"
              }`}>
                {waveIndex.diff}°{" "}
                <span className="text-[10px] font-normal opacity-70">
                  {waveIndex.level === "forte" ? "Onda forte ✓" :
                   waveIndex.level === "medio" ? "Onda presente" :
                   waveIndex.level === "debole" ? "Onda debole" : "No onda"}
                </span>
              </span>
            ) : (
              <span className="text-xs text-slate-500">—</span>
            )}
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
            {data.ventoOrario.map((v) => (
              <button
                key={v.ora}
                onClick={() => {
                  setOraSelezionata(v.ora);
                  onOraChange?.(v.ora);
                }}
                className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                  v.ora === oraSelezionata
                    ? "bg-blue-600/30 border-blue-400/50 text-blue-200"
                    : "bg-slate-800/50 border-slate-700/50 text-slate-400 hover:bg-slate-700/40"
                }`}
              >
                {String(v.ora).padStart(2, "0")}:00
              </button>
            ))}
          </div>

          <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-cyan-400" />
              <h4 className="text-xs font-bold text-cyan-300 uppercase tracking-wider">
                Profilo verticale · {String(oraSelezionata).padStart(2, "0")}:00
              </h4>
              <span className="text-[10px] text-slate-500 ml-auto">{quotaDecollo}m → 4000m · step 250m</span>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <section className="min-w-0 rounded-2xl border border-cyan-400/20 bg-slate-950/55 p-3 sm:p-4" aria-labelledby="wind-speed-altitude-title">
                <div className="mb-2 flex items-start justify-between gap-3">
                  <div>
                    <h5 id="wind-speed-altitude-title" className="text-sm font-bold text-white">Velocità in funzione della quota</h5>
                    <p className="text-xs text-slate-400">Seleziona un’ora qui sopra per aggiornare il profilo.</p>
                  </div>
                  <span className="shrink-0 rounded-lg border border-emerald-400/20 bg-emerald-400/10 px-2 py-1 text-[10px] font-bold text-emerald-200">km/h</span>
                </div>
                {quoteVisibili.length > 0 ? (
                  <div className="h-[260px] w-full" role="img" aria-label="Grafico interattivo della velocità del vento rispetto alla quota">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={quoteVisibili} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                        <CartesianGrid stroke="rgba(148,163,184,.14)" strokeDasharray="3 5" />
                        <XAxis type="number" dataKey="quota" domain={["dataMin", "dataMax"]} tickFormatter={(value: number) => `${value} m`} tick={{ fill: "#94a3b8", fontSize: 10 }} tickLine={false} axisLine={{ stroke: "rgba(148,163,184,.2)" }} />
                        <YAxis type="number" dataKey="speed" domain={[0, Math.max(10, Math.ceil(maxSpeed / 5) * 5)]} tick={{ fill: "#94a3b8", fontSize: 10 }} tickLine={false} axisLine={false} width={36} />
                        <Tooltip
                          cursor={{ stroke: "rgba(103,232,249,.35)", strokeDasharray: "4 4" }}
                          contentStyle={{ background: "#071629", border: "1px solid rgba(103,232,249,.3)", borderRadius: 12, color: "#f8fafc" }}
                          labelFormatter={(value) => `Quota: ${value} m`}
                          formatter={(value, name) => [`${Math.round(Number(value))} km/h`, name === "speed" ? "Velocità" : String(name)]}
                        />
                        <Line dataKey="speed" name="Velocità" type="monotone" stroke="#34d399" strokeWidth={2.5} dot={{ r: 3, fill: "#34d399", stroke: "#071629", strokeWidth: 1.5 }} activeDot={{ r: 6, fill: "#a7f3d0", stroke: "#064e3b", strokeWidth: 2 }} isAnimationActive={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="flex h-[260px] items-center justify-center rounded-xl border border-dashed border-slate-700 text-sm text-slate-400">Profilo vento non disponibile per quest’ora.</div>
                )}
              </section>

              <section className="min-w-0 rounded-2xl border border-sky-400/20 bg-slate-950/55 p-3 sm:p-4" aria-labelledby="wind-direction-altitude-title">
                <div className="mb-2 flex items-start justify-between gap-3">
                  <div>
                    <h5 id="wind-direction-altitude-title" className="text-sm font-bold text-white">Direzione del vento per quota</h5>
                    <p className="text-xs text-slate-400">Ogni punto è un livello del modello; passa sopra per i valori.</p>
                  </div>
                  <span className="shrink-0 rounded-lg border border-sky-400/20 bg-sky-400/10 px-2 py-1 text-[10px] font-bold text-sky-200">gradi °</span>
                </div>
                {quoteVisibili.length > 0 ? (
                  <div className="h-[260px] w-full" role="img" aria-label="Grafico interattivo a punti della direzione del vento rispetto alla quota">
                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart margin={{ top: 8, right: 16, bottom: 8, left: 4 }}>
                        <CartesianGrid stroke="rgba(148,163,184,.14)" strokeDasharray="3 5" />
                        <XAxis type="number" dataKey="dir" name="Direzione" domain={[0, 360]} ticks={[0, 90, 180, 270, 360]} tick={{ fill: "#94a3b8", fontSize: 10 }} tickLine={false} axisLine={{ stroke: "rgba(148,163,184,.2)" }} />
                        <YAxis type="number" dataKey="quota" name="Quota" domain={["dataMin", "dataMax"]} tickFormatter={(value: number) => `${value} m`} tick={{ fill: "#94a3b8", fontSize: 10 }} tickLine={false} axisLine={false} width={56} />
                        <Tooltip
                          cursor={{ strokeDasharray: "4 4", stroke: "rgba(103,232,249,.4)" }}
                          contentStyle={{ background: "#071629", border: "1px solid rgba(103,232,249,.3)", borderRadius: 12, color: "#f8fafc" }}
                          formatter={(value, name) => {
                            if (name === "Direzione") return [`${Math.round(Number(value))}°`, "Direzione"];
                            if (name === "Velocità") return [`${Math.round(Number(value))} km/h`, "Velocità"];
                            return [value, name];
                          }}
                          labelFormatter={(_, payload) => {
                            const point = payload?.[0]?.payload as { quota?: number } | undefined;
                            return point?.quota == null ? "Profilo vento" : `Quota: ${point.quota} m`;
                          }}
                        />
                        <Scatter data={quoteVisibili} name="Direzione" dataKey="dir" fill="#60a5fa" shape="circle" />
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="flex h-[260px] items-center justify-center rounded-xl border border-dashed border-slate-700 text-sm text-slate-400">Direzione vento non disponibile per quest’ora.</div>
                )}
              </section>
            </div>
          </div>
        </>
      )}
    </div>
  );
}