/**
 * TERMICHE: dove STACCANO (stile XCTherm, thermal.kk7.ch).
 *
 * Il decollo della bolla non avviene ovunque: serve un pendio che riceva il
 * sole con la giusta pendenza. Su ogni cella della griglia DEM del campo vento
 * calcolo un PUNTEGGIO DI STACCO e una FORZA (m/s) realistica:
 *
 *  - ESPOSIZIONE: versante rivolto verso il sole all'ora selezionata
 *    (azimut solare approssimato: SE la mattina, S a mezzogiorno, SO il pomeriggio)
 *  - PENDENZA: finestra ideale 8-23°, oltre i ~30° il punteggio cala
 *  - FORZA: curva dell'ora (picco ~14) × punteggio × radiazione diretta
 *    del sounding del decollo (HourlyPoint.rad, W/m²) — la radiazione è il
 *    motore reale della bolla
 *
 * Il colore della termica dice la forza (come su XCTherm):
 *   azzurro <1.5 · verde 1.5-2.5 · giallo 2.5-3.5 · arancio 3.5-4.5 · rosso >4.5 m/s
 */

import type { WindField } from "./winds";

export interface TriggerCell {
  lat: number;
  lon: number;
  h: number; // quota DEM dello stacco
  score: number; // 0..1 qualità dello stacco
  strength: number; // m/s stimati
}

/** Azimut solare approssimato in gradi (da Nord, orario) all'ora locale. */
export function sunAzimuth(hour: number): number {
  return 180 + (hour - 12) * 15; // 12 → Sud, 9 → SE, 15 → SO
}

/** Colore della termica secondo la forza (m/s). */
export function thermalColor(strength: number): string {
  if (!Number.isFinite(strength)) return "#4cc3ff";
  if (strength < 1.5) return "#4cc3ff";
  if (strength < 2.5) return "#35d07f";
  if (strength < 3.5) return "#ffd23f";
  if (strength < 4.5) return "#ff9f43";
  return "#ff5470";
}

/** Soglie per la legenda (m/s). */
export const THERMAL_SCALE = [
  { max: 1.5, c: "#4cc3ff" },
  { max: 2.5, c: "#35d07f" },
  { max: 3.5, c: "#ffd23f" },
  { max: 4.5, c: "#ff9f43" },
  { max: Infinity, c: "#ff5470" },
];

export function computeTriggers(
  field: WindField,
  hour: number,
  rad: number | null,
): TriggerCell[] {
  if (hour < 8 || hour > 18) return []; // di notte le bolle non staccano

  const az = (sunAzimuth(hour) * Math.PI) / 180;
  const sE = Math.sin(az);
  const sN = Math.cos(az);
  const hourK = Math.max(0.15, Math.sin((Math.PI * (hour - 7)) / 12)); // picco ~13
  const radK = rad == null || !Number.isFinite(rad) ? 0.8 : Math.min(1.2, Math.max(0.3, rad / 850));

  const out: TriggerCell[] = [];
  for (let i = 0; i < field.rows; i++) {
    for (let j = 0; j < field.cols; j++) {
      const s = field.S[i][j];
      const gE = field.gE[i][j];
      const gN = field.gN[i][j];
      const gl = Math.hypot(gE, gN);
      if (gl < 1e-6) continue;
      const uE = gE / gl; // unitario VERSO l'alto del pendio
      const uN = gN / gl;
      const sunDot = Math.max(0, Math.min(1, uE * sE + uN * sN));

      /* finestra di pendenza: troppo piatto non stacca, troppo ripido è scivoloso */
      const slopeScore =
        s < 0.08 ? 0 : s < 0.15 ? ((s - 0.08) / 0.07) * 0.85 : s <= 0.4 ? 1 : s <= 0.6 ? 1 - ((s - 0.4) / 0.2) * 0.45 : 0.3;
      if (slopeScore <= 0) continue;

      const score = Math.min(1, 0.58 * sunDot * slopeScore + 0.42 * slopeScore * Math.max(0.35, sunDot));
      if (score < 0.42) continue;

      const strength = (1.2 + 2.8 * hourK) * (0.5 + 0.9 * score) * radK;
      out.push({
        lat: field.lat0 + (((field.rows - 1) / 2 - i) * field.step) / field.mLat,
        lon: field.lon0 + ((j - (field.cols - 1) / 2) * field.step) / field.mLon,
        h: field.H[i][j],
        score,
        strength: Number.isFinite(strength) ? strength : 0,
      });
    }
  }
  return out;
}
