"use client";

import { calcCloudBase } from "@/utils/calcCloudBase";

export interface ParametriVolabilita {
  windSpeed: number;        // km/h (al suolo)
  windGusts?: number;       // km/h
  windDir: number;          // gradi 0-360 (da dove viene il vento)
  esposizione: string;      // orientamento decollo: "N", "NE", "E", "SE", "S", "SW", "W", "NW", "S/SE", "S/SW", etc.
  temperature: number;      // °C
  dewPoint: number;         // °C
  cloudCover: number;       // %
  precipitation: number;    // mm
  weatherCode?: number;     // WMO
  cape?: number;            // J/kg
  liftedIndex?: number;     // LI
  quota: number;            // metri slm
}

export interface RisultatoVolabilita {
  indice: number;           // 1 (Perfetto) ... 10 (Pericoloso)
  label: string;            // "Perfetto", "Ottimo", "Buono", "Discreto", "Impegnativo", "Rischioso", "Sconsigliato", "Pericoloso"
  coloreTesto: string;      // Tailwind text color
  coloreBg: string;         // Tailwind bg color
  coloreBordo: string;      // Tailwind border color
  baseNubiM: number;        // Quota base cumuli (m slm)
  rateoTermicoMs: number;   // m/s stimato
  motivi: string[];         // Dettaglio per debug/utente
  windRelativo: "frontale" | "diagonale" | "laterale" | "di_coda" | "sconosciuto";
}

