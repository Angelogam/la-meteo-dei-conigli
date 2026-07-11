"use client";

import type { HourData } from "@/types/meteo";

export interface ThermalAnalysis {
  thermalBase: number | null;
  thermalTop: number | null;
  avgUpdraft: number | null;
  strength: "debole" | "moderata" | "buona" | "forte" | "nulla";
  description: string;
  risk: "nullo" | "basso" | "medio" | "alto";
}

export function calcThermalReal(
  dayData: HourData[],
  altitude: number,
  surfaceTemp: number | null,
  surfaceDew: number | null
): ThermalAnalysis {
  if (!dayData.length || surfaceTemp === null || surfaceDew === null) {
    return {
      thermalBase: null,
      thermalTop: null,
      avgUpdraft: null,
      strength: "nulla",
      risk: "nullo",
      description: "Dati insufficienti per calcolare le termiche.",
    };
  }

  // Calcolo base termiche con formula del gradiente adiabatico secco
  // Lifted Condensation Level: base (m) = (temp - dew_point) * 125
  const spread = surfaceTemp - surfaceDew;
  const lclBase = Math.round(spread * 125); // metri sopra la quota del decollo

  // Altezza massima termiche: se c'è inversione termica o forte vento, limitiamo
  const windSpeed = dayData.length > 0
    ? Math.max(...dayData.filter(h => {
        const hh = h.time.getHours();
        return hh >= 10 && hh <= 15;
      }).map(h => h.windSpeed))
    : 10;

  // Vento forte taglia le termiche
  let topReduction = 0;
  if (windSpeed > 25) topReduction = 0.5;
  else if (windSpeed > 20) topReduction = 0.3;
  else if (windSpeed > 15) topReduction = 0.15;

  const maxThermalBase = 2500; // limite massimo realistico per termiche in Italia
  const thermalBase = Math.min(lclBase, maxThermalBase);
  const thermalTop = Math.round(thermalBase * (1 - topReduction));

  // Forza del termico in base allo spread e vento
  let avgUpdraft: number;
  let strength: ThermalAnalysis["strength"];
  if (spread < 3) {
    avgUpdraft = 0;
    strength = "nulla";
  } else if (spread < 6) {
    avgUpdraft = 0.5 + spread * 0.3;
    strength = "debole";
  } else if (spread < 10) {
    avgUpdraft = 1.5 + spread * 0.2;
    strength = "moderata";
  } else if (spread < 15) {
    avgUpdraft = 3 + spread * 0.15;
    strength = "buona";
  } else {
    avgUpdraft = 4.5 + spread * 0.1;
    strength = "forte";
  }

  avgUpdraft = Math.round(avgUpdraft * 10) / 10;

  // Rischio: vento forte + termiche forti = turbolenza
  let risk: ThermalAnalysis["risk"] = "nullo";
  if (windSpeed > 25 && spread > 12) risk = "alto";
  else if (windSpeed > 20 && spread > 10) risk = "medio";
  else if (windSpeed > 15 && spread > 8) risk = "basso";

  // Descrizione chiara e realistica
  const baseDisplay = thermalBase > 300
    ? `Base termiche a ~${thermalBase} m slm`
    : "Termiche molto basse o assenti";

  const topDisplay = thermalTop > 100
    ? `, sviluppo fino a ~${thermalTop} m`
    : "";

  const windNote = windSpeed > 20
    ? ` ⚠️ Vento forte (${Math.round(windSpeed)} km/h) taglia le termiche.`
    : windSpeed > 12
      ? ` Vento moderato (${Math.round(windSpeed)} km/h) condizioni ancora volabili.`
      : ` Vento debole (${Math.round(windSpeed)} km/h) ideale per termiche.`;

  const riskNote = risk !== "nullo"
    ? ` Rischio turbolenza ${risk}.`
    : "";

  const descParts: string[] = [
    `${baseDisplay}${topDisplay}. Forza: ${strength} (${avgUpdraft} m/s).${windNote}${riskNote}`
  ];

  if (avgUpdraft !== null && avgUpdraft > 0) {
    if (avgUpdraft >= 3) descParts.push("Condizioni ottime per cross country.");
    else if (avgUpdraft >= 1.5) descParts.push("Buone condizioni per volo locale.");
    else descParts.push("Termiche deboli, volo locale possibile.");
  } else {
    descParts.push("Nessuna termica prevista, solo volo in dinamica eventuale.");
  }

  return {
    thermalBase: thermalBase > 0 ? altitude + thermalBase : null,
    thermalTop: thermalTop > 0 ? altitude + thermalTop : null,
    avgUpdraft,
    strength,
    risk,
    description: descParts.join(" "),
  };
}