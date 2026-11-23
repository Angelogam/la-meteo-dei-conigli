// Render docs/locandine/locandina-premium.html -> public/locandine/locandina-premium-*.png|.jpg
// Revisione critica 23/11, punto 12: locandina premium 1080×1350 per WhatsApp.
//
// Uso:
//   node scripts/render-locandina-premium.cjs                     # dati live Open-Meteo per Montoso
//   node scripts/render-locandina-premium.cjs --sito X --lat .. --lon .. --quota ..
//   node scripts/render-locandina-premium.cjs --data dati.json    # dati già salvati
//
// Se Open-Meteo non risponde (quota/s rete) viene usato un set di dati
// DIMOSTRATIVI chiaramente marcato sulla locandina: mai dati inventati
// spacciati per veri.

const path = require("path");
const fs = require("fs");
const { chromium } = require("playwright");

const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "docs", "locandine", "locandina-premium.html");
const OUT = path.join(ROOT, "public", "locandine");
const DOWNLOAD = "/home/z/my-project/download";

function arg(nome, def) {
  const i = process.argv.indexOf("--" + nome);
  return i >= 0 ? process.argv[i + 1] : def;
}

const SITO = arg("sito", "Montoso");
const LAT = parseFloat(arg("lat", "44.5293"));
const LON = parseFloat(arg("lon", "7.2823"));
const QUOTA = parseInt(arg("quota", "1350"), 10);
const SLUG = arg("slug", "locandina-premium-" + SITO.toLowerCase().replace(/\s+/g, "-"));
const GIORNO = parseInt(arg("giorno", "0"), 10);
const DATA_FILE = arg("data", null);

const clamp = (v, min, max) => Math.min(Math.max(v, min), max);
const altDaPressione = (hpa) => Math.round(44330 * (1 - Math.pow(hpa / 1013.25, 0.1903)));
const dirLettera = (d) => ["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSO","SO","OSO","O","ONO","NO","NNO"][Math.round((((d % 360) + 360) % 360) / 22.5) % 16];

