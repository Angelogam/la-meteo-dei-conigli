import { DECOLLI, type Decollo } from "@/data/decolli";

export function validaVentoPerDecollo(windDir: number, exposure: string) {
  if (windDir == null) {
    return { status: "sconosciuto" as const, label: "Dati mancanti", icon: "❓", descrizione: "Direzione vento non disponibile" };
  }

  // Normalizza l'esposizione per il confronto
  const exp = exposure.toUpperCase().trim();
  const dir = ((windDir % 360) + 360) % 360; // Assicura che sia tra 0 e 359

  // Definisci le direzioni cardinali
  const directions: Record<string, { min: number; max: number }> = {
    "N": { min: 338, max: 22 },   // Nord
    "NE": { min: 23, max: 68 },   // Nord-Est
    "E": { min: 69, max: 113 },   // Est
    "SE": { min: 114, max: 158 }, // Sud-Est
    "S": { min: 159, max: 202 },  // Sud
    "SW": { min: 203, max: 247 }, // Sud-Ovest
    "W": { min: 248, max: 292 },  // Ovest
    "NW": { min: 293, max: 337 }, // Nord-Ovest
  };

  // Trova la direzione più vicina all'esposizione
  let closestDir = "N";
  let minDiff = 360;
  
  for (const [dirName, range] of Object.entries(directions)) {
    let diff;
    if (range.max < range.min) { // Attraversa lo 0° (es. N: 338-22)
      diff = Math.min(
        Math.abs(dir - range.min),
        Math.abs(dir - (range.max + 360))
      );
    } else {
      diff = Math.min(
        Math.abs(dir - range.min),
        Math.abs(dir - range.max)
      );
    }
    
    if (diff < minDiff) {
      minDiff = diff;
      closestDir = dirName;
    }
  }

  // Calcola la differenza angolare tra vento e esposizione
  const expRange = directions[closestDir];
  let angleDiff;
  
  if (expRange.max < expRange.min) { // Attraversa lo 0°
    angleDiff = Math.min(
      Math.abs(dir - expRange.min),
      Math.abs(dir - (expRange.max + 360))
    );
  } else {
    angleDiff = Math.min(
      Math.abs(dir - expRange.min),
      Math.abs(dir - expRange.max)
    );
  }

  // Determina lo status
  if (angleDiff <= 45) {
    return { status: "favorevole" as const, label: "Sopravvento", icon: "🪁", descrizione: "Vento favorevole per il decollo" };
  } else if (angleDiff <= 90) {
    return { status: "laterale" as const, label: "Vento laterale", icon: "↔️", descrizione: "Vento laterale, prestare attenzione in fase di apertura" };
  } else {
    return { status: "sottovento" as const, label: "Sottovento", icon: "⚠️", descrizione: "Vento sottovento, condizioni pericolose per il decollo" };
  }
}

export function getVentoStatusColor(status: string) {
  switch (status) {
    case "favorevole":
      return "text-emerald-300 bg-emerald-900/20 border-emerald-500/30";
    case "laterale":
      return "text-amber-200 bg-amber-900/30 border-amber-500/30";
    case "sottovento":
      return "text-red-200 bg-red-900/30 border-red-500/30";
    default:
      return "text-slate-400 bg-slate-900/30 border-slate-500/30";
  }
}