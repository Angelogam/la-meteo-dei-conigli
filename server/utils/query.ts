import { createError } from "nitro/h3";

/**
 * Validazione query string condivisa dagli endpoint aerologici.
 * Stile coerente con /api/open-meteo: parametri non documentati o
 * ripetuti vengono rifiutati, coordinate validate con range espliciti.
 */

export function rejectUnknownParameters(url: URL, allowed: readonly string[]) {
  const unknown = [...url.searchParams.keys()].filter((key) => !allowed.includes(key));
  if (unknown.length > 0) {
    throw createError({
      statusCode: 400,
      statusMessage: `Parametri non supportati: ${unknown.join(", ")}`,
      data: { unknown, allowed },
    });
  }
}

export function singleQuery(query: Record<string, unknown>, name: string): string | undefined {
  const value = query[name];
  if (Array.isArray(value)) {
    throw createError({
      statusCode: 400,
      statusMessage: `Parametro ${name} ripetuto: specificarlo una sola volta`,
      data: { parameter: name },
    });
  }
  if (typeof value === "string") return value.trim() || undefined;
  return undefined;
}

export function parseCoordinate(value: string | undefined, name: string, min: number, max: number): number {
  if (!value || value.length > 24) {
    throw createError({ statusCode: 400, statusMessage: `Coordinata ${name} obbligatoria`, data: { parameter: name } });
  }
  const number = Number(value);
  if (!Number.isFinite(number) || number < min || number > max) {
    throw createError({
      statusCode: 400,
      statusMessage: `Coordinata ${name} non valida`,
      data: { parameter: name, min, max },
    });
  }
  return number;
}

export function parseNumberParameter(
  value: string | undefined,
  name: string,
  min: number,
  max: number,
  fallback?: number,
): number {
  if (value === undefined || value === "") {
    if (fallback !== undefined) return fallback;
    throw createError({ statusCode: 400, statusMessage: `Parametro ${name} obbligatorio`, data: { parameter: name } });
  }
  const number = Number(value);
  if (!Number.isFinite(number) || number < min || number > max) {
    throw createError({
      statusCode: 400,
      statusMessage: `Parametro ${name} non valido o fuori intervallo`,
      data: { parameter: name, min, max },
    });
  }
  return number;
}

const ESPOSIZIONI_VALIDE = [
  "N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
  "S", "SSW", "SSO", "SW", "WSW", "WSO", "W", "WNW", "WNO", "NW", "NNW", "NNO",
  "O", "SO", "NO", "OSO", "ONO",
  "S/SE", "S/SW", "S/SO", "N/NE", "N/NW", "N/NO",
  "E/NE", "E/SE", "W/NW", "W/SW", "O/NO", "O/SO",
  "SE/S", "SW/S", "SO/S", "NE/N",
];

export function parseEsposizione(value: string | undefined): string {
  if (value === undefined || value === "") return "S";
  const clean = value.trim().toUpperCase().replace(/\s+/g, "");
  if (!ESPOSIZIONI_VALIDE.includes(clean)) {
    throw createError({
      statusCode: 400,
      statusMessage: "Esposizione non valida",
      data: { parameter: "exposure", allowed: ESPOSIZIONI_VALIDE },
    });
  }
  return clean;
}
