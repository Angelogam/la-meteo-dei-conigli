/**
 * Utility condivisa per il calcolo della base dei cumuli (LCL).
 *
 * Formula: LCL ≈ altitude + (T - Td) × 125 m/°C
 * Cap massimo: altitude + 1800 m (valore realistico per le Alpi).
 * Al di sopra di questa soglia il modello semplice perde accuratezza
 * perché l'umidità in quota non segue più il gradiente superficiale.
 */

export const MAX_CLOUD_BASE_GAIN = 1800; // metri sopra il sito

export function calcCloudBase(siteAlt: number, t: number, dew: number): number {
  const spread = Math.max(0.5, t - dew);
  return Math.round(siteAlt + Math.min(MAX_CLOUD_BASE_GAIN, spread * 125));
}

/**
 * Restituisce un oggetto con le informazioni di rischio nubi basse.
 */
export function assessCloudRisk(
  cloudBase: number,
  siteAlt: number,
): { risk: "low" | "medium" | "high"; label: string } {
  const diff = cloudBase - siteAlt;
  if (diff < 300) return { risk: "high", label: "Troppo bassa" };
  if (diff < 500) return { risk: "medium", label: "Marginale" };
  return { risk: "low", label: "Buona" };
}
