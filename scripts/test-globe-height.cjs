/**
 * TEST RISOLUTIVO: il globe sta usando le heightmap del DEM?
 * Misura globe.getHeight() su 25 punti attorno al centro vista.
 * Se il terreno 3D funziona → quote ~1000-2000 m (Appennini/Alpi).
 * Se è l'ellissoide → 0 o undefined.
 * Uso: node scripts/test-globe-height.cjs [baseUrl]
 */
const { chromium } = require("playwright");
const fs = require("fs");

const BASE = process.argv[2] || "https://la-meteo-dei-conigli.vercel.app";
const T0 = Date.now();
const log = (s) => {
  try {
    fs.writeSync(1, `[${((Date.now() - T0) / 1000).toFixed(0)}s] ${s}\n`);
  } catch {}
};

(async () => {
  const browser = await chromium.launch({
    args: ["--use-gl=angle", "--enable-unsafe-swiftshader", "--disable-dev-shm-usage"],
  });
  const page = await browser.newPage({ viewport: { width: 1024, height: 640 } });
  page.setDefaultTimeout(45000);
  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.evaluate(() => document.getElementById("vista3d")?.scrollIntoView({ block: "center" }));
  await page.waitForFunction(() => !!(window).__c3dViewer, null, { timeout: 90000 });
  await page.waitForTimeout(20000); // SwiftShader: lascia lavorare il loader

  const out = await page.evaluate(() => {
    const v = window.__c3dViewer;
    const scene = v.scene;
    const cv = scene.canvas;
    // oggetto plain {x,y}: pickEllipsoid legge solo .x/.y
    const c3 = scene.camera.pickEllipsoid({ x: cv.clientWidth / 2, y: cv.clientHeight / 2 });
    if (!c3) return { err: "pickEllipsoid null" };
    const carto = scene.globe.ellipsoid.cartesianToCartographic(c3);
    const probe = [];
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const latR = carto.latitude + dx * 0.0004; // ~±220 m
        const lonR = carto.longitude + dy * 0.0004;
        const h = scene.globe.getHeight({ longitude: lonR, latitude: latR, height: 0 });
        probe.push(h == null ? null : Math.round(h));
      }
    }
    const maxH = Math.max(...probe.map((p) => p ?? 0));
    return {
      provName: v.terrainProvider?.constructor?.name,
      camH: Math.round(scene.camera.positionCartographic.height),
      camLat: +((carto.latitude * 180) / Math.PI).toFixed(4),
      camLon: +((carto.longitude * 180) / Math.PI).toFixed(4),
      heights: probe,
      maxH,
      exagger: scene.verticalExaggeration,
      maxSSE: scene.globe.maximumScreenSpaceError,
    };
  });
  log("RISULTATO: " + JSON.stringify(out, null, 1));

  await browser.close();
  const ok = out && !out.err && out.maxH > 300;
  log(ok ? "✅ TERRENO 3D ATTIVO (heightmap applicate)" : "❌ TERRENO PIATTO — il globe NON usa il DEM");
})().catch((e) => {
  console.error("ERRORE:", e);
  process.exit(1);
});
