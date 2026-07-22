"use client";

import { DECOLLI, type Decollo } from "@/data/decolli";

/**
 * Data l'esposizione di un decollo (es. "S", "S/SE", "NE"),
 * restituisce l'angolo centrale in gradi.
 */
function exposureToDegrees(exposure: string): number {
  const map: Record<string, number> = {
    "N": 0,
    "N/NE": 22.5, "NNE": 22.5,
    "NE": 45,
    "E/NE": 67.5, "ENE": 67.5,
    "E": 90,
    "E/SE": 112.5, "ESE": 112.5,
    "SE": 135,
    "S/SE": 157.5, "SSE": 157.5,
    "S": 180,
    "S/SW": 202.5, "SSW": 202.5,
    "SW": 225,
    "O/SW": 247.5, "WSW": 247.5,
    "O": 270, "W": 270,
    "O/NW": 292.5, "WNW": 292.5,
    "NW": 315,
    "N/NW": 337.5, "NNW": 337.5,
  };

  // Normalizza: toglie spazi, maiuscolo
  const key = exposure.trim().toUpperCase().replace(/\s+/g, "");
  return map[key] ?? 180; // default: S
}

/**
 * Determina se il vento è favorevole, laterale o contrario
 * rispetto all'esposizione del decollo.
 *
 * @param windDir  direzione del vento in gradi (0-360)
 * @param exposure esposizione del decollo (es. "S", "SE", "S/SW")
 * @returns valutazione
 */
export function validaVentoPerDecollo(
  windDir: number,
  exposure: string,
): {
  status: "favorevole" | "laterale" | "contrario" | "sottovento";
  label: string;
  icon: string;
  descrizione: string;
} {
  if (windDir == null) {
    return { status: "contrario", label: "Dato mancante", icon: "❓", descrizione: "Direzione vento non disponibile." };
  }

  const expDeg = exposureToDegrees(exposure);

  // La differenza angolare minima (0-180)
  let diff = Math.abs(windDir - expDeg);
  if (diff > 180) diff = 360 - diff;

  // Esposizione S (180°) + vento da O (270°) = diff 90° → laterale
  // Esposizione S (180°) + vento da N (0/360°) = diff 180° → sottovento/contrario
  // Esposizione S (180°) + vento da S (180°) = diff 0° → frontale/favorevole

  if (diff <= 45) {
    return {
      status: "favorevole",
      label: "Sopravvento ✅",
      icon: "🪁",
      descrizione: `Vento da ${Math.round(windDir)}° frontale all'esposizione ${exposure}. Decollo perfettamente avento.`,
    };
  }

  if (diff <= 90) {
    return {
      status: "laterale",
      label: "Laterale ⚠️",
      icon: "⚠️",
      descrizione: `Vento da ${Math.round(windDir)}° laterale rispetto all'esposizione ${exposure}. Decollo possibile ma con attenzione.`,
    };
  }

  if (diff <= 135) {
    return {
      status: "contrario",
      label: "Sfavorito ❌",
      icon: "❌",
      descrizione: `Vento da ${Math.round(windDir)}° in diagonale opposta all'esposizione ${exposure}. Decollo difficile, potrebbe essere sottovento.`,
    };
  }

  return {
    status: "sottovento",
    label: "Sottovento 🚫",
    icon: "🚫",
    descrizione: `Vento da ${Math.round(windDir)}° in direzione opposta all'esposizione ${exposure} (diff. ${Math.round(diff)}°). Decollo SOTTOVENTO — NON VOLABILE.`,
  };
}

/**
 * Valuta TUTTI i decolli con i dati vento attuali.
 * Usa i venti orari e l'esposizione di ogni decollo.
 */
export function validaTuttiDecolli(
  ventiPerId: Record<string, { windSpeed: number; windDir: number; hour: number }[]>,
): {
  id: string;
  nome: string;
  esposizione: string;
  quota: number;
  vento: { speed: number; dir: number };
  valutazione: ReturnType<typeof validaVentoPerDecollo>;
  ora: number;
}[] {
  const risultati: ReturnType<typeof validaTuttiDecolli> = [];

  for (const decollo of DECOLLI) {
    const venti = ventiPerId[decollo.id];
    if (!venti || venti.length === 0) {
      risultati.push({
        id: decollo.id,
        nome: decollo.name,
        esposizione: decollo.exposure,
        quota: decollo.altitude,
        vento: { speed: 0, dir: 0 },
        valutazione: {
          status: "contrario",
          label: "Dato mancante",
          icon: "❓",
          descrizione: "Nessun dato vento disponibile per questo decollo.",
        },
        ora: 12,
      });
      continue;
    }

    // Prende l'ora più rappresentativa (12:00 — ora di punta del volo)
    const oraMigliore = venti.reduce((best, v) =>
      Math.abs(v.hour - 12) < Math.abs(best.hour - 12) ? v : best,
    );

    risultati.push({
      id: decollo.id,
      nome: decollo.name,
      esposizione: decollo.exposure,
      quota: decollo.altitude,
      vento: { speed: oraMigliore.windSpeed, dir: oraMigliore.windDir },
      valutazione: validaVentoPerDecollo(oraMigliore.windDir, decollo.exposure),
      ora: oraMigliore.hour,
    });
  }

  return risultati;
}

/**
 * Ottiene il colore in base allo status del vento.
 */
export function getVentoStatusColor(status: string): string {
  switch (status) {
    case "favorevole": return "text-emerald-300 bg-emerald-900/20 border-emerald-500/30";
    case "laterale": return "text-amber-300 bg-amber-900/20 border-amber-500/30";
    case "contrario": return "text-orange-300 bg-orange-900/20 border-orange-500/30";
    case "sottovento": return "text-red-300 bg-red-900/30 border-red-500/40";
    default: return "text-slate-400 bg-slate-800/20 border-slate-500/30";
  }
}