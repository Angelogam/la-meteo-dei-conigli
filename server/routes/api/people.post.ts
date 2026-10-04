import { defineHandler } from "nitro";
import { readBody, createError } from "nitro/h3";
import fs from "node:fs";
import path from "node:path";

const DATA_DIR = path.resolve("./server/data");
const DATA_FILE = path.join(DATA_DIR, "people.json");

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, "[]", "utf-8");
  }
}

function readPeople() {
  try {
    const data = fs.readFileSync(DATA_FILE, "utf-8");
    return JSON.parse(data) as any[];
  } catch {
    return [];
  }
}

function writePeople(people: any[]) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(people, null, 2), "utf-8");
}

export default defineHandler(async (event) => {
  ensureDataDir();
  
  const body = await readBody<{ name: string; email?: string; phone?: string; notes?: string }>(event);

  if (!body?.name || !body.name.trim()) {
    throw createError({ statusCode: 400, statusMessage: "Nome è obbligatorio" });
  }

  const people = readPeople();

  const newPerson = {
    id: `person-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    name: body.name.trim(),
    email: body.email?.trim() || undefined,
    phone: body.phone?.trim() || undefined,
    notes: body.notes?.trim() || undefined,
    createdAt: new Date().toISOString(),
  };

  people.push(newPerson);
  writePeople(people);

  return {
    ok: true,
    person: newPerson,
    total: people.length,
  };
});
