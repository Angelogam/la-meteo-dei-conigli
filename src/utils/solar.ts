/**
 * POSIZIONE DEL SOLE — algoritmo NOAA semplificato (precisione <0,5°, ample per l'aerologia).
 * Serve al campo termico stile Meteo-Parapente per capire, ora per ora, QUALE pendio
 * il sole sta riscaldando: i versanti esposti al sole generano le bolle di risalita.
 *
 * Convenzioni: elevazione > 0 = sole sopra l'orizzonte; azimut in gradi dal Nord
 * in senso orario (0=N, 90=E, 180=S, 270=O).
 */

const RAD = Math.PI / 180;

/** Fuso Europe/Rome (1 = CET, 2 = CEST) per la data locale "YYYY-MM-DD". */
export function romeUtcOffsetHours(dayISO: string): number {
  const probe = Date.parse(dayISO + "T12:00:00Z");
  if (!Number.isFinite(probe)) return 1;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Rome",
    hour: "numeric",
    hour12: false,
  }).format(new Date(probe));
  const h = Number(parts);
  // 12 UTC → 13 (CET) o 14 (CEST)
  return h - 12 >= 0 && h - 12 <= 3 ? h - 12 : 1;
}

export interface SunPos {
  /** elevazione sopra l'orizzonte, gradi (può essere negativa di notte) */
  elev: number;
  /** azimut dal Nord in senso orario, gradi */
  az: number;
}

/**
 * Posizione del sole per un'ora LOCALE di Roma.
 * @param dayISO "YYYY-MM-DD" (giorno locale della previsione)
 * @param localHour ora locale (6..22 della timeline)
 * @param lat latitudine del centro mappa
 * @param lon longitudine del centro mappa
 */
export function solarPosition(dayISO: string, localHour: number, lat: number, lon: number): SunPos {
  const off = romeUtcOffsetHours(dayISO);
  const base = Date.parse(dayISO + "T00:00:00Z");
  if (!Number.isFinite(base)) return { elev: 0, az: 180 };
  const utcMs = base + (localHour - off) * 3600_000;

  // Giorno giuliano
  const jd = utcMs / 86400_000 + 2440587.5;
  const n = jd - 2451545.0; // giorni da J2000.0

  // Longitudine media e anomalia media del sole
  const L = (280.46 + 0.9856474 * n) % 360;
  const g = ((357.528 + 0.9856003 * n) % 360) * RAD;

  // Longitudine eclittica e obliquità
  const lambda = (L + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * RAD;
  const eps = (23.439 - 0.0000004 * n) * RAD;

  // Declinazione e ascensione retta
  const decl = Math.asin(Math.sin(eps) * Math.sin(lambda));
  const ra = Math.atan2(Math.cos(eps) * Math.sin(lambda), Math.cos(lambda)) / RAD; // gradi

  // Tempo siderale locale (gradi) e angolo orario
  const gmst = (18.697374558 + 24.06570982441908 * n) % 24;
  const lst = ((gmst * 15 + lon) % 360 + 360) % 360;
  const ha = (((lst - ra) % 360) + 360) % 360; // 0..360

  // Elevazione e azimut (dal Sud, positivo verso Ovest → convertito al Nord orario)
  const latR = lat * RAD;
  const haR = ha * RAD;
  const sinElev =
    Math.sin(latR) * Math.sin(decl) + Math.cos(latR) * Math.cos(decl) * Math.cos(haR);
  const elev = Math.asin(Math.max(-1, Math.min(1, sinElev))) / RAD;
  const azSouth = Math.atan2(
    Math.sin(haR),
    Math.cos(haR) * Math.sin(latR) - Math.tan(decl) * Math.cos(latR),
  ) / RAD;
  const az = (((azSouth + 180) % 360) + 360) % 360;

  return { elev, az };
}
