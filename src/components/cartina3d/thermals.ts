/**
 * TERMICHE: dove STACCANO (stile XCTherm, thermal.kk7.ch).
 *
 * Il decollo della bolla non avviene ovunque: serve un pendio che riceva il
 * sole E su cui l'aria STIA SALGENDO. Su ogni cella della griglia DEM del
 * campo vento calcolo un PUNTEGGIO DI STACCO e una FORZA (m/s) realistica:
 *
 *  - ESPOSIZIONE: versante rivolto verso il sole all'ora selezionata
 *    (azimut solare approssimato: SE la mattina, S a mezzogiorno, SO il pomeriggio)
 *  - INCLINAZIONE DEL VENTO (il cuore dell'algoritmo): il flusso FUSO del
 *    campo vento (vento meteo + brezza di versante) viene proiettato sulla
 *    direzione di massima pendenza. Se l'aria SALGE lungo il pendio la bolla
 *    è alimentata e lo stacco è forte; se l'aria SCENDE (lato sottovento,
 *    rotore) lo stacco è SUPPRESSO del tutto.
 *  - PENDENZA: finestra ideale 8-23°, oltre i ~30° il punteggio cala
 *  - VENTO TROPPO FORTE: oltre ~35 km/h le bolle si spezzano (forza ridotta)
 *  - FORZA: curva dell'ora (picco ~14) × punteggio × radiazione diretta
 *    del sounding del decollo (HourlyPoint.rad, W/m²)
 *
 * Il colore della termica dice la forza (come su XCTherm):
 *   azzurro <1.5 · verde 1.5-2.5 · giallo 2.5-3.5 · arancio 3.5-4.5 · rosso >4.5 m/s
 */

import type { FlowCell, WindField } from "./winds";
import { heightAt } from "./winds";
import type { PilotThermal } from "./xcflights";

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

/**
 * BASE DELLE NUVOLE (LCL) dal sounding: a quanta quota la colonna d'aria
 * condensa. È il tetto fisico della bolla: il cono termico sale fino lì.
 * Formula della gradiente adiabatica secca: LCL ≈ 125 m per ogni °C di
 * divario temperatura-punto di rugiada, sommato alla quota del sito.
 */
export function cloudBaseFrom(
  temp: number | null | undefined,
  dew: number | null | undefined,
  groundAlt: number | null | undefined,
): number | null {
  const T = Number(temp);
  const Td = Number(dew);
  if (!Number.isFinite(T) || !Number.isFinite(Td) || Td > T) return null;
  const base = (groundAlt ?? 0) + 125 * (T - Td);
  if (!Number.isFinite(base)) return null;
  return Math.min(4200, Math.max(900, base));
}

/** Soglie per la legenda (m/s). */
export const THERMAL_SCALE = [
  { max: 1.5, c: "#4cc3ff" },
  { max: 2.5, c: "#35d07f" },
  { max: 3.5, c: "#ffd23f" },
  { max: 4.5, c: "#ff9f43" },
  { max: Infinity, c: "#ff5470" },
];

/**
 * computeTriggers — stacchi termici per la scena 3D.
 *
 * 1. STIMA fisica (sole × pendenza × radiazione × INCLINAZIONE del vento):
 *    il flusso fuso (vento meteo + brezza di versante) proiettato sulla linea
 *    di massima pendenza decide dove l'aria SALGE (stacco alimentato) o SCENDE
 *    (sottovento: stacco soppresso).
 * 2. CONFERME DAI VOLI REALI (XCTherm/XContest, `pilot`): dove i piloti
 *    salgono davvero il cono ANCORA la scena — il punto pesa più della stima.
 *    Le celle stimate vicine (< 300 m) a una bolla confermata vengono
 *    assorbite: niente coni doppi attaccati.
 */
