/**
 * TEST rotazione billboard Cesium — convenzione empirica.
 * Aggiunge una freccia gialla PUNTATA IN SU con rotation=-90° sopra il decollo,
 * camera top-down nord-up: se punta a DESTRA (E) la convenzione è antioraria
 * (rot = heading − azimut corretto); se punta a SINISTRA è oraria (va invertita).
 * Uso: node scripts/test-billboard-rot.cjs [url]
 */
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const OUT = "/home/z/my-project/shots-local";
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await chromium.launch({
    args: ["--use-gl=angle", "--enable-unsafe-swiftshader", "--disable-dev-shm-usage"],
  });
  const page = await browser.newPage({ viewport: { width: 800, height: 520 } });
  page.setDefaultTimeout(30000);
  await page.goto(process.argv[2] || "http://localhost:4173", { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.evaluate(() => document.getElementById("vista3d")?.scrollIntoView({ block: "center" }));
  await page.waitForFunction(() => !!(window).__c3dViewer, null, { timeout: 90000 });
  await page.waitForTimeout(5000);

  const site = await page.evaluate(() => {
    const C = (window).__c3dCesium;
    const v = (window).__c3dViewer;
    /* freccia di prova: canvas trasparente con freccia NERA PUNTATA IN SU */
    const c = document.createElement("canvas");
    c.width = 40;
    c.height = 80;
    const g = c.getContext("2d");
    g.fillStyle = "#000";
    g.fillRect(17, 26, 6, 50); // asta
    g.beginPath(); // punta in alto
    g.moveTo(20, 2);
    g.lineTo(4, 30);
    g.lineTo(36, 30);
    g.closePath();
    g.fill();
    /* quattro frecce: −90°, +90°, 0°, 180° attorno al centro */
    const mk = (rot, dLon, alt, tag) => {
      const bb = v.entities.add({
        position: C.Cartesian3.fromDegrees(dLon, lat0p, alt),
        billboard: { image: c, rotation: rot, scale: 1.6, disableDepthTestDistance: Number.POSITIVE_INFINITY },
      });
      void tag;
      return bb;
    };
    const lat0 = 44.25, lon0 = 7.3, alt = 5000; const lat0p = lat0;
    v.entities.add({ position: C.Cartesian3.fromDegrees(lon0, lat0, alt), point: { pixelSize: 8, color: C.Color.RED, disableDepthTestDistance: Number.POSITIVE_INFINITY } });
    mk(-Math.PI / 2, lon0 + 0.05, alt, "m90"); // atteso: punta a destra se CCW
    mk(Math.PI / 2, lon0 - 0.05, alt, "p90"); // atteso: punta a sinistra se CCW
    mk(0, lon0, alt, "zero"); // su
    void lat0;
    v.camera.setView({
      destination: C.Cartesian3.fromDegrees(lon0, lat0, alt + 19000),
      orientation: { heading: 0, pitch: -Math.PI / 2, roll: 0 },
    });
    return true;
  });
  await page.waitForTimeout(4000);
  const el = await page.$('[data-testid="cartina-3d"]');
  const box = await el.boundingBox();
  await page.screenshot({ path: path.join(OUT, "rot-test.png"), clip: box, timeout: 60000, animations: "disabled" });
  console.log("shot rot-test.png fatto — site:", site);
  await browser.close();
})().catch((e) => {
  console.error("❌", e);
  process.exit(1);
});
