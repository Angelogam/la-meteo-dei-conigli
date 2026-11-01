"use client";

/**
 * FILTRO CLIMATOLOGICO — Confronta i dati meteo reali con i valori medi
 * stagionali attesi per le Alpi piemontesi (basato su ERA5 2000-2024).
 *
 * Ogni mese ha un range atteso per temperatura, vento e pioggia,
 * calcolato per altitudini tra 500 e 2800m.
 */

interface ClimaMensile {
  tempMax: [number, number]; // range min-max °C
  tempMin: [number, number];
  ventoMedio: [number, number]; // km/h
  pioggiaMax: number; // mm/giorno
  deltaMin: number; // delta termico minimo atteso °C
}

const CLIMA: Record<number, ClimaMensile> = {
  1:  { tempMax: [-5, 5],   tempMin: [-12, 0],  ventoMedio: [3, 15], pioggiaMax: 15, deltaMin: 3 },
  2:  { tempMax: [-3, 8],   tempMin: [-10, 2],  ventoMedio: [3, 16], pioggiaMax: 15, deltaMin: 3 },
  3:  { tempMax: [0, 12],   tempMin: [-6, 5],   ventoMedio: [4, 18], pioggiaMax: 20, deltaMin: 4 },
  4:  { tempMax: [5, 18],   tempMin: [-1, 8],   ventoMedio: [4, 18], pioggiaMax: 25, deltaMin: 5 },
  5:  { tempMax: [10, 24],  tempMin: [3, 12],   ventoMedio: [4, 16], pioggiaMax: 30, deltaMin: 6 },
  6:  { tempMax: [14, 30],  tempMin: [7, 16],   ventoMedio: [3, 14], pioggiaMax: 30, deltaMin: 8 },
  7:  { tempMax: [16, 34],  tempMin: [9, 18],   ventoMedio: [3, 12], pioggiaMax: 25, deltaMin: 10 },
  8:  { tempMax: [15, 32],  tempMin: [8, 17],   ventoMedio: [3, 12], pioggiaMax: 25, deltaMin: 9 },
  9:  { tempMax: [10, 26],  tempMin: [4, 13],   ventoMedio: [4, 14], pioggiaMax: 25, deltaMin: 7 },
  10: { tempMax: [5, 20],   tempMin: [-1, 8],   ventoMedio: [4, 16], pioggiaMax: 20, deltaMin: 5 },
  11: { tempMax: [0, 12],   tempMin: [-5, 4],   ventoMedio: [4, 18], pioggiaMax: 20, deltaMin: 3 },
  12: { tempMax: [-3, 7],   tempMin: [-10, 1],  ventoMedio: [3, 16], pioggiaMax: 15, deltaMin: 3 },
};

export interface AnomaliaClima {
  tipo: "temp_max" | "temp_min" | "vento" | "pioggia" | "delta";
  etichetta: string;
  valore: number;
  atteso: string;
  descrizione: string;
  severita: "info" | "warning";
}

/**
 * Confronta i dati reali con la climatologia e restituisce le anomalie rilevate.
 * @param tempMax temperatura massima del giorno
 * @param tempMin temperatura minima del giorno
 * @param ventoMedio velocità media del vento
 * @param pioggiaTotale precipitazione totale
 * @param deltaTermico differenza max-min
 * @returns array di anomalie (vuoto se tutto ok)
 */
export function confrontaClima(
  tempMax: number,
  tempMin: number,
  ventoMedio: number,
  pioggiaTotale: number,
  deltaTermico: number,
): AnomaliaClima[] {
  const anomalie: AnomaliaClima[] = [];
  const mese = new Date().getMonth() + 1;
  const clima = CLIMA[mese] || CLIMA[6]; // fallback giugno

  // Temperatura max
  if (tempMax > clima.tempMax[1]) {
    const diff = Math.round(tempMax - clima.tempMax[1]);
    anomalie.push({
      tipo: "temp_max",
      etichetta: "Temp. max",
      valore: tempMax,
      atteso: `${clima.tempMax[0]}°C ~ ${clima.tempMax[1]}°C`,
      descrizione: `Più alta del normale (+${diff}°C)`,
      severita: diff > 6 ? "warning" : "info",
    });
  } else if (tempMax < clima.tempMax[0]) {
    const diff = Math.round(clima.tempMax[0] - tempMax);
    anomalie.push({
      tipo: "temp_max",
      etichetta: "Temp. max",
      valore: tempMax,
      atteso: `${clima.tempMax[0]}°C ~ ${clima.tempMax[1]}°C`,
      descrizione: `Più bassa del normale (-${diff}°C)`,
      severita: diff > 6 ? "warning" : "info",
    });
  }

  // Temperatura min
  if (tempMin < clima.tempMin[0]) {
    const diff = Math.round(clima.tempMin[0] - tempMin);
    anomalie.push({
      tipo: "temp_min",
      etichetta: "Temp. min",
      valore: tempMin,
      atteso: `${clima.tempMin[0]}°C ~ ${clima.tempMin[1]}°C`,
      descrizione: `Notte fredda (-${diff}°C dalla media)`,
      severita: diff > 5 ? "warning" : "info",
    });
  }

  // Vento medio
  if (ventoMedio > clima.ventoMedio[1]) {
    const diff = Math.round(ventoMedio - clima.ventoMedio[1]);
    anomalie.push({
      tipo: "vento",
      etichetta: "Vento medio",
      valore: ventoMedio,
      atteso: `${clima.ventoMedio[0]} ~ ${clima.ventoMedio[1]} km/h`,
      descrizione: `Più vento del normale (+${diff} km/h)`,
      severita: diff > 10 ? "warning" : "info",
    });
  }

  // Pioggia
  if (pioggiaTotale > clima.pioggiaMax * 1.5) {
    anomalie.push({
      tipo: "pioggia",
      etichetta: "Pioggia",
      valore: pioggiaTotale,
      atteso: `≤ ${clima.pioggiaMax} mm`,
      descrizione: `Giornata più piovosa del normale`,
      severita: "warning",
    });
  }

  // Delta termico
  if (deltaTermico < clima.deltaMin && deltaTermico > 0) {
    anomalie.push({
      tipo: "delta",
      etichetta: "Delta termico",
      valore: deltaTermico,
      atteso: `≥ ${clima.deltaMin}°C`,
      descrizione: `Escursione ridotta, termiche meno attive`,
      severita: "info",
    });
  }

  return anomalie;
}

/**
 * Ottiene la descrizione climatologica del mese corrente.
 */
export function descrizioneClimaMese(): string {
  const mese = new Date().getMonth() + 1;
  const clima = CLIMA[mese] || CLIMA[6];
  const nomiMesi = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];
  return `${nomiMesi[mese - 1]}: temp ${clima.tempMax[0]}°C–${clima.tempMax[1]}°C, vento ${clima.ventoMedio[0]}–${clima.ventoMedio[1]} km/h, pioggia ≤ ${clima.pioggiaMax}mm`;
}