"use client";

export interface ParametriVolo {
  windSpeed: number;        // km/h
  windGusts?: number;       // km/h
  windDir: number;          // gradi 0-360
  exposure: string;         // esposizione decollo es. "S", "SE", "NE"
  temperature: number;      // °C
  dewPoint: number;         // °C
  cloudCover: number;       // %
  precipitation: number;    // mm
  weatherCode: number;      // WMO code
  cape?: number;            // J/kg
  altitude: number;         // Quota decollo (m)
}

export interface RisultatoVolabilita {
  indice: number;           // 1 (Perfetto) a 10 (Pericoloso)
  giudizio: string;         // "Condizioni Perfette", "Ottimo", "Buono", "Attenzione", "Sconsigliato", "Pericoloso"
  coloreTesto: string;      // Classe Tailwind testo
  coloreBg: string;         // Classe Tailwind sfondo badge
  coloreBordo: string;      // Classe Tailwind bordo
  coloreHex: string;        // Colore Hex puro (da verde #10b981 a rosso #ef4444)
  baseNubiM: number;        // Quota base cumuli in metri slm
  rateoTermicoMs: number;   // Stima rateo termico m/s
  motivi: string[];
}

function exposureToDeg(exposure: string): number {
  const map: Record<string, number> = {
    "N": 0, "NNE": 22.5, "N/NE": 22.5, "NE": 45, "ENE": 67.5, "E/NE": 67.5,
    "E": 90, "ESE": 112.5, "E/SE": 112.5, "SE": 135, "SSE": 157.5, "S/SE": 157.5,
    "S": 180, "SSW": 202.5, "S/SW": 202.5, "SW": 225, "WSW": 247.5, "W/SW": 247.5, "O/SW": 247.5,
    "W": 270, "O": 270, "WNW": 292.5, "O/NW": 292.5, "NW": 315, "NNW": 337.5, "N/NW": 337.5,
  };
  const clean = exposure.trim().toUpperCase().replace(/\s+/g, "");
  return map[clean] ?? 180;
}

