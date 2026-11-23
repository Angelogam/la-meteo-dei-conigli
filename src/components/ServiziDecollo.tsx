"use client";

/**
 * ServiziDecollo — ricettività e servizi REALI attorno al decollo, dalla
 * mappa libera OpenStreetMap via API Overpass (endpoint pubblico, nessuna
 * chiave). Mostra soltanto ciò che OSM espone davvero: nomi, distanza e i
 * contatti pubblici presenti nei tag (telefono, sito, email). Nessuna
 * rubrica inventata, nessuna foto non verificabile. Se il servizio non
 * risponde la sezione sparisce da sola — mai un componente rotto visibile.
 *
 * Categorie richieste dal proprietario: hotel/B&B, campeggi, rifugi,
 * dove mangiare, parcheggi, club. I "recuperi" non esistono come dato
 * aperto strutturato: non vengono simulati (si aggiungeranno in KB).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  BedDouble, Car, ExternalLink, Home, Mail, MapPin, Mountain, Phone,
  RotateCcw, Tent, UtensilsCrossed, Users,
} from "lucide-react";

type CatKey = "dormire" | "campeggi" | "rifugi" | "mangiare" | "parcheggi" | "club";

interface Poi {
  id: string;
  nome: string;
  cat: CatKey;
  lat: number;
  lon: number;
  telefono?: string;
  sito?: string;
  email?: string;
  distanzaKm: number;
}

const CAT_LABEL: Record<CatKey, string> = {
  dormire: "Hotel e B&B",
  campeggi: "Campeggi",
  rifugi: "Rifugi",
  mangiare: "Dove mangiare",
  parcheggi: "Parcheggi",
  club: "Club e scuole di volo",
};

const CAT_ICON: Record<CatKey, React.ReactNode> = {
  dormire: <BedDouble className="size-3.5" aria-hidden="true" />,
  campeggi: <Tent className="size-3.5" aria-hidden="true" />,
  rifugi: <Home className="size-3.5" aria-hidden="true" />,
  mangiare: <UtensilsCrossed className="size-3.5" aria-hidden="true" />,
  parcheggi: <Car className="size-3.5" aria-hidden="true" />,
  club: <Users className="size-3.5" aria-hidden="true" />,
};

const CAT_ORDER: CatKey[] = ["club", "dormire", "campeggi", "rifugi", "mangiare", "parcheggi"];
const CAT_MAX: Record<CatKey, number> = { club: 3, dormire: 8, campeggi: 4, rifugi: 4, mangiare: 8, parcheggi: 4 };

/** Distanza ortodromica in km (formula haversine). */
function distanzaKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function costruisciQuery(lat: number, lon: number): string {
  const dormire = "^(hotel|motel|guest_house|apartment|bed_and_breakfast)$";
  const campeggi = "^(camp_site|caravan_site)$";
  const rifugi = "^(alpine_hut|wilderness_hut|chalet)$";
  const mangiare = "^(restaurant|cafe)$";
  return `[out:json][timeout:25];(
    node["tourism"~"${dormire}"](around:12000,${lat},${lon});
    way["tourism"~"${dormire}"](around:12000,${lat},${lon});
    node["tourism"~"${campeggi}"](around:12000,${lat},${lon});
    way["tourism"~"${campeggi}"](around:12000,${lat},${lon});
    node["tourism"~"${rifugi}"](around:12000,${lat},${lon});
    way["tourism"~"${rifugi}"](around:12000,${lat},${lon});
    node["amenity"~"${mangiare}"](around:12000,${lat},${lon});
    way["amenity"~"${mangiare}"](around:12000,${lat},${lon});
    node["amenity"="parking"](around:6000,${lat},${lon});
    way["amenity"="parking"](around:6000,${lat},${lon});
    node["club"="aero_club"](around:20000,${lat},${lon});
  );out tags center 80;`;
}

