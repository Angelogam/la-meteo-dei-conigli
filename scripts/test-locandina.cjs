// Test visivo della locandina generata da PosterGenerator.ts
// Bundle con rolldown (vite 8) → pagina Chromium (server http su public/) → PNG + PDF
const path = require("path");
const fs = require("fs");
const { chromium } = require("playwright");

const ROOT = path.resolve(__dirname, "..");
const BUNDLE = "/tmp/locandina-bundle.js";
const PDF_BUNDLE = "/tmp/pdfgen-bundle.js";
const OUT_DIR = "/tmp/render";
fs.mkdirSync(OUT_DIR, { recursive: true });

const rolldownPath = path.join(ROOT, "node_modules/.pnpm/rolldown@1.2.11/node_modules/rolldown/dist/index.mjs");
// rolldown è ESM-only: import dinamico
async function bundle(entry, outfile, globalName) {
  const { build: rdBuild } = await import("file://" + rolldownPath);
  await rdBuild({
    input: entry,
    output: { file: outfile, format: "iife", name: globalName, sourcemap: false },
    platform: "browser",
    resolve: { extensions: [".ts", ".tsx", ".js", ".mjs"] },
  });
}

const HOURS = [];
for (let h = 9; h <= 18; h++) {
  const d = new Date();
  d.setHours(h, 0, 0, 0);
  const t = 8.2 + Math.sin(((h - 9) / 9) * Math.PI) * 4.6;
  HOURS.push({
    time: d,
    temperature: +(t).toFixed(1),
    feelsLike: +(t - 1).toFixed(1),
    humidity: 58 - Math.round(Math.sin(((h - 9) / 9) * Math.PI) * 12),
    dewPoint: 2.4,
    pressure: 1021.4,
    surfacePressure: 868.2,
    precipitation: 0,
    rain: 0,
    snowfall: 0,
    weatherCode: 0,
    cloudCover: 8 + Math.round(Math.sin(h / 2) * 6),
    cloudCoverLow: 2,
    cloudCoverMid: 4,
    cloudCoverHigh: 5,
    windSpeed: +(2.4 + Math.sin(((h - 9) / 9) * Math.PI) * 2.6).toFixed(1),
    windDir: 315,
    windGusts: Math.round(9 + Math.sin(((h - 9) / 9) * Math.PI) * 13),
    radiation: 120 + Math.round(Math.sin(((h - 9) / 9) * Math.PI) * 620),
    directRadiation: 300,
    uvIndex: +(Math.sin(((h - 9) / 9) * Math.PI) * 3.6).toFixed(1),
    visibility: 32000,
    vapourPressureDeficit: 3.2,
    isDay: h >= 7 && h <= 19,
    freezingLevel: 3300 + Math.round(Math.sin(h / 3) * 90),
    sunshineDuration: 3000,
    mixingRatio: 4.1,
    virtualTemp: t + 0.2,
    windProfile: [],
    temp80m: t - 0.4,
    temp120m: t - 0.7,
    temperature180m: t - 1.0,
    windSpeed80m: +(4.2 + Math.sin(((h - 9) / 9) * Math.PI) * 3.4).toFixed(1),
    windDir80m: 318,
    windSpeed120m: +(5.4 + Math.sin(((h - 9) / 9) * Math.PI) * 4.2).toFixed(1),
    windDir120m: 320,
    windSpeed180m: +(6.8 + Math.sin(((h - 9) / 9) * Math.PI) * 5.2).toFixed(1),
    windDir180m: 322,
    precipitationProbability: 0,
    cape: 4 + Math.round(Math.sin(h / 3) * 3),
    liftedIndex: 4.7,
  });
}

const MOCK_CURRENT = {
  temperature: 11.2, humidity: 52, dewPoint: 2.6, windSpeed: 4.8, windDir: 315,
  windGusts: 14, cloudCover: 10, pressure: 1021.4, cape: 6, liftedIndex: 4.7,
  visibility: 32000, uvIndex: 3.1, precipitation: 0, weatherCode: 0,
};

const MOCK_DAILY = [{
  tempMax: 18.6, temperatureMax: 18.6, tempMin: 6.8,
  sunrise: (() => { const d = new Date(); d.setHours(7, 29, 0, 0); return d.toISOString(); })(),
  sunset: (() => { const d = new Date(); d.setHours(18, 53, 0, 0); return d.toISOString(); })(),
  uvIndexMax: 4.1,
}];

