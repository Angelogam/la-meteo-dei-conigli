import { defineHandler } from "nitro";

const apiVersion = "1.1.0";

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
    { name: "Soundings", description: "Siti sounding e configurazione plugin" },
    { name: "People", description: "Archivio persone dimostrativo" },
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
          { name: "hourly", in: "query", schema: { type: "string" } },
          { name: "daily", in: "query", schema: { type: "string" } },
          { name: "timezone", in: "query", schema: { type: "string" } },
          { name: "forecast_days", in: "query", schema: { type: "integer", minimum: 1, maximum: 16 } },
          { name: "forecast_hours", in: "query", schema: { type: "integer", minimum: 1, maximum: 384 } },
          { name: "temperature_unit", in: "query", schema: { type: "string", enum: ["celsius", "fahrenheit"] } },
          { name: "wind_speed_unit", in: "query", schema: { type: "string", enum: ["kmh", "ms", "mph", "kn"] } },
          { name: "precipitation_unit", in: "query", schema: { type: "string", enum: ["mm", "inch"] } },
        ],
        responses: {
          "200": { description: "Previsione JSON del provider" },
          "400": { description: "Coordinate o parametri non validi" },
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
        responses: { "200": { description: "Metadati plugin o siti disponibili" }, "404": { description: "Sito non trovato" }, "502": { description: "Plugin remoto non raggiungibile" } },
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
        tags: ["People"], summary: "Crea una persona",
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
  },
}));