import { defineHandler } from "nitro";
import { getQuery, createError } from "nitro/h3";
import fs from "node:fs";
import path from "node:path";

interface PersonRecord {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  notes?: string;
  createdAt: string;
}

const DATA_FILE = path.resolve("./server/data/people.json");
const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

function readPeople(): PersonRecord[] {
  if (!fs.existsSync(DATA_FILE)) return [];
  try {
    const parsed: unknown = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
    if (!Array.isArray(parsed)) throw new Error("Archivio persone non valido");
    return parsed as PersonRecord[];
  } catch {
    throw createError({ statusCode: 500, statusMessage: "Archivio persone non leggibile" });
  }
}

function parseInteger(value: unknown, fallback: number, name: string, min: number, max: number) {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value !== "string" || !/^\d+$/.test(value)) {
    throw createError({ statusCode: 400, statusMessage: `Parametro ${name} non valido`, data: { parameter: name } });
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < min || parsed > max) {
    throw createError({ statusCode: 400, statusMessage: `Parametro ${name} fuori intervallo`, data: { parameter: name, min, max } });
  }
  return parsed;
}

export default defineHandler((event) => {
  const query = getQuery(event);
  const limit = parseInteger(query.limit, DEFAULT_LIMIT, "limit", 1, MAX_LIMIT);
  const offset = parseInteger(query.offset, 0, "offset", 0, 1_000_000);
  const people = readPeople();

  return {
    ok: true,
    data: people.slice(offset, offset + limit),
    meta: { total: people.length, limit, offset, hasMore: offset + limit < people.length },
    // Compatibility fields for existing clients.
    total: people.length,
    limit,
    offset,
    items: people.slice(offset, offset + limit),
  };
});
