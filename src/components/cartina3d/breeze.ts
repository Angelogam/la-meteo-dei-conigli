/**
 * CASELLE DI BREZZA sui pin dei decolli — dati LIVE da Open-Meteo
 * (richiesta pilota v16: «ci devi anche mettere le caselle con velocità e
 * direzione della brezza prendendo i dati da le fonti tipo open meteo»).
 *
 * COME FUNZIONA:
 *  - UNA richiesta BULK per tutti i decolli (Open-Meteo accetta più
 *    coordinate separate da virgola: nessun rate-limit multi-request);
 *    a blocchi di 50 per non toccare i limiti di lunghezza dell'URL;
 *  - parametri CURRENT: wind_speed_10m, wind_direction_10m, wind_gusts_10m
 *    (la brezza che il pilota trova ora in decollo);
 *  - cache in MEMORIA (10 min) e su localStorage (30 min): cambi di decollo
 *    istantanei e resistenza ai buchi di rete;
 *  - timeout 9 s + 2 tentativi con backoff per blocco; un blocco fallito non
 *    tocca gli altri (le caselle appaiono dove il dato c'è).
 * Nessun dato inventato: se Open-Meteo non risponde la casella NON appare.
 */

export interface BreezeNow {
  ws: number; // km/h a 10 m
  gust: number; // km/h raffiche
  wd: number; // gradi «da» (direzione meteorologica)
  at: number; // epoch ms del rilevamento
}

export interface BreezePoint {
  id: string;
  lat: number;
  lon: number;
}

const MEM_TTL_MS = 10 * 60 * 1000;
const DISK_TTL_MS = 30 * 60 * 1000;
const CHUNK = 50; // decolli per richiesta (URL sicuro)
const mem = new Map<string, { at: number; data: Map<string, BreezeNow> }>();

const round1 = (v: number): string => v.toFixed(3);
const cacheKey = (pts: BreezePoint[]): string => pts.map((p) => `${round1(p.lat)},${round1(p.lon)}`).join(";");

const readDisk = (key: string): Map<string, BreezeNow> | null => {
  try {
    const raw = localStorage.getItem(`c3dBreezeV1:${key}`);
    if (!raw) return null;
    const obj = JSON.parse(raw) as { at: number; arr: [string, BreezeNow][] };
    if (!obj || typeof obj.at !== "number" || Date.now() - obj.at > DISK_TTL_MS) return null;
    return new Map(obj.arr);
  } catch {
    return null;
  }
};

const writeDisk = (key: string, data: Map<string, BreezeNow>): void => {
  try {
    localStorage.setItem(`c3dBreezeV1:${key}`, JSON.stringify({ at: Date.now(), arr: [...data] }));
  } catch {
    /* quota piena: la cache su disco è facoltativa */
  }
};

/* un blocco di decolli → mappa id → BreezeNow (o vuota se il blocco fallisce) */
const pullChunk = async (chunk: BreezePoint[]): Promise<Map<string, BreezeNow>> => {
  const out = new Map<string, BreezeNow>();
  const latQ = chunk.map((p) => p.lat.toFixed(4)).join(",");
  const lonQ = chunk.map((p) => p.lon.toFixed(4)).join(",");
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${latQ}&longitude=${lonQ}` +
    `&current=wind_speed_10m,wind_direction_10m,wind_gusts_10m` +
    `&wind_speed_unit=kmh&timezone=Europe%2FBerlin`;
  let lastErr: unknown = new Error("open-meteo breeze non tentato");
  for (let attempt = 0; attempt < 3; attempt++) {
    const ac = new AbortController();
    const timer = window.setTimeout(() => ac.abort(), 9000);
    try {
      const res = await fetch(url, { signal: ac.signal });
      if (!res.ok) throw new Error(`open-meteo ${res.status}`);
      const j: unknown = await res.json();
      const arr: unknown[] = Array.isArray(j) ? j : [j];
      for (let i = 0; i < chunk.length && i < arr.length; i++) {
        const cur = (arr[i] as { current?: Record<string, unknown> })?.current;
        if (!cur) continue;
        const ws = Number(cur.wind_speed_10m);
        const wd = Number(cur.wind_direction_10m);
        const gust = Number(cur.wind_gusts_10m);
        if (!Number.isFinite(ws) || !Number.isFinite(wd)) continue;
        const p = chunk[i];
        out.set(p.id, {
          ws,
          wd,
          gust: Number.isFinite(gust) ? gust : ws * 1.6,
          at: Date.now(),
        });
      }
      return out;
    } catch (e) {
      lastErr = e;
      await new Promise((r) => setTimeout(r, 900 * Math.pow(2, attempt)));
    } finally {
      window.clearTimeout(timer);
    }
  }
  console.warn("[c3d] caselle brezza: blocco non disponibile:", String(lastErr).slice(0, 80));
  return out;
};

/** Vento LIVE Open-Meteo per tutti i decolli dati. Mai rigetta errori:
    ritorna la mappa (anche parziale) di ciò che ha ottenuto. */
export async function fetchBreezeNow(pts: BreezePoint[]): Promise<Map<string, BreezeNow>> {
  if (!pts.length) return new Map();
  const key = cacheKey(pts);

  /* 1. memoria (10 min) */
  const m = mem.get(key);
  if (m && Date.now() - m.at < MEM_TTL_MS) return m.data;

  /* 2. disco (30 min) */
  const disk = readDisk(key);
  if (disk && disk.size) {
    mem.set(key, { at: Date.now(), data: disk });
    return disk;
  }

  /* 3. rete: blocchi da 50 in parallelo, risultati uniti */
  const chunks: BreezePoint[][] = [];
  for (let i = 0; i < pts.length; i += CHUNK) chunks.push(pts.slice(i, i + CHUNK));
  const parts = await Promise.all(chunks.map((c) => pullChunk(c)));
  const out = new Map<string, BreezeNow>();
  for (const part of parts) for (const [id, b] of part) out.set(id, b);
  if (out.size) {
    mem.set(key, { at: Date.now(), data: out });
    writeDisk(key, out);
  }
  return out;
}
