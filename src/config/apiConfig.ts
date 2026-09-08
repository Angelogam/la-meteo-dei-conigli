/**
 * Configurazione API per Meteo dei Conigli
 *
 * Sceglie automaticamente l'endpoint giusto in base all'ambiente:
 * - Se PROXY abilitato e disponibile: usa http://localhost:3000/api/open-meteo
 * - Altrimenti: usa direttamente Open-Meteo (fallback)
 */

// Endpoint del proxy Node.js locale
// Quando il server è attivo, TUTTE le chiamate passano da qui
export const API_PROXY_URL = "http://localhost:3000/api/open-meteo";

// Endpoint diretto Open-Meteo (fallback)
export const OPEN_METEO_DIRECT = "https://api.open-meteo.com/v1/forecast";

/**
 * Determina se usare il proxy o andare diretto
 * Per ora è sempre true (proxy attivo)
 */
export const USE_PROXY = true;

/**
 * URL base per le chiamate meteo
 */
export const getMeteoBaseUrl = (): string => {
  if (USE_PROXY) {
    return API_PROXY_URL;
  }
  return OPEN_METEO_DIRECT;
};

/**
 * URL per le chiamate API (altri endpoint)
 */
export const getApiBaseUrl = (): string => {
  return "http://localhost:3000/api";
};