export function computeTriggers(
  field: WindField,
  hour: number,
  rad: number | null,
  flows: FlowCell[] = [],
  pilot: PilotThermal[] = [],
  maxR = 5200, // le STIME restano nella zona decollo anche con la griglia larga
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

      /* INCLINAZIONE DEL VENTO: il flusso fuso (vento meteo + brezza) proiettato
         sulla linea di massima pendenza. +1 = l'aria risale il versante (bolla
         alimentata), −1 = l'aria scende (sottovento/rotore: niente stacco). */
      const fc = flows[i * field.cols + j];
      let windDot = 0.55; // senza campo vento disponibile: neutro-positivo
      let wsp = 8;
      if (fc && Number.isFinite(fc.dE) && Number.isFinite(fc.dN)) {
        windDot = Math.max(-1, Math.min(1, fc.dE * uE + fc.dN * uN));
        wsp = Number.isFinite(fc.sp) ? fc.sp : 8;
      }
      if (windDot < -0.12) continue; // l'aria SCENDE qui: sottovento → nessuna bolla

      /* finestra di pendenza: troppo piatto non stacca, troppo ripido è scivoloso */
      const slopeScore =
        s < 0.08 ? 0 : s < 0.15 ? ((s - 0.08) / 0.07) * 0.85 : s <= 0.4 ? 1 : s <= 0.6 ? 1 - ((s - 0.4) / 0.2) * 0.45 : 0.3;
      if (slopeScore <= 0) continue;

      /* punteggio: sole e risalita dell'aria pesano insieme */
      const score = Math.min(1, slopeScore * (0.5 * sunDot + 0.5 * Math.max(0, windDot)));
      if (score < 0.42) continue;

      /* forza: la risalita del vento alimenta la bolla; vento troppo forte la
         spezza, aria stagnante la indebolisce */
      const windK = wsp > 35 ? 0.72 : wsp < 2.5 ? 0.85 : 1;
      const strength = (1.2 + 2.8 * hourK) * (0.5 + 0.9 * score) * radK * (0.72 + 0.52 * Math.max(0, windDot)) * windK;
      /* con la griglia DEM allargata alle brezze, le stime restano legate alla
         zona di decollo: i coni lontani non sono osservabili né utili */
      const distC = Math.hypot(i * field.step - ((field.rows - 1) * field.step) / 2, j * field.step - ((field.cols - 1) * field.step) / 2);
      if (distC > maxR) continue;
      out.push({
        lat: field.lat0 + (((field.rows - 1) / 2 - i) * field.step) / field.mLat,
        lon: field.lon0 + ((j - (field.cols - 1) / 2) * field.step) / field.mLon,
        h: field.H[i][j],
        score,
        strength: Number.isFinite(strength) ? strength : 0,
      });
    }
  }

  /* ---- CONFERME DAI VOLI REALI: dove i piloti salgono davvero ----
     La posizione è un DATO (salite IGC), la forza resta guidata dall'ora e
     dalla radiazione; il vento che scende forte in quel punto resta l'unica
     condizione di soppressione (rotore/sottovento). */
  if (pilot.length && hour >= 8 && hour <= 18) {
    const latN = field.lat0 + (((field.rows - 1) / 2) * field.step) / field.mLat;
    const latS = field.lat0 - (((field.rows - 1) / 2) * field.step) / field.mLat;
    const lonW = field.lon0 - (((field.cols - 1) / 2) * field.step) / field.mLon;
    const lonE = field.lon0 + (((field.cols - 1) / 2) * field.step) / field.mLon;
    const confirmed: TriggerCell[] = [];
    for (const p of pilot) {
      if (p.lat < latS || p.lat > latN || p.lon < lonW || p.lon > lonE) continue; // fuori dal campo
      const h = heightAt(field, p.lat, p.lon);
      if (!Number.isFinite(h)) continue;
      /* cella di flusso corrispondente: vento che SCENDE = rotore → soppresso */
      const fi = Math.min(field.rows - 1, Math.max(0, Math.round((field.rows - 1) / 2 - ((p.lat - field.lat0) * field.mLat) / field.step)));
      const fj = Math.min(field.cols - 1, Math.max(0, Math.round(((p.lon - field.lon0) * field.mLon) / field.step + (field.cols - 1) / 2)));
      const fc = flows[fi * field.cols + fj];
      let windK = 1;
      if (fc && Number.isFinite(fc.dE) && Number.isFinite(fc.dN)) {
        const gl = Math.hypot(field.gE[fi][fj], field.gN[fi][fj]);
        if (gl > 1e-6) {
          const dot = fc.dE * (field.gE[fi][fj] / gl) + fc.dN * (field.gN[fi][fj] / gl);
          if (dot < -0.35) continue; // l'aria scende qui: la bolla confermata oggi non stacca
          if (dot < 0) windK = 0.8;
        }
        if (Number.isFinite(fc.sp) && fc.sp > 40) windK = Math.min(windK, 0.75); // vento che spezza le bolle
      }
      const heat = Math.min(1, Math.max(0, p.heat));
      const strength = (1.4 + 2.9 * hourK) * (0.75 + 0.75 * heat) * radK * windK;
      confirmed.push({ lat: p.lat, lon: p.lon, h, score: Math.min(1, 0.55 + 0.45 * heat), strength: Number.isFinite(strength) ? strength : 0 });
    }

    if (confirmed.length) {
      /* dedup: le stime entro 300 m di una conferma escono (la conferma vince) */
      const dLat = 300 / 111320;
      const est = out.filter(
        (t) =>
          !confirmed.some(
            (c) =>
              Math.abs(c.lat - t.lat) < dLat &&
              Math.abs(c.lon - t.lon) < dLat / Math.max(0.2, Math.cos((t.lat * Math.PI) / 180)),
          ),
      );
      return est.concat(confirmed);
    }
  }
  return out;
}
