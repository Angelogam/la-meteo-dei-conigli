import { defineHandler } from "nitro";
import { readBody, createError } from "nitro/h3";
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

function writePeople(people) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(people, null, 2));
}

interface PersonData {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  notes?: string;
  createdAt?: string;
}

export default defineHandler(async (event) => {
  const body = await readBody<{ name: string; email?: string; phone?: string; notes?: string }>(event);

  if (!body?.name) {
    throw createError({ statusCode: 400, statusMessage: "Nome è obbligatorio" });
  }

  const people = readPeople();

  const newPerson: PersonData = {
    id: `person-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    name: body.name,
    email: body.email,
    phone: body.phone,
    notes: body.notes,
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