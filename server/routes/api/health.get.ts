import { defineHandler } from "nitro";

export default defineHandler(() => {
  return {
    ok: true,
    service: "Meteo dei Conigli API",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    endpoints: [
      "GET /api/people - Lista persone",
      "POST /api/people - Aggiungi persona",
      "GET /api/people/:id - Dettaglio persona",
      "GET /api/windy-soundings?action=sites - Siti sounding",
      "GET /api/windy-soundings?action=plugin - Plugin JS",
    ],
    dataDir: process.cwd() + "/server/data",
  };
});