function calcola(h, quota) {
  // ore di volo 8-18 del giorno richiesto
  const ore = [];
  h.time.forEach((t, i) => {
    const d = new Date(t);
    const oggi = new Date();
    oggi.setDate(oggi.getDate() + GIORNO);
    if (d.toDateString() !== oggi.toDateString()) return;
    const oraH = d.getHours();
    if (oraH < 8 || oraH > 18) return;
    const temp = h.temperature_2m?.[i], dew = h.dew_point_2m?.[i];
    const spread = temp != null && dew != null ? temp - dew : null;
    const rateo = spread != null ? clamp(spread * 0.15 + (h.cape?.[i] > 0 ? h.cape[i] / 5000 : 0), 0.1, 3) : null;
    const w = h.wind_speed_10m?.[i], g = h.wind_gusts_10m?.[i], wd = h.wind_direction_10m?.[i];
    ore.push({
      ora: oraH,
      rateo,
      base: spread != null ? quota + Math.round(spread * 125) : null,
      vento: w, raffiche: g ?? w, dir: wd,
      scarto: g != null && w != null ? g - w : null,
      rainProb: h.precipitation_probability?.[i] ?? 0,
      rain: h.precipitation?.[i] ?? 0,
      code: h.weather_code?.[i],
      cloud: h.cloud_cover?.[i],
      cape: h.cape?.[i],
    });
  });
  if (!ore.length) throw new Error("nessuna ora utile nel dato");

  const conDato = ore.filter((o) => o.rateo != null);
  const ventoAvg = conDato.reduce((s, o) => s + (o.vento ?? 0), 0) / Math.max(1, conDato.filter((o) => o.vento != null).length);
  const gustMax = Math.max(...ore.map((o) => o.raffiche ?? 0));
  const scartoMax = Math.max(...ore.map((o) => o.scarto ?? 0));
  const rainProbMax = Math.max(...ore.map((o) => o.rainProb ?? 0));
  const rainMax = Math.max(...ore.map((o) => o.rain ?? 0));
  const cloudAvg = ore.reduce((s, o) => s + (o.cloud ?? 0), 0) / ore.length;
  const stormRisk = ore.some((o) => (o.code != null && [95, 96, 99].includes(o.code)) || (o.cape != null && o.cape > 1000));

  // voto (stessa famiglia di regole della card giorno dell'app)
  let score = 5;
  if (ventoAvg <= 8) score += 2; else if (ventoAvg <= 15) score += 1; else if (ventoAvg <= 25) score -= 1; else score -= 2;
  if (rainProbMax <= 30) score += 1; else if (rainProbMax > 60) score -= 2;
  if (cloudAvg <= 30) score += 1; else if (cloudAvg > 70) score -= 1;
  if (gustMax > 25) score -= 1;
  if (stormRisk) score -= 1;
  score = clamp(Math.round(score), 1, 10);
  const esito = score >= 7 ? "GO" : score >= 5 ? "ATTESA" : "NO-GO";
  const esitoLabel = esito === "GO" ? "SI VOLA" : esito === "ATTESA" ? "DA VALUTARE" : "NO";
  const volabile = clamp(Math.round(score * 9 + (rainProbMax < 40 ? 12 : 0)), 15, 95);
  const dirMedia = conDato.length ? Math.round(conDato.reduce((s, o) => s + (o.dir ?? 0), 0) / conDato.length) : null;

  // finestra: prima corsia di 2 ore consecutive senza veti (stessa regola del Pilot Brain)
  const libera = (o) => o.raffiche != null && ((o.raffiche ?? 0) <= 25 && (o.scarto ?? 0) <= 12 && (o.rainProb ?? 0) < 40 && ![95, 96, 99].includes(o.code ?? 0));
  let slot = null;
  for (let i = 0; i < ore.length - 1; i++) {
    if (libera(ore[i]) && libera(ore[i + 1])) {
      slot = `${String(ore[i].ora).padStart(2, "0")}:00 – ${String(ore[i + 1].ora + 1).padStart(2, "0")}:00`;
      break;
    }
  }
  const piccoPomeriggio = ore.filter((o) => o.ora >= 13 && o.ora <= 15);
  const piccoVietato = piccoPomeriggio.some((o) => (o.raffiche ?? 0) > 22 || (o.scarto ?? 0) > 10) ? "13:00–15:00" : null;

  // termiche
  const baseNubi = conDato.length ? Math.max(...conDato.map((o) => o.base ?? 0)) : null;
  const piccoRateo = conDato.length ? Math.max(...conDato.map((o) => o.rateo ?? 0)) : null;

  // cross (ABT-09): margine base nubi sopra la quota decollo
  const margine = baseNubi != null ? baseNubi - quota : null;
  const cross =
    margine == null ? { traversabile: null, testo: "DA VALUTARE", dettaglio: "base cumuli non stimabile" } :
    margine >= 300 ? { traversabile: true, testo: "SÌ, CON MARGINE", dettaglio: `Base cumuli ${baseNubi.toLocaleString("it-IT")} m vs decollo ${quota.toLocaleString("it-IT")} m · margine ${margine.toLocaleString("it-IT")} m sopra le selle` } :
    margine > 0 ? { traversabile: null, testo: "ANCORA NO · BASE BASSA", dettaglio: `Base cumuli ${baseNubi.toLocaleString("it-IT")} m: margine ${margine} m, sotto il minimo di 300 m sulle valiche` } :
    { traversabile: false, testo: "NO", dettaglio: `Base cumuli ${baseNubi.toLocaleString("it-IT")} m sotto la quota del decollo (${quota.toLocaleString("it-IT")} m)` };

  // avvisi
  const avvisi = [];
  if (gustMax > 25) avvisi.push({ tono: "critico", testo: `Raffiche fino a ${Math.round(gustMax)} km/h: oltre il limite di 25, finestra in chiusura.` });
  if (scartoMax > 12) avvisi.push({ tono: "critico", testo: `Scarto vento-raffica fino a ${Math.round(scartoMax)} km/h: impulsi a scatti.` });
  if (stormRisk) avvisi.push({ tono: "critico", testo: "Rischio temporali: guarda il radar prima di lanciarti e stacca presto." });
  else if (rainProbMax >= 45) avvisi.push({ tono: "attenzione", testo: `Pioggia possibile (${rainProbMax}%): tieni d'occhio il radar.` });
  if (ventoAvg > 20) avvisi.push({ tono: "attenzione", testo: `Vento medio ${Math.round(ventoAvg)} km/h: decollo esigente, verifica a terra.` });
  if (!avvisi.length) avvisi.push({ tono: "favorevole", testo: "Raffiche e scarto entro i limiti: nessun allarme." });

  // windgram dell'ora con l'ascendenza migliore
  const best = conDato.slice().sort((a, b) => (b.rateo ?? 0) - (a.rateo ?? 0))[0];
  const idxBest = h.time.findIndex((t) => new Date(t).getHours() === best.ora && new Date(t).toDateString() === new Date(h.time.find((x) => new Date(x).getHours() === best.ora)).toDateString());
  const livelli = [
    { quota: quota, kmh: best.vento ?? 0, dir: best.dir ?? 0 },
    { quota: quota + 80, kmh: h.wind_speed_80m?.[idxBest] ?? best.vento ?? 0, dir: h.wind_direction_80m?.[idxBest] ?? best.dir ?? 0 },
    { quota: altDaPressione(850), kmh: h.wind_speed_850hPa?.[idxBest] ?? null, dir: h.wind_direction_850hPa?.[idxBest] ?? null },
    { quota: altDaPressione(700), kmh: h.wind_speed_700hPa?.[idxBest] ?? null, dir: h.wind_direction_700hPa?.[idxBest] ?? null },
    { quota: altDaPressione(500), kmh: h.wind_speed_500hPa?.[idxBest] ?? null, dir: h.wind_direction_500hPa?.[idxBest] ?? null },
  ]
    .filter((l) => l.kmh != null && l.dir != null && Number.isFinite(l.kmh))
    .sort((a, b) => a.quota - b.quota);

  const dataOra = new Date();
  dataOra.setDate(dataOra.getDate() + GIORNO);
  const dataLabel = dataOra.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).replace(/^./, (c) => c.toUpperCase());

  return {
    sito: SITO, quota, dataLabel, demo: false,
    aggiornato: new Date().toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" }),
    voto: {
      score, esito, esitoLabel,
      riga: `Vento medio ${Math.round(ventoAvg)} km/h${dirMedia != null ? " da " + dirLettera(dirMedia) : ""} · raffiche fino a ${Math.round(gustMax)} km/h · ${cloudAvg > 60 ? "cielo coperto" : cloudAvg > 30 ? "nuvolosità media" : "cielo aperto"}`,
      volabile,
    },
    finestra: { slot, fase: slot ? "Finestra consigliata dalle previsioni del giorno" : "Nessuna corsia di 2 ore senza veti", vietato: piccoVietato },
    termiche: { ore: conDato.map((o) => ({ ora: o.ora, rateo: o.rateo ?? 0 })), base: baseNubi, picco: piccoRateo },
    cross, avvisi,
    windgram: livelli.length >= 2 ? { ora: best.ora, livelli } : null,
  };
}