function categorizza(tags: Record<string, string>): CatKey | null {
  const t = tags.tourism ?? "";
  if (/^(hotel|motel|guest_house|apartment|bed_and_breakfast)$/.test(t)) return "dormire";
  if (/^(camp_site|caravan_site)$/.test(t)) return "campeggi";
  if (/^(alpine_hut|wilderness_hut|chalet)$/.test(t)) return "rifugi";
  const a = tags.amenity ?? "";
  if (/^(restaurant|cafe)$/.test(a)) return "mangiare";
  if (a === "parking") return "parcheggi";
  if (tags.club === "aero_club") return "club";
  return null;
}

interface OverpassElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

async function caricaPoi(lat: number, lon: number): Promise<Poi[]> {
  const res = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    body: "data=" + encodeURIComponent(costruisciQuery(lat, lon)),
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
  if (!res.ok) throw new Error(String(res.status));
  const j = (await res.json()) as { elements?: OverpassElement[] };
  const viste = new Set<string>();
  const contatore: Record<CatKey, number> = { dormire: 0, campeggi: 0, rifugi: 0, mangiare: 0, parcheggi: 0, club: 0 };
  const tutti: Poi[] = [];
  for (const el of j.elements ?? []) {
    const tags = el.tags ?? {};
    const nome = (tags.name ?? "").trim();
    if (!nome) continue; // i POI senza nome non sono utili a un pilota
    const cat = categorizza(tags);
    if (!cat) continue;
    const pla = el.lat ?? el.center?.lat;
    const plo = el.lon ?? el.center?.lon;
    if (pla == null || plo == null) continue;
    const chiave = `${cat}:${nome.toLowerCase()}`;
    if (viste.has(chiave)) continue; // node+way duplicati dello stesso posto
    if (contatore[cat] >= CAT_MAX[cat]) continue;
    viste.add(chiave);
    contatore[cat]++;
    tutti.push({
      id: `${el.type}/${el.id}`,
      nome,
      cat,
      lat: pla,
      lon: plo,
      ...(tags.phone || tags["contact:phone"] ? { telefono: tags.phone ?? tags["contact:phone"] } : {}),
      ...(tags.website || tags["contact:website"] ? { sito: tags.website ?? tags["contact:website"] } : {}),
      ...(tags.email || tags["contact:email"] ? { email: tags.email ?? tags["contact:email"] } : {}),
      distanzaKm: distanzaKm(lat, lon, pla, plo),
    });
  }
  // nel gruppo: i più vicini prima
  return CAT_ORDER.flatMap((c) =>
    tutti.filter((p) => p.cat === c).sort((a, b) => a.distanzaKm - b.distanzaKm),
  );
}

interface ServiziDecolloProps {
  nome: string;
  lat: number;
  lon: number;
  /** variante "home" = blocco compatto; "pagina" = dentro la scheda decollo */
  variante?: "home" | "pagina";
}

