"use client";

import React, { useMemo } from "react";
import { Wind, Calendar, MapPin } from "lucide-react";

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
}

// Genera colore in base alla direzione del vento
function getWindColor(dir: number): string {
  const normalized = ((dir % 360) + 360) % 360;
  if (normalized >= 315 || normalized < 45) return "#3b82f6"; // N - Blu
  if (normalized >= 45 && normalized < 135) return "#22c55e"; // E - Verde
  if (normalized >= 135 && normalized < 225) return "#f97316"; // S - Arancione
  return "#ef4444"; // W - Rosso
}

export default function WindgramProfessionale({
  dati,
  quotaDecollo,
  siteName,
  dataGiorno,
}: WindgramProfessionaleProps) {
  // Quote da mostrare - come nell'immagine (in alto le più alte, in basso le più basse)
  // Ma per decolli in Piemonte usiamo 0m to 4000m step 500m per essere realistici
  const quoteVisibili = useMemo(() => {
    const quote: number[] = [];
    for (let q = 4000; q >= 0; q -= 500) {
      quote.push(q);
    }
    return quote;
  }, []);

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
    return Math.max(max, 20); // minimo 20 per visualizzazione realistica
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
          <h3 className="text-sm font-bold text-white">Windgram {siteName && `· ${siteName}`}</h3>
        </div>
        {dataGiorno && (
          <div className="flex items-center gap-1 text-[10px] text-slate-500">
            <Calendar className="w-3 h-3" />
            {dataGiorno}
          </div>
        )}
      </div>

      {/* Legenda colori */}
      <div className="flex items-center justify-center gap-4 px-4 py-1.5 bg-slate-800/30 border-b border-slate-700/30 text-[10px]">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: "#3b82f6" }} />
          <span className="text-slate-300 font-bold">N</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: "#22c55e" }} />
          <span className="text-slate-300 font-bold">E</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: "#f97316" }} />
          <span className="text-slate-300 font-bold">S</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: "#ef4444" }} />
          <span className="text-slate-300 font-bold">W</span>
        </span>
        <span className="text-slate-500">·</span>
        <span className="text-slate-400">Galleria del vento</span>
      </div>

      {/* Windgram verticale - come nell'immagine */}
      <div className="overflow-x-auto">
        <div className="min-w-[700px] p-3">
          {/* Header colonne - quote (in alto le più alte) */}
          <div className="flex mb-1">
            {/* Etichetta ore a sinistra */}
            <div className="w-16 shrink-0" />
            
            {/* Quote come colonne */}
            <div className="flex-1 grid grid-cols-[repeat(9,1fr)] gap-0">
              {quoteVisibili.map((q) => {
                const isDecollo = Math.abs(q - quotaDecollo) < 250;
                return (
                  <div key={q} className="text-center">
                    <div className={`text-[10px] font-mono ${isDecollo ? "text-emerald-400 font-bold" : "text-slate-500"}`}>
                      {isDecollo ? "🪂" : ""}
                    </div>
                    <div className="text-[9px] font-mono text-slate-500">
                      {q / 1000}.0
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Righe ore - barre verticali che crescono dal basso */}
          <div className="space-y-1">
            {oreVisibili.map((ora) => {
              return (
                <div key={ora} className="flex items-center gap-1">
                  {/* Etichetta ora */}
                  <div className="w-16 shrink-0 text-center">
                    <span className="text-[11px] font-bold text-slate-400">
                      {String(ora).padStart(2, "0")}:00
                    </span>
                  </div>

                  {/* Celle per ogni quota */}
                  <div className="flex-1 grid grid-cols-[repeat(9,1fr)] gap-0.5">
                    {quoteVisibili.map((q) => {
                      const d = dati.find(x => x.ora === ora);
                      if (!d) return <div key={q} className="h-8 bg-slate-800/40 rounded" />;

                      const v = d.quote[q];
                      if (!v || !v.speed) return <div key={q} className="h-8 bg-slate-800/40 rounded" />;

                      const speed = v.speed;
                      const dir = v.dir;
                      const color = getWindColor(dir);
                      const pct = Math.max(10, Math.min(100, (speed / maxSpeed) * 100));

                      return (
                        <div
                          key={q}
                          className="relative h-8 rounded-sm overflow-hidden flex items-end"
                          style={{
                            backgroundColor: `${color}10`,
                          }}
                          title={`${q}m · ${String(ora).padStart(2, "0")}:00\nVento: ${Math.round(speed)} km/h da ${Math.round(dir)}°\nRaffiche: ${Math.round(d.gust)} km/h`}
                        >
                          {/* Barra verticale che cresce dal BASSO - come nell'immagine */}
                          <div
                            className="w-full rounded-sm"
                            style={{
                              height: `${pct}%`,
                              backgroundColor: color,
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="flex justify-between mt-2 text-[10px] text-slate-600">
            <span>Max: {Math.round(maxSpeed)} km/h</span>
            <span>↑ km/h</span>
          </div>
        </div>
      </div>
    </div>
  );
}