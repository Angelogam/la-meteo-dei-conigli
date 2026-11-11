/** Nome italiano della direzione (settore di 45°) partendo dai gradi meteorologici. */
export function dirName(deg: number | null | undefined): string {
  if (deg == null || Number.isNaN(deg)) return "Var";
  return ["N", "NE", "E", "SE", "S", "SO", "O", "NO"][Math.round(((deg % 360) / 45)) % 8];
}
