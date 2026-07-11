"use client";

import { DECOLLI, Decollo } from "@/data/decolli";
import type { HourData } from "@/types/meteo";
import { useEffect, useState, useRef } from "react";

interface SiteListProps {
  selected: string;
  current: HourData | null;
  onSelect: (id: string) => void;
  weatherMap: Record<string, HourData>;
  allHourlyData?: Record<string, HourData[]>; // <-- nuova prop: tutti i dati orari per ogni decollo
}

const diffColor = (d: number) => d <= 2 ? "#4caf50" : d <= 3 ? "#ff9800" : "#f44336";
const diffLabel = (d: number) => d <= 2 ? "Facile" : d <= 3 ? "Medio" : "Difficile";
const volabilitaColor = (p: number) => {
  if (p >= 70) return "#4caf50";
  if (p >= 40) return "#ff9800";
  return "#f44336";
};

/** Calcola volabilità e allerta in base ai dati reali */
const calcolaVolabilitaReale = (dataOrari: HourData[]): { percentuale: number; allerta: string; coloreAllerta: string } => {
  if (!dataOrari || dataOrari.length === 0) return { percentuale: 50, allerta: "Dati insufficienti", coloreAllerta: "#9e9e9e" };

  const now = new Date();
  const oraCorrente = now.getHours();
  const oggi = now.getDate();

  // Prendi i dati delle prossime 4 ore (ora corrente + 3 ore avanti)
  const finestra = dataOrari.filter(h => {
    const hh = h.time.getHours();
    const dd = h.time.getDate();
    return dd === oggi && hh >= oraCorrente && hh <= oraCorrente + 4;
  });

  // Se non ci sono dati per oggi, usa l'ora più vicina disponibile
  const datiDisponibili = finestra.length > 0 ? finestra : dataOrari.slice(0, 5);
  if (datiDisponibili.length === 0) return { percentuale: 50, allerta: "N/D", coloreAllerta: "#9e9e9e" };

  let score = 100;
  let allerta = "Nessuna";
  let coloreAllerta = "#4caf50";

  // Controlla ogni ora nella finestra
  for (const h of datiDisponibili) {
    const code = h.weatherCode;
    const pioggia = h.precipitation > 0.3;
    const vento = h.windSpeed;
    const raffica = h.windGust;
    const nuvole = h.cloudCover;

    // Temporale imminente (weatherCode >= 95)
    if (code >= 95) {
      score -= 60;
      if (allerta !== "Alto") {
        allerta = "Alto";
        coloreAllerta = "#d32f2f";
      }
    }

    // Pioggia imminente nelle prossime ore
    if (pioggia) {
      score -= 45;
      if (allerta !== "Alto") {
        allerta = "Medio";
        coloreAllerta = "#ff9800";
      }
      // Se piove nelle prossime 2 ore, allerta più grave
      const diffOre = h.time.getHours() - oraCorrente;
      if (diffOre <= 2 && diffOre >= 0) {
        allerta = "Alto";
        coloreAllerta = "#d32f2f";
      }
    }

    // Pioggia forte
    if (code >= 61 && code <= 67) {
      score -= 35;
      if (allerta === "Nessuna") {
        allerta = "Medio";
        coloreAllerta = "#ff9800";
      }
    }

    // Vento forte
    if (vento > 35) {
      score -= 35;
      if (allerta === "Nessuna") {
        allerta = "Medio";
        coloreAllerta = "#ff9800";
      }
    }
    if (vento > 50) {
      score -= 20;
      if (allerta !== "Alto") {
        allerta = "Alto";
        coloreAllerta = "#d32f2f";
      }
    }

    // Raffiche forti
    if (raffica > 50) {
      score -= 20;
      if (allerta === "Nessuna") {
        allerta = "Medio";
        coloreAllerta = "#ff9800";
      }
    }

    // Vento troppo debole per volo
    if (vento < 5) {
      score -= 15;
    }

    // Nebbia
    if (code === 45 || code === 48) {
      score -= 30;
      if (allerta === "Nessuna") {
        allerta = "Medio";
        coloreAllerta = "#ff9800";
      }
    }

    // Cielo coperto + umidità = possibile temporale
    if (nuvole > 80 && code >= 51 && code <= 57) {
      score -= 20;
    }
  }

  // Se c'è allerta e pioggia nelle due ore successive, forza allerta alta
  const pioggiaProssima2h = datiDisponibili.some(h => {
    const diff = h.time.getHours() - oraCorrente;
    return diff >= 0 && diff <= 2 && h.precipitation > 1.0;
  });
  if (pioggiaProssima2h && allerta !== "Alto") {
    allerta = "Alto";
    coloreAllerta = "#d32f2f";
  }

  return {
    percentuale: Math.max(0, Math.min(100, score)),
    allerta,
    coloreAllerta
  };
};

