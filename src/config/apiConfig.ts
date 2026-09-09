/**
 * Configurazione API per Meteo dei Conigli
 *
 * Sceglie automaticamente l'endpoint giusto in base all'ambiente:
 * - Se PROXY abilitato e disponibile: usa http://localhost:3000/api/open-meteo
 * - Altrimenti: usa direttamente Open-Meteo (fallback)
 */

// Endpoint del proxy Node.js locale
export const API_PROXY_URL = "http://localhost:3000/api/open-meteo";

// Endpoint diretto Open-Meteo (fallback)
export const OPEN_METEO_DIRECT = "https://api.open-meteo.com/v1/forecast";

/**
 * Determina se usare il proxy o andare diretto.
 * Usa il proxy solo se esplicitamente abilitato via variabile d'ambiente.
 * In produzione (build) il proxy non è disponibile → fallback diretto.
 */
export const USE_PROXY = import.meta.env.VITE_USE_PROXY === "true";

/**
 * URL base per le chiamate meteo.
 * In ambiente sviluppo con proxy attivo usa il proxy, altrimenti va diretto.
 */
export const getMeteoBaseUrl = (): string => {
  if (USE_PROXY && typeof window !== "undefined") {
    return API_PROXY_URL;
  }
  return OPEN_METEO_DIRECT;
};

/**
 * URL per le chiamate API (altri endpoint)
 */
export const getApiBaseUrl = (): string => {
  return API_PROXY_URL.replace("/open-meteo", "");
};