export function calcolaIndiceVolabilita(p: ParametriVolo): RisultatoVolabilita {
  const motivi: string[] = [];

  // Calcolo Base Nubi (LCL: formula Espy: quota + spread * 125m)
  const spread = Math.max(0.5, p.temperature - p.dewPoint);
  const baseNubiM = Math.round(p.altitude + spread * 125);

  // Stima rateo termico (m/s)
  let rateoTermico = Math.max(0, spread * 0.22 + (p.cape ? Math.min(1.2, p.cape / 900) : 0.3));
  if (p.precipitation > 0.5 || p.weatherCode >= 51) rateoTermico = 0;
  if (p.cloudCover > 80) rateoTermico *= 0.3;
  rateoTermico = Math.round(rateoTermico * 10) / 10;

  // 1. CONDIZIONI BLOCCANTI / PERICOLOSE (Ritorna 10/10)
  if (p.weatherCode >= 95 || (p.cape && p.cape > 1500 && p.precipitation > 0.5)) {
    return {
      indice: 10,
      giudizio: "Temporale / Pericoloso",
      coloreTesto: "text-red-400",
      coloreBg: "bg-red-950/80",
      coloreBordo: "border-red-600",
      coloreHex: "#dc2626",
      baseNubiM,
      rateoTermicoMs: 0,
      motivi: ["Temporale o rischio fulmini in atto"],
    };
  }

  if (p.precipitation > 1.5) {
    return {
      indice: 10,
      giudizio: "Pioggia / Non volabile",
      coloreTesto: "text-red-400",
      coloreBg: "bg-red-950/80",
      coloreBordo: "border-red-600",
      coloreHex: "#dc2626",
      baseNubiM,
      rateoTermicoMs: 0,
      motivi: [`Pioggia battente (${p.precipitation.toFixed(1)} mm)`],
    };
  }

  if (p.windSpeed > 32 || (p.windGusts && p.windGusts > 40)) {
    return {
      indice: 10,
      giudizio: "Vento troppo forte",
      coloreTesto: "text-red-400",
      coloreBg: "bg-red-950/80",
      coloreBordo: "border-red-600",
      coloreHex: "#dc2626",
      baseNubiM,
      rateoTermicoMs: 0,
      motivi: [`Vento a ${Math.round(p.windSpeed)} km/h con raffiche a ${Math.round(p.windGusts || p.windSpeed)} km/h`],
    };
  }

  // 2. CALCOLO PROGRESSIVO PUNTEGGIO (1 = Perfetto, 10 = Pericoloso)
  let punteggio = 1.0;

  // A. VENTO AL SUOLO (Ideale 7-15 km/h)
  if (p.windSpeed < 3) {
    punteggio += 1.5;
    motivi.push("Vento quasi nullo (decollo a corsa)");
  } else if (p.windSpeed >= 5 && p.windSpeed <= 14) {
    // Vento perfetto: +0
  } else if (p.windSpeed > 14 && p.windSpeed <= 20) {
    punteggio += 1.5;
    motivi.push("Vento moderato");
  } else if (p.windSpeed > 20 && p.windSpeed <= 26) {
    punteggio += 3.5;
    motivi.push("Vento sostenuto, attenzione in quota");
  } else {
    punteggio += 5.5;
    motivi.push("Vento forte al limite");
  }

  // Raffiche (gusts)
  if (p.windGusts && p.windGusts > p.windSpeed + 12) {
    punteggio += 2.0;
    motivi.push(`Raffiche irregolari (+${Math.round(p.windGusts - p.windSpeed)} km/h)`);
  }

  // B. DIREZIONE RISPETTO ALL'ESPOSIZIONE DEL DECOLLO
  const expDeg = exposureToDeg(p.exposure);
  let diffDir = Math.abs(p.windDir - expDeg);
  if (diffDir > 180) diffDir = 360 - diffDir;

  if (diffDir <= 35) {
    // Perfettamente frontale / sopravvento: +0
  } else if (diffDir <= 70) {
    punteggio += 1.0;
    motivi.push("Vento leggermente diagonale");
  } else if (diffDir <= 110) {
    punteggio += 3.0;
    motivi.push("Vento traversone al decollo");
  } else {
    punteggio += 5.5;
    motivi.push("SOTTOVENTO / Vento alle spalle");
  }

  // C. NUVOLOSITÀ E PIOGGERELLA
  if (p.precipitation > 0.2) {
    punteggio += 3.5;
    motivi.push("Pioviggine debole in corso");
  } else if (p.cloudCover > 85) {
    punteggio += 1.5;
    motivi.push("Cielo molto coperto, termiche deboli");
  } else if (p.cloudCover >= 15 && p.cloudCover <= 55) {
    // Cumuli ideali: nessun malus
  }

  // D. BASE NUBI SOTTO IL DECOLLO (Nebbia / nube bassa)
  if (baseNubiM <= p.altitude + 80) {
    punteggio += 4.5;
    motivi.push("Base nubi bassa / possibile nebbia sul decollo");
  }

  // Normalizza tra 1 e 10
  const indiceFinale = Math.max(1, Math.min(10, Math.round(punteggio)));

  let giudizio = "Condizioni Perfette";
  let coloreTesto = "text-emerald-400";
  let coloreBg = "bg-emerald-950/70";
  let coloreBordo = "border-emerald-500/60";
  let coloreHex = "#10b981";

  if (indiceFinale === 1 || indiceFinale === 2) {
    giudizio = "Perfetto";
    coloreTesto = "text-emerald-400";
    coloreBg = "bg-emerald-950/70";
    coloreBordo = "border-emerald-500/60";
    coloreHex = "#10b981";
  } else if (indiceFinale === 3 || indiceFinale === 4) {
    giudizio = "Buono";
    coloreTesto = "text-lime-400";
    coloreBg = "bg-lime-950/70";
    coloreBordo = "border-lime-500/60";
    coloreHex = "#84cc16";
  } else if (indiceFinale === 5 || indiceFinale === 6) {
    giudizio = "Discreto";
    coloreTesto = "text-yellow-400";
    coloreBg = "bg-yellow-950/70";
    coloreBordo = "border-yellow-500/60";
    coloreHex = "#eab308";
  } else if (indiceFinale === 7 || indiceFinale === 8) {
    giudizio = "Impegnativo";
    coloreTesto = "text-orange-400";
    coloreBg = "bg-orange-950/70";
    coloreBordo = "border-orange-500/60";
    coloreHex = "#f97316";
  } else {
    giudizio = "Sconsigliato / Pericoloso";
    coloreTesto = "text-red-400";
    coloreBg = "bg-red-950/80";
    coloreBordo = "border-red-500/70";
    coloreHex = "#ef4444";
  }

  return {
    indice: indiceFinale,
    giudizio,
    coloreTesto,
    coloreBg,
    coloreBordo,
    coloreHex,
    baseNubiM,
    rateoTermicoMs: rateoTermico,
    motivi,
  };
}