function esempio() {
  // dati DIMOSTRATIVI realistici (marcati come tali sulla locandina)
  const ore = [];
  for (let ora = 8; ora <= 18; ora++) {
    const campana = Math.exp(-Math.pow(ora - 12.5, 2) / 9);
    ore.push({ ora, rateo: Math.round((0.4 + campana * 1.3) * 10) / 10 });
  }
  return {
    sito: SITO, quota: QUOTA, dataLabel: new Date().toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).replace(/^./, (c) => c.toUpperCase()),
    demo: true, aggiornato: new Date().toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" }),
    voto: { score: 6, esito: "ATTESA", esitoLabel: "DA VALUTARE", riga: "Vento medio 9 km/h da NO · raffiche fino a 21 km/h · nuvolosità media", volabile: 66 },
    finestra: { slot: "10:00 – 12:00", fase: "Esempio di finestra consigliata dal modello", vietato: "13:00–15:00" },
    termiche: { ore, base: 2350, picco: 1.7 },
    cross: { traversabile: true, testo: "SÌ, CON MARGINE", dettaglio: "Base cumuli 2.350 m vs decollo 1.350 m · margine 1.000 m sopra le selle" },
    avvisi: [
      { tono: "attenzione", testo: "Raffiche fino a 21 km/h col picco termico: verifica a terra prima di lanciarti." },
      { tono: "attenzione", testo: "Picco pomeridiano con impulsi: rientra entro le 13:00." },
    ],
    windgram: {
      ora: 12,
      livelli: [
        { quota: QUOTA, kmh: 9, dir: 315 },
        { quota: QUOTA + 80, kmh: 12, dir: 320 },
        { quota: altDaPressione(850), kmh: 18, dir: 330 },
        { quota: altDaPressione(700), kmh: 26, dir: 5 },
        { quota: altDaPressione(500), kmh: 38, dir: 10 },
      ],
    },
  };
}

