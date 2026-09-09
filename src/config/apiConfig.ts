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
 * Il proxy va usato SOLO in locale quando il server Node è attivo su :3000.
 * Di default FALSE per evitare errori quando il server non è in esecuzione.
 * Per attivarlo: VITE_USE_PROXY=true .env oppure passare direttamente.
 */
export const USE_PROXY = typeof import.meta.env.VITE_USE_PROXY !== "undefined"
  ? import.meta.env.VITE_USE_PROXY === "true"
  : false;

/**
 * URL base per le chiamate meteo.
 * In produzione o se il proxy non è configurato → diretto a Open-Meteo.
 */
export const getMeteoBaseUrl = (): string => {
  if (typeof window === "undefined") return OPEN_METEO_DIRECT;
  if (!USE_PROXY) return OPEN_METEO_DIRECT;
  // Prova il proxy, se fallisce torna al diretto (gestito dal client con try/catch)
  return API_PROXY_URL;
};

/**
 * URL per le chiamate API (altri endpoint)
 */
export const getApiBaseUrl = (): string => {
  return API_PROXY_URL.replace("/open-meteo", "");
};