const INPUT = {
  siteName: "Montoso – Rucas",
  province: "CN",
  date: new Date(),
  elevation: 1500,
  current: MOCK_CURRENT,
  hourly: HOURS,
  daily: MOCK_DAILY[0],
  report:
    "Condizione molto tranquilla e sicura. Le termiche saranno presenti ma poco efficaci e consentiranno solo modesti guadagni di quota. Giornata ideale per scuola, voli locali, allenamento e perfezionamento del pilotaggio. Non adatta a cross o voli di distanza.",
  probabilities: { flyable: 78, thermal: 55, wind: 70, rain: 6, storm: 8 },
  analisiReport: {
    quadroTermico:
      "Il quadro termico mostra un riscaldamento regolare dalle prime ore del mattino, con gradienti vicini all'adiabatica secca tra collina e quota: ascendenze organizzate ma non violente, base dei cumuli attorno ai 2500 m e moderati guadagni previsti fino a metà pomeriggio.",
    ventoQuota:
      "In quota il vento resta del settore nord-ovest con intensità crescente tra 2000 e 3000 m, senza gradini di scudo marcati: possibili derive importanti sui crinali esposti e brezza di valle che ruota nel pomeriggio.",
    strategia:
      "Conviene decollare nella finestra centrale, sfruttando i trigger dei versanti soleggiati e tenendosi pronti a gestire l'aumento del vento in quota dopo le 14: meglio pianificare traiettorie corte verso le creste vicine, con atterraggi alternativi sempre in vista.",
    giudizioFinale:
      "Giornata volabile con margini di sicurezza adeguati: adatta a voli locali e allenamento, senza ambizioni di cross data la moderata energia disponibile.",
    segnaliPericolo:
      "Nessun segnale temporalesco rilevante; da monitorare il rafforzamento del vento in quota e le raffiche da cumuli nelle ore più calde.",
  },
};

(async () => {
  await bundle(path.join(ROOT, "src/utils/PosterGenerator.ts"), BUNDLE, "LocandinaGen");
  await bundle(path.join(ROOT, "src/utils/PdfGenerator.ts"), PDF_BUNDLE, "PdfGen");

  const http = require("http");
  const serveRoot = path.join(ROOT, "public");
  const mime = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".woff2": "font/woff2", ".html": "text/html" };
  const server = http.createServer((req, res) => {
    const p = path.join(serveRoot, decodeURIComponent(req.url.split("?")[0]));
    fs.readFile(p, (err, data) => {
      if (err) { res.writeHead(404); res.end("nf"); return; }
      res.writeHead(200, { "Content-Type": mime[path.extname(p)] || "application/octet-stream" });
      res.end(data);
    });
  });
  await new Promise((r) => server.listen(8899, r));

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  page.on("console", (m) => { if (m.type() === "error") console.log("[console]", m.text().slice(0, 300)); });
  page.on("pageerror", (e) => console.log("[pageerror]", String(e).slice(0, 300)));
  await page.goto("http://localhost:8899/", { waitUntil: "load" });
  await page.addScriptTag({ path: BUNDLE });
  await page.addScriptTag({ path: PDF_BUNDLE });

  const result = await page.evaluate(async (input) => {
    const toB64 = async (blob) => {
      const buf = await blob.arrayBuffer();
      let bin = "";
      const u8 = new Uint8Array(buf);
      for (let i = 0; i < u8.length; i += 0x8000) bin += String.fromCharCode(...u8.subarray(i, i + 0x8000));
      return btoa(bin);
    };
    const { blob, width, height } = (await LocandinaGen.generateLocandinaRender(input, "png", 1080));
    const pngB64 = await toB64(blob);
    const jpgFronte = await LocandinaGen.generateLocandinaRender(input, "jpg", 2160);
    const pages = await LocandinaGen.generateLocandinaPages(input, 2160);
    const retroB64 = await toB64(pages.informazioni);
    const pdf = await PdfGen.jpegsToPdfBlob([jpgFronte.blob, pages.informazioni], 595.28);
    const pdfB64 = await toB64(pdf);
    return { pngB64, retroB64, width, height, jpgKB: Math.round(jpgFronte.blob.size / 1024), retroKB: Math.round(pages.informazioni.size / 1024), pdfKB: Math.round(pdf.size / 1024), pdfB64 };
  }, INPUT);

  fs.writeFileSync(path.join(OUT_DIR, "app-locandina.png"), Buffer.from(result.pngB64, "base64"));
  fs.writeFileSync(path.join(OUT_DIR, "app-locandina-retro.png"), Buffer.from(result.retroB64, "base64"));
  fs.writeFileSync(path.join(OUT_DIR, "app-locandina.pdf"), Buffer.from(result.pdfB64, "base64"));
  console.log("PNG:", result.width, "x", result.height, "| JPG fronte:", result.jpgKB, "KB | JPG retro:", result.retroKB, "KB | PDF:", result.pdfKB, "KB");

  // also verify the WhatsApp share capability detection paths exist
  const shareInfo = await page.evaluate(() => ({
    hasShare: typeof navigator.share === "function",
    hasCanShare: typeof navigator.canShare === "function",
  }));
  console.log("share:", JSON.stringify(shareInfo));

  await browser.close();
  server.close();
})().catch((e) => { console.error(e); process.exit(1); });
