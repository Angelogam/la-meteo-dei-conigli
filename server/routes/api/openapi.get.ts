import { defineHandler } from "nitro";

const apiVersion = "1.2.0";

export default defineHandler(() => ({
  openapi: "3.1.0",
  info: {
    title: "La Meteo dei Conigli API",
    version: apiVersion,
    description: "API per previsioni meteorologiche e sounding atmosferici. I dati sono previsioni modellistiche, non garanzie di sicurezza del volo.",
    contact: { name: "La Meteo dei Conigli" },
  },
  servers: [{ url: "/api", description: "Deployment corrente" }],
  tags: [
    { name: "System", description: "Stato e documentazione" },
    { name: "Weather", description: "Previsioni meteorologiche" },
    { name: "Aerologia", description: "Indici derivati per il volo libero: volabilità, termiche, validazione vento decollo" },
    { name: "Soundings", description: "Siti sounding e configurazione plugin" },
    { name: "People", description: "Archivio persone dimostrativo; non usare per dati personali in produzione senza autenticazione e storage persistente" },
  ],
  paths: {
    "/health": { get: { tags: ["System"], summary: "Stato API", responses: { "200": { description: "API raggiungibile" } } } },
    "/openapi": { get: { tags: ["System"], summary: "Specifica OpenAPI", responses: { "200": { description: "Documento OpenAPI 3.1" } } } },
    "/open-meteo": {
      get: {
        tags: ["Weather"], summary: "Proxy Open-Meteo",
        description: "Proxy con allow-list dei parametri e coordinate validate.",
        parameters: [
          { name: "latitude", in: "query", required: true, schema: { type: "number", minimum: -90, maximum: 90 } },
          { name: "longitude", in: "query", required: true, schema: { type: "number", minimum: -180, maximum: 180 } },
          { name: "current", in: "query", schema: { type: "string" } },
          { name: "hourly", in: "query", schema: { type: "string" } },
          { name: "daily", in: "query", schema: { type: "string" } },
          { name: "timezone", in: "query", schema: { type: "string" } },
          { name: "models", in: "query", schema: { type: "string" } },
          { name: "start_date", in: "query", schema: { type: "string", format: "date" } },
          { name: "end_date", in: "query", schema: { type: "string", format: "date" } },
          { name: "forecast_days", in: "query", schema: { type: "integer", minimum: 1, maximum: 16 } },
          { name: "forecast_hours", in: "query", schema: { type: "integer", minimum: 1, maximum: 384 } },
          { name: "temperature_unit", in: "query", schema: { type: "string", enum: ["celsius", "fahrenheit"] } },
          { name: "wind_speed_unit", in: "query", schema: { type: "string", enum: ["kmh", "ms", "mph", "kn"] } },
          { name: "precipitation_unit", in: "query", schema: { type: "string", enum: ["mm", "inch"] } },
        ],
        responses: {
          "200": { description: "Previsione JSON del provider" },
          "400": { description: "Coordinate non valide, parametro non supportato o ripetuto, oppure valore fuori formato/intervallo" },
          "429": { description: "Limite provider raggiunto" },
          "502": { description: "Provider non disponibile o risposta non valida" },
          "504": { description: "Timeout provider" },
        },
      },
    },
    "/volabilita": {
      get: {
        tags: ["Aerologia"], summary: "Indice di volabilità 1-10",
        description: "Combina vento, raffiche, esposizione del decollo, nuvolosità, base nubi e instabilità in un indice di volabilità. Formula identica a quella dell'app.",
        parameters: [
          { name: "latitude", in: "query", required: true, schema: { type: "number", minimum: -90, maximum: 90 } },
          { name: "longitude", in: "query", required: true, schema: { type: "number", minimum: -180, maximum: 180 } },
          { name: "altitude", in: "query", schema: { type: "number", minimum: 0, maximum: 8849, default: 0 }, description: "Quota decollo in metri slm" },
          { name: "exposure", in: "query", schema: { type: "string", default: "S" }, description: "Orientamento del decollo (N, NE, ..., SO, NO, anche composte come S/SE)" },
          { name: "timezone", in: "query", schema: { type: "string", default: "auto" } },
        ],
        responses: {
          "200": { description: "Indice di volabilità con motivazioni e condizioni correnti" },
          "400": { description: "Parametri mancanti, non validi, ripetuti o non supportati" },
          "429": { description: "Limite provider raggiunto" },
          "502": { description: "Provider non disponibile o risposta non valida" },
          "504": { description: "Timeout provider" },
        },
      },
    },
    "/termiche": {
      get: {
        tags: ["Aerologia"], summary: "Termiche orarie stimate",
        description: "Rateo (m/s), base LCL e top termico per le ore future, calcolati dai dati orari Open-Meteo. Le stime sono empiriche.",
        parameters: [
          { name: "latitude", in: "query", required: true, schema: { type: "number", minimum: -90, maximum: 90 } },
          { name: "longitude", in: "query", required: true, schema: { type: "number", minimum: -180, maximum: 180 } },
          { name: "altitude", in: "query", schema: { type: "number", minimum: 0, maximum: 8849, default: 0 }, description: "Quota decollo in metri slm" },
          { name: "days", in: "query", schema: { type: "integer", minimum: 1, maximum: 3, default: 1 }, description: "Giorni di orizzonte da includere" },
          { name: "timezone", in: "query", schema: { type: "string", default: "auto" } },
        ],
        responses: {
          "200": { description: "Serie oraria delle termiche con finestra migliore" },
          "400": { description: "Parametri mancanti, non validi, ripetuti o non supportati" },
          "429": { description: "Limite provider raggiunto" },
          "502": { description: "Provider non disponibile o risposta non valida" },
          "504": { description: "Timeout provider" },
        },
      },
    },
    "/venti-decollo": {
      get: {
        tags: ["Aerologia"], summary: "Validazione vento in decollo",
        description: "Confronta il vento in superficie con l'esposizione del decollo: relazione frontale/diagonale/laterale/di coda, classificazione e consiglio di decollo.",
        parameters: [
          { name: "latitude", in: "query", required: true, schema: { type: "number", minimum: -90, maximum: 90 } },
          { name: "longitude", in: "query", required: true, schema: { type: "number", minimum: -180, maximum: 180 } },
          { name: "altitude", in: "query", schema: { type: "number", minimum: 0, maximum: 8849, default: 0 }, description: "Quota decollo in metri slm" },
          { name: "exposure", in: "query", schema: { type: "string", default: "S" }, description: "Orientamento del decollo (N, NE, ..., SO, NO, anche composte come S/SE)" },
          { name: "timezone", in: "query", schema: { type: "string", default: "auto" } },
        ],
        responses: {
          "200": { description: "Esito della validazione vento con motivazioni" },
          "400": { description: "Parametri mancanti, non validi, ripetuti o non supportati" },
          "429": { description: "Limite provider raggiunto" },
          "502": { description: "Provider non disponibile o risposta non valida" },
          "504": { description: "Timeout provider" },
        },
      },
    },
    "/windy-soundings": {
      get: {
        tags: ["Soundings"], summary: "Siti sounding e configurazione plugin",
        parameters: [
          { name: "action", in: "query", schema: { type: "string", enum: ["sites", "plugin"] } },
          { name: "site", in: "query", schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "Metadati plugin o siti disponibili" },
          "400": { description: "Parametro sconosciuto, azione non valida o combinazione ambigua" },
          "404": { description: "Sito non trovato" },
          "502": { description: "Plugin remoto non raggiungibile o risposta non valida" },
          "504": { description: "Timeout del provider Windy" },
        },
      },
    },
    "/people": {
      get: {
        tags: ["People"], summary: "Elenco persone paginato",
        parameters: [
          { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 100, default: 25 } },
          { name: "offset", in: "query", schema: { type: "integer", minimum: 0, default: 0 } },
        ],
        responses: { "200": { description: "Lista paginata" }, "400": { description: "Paginazione non valida" } },
      },
      post: {
        tags: ["People"], summary: "Crea una persona dimostrativa",
        description: "Endpoint dimostrativo senza autenticazione. Non inviare dati personali reali.",
        requestBody: {
          required: true,
          content: { "application/json": { schema: {
            type: "object", additionalProperties: false, required: ["name"],
            properties: {
              name: { type: "string", minLength: 1, maxLength: 120 },
              email: { type: "string", format: "email", maxLength: 254 },
              phone: { type: "string", maxLength: 40 },
              notes: { type: "string", maxLength: 2000 },
            },
          } } },
        },
        responses: { "201": { description: "Persona creata" }, "400": { description: "Payload non valido" }, "409": { description: "Limite archivio raggiunto" } },
      },
    },
    "/people/{id}": {
      get: {
        tags: ["People"], summary: "Dettaglio persona dimostrativa",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "Persona trovata" },
          "400": { description: "ID mancante" },
          "404": { description: "Persona non trovata" },
          "500": { description: "Archivio non leggibile" },
        },
      },
    },
  },
}));
