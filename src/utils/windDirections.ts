/**
 * Converte gradi vento in punto cardinale.
 * 0° = N, 90° = E, 180° = S, 270° = W
 */
export function degreesToCardinal(deg: number): string {
  if (deg == null) return "—";
  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW", "N"];
  return directions[Math.round(deg / 45) % 8];
}

/**
 * Restituisce la sigla estesa del punto cardinale
 */
export function cardinalToLong(cardinal: string): string {
  const map: Record<string, string> = {
    "N": "Nord",
    "NE": "Nord-Est",
    "E": "Est",
    "SE": "Sud-Est",
    "S": "Sud",
    "SW": "Sud-Ovest",
    "W": "Ovest",
    "NW": "Nord-Ovest",
  };
  return map[cardinal] || cardinal;
}

/**
 * Icona freccia per direzione vento
 */
export function windArrow(deg: number): string {
  const arrows = ["↑", "↗", "→", "↘", "↓", "↙", "←", "↖"];
  return arrows[Math.round(deg / 45) % 8] || "→";
}

/**
 * Formatta direzione vento completa: "↗ NE (45°)"
 */
export function formatWindDir(deg: number): string {
  if (deg == null) return "—";
  const card = degreesToCardinal(deg);
  const arrow = windArrow(deg);
  return `${arrow} ${card} (${Math.round(deg)}°)`;
}