export const SiteList = ({ selected, current, onSelect, weatherMap = {}, allHourlyData = {} }: SiteListProps) => {
  return (
    <div className="bg-gray-300/80 rounded-2xl border border-gray-400/60 p-3 backdrop-blur md:h-[calc(100vh-180px)] overflow-hidden">
      <h3 className="text-xl text-red-600 mb-3 font-bold">Decolli</h3>
      <div className="overflow-y-auto h-[calc(100%-40px)] pr-1">
        {DECOLLI.map((d) => {
          const sel = d.id === selected;
          const datiOrari = allHourlyData[d.id];
          const vol = datiOrari ? calcolaVolabilitaReale(datiOrari) : null;
          const temp = datiOrari && datiOrari.length > 0 ? Math.round(datiOrari[0].temperature) : null;
          const ventoOra = datiOrari && datiOrari.length > 0 ? Math.round(datiOrari[0].windSpeed) : null;

          return (
            <button
              key={d.id}
              onClick={() => onSelect(d.id)}
              className={
                "w-full text-left rounded-xl p-3 mb-2 cursor-pointer transition-colors " +
                (sel
                  ? "bg-gray-200 border border-gray-500 shadow-sm"
                  : "bg-white/70 border border-gray-300 hover:bg-white/90")
              }
            >
              <div className="flex justify-between items-center">
                <span className="font-bold text-base text-gray-800">{d.name}</span>
                <span className="text-sm text-gray-500">{d.valley}</span>
              </div>
              {vol && (
                <>
                  <div className="flex justify-center items-center gap-3 my-1.5">
                    <span
                      className="text-base font-bold text-white px-3 py-1 rounded-full"
                      style={{ background: volabilitaColor(vol.percentuale) }}
                    >
                      Volabilità {vol.percentuale}%
                    </span>
                    {temp !== null && (
                      <span className="text-base font-bold text-orange-600">{temp}°C</span>
                    )}
                  </div>
                  {vol.allerta !== "Nessuna" && (
                    <div className="flex justify-center mb-1">
                      <span
                        className="text-sm font-bold px-2 py-0.5 rounded-full text-white"
                        style={{ background: vol.coloreAllerta }}
                      >
                        ⚠️ Allerta {vol.allerta}
                      </span>
                    </div>
                  )}
                  {vol.allerta === "Nessuna" && (
                    <div className="flex justify-center mb-1">
                      <span className="text-sm font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                        ✅ Volo sicuro
                      </span>
                    </div>
                  )}
                </>
              )}
              <div className="flex justify-between text-sm text-gray-600 mt-1 font-medium">
                <span>{d.exposure}</span>
                <span>{d.altitude}m</span>
              </div>
              <div className="flex justify-between text-xs mt-1.5 items-center">
                <span
                  className="text-sm px-2 py-0.5 rounded-full font-semibold text-white"
                  style={{ background: diffColor(d.difficulty) }}
                >
                  {diffLabel(d.difficulty)}
                </span>
                {ventoOra !== null && (
                  <span className="text-sm font-bold text-blue-700">
                    Vento {ventoOra} km/h
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};