(async () => {
  let data;
  if (DATA_FILE) {
    data = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
    data.demo = data.demo ?? false;
    console.log("dati da file:", DATA_FILE);
  } else {
    const url =
      "https://api.open-meteo.com/v1/forecast?latitude=" + LAT + "&longitude=" + LON +
      "&hourly=temperature_2m,dew_point_2m,wind_speed_10m,wind_gusts_10m,wind_direction_10m,wind_speed_80m,wind_direction_80m,wind_speed_850hPa,wind_direction_850hPa,wind_speed_700hPa,wind_direction_700hPa,wind_speed_500hPa,wind_direction_500hPa,cloud_cover,precipitation_probability,precipitation,weather_code,cape" +
      "&timezone=Europe%2FRome&forecast_days=" + (GIORNO + 1);
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const j = await res.json();
      if (j.error) throw new Error(j.reason || "errore Open-Meteo");
      data = calcola(j.hourly, QUOTA);
      console.log("dati live Open-Meteo ok");
    } catch (e) {
      console.log("Open-Meteo non disponibile (" + e.message + ") → uso dati DIMOSTRATIVI marcati");
      data = esempio();
    }
  }

  let html = fs.readFileSync(SRC, "utf8");
  html = html.replace("/*__DATA__*/null", JSON.stringify(data));
  const tmp = path.join(ROOT, "docs", "locandine", ".render-premium.tmp.html");
  fs.writeFileSync(tmp, html);

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1160, height: 1450 }, deviceScaleFactor: 1 });
  await page.goto("file://" + tmp, { waitUntil: "networkidle" });
  await page.evaluate(() => (document.fonts ? document.fonts.ready : true));
  await page.waitForTimeout(700);
  const poster = page.locator("#poster");
  const box = await poster.boundingBox();
  fs.mkdirSync(OUT, { recursive: true });
  const pngPath = path.join(OUT, SLUG + ".png");
  await page.screenshot({ path: pngPath, clip: { x: box.x, y: box.y, width: 1080, height: 1350 }, type: "png" });
  await browser.close();
  fs.unlinkSync(tmp);

  const sharp = require("sharp");
  const png = fs.readFileSync(pngPath);
  await sharp(png).jpeg({ quality: 90, mozjpeg: true }).toFile(path.join(OUT, SLUG + ".jpg"));

  fs.mkdirSync(DOWNLOAD, { recursive: true });
  fs.copyFileSync(pngPath, path.join(DOWNLOAD, SLUG + ".png"));
  fs.copyFileSync(path.join(OUT, SLUG + ".jpg"), path.join(DOWNLOAD, SLUG + ".jpg"));
  console.log("rendered:", SLUG, "→", pngPath, "(demo:", data.demo + ")");
})().catch((e) => { console.error(e); process.exit(1); });
