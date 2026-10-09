const API_VERSION = "1.1.0";

export default defineHandler(() => ({
  ok: true,
  status: "healthy",
  service: "La Meteo dei Conigli API",
  version: API_VERSION,
  timestamp: new Date().toISOString(),
  checks: {
    api: "ok",
    // Provider availability is checked on actual provider requests.
    upstreamProviders: "not_checked",
  },
}));