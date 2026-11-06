/**
 * COPY-CESIUM — porta gli asset statici di CesiumJS (Workers, Assets, Widgets,
 * ThirdParty e il bundle principale Cesium.js) da node_modules a public/cesium/
 * servendoli come file statici.
 *
 * Perché così: con la pipeline Nitro/Vite i plugin di copia statica perdono i
 * file in build; public/ invece viene copiato sempre, in dev e in produzione.
 * La cartella è nella .gitignore (23 MB non finiscono nella repo): lo script
 * gira in postinstall, quindi Vercel/GitHub la ricreano a ogni deploy.
 *
 * ⚠️ Il bundle principale Cesium.js DEVE essere copiato: la riscrittura SPA
 * (vercel.json «/(.*) → /index.html») maschera i 404, quindi se manca
 * /cesium/Cesium.js il server risponde 200 con HTML — chi lo richiede si
 * trova «Unexpected token '<'» invece di JavaScript.
 *
 * Idempotente: se public/cesium è già completo (widgets.css + Cesium.js),
 * non fa nulla.
 */

const fs = require("fs");
const path = require("path");

const SRC = path.join(__dirname, "..", "node_modules", "cesium", "Build", "Cesium");
const DEST = path.join(__dirname, "..", "public", "cesium");
const DIRS = ["Assets", "ThirdParty", "Widgets", "Workers"];
/* il bundle UMD principale serve /cesium/Cesium.js (la lib ESM lazy-importata
   dal codice è quella di Vite; questo file esiste per compatibilità/debug e
   per chiunque cerchi il build classico sotto /cesium/) */
const FILES = ["Cesium.js"];

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const s = path.join(from, entry.name);
    const d = path.join(to, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

try {
  if (!fs.existsSync(SRC)) {
    console.warn("[copy-cesium] node_modules/cesium non trovato: salto");
    process.exit(0);
  }
  if (
    fs.existsSync(path.join(DEST, "Widgets", "widgets.css")) &&
    FILES.every((f) => fs.existsSync(path.join(DEST, f)))
  ) {
    process.exit(0); // già fatto
  }
  fs.rmSync(DEST, { recursive: true, force: true });
  for (const d of DIRS) {
    const from = path.join(SRC, d);
    if (fs.existsSync(from)) copyDir(from, path.join(DEST, d));
  }
  for (const f of FILES) {
    const from = path.join(SRC, f);
    if (fs.existsSync(from)) fs.copyFileSync(from, path.join(DEST, f));
  }
  console.log("[copy-cesium] asset CesiumJS copiati in public/cesium/");
} catch (e) {
  console.warn("[copy-cesium] copia non riuscita:", e && e.message);
}
