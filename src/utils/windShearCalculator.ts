/**
 * Wind Shear Calculator — calcolo puro e testabile dello shear verticale.
 *
 * Non emette giudizi di sicurezza. Restituisce solo dati quantitativi.
 */

export interface WindObservation {
  altitude: number; // metri sopra il livello del mare
  speed: number;    // km/h
  direction: number; // gradi, provenienza meteorologica (0=N, 90=E, ...)
}

export interface WindShearResult {
  lowerAltitude: number;
  upperAltitude: number;
  lowerSpeed: number;
  upperSpeed: number;
  lowerDirection: number;
  upperDirection: number;
  speedDifference: number;       // km/h, valore assoluto
  directionDifference: number;   // gradi, 0–180 (il percorso più breve)
  speedDifferencePer100m: number; // km/h per 100m di dislivello
}

/**
 * Calcola la differenza angolare più breve tra due direzioni (0–180°).
 * Gestisce correttamente il passaggio 359° → 0°.
 */
export function directionDifference(a: number, b: number): number {
  let diff = Math.abs(((a % 360) + 360) % 360 - ((b % 360) + 360) % 360);
  if (diff > 180) diff = 360 - diff;
  return diff;
}

/**
 * Calcola lo shear tra due osservazioni di vento a quote diverse.
 * Entrambi i parametri devono essereNonNull (speed e direction non null).
 */
export function calculateWindShear(
  lower: WindObservation,
  upper: WindObservation
): WindShearResult {
  const altDiff = upper.altitude - lower.altitude;
  const speedDiff = Math.abs(upper.speed - lower.speed);

  return {
    lowerAltitude: lower.altitude,
    upperAltitude: upper.altitude,
    lowerSpeed: lower.speed,
    upperSpeed: upper.speed,
    lowerDirection: lower.direction,
    upperDirection: upper.direction,
    speedDifference: Math.round(speedDiff * 10) / 10,
    directionDifference: Math.round(directionDifference(lower.direction, upper.direction) * 10) / 10,
    speedDifferencePer100m: altDiff !== 0
      ? Math.round((speedDiff / altDiff) * 100 * 10) / 10
      : 0,
  };
}

/**
 * Calcola il shear tra tutti i livelli disponibili in un array ordinato per altitudine.
 * Ritorna solo le coppie per cui entrambi i livelli hanno dati validi.
 */
export function calculateShearProfile(observations: WindObservation[]): WindShearResult[] {
  const sorted = [...observations].sort((a, b) => a.altitude - b.altitude);
  const results: WindShearResult[] = [];

  for (let i = 0; i < sorted.length - 1; i++) {
    const lower = sorted[i];
    const upper = sorted[i + 1];
    // Entrambi devono avere speed e direction validi
    if (
      lower.speed != null && upper.speed != null &&
      lower.direction != null && upper.direction != null &&
      !isNaN(lower.speed) && !isNaN(upper.speed) &&
      !isNaN(lower.direction) && !isNaN(upper.direction)
    ) {
      results.push(calculateWindShear(lower, upper));
    }
  }

  return results;
}
