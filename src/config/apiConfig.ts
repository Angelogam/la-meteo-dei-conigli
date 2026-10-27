/** Endpoint meteo centralizzato. Il browser usa il proxy same-origin Nitro. */
export const API_PROXY_URL = "/api/open-meteo";
export const OPEN_METEO_DIRECT = "https://api.open-meteo.com/v1/forecast";
export const USE_PROXY = true;
export const getMeteoBaseUrl = (): string => API_PROXY_URL;
export const getApiBaseUrl = (): string => "/api";
