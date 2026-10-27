import { defineHandler } from "nitro";
import { getRouterParam, createError } from "nitro/h3";
import fs from "node:fs";
import path from "node:path";

const DATA_FILE = path.resolve("./server/data/people.json");

function readPeople() {
  if (!fs.existsSync(DATA_FILE)) return [];
  try {
    const data = fs.readFileSync(DATA_FILE, "utf-8");
    const parsed: unknown = JSON.parse(data);
    if (!Array.isArray(parsed)) {
      throw new Error("Archivio persone non valido");
    }
    return parsed as Array<{ id: string; [key: string]: unknown }>;
  } catch {
    throw createError({ statusCode: 500, statusMessage: "Archivio persone non leggibile" });
  }
}

export default defineHandler((event) => {
  const id = getRouterParam(event, "id");
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: "ID mancante" });
  }

  const people = readPeople();
  const person = people.find((p) => p.id === id);

  if (!person) {
    throw createError({ statusCode: 404, statusMessage: "Persona non trovata" });
  }

  return {
    ok: true,
    person,
  };
});
