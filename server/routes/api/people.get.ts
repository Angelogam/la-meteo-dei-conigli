import { defineHandler } from "nitro";
import { getQuery } from "nitro/h3";
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
  const query = getQuery(event);
  const limit = query.limit ? parseInt(query.limit as string) : 50;
  const offset = query.offset ? parseInt(query.offset as string) : 0;

  const people = readPeople();
  const total = people.length;
  const items = people.slice(offset, offset + limit);

  return {
    ok: true,
    total,
    limit,
    offset,
    items,
  };
});