/**
 * Calcola la media circolare di direzioni del vento.
 *
 * La semplice media aritmetica di 350° e 10° darebbe 180° (errato!).
 * Questo algoritmo usa seno/coseno per gestire correttamente il wrapping a 360°.
 *
 * @param directions - Array di direzioni in gradi (0-360)
 * @returns Direzione media in gradi (0-360), oppure null se l'array è vuoto
 */
export function circularMeanWindDirection(directions: number[]): number | null {
  if (!directions || directions.length === 0) return null;

  // Converti gradi in radianti
  const radians = directions.map(d => (d * Math.PI) / 180);

  // Calcola la media dei seni e dei coseni
  const sinSum = radians.reduce((s, r) => s + Math.sin(r), 0);
  const cosSum = radians.reduce((s, r) => s + Math.cos(r), 0);

  // Calcola l'angolo medio
  const avgRad = Math.atan2(sinSum / radians.length, cosSum / radians.length);

  // Converti in gradi e normalizza a 0-360
  let avgDeg = (avgRad * 180) / Math.PI;
  if (avgDeg < 0) avgDeg += 360;

  return Math.round(avgDeg);
}

/**
 * Normalizza una direzione del vento a 0-360 gradi.
 */
export function normalizeWindDirection(degrees: number): number {
  let d = degrees % 360;
  if (d < 0) d += 360;
  return d;
}

/**
 * Converte gradi in direzione cardinale breve (N, NE, E, SE, S, SO, O, NO).
 */
export function windDirToCardinal(deg: number): string {
  const dirs = ["N", "NE", "E", "SE", "S", "SO", "O", "NO"];
  const index = Math.round(((deg % 360) + 360) % 360 / 45) % 8;
  return dirs[index];
}
