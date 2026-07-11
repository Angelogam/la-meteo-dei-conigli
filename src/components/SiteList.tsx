"use client";

import { DECOLLI, Decollo } from "@/data/decolli";
import type { HourData } from "@/types/meteo";
import { useEffect, useState, useRef } from "react";

interface SiteListProps {
  selected: string;
  current: HourData | null;
  onSelect: (id: string) => void;
  weatherMap: Record<string, HourData>;
  allHourlyData?: Record<string, HourData[]>;
}

const volabilitaColor = (p: number) => {
  if (p >= 70) return "#4caf50";
  if (p >= 40) return "#ff9800";
  return "#f44336";
};

/** Verifica se un'ora è sicura per volo */
const isOraSicura = (h: HourData): boolean => {
  const code = h.weatherCode;
  if (code >= 95) return false;
  if (h.precipitation > 0.3) return false;
  if (h.windSpeed > 35) return false;
  if (h.windGust > 50) return false;
  if (code === 45 || code === 48) return false;
  if (h.windSpeed < 5) return false;
  return true;
};

/** Genera avviso testuale in base alle condizioni meteo reali */
const generaAvviso = (
  dataOrari: HourData[]
): {
  testo: string;
  colore: string;
  icona: string;
} | null => {
  if (!dataOrari || dataOrari.length === 0) return null;

  const now = new Date();
  const oraCorrente = now.getHours();
  const oggi = now.getDate();

  const finestra = dataOrari.filter((h) => {
    const hh = h.time.getHours();
    const dd = h.time.getDate();
    return dd === oggi && hh >= oraCorrente && hh <= 23;
  });

  if (finestra.length === 0) return null;

  // Controlla condizioni pericolose in qualsiasi ora della giornata
  let haTemporale = false;
  let haVentoForte = false;
  let haPioggia = false;
  let haTurbolenza = false;
  let haNebbia = false;
  let haVentoDebole = false;
  let ventoOttimo = false;
  let condizioniOttime = true;
  let condizioniMedie = false;
  let orePericolose = 0;
  let oreTotali = finestra.length;

  // Controlla anche condizioni di turbolenza (venti > 25 km/h con raffiche > 40)
  let rafficheMassime = 0;
  let ventoMassimo = 0;
  let turbolenzaCount = 0;

  for (const h of finestra) {
    const code = h.weatherCode;
    if (code >= 95) haTemporale = true;
    if (h.precipitation > 1.0) haPioggia = true;
    if (h.windSpeed > 35) haVentoForte = true;
    if (code === 45 || code === 48) haNebbia = true;
    if (h.windSpeed < 5) haVentoDebole = true;
    if (h.windSpeed >= 14 && h.windSpeed <= 29) ventoOttimo = true;

    // Turbolenza: vento > 25 km/h OPPURE raffiche > 40 km/h
    if ((h.windSpeed > 25 && h.windGust > 40) || h.windGust - h.windSpeed > 20) {
      turbolenzaCount++;
    }

    if (h.windSpeed > rafficheMassime) rafficheMassime = h.windSpeed;
    if (h.windGust > ventoMassimo) ventoMassimo = h.windGust;

    if (!isOraSicura(h)) {
      condizioniOttime = false;
      orePericolose++;
    }
  }

  // Se più del 30% delle ore ha turbolenza
  haTurbolenza = turbolenzaCount / oreTotali > 0.3;

  // Se più del 50% delle ore è sicuro ma non tutte
  const oreSicure = finestra.filter((h) => isOraSicura(h)).length;
  condizioniMedie = oreSicure / oreTotali >= 0.5 && oreSicure / oreTotali < 0.9;

  // Se più del 90% delle ore è sicuro
  condizioniOttime = oreSicure / oreTotali >= 0.9;

  // ORDINE DI PRIORITÀ: dal più grave al meno grave
  if (haTemporale) {
    return {
      testo: "🚨 Alto rischio temporali in giornata",
      colore: "#d32f2f",
      icona: "🚨",
    };
  }

  if (haVentoForte) {
    return {
      testo: "💨 Rischio venti forti",
      colore: "#d32f2f",
      icona: "💨",
    };
  }

  if (haTurbolenza && ventoMassimo > 30) {
    return {
      testo: "🌊 Attenzione a turbolenze",
      colore: "#ff9800",
      icona: "🌊",
    };
  }

  if (haPioggia) {
    return {
      testo: "🌧️ Rischio pioggia in giornata",
      colore: "#ff9800",
      icona: "🌧️",
    };
  }

  if (haNebbia) {
    return {
      testo: "🌫️ Possibile nebbia - Visibilità ridotta",
      colore: "#ff9800",
      icona: "🌫️",
    };
  }

  if (condizioniOttime && ventoOttimo) {
    return {
      testo: "🌟 Ottime condizioni per il volo",
      colore: "#4caf50",
      icona: "🌟",
    };
  }

  if (condizioniOttime && !ventoOttimo) {
    return {
      testo: "✅ Buone condizioni per il volo",
      colore: "#4caf50",
      icona: "✅",
    };
  }

  if (condizioniMedie) {
    return {
      testo: "🔶 Possibilità medie per il volo",
      colore: "#ff9800",
      icona: "🔶",
    };
  }

  if (haVentoDebole) {
    return {
      testo: "🌬️ Vento debole - Volo difficile",
      colore: "#ff9800",
      icona: "🌬️",
    };
  }

  return {
    testo: "⚠️ Condizioni variabili - Valutare con attenzione",
    colore: "#ff9800",
    icona: "⚠️",
  };
};

