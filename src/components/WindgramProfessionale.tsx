"use client";

import React, { useMemo } from "react";
import { Wind, Calendar, MapPin } from "lucide-react";

interface LivelloVento {
  quota: number;
  speed: number;
  dir: number;
}

interface WindgramProfessionaleProps {
  dati: {
    ora: number;
    quote: Record<number, { speed: number; dir: number }>;
    gust: number;
    temp: number;
  }[];
  quotaDecollo: number;
  siteName?: string;
  dataGiorno?: string;
  quotaMin?: number;
  quotaMax?: number;
}

// Genera colore in base alla direzione del vento
function getWindColor(dir: number): string {
  // 0° = N (blu), 90° = E (verde), 180° = S (arancio), 270° = W (rosso)
  const normalized = ((dir % 360) + 360) % 360;
  
  // Paletta stile Alpium
  if (normalized >= 315 || normalized < 45) return "#3b82f6"; // N - Blu
  if (normalized >= 45 && normalized < 135) return "#22c55e"; // E - Verde
  if (normalized >= 135 && normalized < 225) return "#f97316"; // S - Arancione
  return "#ef4444"; // W - Rosso
}

// Colore più scuro per raffiche
function getWindColorDark(dir: number): string {
  const normalized = ((dir % 360) + 360) % 360;
  if (normalized >= 315 || normalized < 45) return "#1d4ed8"; // N scuro
  if (normalized >= 45 && normalized < 135) return "#16a34a"; // E scuro
  if (normalized >= 135 && normalized < 225) return "#ea580c"; // S scuro
  return "#dc2626"; // W scuro
}

export default function WindgramProfessionale({
  dati,
  quotaDecollo,
  siteName,
  dataGiorno,
  quotaMin,
  quotaMax,
}: WindgramProfessionaleProps) {
  // Quote da mostrare (dal decollo fino a 4000m, step 250m)
  const quoteVisibili = useMemo(() => {
    const min = quotaMin ?? Math.floor(quotaDecollo / 250) * 250;
    const max = quotaMax ?? 4000;
    const quote: number[] = [];
    for (let q = min; q <= max; q += 250) {
      quote.push(q);
    }
    if (!quote.includes(quotaDecollo)) {
      quote.push(quotaDecollo);
      quote.sort((a, b) => a - b);
    }
    return quote;
  }, [quotaDecollo, quotaMin, quotaMax]);

  // Ore da mostrare (dai dati disponibili)
  const oreVisibili = useMemo(() => {
    if (!dati || dati.length === 0) return [];
    return dati.map(d => d.ora).sort((a, b) => a - b);
  }, [dati]);

  // Calcola la velocità massima per normalizzare le barre
  const maxSpeed = useMemo(() => {
    if (!dati) return 40;
    let max = 1;
    for (const d of dati) {
      for (const q of quoteVisibili) {
        const v = d.quote[q];
        if (v && v.speed > max) max = v.speed;
      }
      if (d.gust > max) max = d.gust;
    }
    return Math.max(max, 30); // minimo 30 per visualizzazione realistica
  }, [dati, quoteVisibili]);

  if (!dati || dati.length === 0 || quoteVisibili.length === 0) {
    return (
      <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-8 text-center">
        <Wind className="w-10 h-10 text-slate-600 mx-auto mb-3" />
        <p className="text-slate-400">Nessun dato vento disponibile</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/80 border border-slate-700/50 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-800/50 border-b border-slate-700/50">
        <div className="flex items-center gap-2">
          <Wind className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-bold text-white">Windgram</h3>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-slate-500">
          {siteName && (
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {siteName}
            </span>
          )}
          {dataGiorno && (
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {dataGiorno}
            </span>
          )}
        </div>
      </div>

      {/* Legenda colori */}
      <div className="flex items-center gap-4 px-4 py-2 bg-slate-800/20 border-b border-slate-700/30 text-[10px]">
        <span className="text-slate-400 font-semibold">Direzione:</span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: "#3b82f6" }} />
          <span className="text-slate-300">N</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: "#22c55e" }} />
          <span className="text-slate-300">E</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: "#f97316" }} />
          <span className="text-slate-300">S</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: "#ef4444" }} />
          <span className="text-slate-300">W</span>
        </span>
        <span className="mx-2 text-slate-600">|</span>
        <span className="text-slate-400">🪂 = decollo</span>
      </div>

      {/* Scroll orizzontale */}
      <div className="overflow-x-auto">
        <div className="min-w-[600px] p-4">
          {/* Header ore */}
          <div className="flex ml-24 mb-1">
            <div className="flex-1 grid grid-cols-[repeat(10,1fr)] gap-0.5">
              {oreVisibili.map((ora) => (
                <div key={ora} className="text-center text-[10px] font-bold text-slate-500">
                  {String(ora).padStart(2, "0")}:00
                </div>
              ))}
            </div>
          </div>

          {/* Griglia quote */}
          <div className="space-y-0.5">
            {quoteVisibili.map((q) => {
              const isDecollo = Math.abs(q - quotaDecollo) < 100;

              return (
                <div
                  key={q}
                  className={`flex items-center rounded-lg ${
                    isDecollo ? "bg-emerald-500/10" : "hover:bg-slate-800/30"
                  }`}
                >
                  {/* Etichetta quota */}
                  <div className="w-24 shrink-0 text-right pr-3 font-mono text-[10px] text-slate-500 relative">
                    {isDecollo && <span className="absolute left-1 top-1/2 -translate-y-1/2">🪂</span>}
                    {q}m
                  </div>

                  {/* Righe vento per ogni ora */}
                  <div className="flex-1 grid grid-cols-[repeat(10,1fr)] gap-0.5 py-0.5">
                    {oreVisibili.map((ora) => {
                      const d = dati.find(x => x.ora === ora);
                      if (!d) return <div key={ora} className="h-4 bg-slate-800/40 rounded" />;

                      const v = d.quote[q];
                      if (!v || !v.speed) return <div key={ora} className="h-4 bg-slate-800/40 rounded" />;

                      const speed = v.speed;
                      const dir = v.dir;
                      const color = getWindColor(dir);
                      const pct = Math.max(10, Math.min(100, (speed / maxSpeed) * 100));

                      return (
                        <div
                          key={ora}
                          className="relative h-4 rounded-sm overflow-hidden flex items-center"
                          style={{
                            backgroundColor: `${color}15`,
                          }}
                          title={`${q}m · ${String(ora).padStart(2, "0")}:00 · ${Math.round(speed)} km/h da ${Math.round(dir)}°`}
                        >
                          {/* Barra del vento */}
                          <div
                            className="h-full rounded-sm"
                            style={{
                              width: `${pct}%`,
                              backgroundColor: color,
                            }}
                          />
                          {/* Valore numerico */}
                          <span
                            className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-white"
                            style={{ textShadow: "0 0 2px rgba(0,0,0,0.8)" }}
                          >
                            {Math.round(speed)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer: velocità massima */}
          <div className="flex justify-end mt-2 text-[10px] text-slate-600">
            Max: {Math.round(maxSpeed)} km/h
          </div>
        </div>
      </div>
    </div>
  );
}