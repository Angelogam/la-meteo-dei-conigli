import { defineHandler } from "nitro";
import { getRouterParam } from "nitro/h3";
import fs from "node:fs";
import path from "node:path";

const DATA_FILE = path.resolve("./server/data/people.json");

function readPeople() {
  try {
    const data = fs.readFileSync(DATA_FILE, "utf-8");
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export default defineHandler(async (event) => {
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