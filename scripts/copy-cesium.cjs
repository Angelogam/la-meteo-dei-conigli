/**
 * COPY-CESIUM — porta gli asset statici di CesiumJS (Workers, Assets, Widgets,
 * ThirdParty) da node_modules a public/cesium/ servendoli come file statici.
 *
 * Perché così: con la pipeline Nitro/Vite i plugin di copia statica perdono i
 * file in build; public/ invece viene copiato sempre, in dev e in produzione.
 * La cartella è nella .gitignore (23 MB non finiscono nella repo): lo script
 * gira in postinstall, quindi Vercel/GitHub la ricreano a ogni deploy.
 *
 * Idempotente: se public/cesium esiste già, non fa nulla.
 */

const fs = require("fs");
const path = require("path");

const SRC = path.join(__dirname, "..", "node_modules", "cesium", "Build", "Cesium");
const DEST = path.join(__dirname, "..", "public", "cesium");
const DIRS = ["Assets", "ThirdParty", "Widgets", "Workers"];

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
  if (fs.existsSync(path.join(DEST, "Widgets", "widgets.css"))) {
    process.exit(0); // già fatto
  }
  fs.rmSync(DEST, { recursive: true, force: true });
  for (const d of DIRS) {
    const from = path.join(SRC, d);
    if (fs.existsSync(from)) copyDir(from, path.join(DEST, d));
  }
  console.log("[copy-cesium] asset CesiumJS copiati in public/cesium/");
} catch (e) {
  console.warn("[copy-cesium] copia non riuscita:", e && e.message);
}
