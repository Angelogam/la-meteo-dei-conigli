/**
 * REGISTRO CONTATTI CLUB — numeri di telefono e recapiti pubblici dei club
 * di volo libero referenziati nella banca dati decolli.
 *
 * Ogni contatto è stato verificato su fonti pubbliche (sito ufficiale del club,
 * portali turistici istituzionali, directory di federazione). I numeri sono
 * quelli pubblicati volontariamente dai club per i piloti in visita: quando un
 * club non pubblica un recapito, il campo semplicemente non è presente.
 */

export interface ClubContatto {
  /** Chiave di match con i club citati nei dati decolli. */
  key: string;
  name: string;
  zona: string;
  tel?: string;
  /** Eventuale secondo recapito (referente / lingua straniera). */
  tel2?: string;
  tel2Label?: string;
  whatsapp?: string;
  email?: string;
  url?: string;
  /** Coordinate sede — usate per il "club più vicino" dei decolli senza club. */
  lat: number;
  lon: number;
  fonte: string;
}

export const CLUB_CONTATTI: ClubContatto[] = [
  {
    key: "paradelta",
    name: "Para Delta Club Cuneo",
    zona: "Cuneo e provincia (Piemonte)",
    tel: "+39 338 984 8624",
    whatsapp: "+39 389 503 0475",
    email: "staff.paradeltaclubcuneo@gmail.com",
    url: "https://www.paradeltaclubcuneo.it",
    lat: 44.3845,
    lon: 7.5423,
    fonte: "sito club · visitcuneese.it",
  },
  {
    key: "volauvent",
    name: "Vol au Vent — Val Pellice",
    zona: "Val Pellice / Torre Pellice (Piemonte)",
    tel: "+39 347 041 9442",
    email: "cinmar1987@gmail.com",
    url: "https://parapendiovolauvent.it",
    lat: 44.8239,
    lon: 7.2214,
    fonte: "parapendiovolauvent.it/contatti",
  },
  {
    key: "velum",
    name: "Circolo Parapendio Torino «Velum Volitans»",
    zona: "Val della Torre / Torino (Piemonte)",
    url: "https://www.facebook.com/p/Circolo-parapendio-Torino-Velum-Volitans-100051627879367",
    lat: 45.1139,
    lon: 7.4664,
    fonte: "pagina Facebook del circolo (nessun telefono pubblicato)",
  },
  {
    key: "vlse",
    name: "Volo Libero Santa Elisabetta (VLS E)",
    zona: "Canavese / Pont Canavese (Torino)",
    tel: "+39 347 242 4494",
    tel2: "+39 346 806 7361",
    tel2Label: "info in inglese (Ezio)",
    email: "vololibero.santaelisabetta@gmail.com",
    url: "https://www.vlse.it",
    lat: 45.3667,
    lon: 7.5333,
    fonte: "vlse.it · turismotorino.org",
  },
  {
    key: "cavallaria",
    name: "Parapendio Club Cavallaria",
    zona: "Brosso / Dora Baltea (Torino)",
    tel: "+39 328 379 9390",
    email: "parapendiocavallaria@gmail.com",
    url: "https://parapendiocavallaria.jimdofree.com",
    lat: 45.5167,
    lon: 7.7667,
    fonte: "canavese.com · pagina Facebook del club",
  },
  {
    key: "cornizzolo",
    name: "Aero Club Monte Cornizzolo",
    zona: "Valsassina / Suello (Lecco)",
    tel: "+39 339 504 1615",
    url: "https://www.cornizzolo.com",
    lat: 45.8317,
    lon: 9.3144,
    fonte: "scuola attiva dal 1991 · contatto navetta «Cornizzolo in volo»",
  },
  {
    key: "pollen",
    name: "Pollen Parapente",
    zona: "Vallouise / Pays des Écrins (Hautes-Alpes, FR)",
    tel: "+33 6 28 05 69 75",
    email: "contact@pollenparapente.com",
    url: "https://www.pollenparapente.com",
    lat: 44.8422,
    lon: 6.4892,
    fonte: "pollenparapente.com · paysdesecrins.com",
  },
];

/** Match permissivo: chiave del club citata nei dati → contatto del registro. */
export function clubContattoForName(name?: string): ClubContatto | undefined {
  if (!name) return undefined;
  const n = name.toLowerCase();
  return CLUB_CONTATTI.find((c) => {
    switch (c.key) {
      case "paradelta": return n.includes("paradelta");
      case "volauvent": return n.includes("volauvent") || n.includes("vol au vent");
      case "velum": return n.includes("velum");
      case "vlse": return n.includes("santa elisabetta") || n.includes("vlse");
      case "cavallaria": return n.includes("cavallaria");
      case "cornizzolo": return n.includes("cornizzolo");
      case "pollen": return n.includes("pollen");
      default: return false;
    }
  });
}

const R_TERRESTRE_KM = 6371;
function haversineKm(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLon = ((bLon - aLon) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R_TERRESTRE_KM * Math.asin(Math.sqrt(s));
}

/**
 * Club del registro più vicino al punto dato (usato quando il decollo non ha
 * un club di riferimento: utile per capire chi vola e gestisce la zona).
 */
export function clubPiuVicino(lat: number, lon: number): { club: ClubContatto; distKm: number } | undefined {
  let best: { club: ClubContatto; distKm: number } | undefined;
  for (const club of CLUB_CONTATTI) {
    const distKm = haversineKm(lat, lon, club.lat, club.lon);
    if (!best || distKm < best.distKm) best = { club, distKm };
  }
  return best;
}
