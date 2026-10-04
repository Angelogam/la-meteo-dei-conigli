import { defineHandler } from "nitro";
import { getQuery, createError } from "nitro/h3";
import fs from "node:fs";
import path from "node:path";

const DATA_FILE = path.resolve("./server/data/people.json");

function readPeople() {
  if (!fs.existsSync(DATA_FILE)) {
    return [];
  }
  try {
    const data = fs.readFileSync(DATA_FILE, "utf-8");
    return JSON.parse(data) as any[];
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
  const items = people.slice(offset, offset + Math.min(limit, 100));

  return {
    ok: true,
    total,
    limit,
    offset,
    items,
    dataFile: DATA_FILE,
    fileExists: fs.existsSync(DATA_FILE),
  };
});
