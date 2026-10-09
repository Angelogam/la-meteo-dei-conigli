import { defineHandler } from "nitro";

const API_VERSION = "1.1.0";

export default defineHandler(() => ({
  ok: true,
  service: "La Meteo dei Conigli API",
  version: API_VERSION,
  timestamp: new Date().toISOString(),
  documentation: "/api/openapi",
  health: "/api/health",
  endpoints: [
    { method: "GET", path: "/api/health", description: "Stato del servizio" },
    { method: "GET", path: "/api/openapi", description: "Specifica OpenAPI 3.1" },
    { method: "GET", path: "/api/open-meteo", description: "Proxy validato per Open-Meteo" },
    { method: "GET", path: "/api/windy-soundings", description: "Siti sounding e metadati plugin" },
    { method: "GET", path: "/api/people", description: "Elenco paginato persone" },
    { method: "POST", path: "/api/people", description: "Crea una persona" },
  ],
  conventions: {
    success: "JSON con ok:true e data/meta dove applicabile",
    errors: "HTTP status coerente e messaggio leggibile",
    timestamps: "ISO 8601 UTC",
  },
}));