export default function ServiziDecollo({ nome, lat, lon, variante = "home" }: ServiziDecolloProps) {
  const [aperto, setAperto] = useState(false);
  const [poi, setPoi] = useState<Poi[] | null>(null);
  const [caricando, setCaricando] = useState(false);
  const [fallito, setFallito] = useState(false);
  const tentativi = useRef(0);

  const carica = useCallback(() => {
    if (caricando) return;
    setCaricando(true);
    setFallito(false);
    caricaPoi(lat, lon)
      .then((r) => setPoi(r))
      .catch(() => setFallito(true)) // se il feed non funziona: la sezione resta vuota (mai rotta in pubblico)
      .finally(() => setCaricando(false));
  }, [lat, lon, caricando]);

  // carica al primo apertura del riquadro: niente rete finché non serve
  useEffect(() => {
    if (aperto && poi === null && !caricando && !fallito && tentativi.current < 3) {
      tentativi.current++;
      carica();
    }
  }, [aperto, poi, caricando, fallito, carica]);

  const raggruppati = CAT_ORDER.map((c) => ({ cat: c, lista: (poi ?? []).filter((p) => p.cat === c) })).filter(
    (g) => g.lista.length > 0,
  );

  return (
    <details
      className="rounded-2xl border border-slate-700/50 bg-slate-800/40 overflow-hidden"
      onToggle={(e) => setAperto((e.target as HTMLDetailsElement).open)}
      data-testid="servizi-decollo"
    >
      <summary className="flex cursor-pointer select-none items-center gap-2 px-4 py-3 text-sm font-bold text-slate-200">
        <Mountain className="size-4 text-emerald-400" aria-hidden="true" />
        Dormire, mangiare, parcheggiare — servizi vicino a {nome}
        <span className="ml-auto text-[11px] font-medium text-slate-500">
          dati reali OpenStreetMap · tocca per aprire
        </span>
      </summary>

      <div className="border-t border-slate-700/40 px-4 py-3">
        {caricando && (
          <p className="py-3 text-center text-sm text-slate-400">Cerco i servizi nella mappa libera…</p>
        )}

        {fallito && poi === null && (
          <div className="py-3 text-center">
            <p className="text-sm text-slate-400">Il servizio della mappa non ha risposto.</p>
            {tentativi.current < 3 && (
              <button
                type="button"
                onClick={carica}
                className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-slate-600 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700/50"
              >
                <RotateCcw className="size-3.5" aria-hidden="true" /> Riprova
              </button>
            )}
          </div>
        )}

        {!caricando && !fallito && poi !== null && raggruppati.length === 0 && (
          <p className="py-3 text-center text-sm text-slate-400">
            Nessun servizio mappato vicino a questo decollo su OpenStreetMap.
          </p>
        )}

        {!caricando && raggruppati.length > 0 && (
          <div className={variante === "home" ? "grid gap-3" : "grid gap-4"}>
            {raggruppati.map((g) => (
              <div key={g.cat}>
                <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-emerald-300/90">
                  {CAT_ICON[g.cat]}
                  {CAT_LABEL[g.cat]}
                  <span className="font-medium normal-case tracking-normal text-slate-500">· {g.lista.length}</span>
                </div>
                <ul className="grid gap-1 sm:grid-cols-2">
                  {g.lista.map((p) => (
                    <li
                      key={p.id}
                      className="flex min-w-0 items-center gap-2 rounded-lg border border-slate-700/40 bg-slate-900/50 px-2.5 py-1.5 text-sm"
                    >
                      <span className="min-w-0 flex-1 truncate font-semibold text-slate-200">{p.nome}</span>
                      <span className="shrink-0 font-mono text-[11px] text-slate-500">
                        {p.distanzaKm.toFixed(1).replace(".", ",")} km
                      </span>
                      {p.telefono && (
                        <a
                          href={`tel:${p.telefono.replace(/\s/g, "")}`}
                          className="shrink-0 rounded-md border border-slate-600 p-1 text-emerald-300 hover:bg-slate-700/60"
                          title={`Chiama ${p.nome}: ${p.telefono}`}
                          aria-label={`Telefono ${p.nome}`}
                        >
                          <Phone className="size-3.5" aria-hidden="true" />
                        </a>
                      )}
                      {p.email && (
                        <a
                          href={`mailto:${p.email}`}
                          className="shrink-0 rounded-md border border-slate-600 p-1 text-sky-300 hover:bg-slate-700/60"
                          title={`Scrivi a ${p.nome}: ${p.email}`}
                          aria-label={`Email ${p.nome}`}
                        >
                          <Mail className="size-3.5" aria-hidden="true" />
                        </a>
                      )}
                      {p.sito && (
                        <a
                          href={p.sito}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 rounded-md border border-slate-600 p-1 text-slate-300 hover:bg-slate-700/60"
                          title={`Sito di ${p.nome}`}
                          aria-label={`Sito web ${p.nome}`}
                        >
                          <ExternalLink className="size-3.5" aria-hidden="true" />
                        </a>
                      )}
                      <a
                        href={`https://www.openstreetmap.org/?mlat=${p.lat}&mlon=${p.lon}#map=15/${p.lat}/${p.lon}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 rounded-md border border-slate-600 p-1 text-amber-300 hover:bg-slate-700/60"
                        title={`${p.nome} sulla mappa`}
                        aria-label={`${p.nome} sulla mappa`}
                      >
                        <MapPin className="size-3.5" aria-hidden="true" />
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <p className="text-[10px] text-slate-500">
              Contatti e nomi come mappati dalla comunità OpenStreetMap: verifica sempre prima di partire.
            </p>
          </div>
        )}
      </div>
    </details>
  );
}
