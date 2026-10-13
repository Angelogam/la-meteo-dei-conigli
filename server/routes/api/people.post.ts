import { defineHandler } from "nitro";
import { readBody, createError, setResponseStatus } from "nitro/h3";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

interface PersonRecord {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  notes?: string;
  createdAt: string;
}

const DATA_DIR = path.resolve("./server/data");
const DATA_FILE = path.join(DATA_DIR, "people.json");
const MAX_RECORDS = 10_000;

function ensureDataFile() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, "[]", "utf-8");
}

function readPeople(): PersonRecord[] {
  try {
    const parsed: unknown = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
    if (!Array.isArray(parsed)) throw new Error("Archivio persone non valido");
    return parsed as PersonRecord[];
  } catch {
    throw createError({ statusCode: 500, statusMessage: "Archivio persone non leggibile" });
  }
}

function optionalText(value: unknown, field: string, maxLength: number): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") {
    throw createError({ statusCode: 400, statusMessage: `Campo ${field} non valido`, data: { field } });
  }
  const trimmed = value.trim();
  if (trimmed.length > maxLength) {
    throw createError({ statusCode: 400, statusMessage: `Campo ${field} troppo lungo`, data: { field, maxLength } });
  }
  return trimmed || undefined;
}

export default defineHandler(async (event) => {
  ensureDataFile();
  const body: unknown = await readBody(event);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw createError({ statusCode: 400, statusMessage: "Il corpo deve essere un oggetto JSON" });
  }

  const input = body as Record<string, unknown>;
  const allowedFields = new Set(["name", "email", "phone", "notes"]);
  const unknownFields = Object.keys(input).filter((key) => !allowedFields.has(key));
  if (unknownFields.length > 0) {
    throw createError({
      statusCode: 400,
      statusMessage: "Il payload contiene campi non supportati",
      data: { fields: unknownFields },
    });
  }

  const name = optionalText(input.name, "name", 120);
  if (!name) throw createError({ statusCode: 400, statusMessage: "Il nome è obbligatorio" });

  const email = optionalText(input.email, "email", 254);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw createError({ statusCode: 400, statusMessage: "Indirizzo email non valido", data: { field: "email" } });
  }
  const phone = optionalText(input.phone, "phone", 40);
  const notes = optionalText(input.notes, "notes", 2000);

  const people = readPeople();
  if (people.length >= MAX_RECORDS) {
    throw createError({ statusCode: 409, statusMessage: "Limite archivio raggiunto" });
  }

  const person: PersonRecord = {
    id: `person-${randomUUID()}`,
    name,
    ...(email ? { email } : {}),
    ...(phone ? { phone } : {}),
    ...(notes ? { notes } : {}),
    createdAt: new Date().toISOString(),
  };

  people.push(person);
  const temporaryFile = `${DATA_FILE}.${randomUUID()}.tmp`;
  try {
    fs.writeFileSync(temporaryFile, JSON.stringify(people, null, 2), { encoding: "utf-8", flag: "wx" });
    fs.renameSync(temporaryFile, DATA_FILE);
  } catch {
    try { if (fs.existsSync(temporaryFile)) fs.unlinkSync(temporaryFile); } catch { /* best-effort cleanup */ }
    throw createError({ statusCode: 500, statusMessage: "Impossibile salvare la persona" });
  }

  setResponseStatus(event, 201);
  return { ok: true, data: person, person, meta: { total: people.length } };
});