function esposizioneToGradi(esposizione: string | undefined | null): number {
  const m: Record<string, number> = {
    "N": 0, "NNE": 22.5, "NE": 45, "ENE": 67.5,
    "E": 90, "ESE": 112.5, "SE": 135, "SSE": 157.5,
    "S": 180, "SSW": 202.5, "SW": 225, "WSW": 247.5,
    "W": 270, "WNW": 292.5, "NW": 315, "NNW": 337.5,
    "SO": 225, // Sud-Ovest (alias italiano)
    "NO": 315, // Nord-Ovest (alias italiano)
    "S/SE": 157.5, "S/SW": 202.5, "N/NE": 22.5, "N/NW": 337.5,
    "E/NE": 67.5, "E/SE": 112.5, "W/NW": 292.5, "W/SW": 247.5,
    "SE/S": 157.5, "SW/S": 202.5,
    "SO/S": 202.5, "NE/N": 22.5,
  };
  if (!esposizione) return 180; // default: Sud
  const clean = esposizione.trim().toUpperCase().replace(/\s+/g, "").replace(/\//g, "/");
  return m[clean] ?? 180;
}

function diffAngolare(a: number, b: number): number {
  let d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

function windRelativoLabel(windDir: number, esposizione: string): "frontale" | "diagonale" | "laterale" | "di_coda" | "sconosciuto" {
  const expDeg = esposizioneToGradi(esposizione);
  // Vento VIENE DA windDir, decollo guarda VERSO esposizione
  // Se vento da S (180°) e decollo guarda S (180°) → vento frontale (headwind) = BUONO
  // Differenza tra provenienza vento e direzione decollo
  const diff = diffAngolare(windDir, expDeg);
  if (diff <= 45) return "frontale";      // headwind - ottimo
  if (diff <= 90) return "diagonale";     // crosswind leggero - ok
  if (diff <= 135) return "laterale";     // crosswind forte - attenzione
  return "di_coda";                        // tailwind - PERICOLOSO
}

export function calcolaIndiceVolabilita(p: ParametriVolabilita): RisultatoVolabilita {
  const motivi: string[] = [];

  // 1. BASE NUBI (LCL semplificato: quota + spread * 125, max +1800m)
  const spread = Math.max(0.5, p.temperature - p.dewPoint);
  const baseNubiM = calcCloudBase(p.quota, p.temperature, p.dewPoint);

  // 2. RATEO TERMICO stimato
  let rateoTermico = Math.max(0, spread * 0.22 + (p.cape ? Math.min(1.5, p.cape / 800) : 0.3));
  if (p.precipitation > 0.3 || (p.weatherCode !== undefined && p.weatherCode >= 51)) rateoTermico = 0;
  if (p.cloudCover > 85) rateoTermico *= 0.25;
  rateoTermico = Math.round(rateoTermico * 10) / 10;

  // 3. CONDIZIONI BLOCCANTI → indice >= 8
  // Temporale / fulmini
  if (p.weatherCode !== undefined && (p.weatherCode === 95 || p.weatherCode === 96 || p.weatherCode === 99)) {
    return {
      indice: 10, label: "Pericoloso", coloreTesto: "text-red-400", coloreBg: "bg-red-950/80", coloreBordo: "border-red-600",
      baseNubiM, rateoTermicoMs: 0, motivi: ["Temporale in atto (WMO 95/96/99)"], windRelativo: "sconosciuto"
    };
  }
  if (p.cape !== undefined && p.cape > 1500 && p.precipitation > 0.5) {
    return {
      indice: 9, label: "Rischioso", coloreTesto: "text-red-400", coloreBg: "bg-red-950/80", coloreBordo: "border-red-600",
      baseNubiM, rateoTermicoMs: 0, motivi: [`CAPE estremo (${p.cape} J/kg) + pioggia`], windRelativo: "sconosciuto"
    };
  }

  // Pioggia significativa
  if (p.precipitation > 1.0) {
    return {
      indice: 9, label: "Non volabile - Pioggia", coloreTesto: "text-red-400", coloreBg: "bg-red-950/80", coloreBordo: "border-red-600",
      baseNubiM, rateoTermicoMs: 0, motivi: [`Pioggia ${p.precipitation.toFixed(1)} mm`], windRelativo: "sconosciuto"
    };
  }
  if (p.precipitation > 0.2) {
    return {
      indice: 8, label: "Sconsigliato - Pioviggine", coloreTesto: "text-orange-400", coloreBg: "bg-orange-950/80", coloreBordo: "border-orange-600",
      baseNubiM, rateoTermicoMs: rateoTermico, motivi: ["Pioviggine in corso"], windRelativo: "sconosciuto"
    };
  }

  // Vento troppo forte
  if (p.windSpeed > 30 || (p.windGusts !== undefined && p.windGusts > 40)) {
    return {
      indice: 9, label: "Pericoloso - Vento forte", coloreTesto: "text-red-400", coloreBg: "bg-red-950/80", coloreBordo: "border-red-600",
      baseNubiM, rateoTermicoMs: 0, motivi: [`Vento ${Math.round(p.windSpeed)} km/h, raffiche ${Math.round(p.windGusts || 0)} km/h`], windRelativo: "sconosciuto"
    };
  }

  // 4. CALCOLO PROGRESSIVO (1 = perfetto)
  let punteggio = 1.0;

  // A. VENTO AL SUOLO (ideale 8-16 km/h)
  if (p.windSpeed < 3) {
    punteggio += 1.5; motivi.push("Vento quasi nullo (decollo a corsa)");
  } else if (p.windSpeed >= 5 && p.windSpeed <= 15) {
    // ideale: +0
  } else if (p.windSpeed > 15 && p.windSpeed <= 20) {
    punteggio += 1.5; motivi.push("Vento moderato-sostenuto");
  } else if (p.windSpeed > 20 && p.windSpeed <= 26) {
    punteggio += 3.5; motivi.push("Vento sostenuto, impegnativo");
  } else {
    punteggio += 5.5; motivi.push("Vento forte al limite");
  }

  // Raffiche eccessive
  if (p.windGusts !== undefined && p.windGusts > p.windSpeed + 10) {
    punteggio += 2.0; motivi.push(`Raffiche irregolari (+${Math.round(p.windGusts - p.windSpeed)} km/h)`);
  }

  // B. DIREZIONE VENTO vs ESPOSIZIONE DECOLLO
  const rel = windRelativoLabel(p.windDir, p.esposizione);
  if (rel === "frontale") {
    // +0 - ideale
  } else if (rel === "diagonale") {
    punteggio += 0.5; motivi.push("Vento diagonale favorevole");
  } else if (rel === "laterale") {
    punteggio += 2.5; motivi.push("Vento laterale (crosswind forte)");
  } else if (rel === "di_coda") {
    punteggio += 5.0; motivi.push("VENTO DI CODA / SOTTOVENTO - PERICOLOSO");
  }

  // C. NUVOLOSITÀ
  if (p.cloudCover > 90) {
    punteggio += 2.0; motivi.push("Cielo coperto > 90%");
  } else if (p.cloudCover > 70) {
    punteggio += 1.0; motivi.push("Molto nuvoloso");
  } else if (p.cloudCover >= 15 && p.cloudCover <= 55) {
    // cumuli ideali: nessun malus
  }

  // D. BASE NUBI BASSA (nebbia / nubi basse sul decollo)
  if (baseNubiM <= p.quota + 100) {
    punteggio += 3.0; motivi.push(`Base nubi bassa (${baseNubiM}m vs decollo ${p.quota}m)`);
  }

  // E. INSTABILITÀ / TURBOLENZA (CAPE, Lifted Index)
  if (p.cape !== undefined && p.cape > 1200) {
    punteggio += 1.5; motivi.push(`CAPE alto (${p.cape} J/kg) - turbolenza probabile`);
  }
  if (p.liftedIndex !== undefined && p.liftedIndex < -4) {
    punteggio += 1.0; motivi.push(`Lifted Index ${p.liftedIndex} - instabilità marcata`);
  }

  // Normalizza 1-10
  const indiceFinale = Math.max(1, Math.min(10, Math.round(punteggio)));

  // Label e colori
  let label = "";
  let coloreTesto = "";
  let coloreBg = "";
  let coloreBordo = "";

  if (indiceFinale <= 2) { label = "Perfetto"; coloreTesto = "text-emerald-400"; coloreBg = "bg-emerald-950/80"; coloreBordo = "border-emerald-500/60"; }
  else if (indiceFinale <= 3) { label = "Ottimo"; coloreTesto = "text-emerald-300"; coloreBg = "bg-emerald-950/70"; coloreBordo = "border-emerald-500/50"; }
  else if (indiceFinale <= 4) { label = "Buono"; coloreTesto = "text-lime-400"; coloreBg = "bg-lime-950/70"; coloreBordo = "border-lime-500/50"; }
  else if (indiceFinale <= 5) { label = "Discreto"; coloreTesto = "text-yellow-400"; coloreBg = "bg-yellow-950/70"; coloreBordo = "border-yellow-500/50"; }
  else if (indiceFinale <= 6) { label = "Impegnativo"; coloreTesto = "text-amber-400"; coloreBg = "bg-amber-950/70"; coloreBordo = "border-amber-500/50"; }
  else if (indiceFinale <= 7) { label = "Difficile"; coloreTesto = "text-orange-400"; coloreBg = "bg-orange-950/80"; coloreBordo = "border-orange-500/60"; }
  else if (indiceFinale <= 8) { label = "Rischioso"; coloreTesto = "text-orange-300"; coloreBg = "bg-orange-950/80"; coloreBordo = "border-orange-600"; }
  else { label = "Sconsigliato"; coloreTesto = "text-red-400"; coloreBg = "bg-red-950/80"; coloreBordo = "border-red-500/70"; }

  return {
    indice: indiceFinale,
    label,
    coloreTesto,
    coloreBg,
    coloreBordo,
    baseNubiM,
    rateoTermicoMs: rateoTermico,
    motivi,
    windRelativo: rel,
  };
}