/** Calcola volabilità e fino a che ora si può volare sicuro */
const calcolaVolabilitaReale = (
  dataOrari: HourData[]
): {
  percentuale: number;
  allerta: string;
  coloreAllerta: string;
  finoAOra: string | null;
  oraPericolosa: string | null;
  tipoAllerta: string | null;
} => {
  const defaultResult = {
    percentuale: 50,
    allerta: "Dati insufficienti",
    coloreAllerta: "#9e9e9e",
    finoAOra: null as string | null,
    oraPericolosa: null as string | null,
    tipoAllerta: null as string | null,
  };

  if (!dataOrari || dataOrari.length === 0) return defaultResult;

  const now = new Date();
  const oraCorrente = now.getHours();
  const oggi = now.getDate();

  const finestra = dataOrari.filter((h) => {
    const hh = h.time.getHours();
    const dd = h.time.getDate();
    return dd === oggi && hh >= oraCorrente && hh <= 23;
  });

  if (finestra.length === 0) return defaultResult;

  let primaOraPericolosa: HourData | null = null;
  let score = 100;
  let allerta = "Nessuna";
  let coloreAllerta = "#4caf50";
  let oreSicureConsecutive = 0;
  let tipoAllerta: string | null = null;

  for (const h of finestra) {
    const sicura = isOraSicura(h);
    const code = h.weatherCode;
    const pioggia = h.precipitation > 0.3;
    const vento = h.windSpeed;
    const raffica = h.windGust;
    const nuvole = h.cloudCover;

    if (sicura) {
      oreSicureConsecutive++;
    } else {
      if (!primaOraPericolosa) {
        primaOraPericolosa = h;
      }

      if (code >= 95) {
        score -= 60;
        if (allerta !== "Alto") { allerta = "Alto"; coloreAllerta = "#d32f2f"; tipoAllerta = "temporale"; }
      }
      if (pioggia) {
        score -= 45;
        if (allerta !== "Alto") {
          allerta = "Medio";
          coloreAllerta = "#ff9800";
          tipoAllerta = "pioggia";
        }
        const diffOre = h.time.getHours() - oraCorrente;
        if (diffOre <= 2 && diffOre >= 0) {
          allerta = "Alto";
          coloreAllerta = "#d32f2f";
          tipoAllerta = "pioggia_imminente";
        }
      }
      if (code >= 61 && code <= 67) {
        score -= 35;
        if (allerta === "Nessuna") { allerta = "Medio"; coloreAllerta = "#ff9800"; tipoAllerta = "pioggia"; }
      }
      if (vento > 35) {
        score -= 35;
        if (allerta === "Nessuna") { allerta = "Medio"; coloreAllerta = "#ff9800"; tipoAllerta = "vento_forte"; }
      }
      if (vento > 50) {
        score -= 20;
        if (allerta !== "Alto") { allerta = "Alto"; coloreAllerta = "#d32f2f"; tipoAllerta = "vento_fortissimo"; }
      }
      if (raffica > 50) {
        score -= 20;
        if (allerta === "Nessuna") { allerta = "Medio"; coloreAllerta = "#ff9800"; tipoAllerta = "raffiche"; }
      }
      if (vento < 5) {
        score -= 15;
        if (allerta === "Nessuna") { allerta = "Basso"; coloreAllerta = "#ff9800"; tipoAllerta = "vento_debole"; }
      }
      if (code === 45 || code === 48) {
        score -= 30;
        if (allerta === "Nessuna") { allerta = "Medio"; coloreAllerta = "#ff9800"; tipoAllerta = "nebbia"; }
      }
      if (nuvole > 80 && code >= 51 && code <= 57) score -= 20;
    }
  }

  const pioggiaProssima2h = finestra.some((h) => {
    const diff = h.time.getHours() - oraCorrente;
    return diff >= 0 && diff <= 2 && h.precipitation > 1.0;
  });
  if (pioggiaProssima2h && allerta !== "Alto") {
    allerta = "Alto";
    coloreAllerta = "#d32f2f";
    tipoAllerta = "pioggia_imminente";
  }

  let finoAOra: string | null = null;
  let oraPericolosa: string | null = null;

  if (primaOraPericolosa) {
    const oraSicuraFine = oraCorrente + oreSicureConsecutive - 1;
    finoAOra = `${oraSicuraFine}:00`;
    oraPericolosa = `${primaOraPericolosa.time.getHours()}:00`;
  } else {
    finoAOra = "23:00";
    oraPericolosa = null;
  }

  return {
    percentuale: Math.max(0, Math.min(100, score)),
    allerta,
    coloreAllerta,
    finoAOra,
    oraPericolosa,
    tipoAllerta,
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
          const avviso = datiOrari ? generaAvviso(datiOrari) : null;
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
                  
                  {/* AVVISO GENERALE */}
                  {avviso && (
                    <div className="flex justify-center mb-1">
                      <span
                        className="text-xs font-bold px-2 py-1 rounded-full text-white"
                        style={{ background: avviso.colore }}
                      >
                        {avviso.testo}
                      </span>
                    </div>
                  )}

                  {vol.allerta === "Nessuna" && vol.finoAOra && (
                    <div className="flex justify-center flex-col items-center mb-1">
                      <span className="text-sm font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                        ✅ Volo sicuro fino {vol.finoAOra}
                      </span>
                      {vol.oraPericolosa && (
                        <span className="text-xs text-red-600 mt-0.5 font-semibold">
                          ⛈️ Pericolo da {vol.oraPericolosa}
                        </span>
                      )}
                    </div>
                  )}
                  {vol.allerta === "Nessuna" && !vol.finoAOra && (
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