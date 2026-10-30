/**
 * VERIFICA FOCUSED v6b — primi piani: (1) orientamento delle frecce dal vero
 * (top-down nord-up sopra il decollo), (2) primo piano del cono termico rifatto
 * (texture a gradiente + eliche + anello). Uso: node scripts/verify-3d-v6b.cjs [url]
 */
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const BASE = process.argv[2] || "http://localhost:4173";
const OUT = "/home/z/my-project/shots-local";
fs.mkdirSync(OUT, { recursive: true });
const T0 = Date.now();
const log = (s) => {
  try {
    fs.writeSync(1, `[${((Date.now() - T0) / 1000).toFixed(0)}s] ${s}\n`);
  } catch {
    /* ignore */
  }
};

(async () => {
  const browser = await chromium.launch({
    args: ["--use-gl=angle", "--enable-unsafe-swiftshader", "--disable-dev-shm-usage"],
  });
  const page = await browser.newPage({ viewport: { width: 900, height: 560 } });
  page.setDefaultTimeout(30000);
  const errs = [];
  page.on("pageerror", (e) => errs.push(String(e).slice(0, 160)));

  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.evaluate(() => document.getElementById("vista3d")?.scrollIntoView({ block: "center" }));
  await page.waitForFunction(() => !!(window).__c3dViewer, null, { timeout: 90000 });
  await page.waitForTimeout(8000);
  await page.evaluate(() => {
    const b = document.querySelector('[data-testid="c3d-slot-12"]');
    b?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
  });
  await page.waitForTimeout(5000);

  const site = await page.evaluate(() => {
    const v = (window).__c3dViewer;
    const c = v.camera.positionCartographic;
    return { lat: (c.latitude * 180) / Math.PI, lon: (c.longitude * 180) / Math.PI };
  });

  const shot = async (name) => {
    try {
      const el = await page.$('[data-testid="cartina-3d"]');
      const box = await el.boundingBox();
      await page.screenshot({ path: path.join(OUT, name), clip: box, timeout: 60000, animations: "disabled" });
      log("    shot: " + name);
    } catch (e) {
      log("    shot FALLITO: " + name + " — " + String(e).slice(0, 90));
    }
  };

  /* [1] TOP-DOWN nord-up sopra il decollo: confronto visivo direzione frecce vs etichetta */
  await page.evaluate(({ lat, lon }) => {
    const Cesium = (window).__c3dCesium;
    (window).__c3dViewer.camera.setView({
      destination: Cesium.Cartesian3.fromDegrees(lon, lat, 12500),
      orientation: { heading: 0, pitch: -Math.PI / 2, roll: 0 },
    });
  }, site);
  await page.waitForTimeout(3000);
  const dirLabel = await page.$eval('[data-testid="c3d-hud-wind"]', (e) => e.textContent).catch(() => "");
  log("[1] HUD quota (sopra il decollo): " + dirLabel.trim());
  await shot("v6b-topdown-center.png");

  /* [2] primo piano del cono più forte: camera bassa e vicina, guarda il cono */
  const cone = await page.evaluate(() => {
    const cs = (window).__c3dCones ?? [];
    return cs.length ? cs.reduce((a, b) => (b.strength > a.strength ? b : a)) : null;
  });
  log("[2] cono più forte: " + JSON.stringify(cone));
  if (cone) {
    const dLat = 0.011; // ~1.2 km a sud, guarda a nord verso il cono
    await page.evaluate(({ cone, dLat }) => {
      const Cesium = (window).__c3dCesium;
      (window).__c3dViewer.camera.setView({
        destination: Cesium.Cartesian3.fromDegrees(cone.lon, cone.lat - dLat, cone.h + 950),
        orientation: { heading: 0, pitch: -12 * Math.PI / 180, roll: 0 },
      });
    }, { cone, dLat });
    await page.waitForTimeout(3000);
    await shot("v6b-cone-close.png");

    /* [3] il cono dall'alto: il gradiente base→cima si legge? */
    await page.evaluate(({ cone }) => {
      const Cesium = (window).__c3dCesium;
      (window).__c3dViewer.camera.setView({
        destination: Cesium.Cartesian3.fromDegrees(cone.lon, cone.lat - 0.004, cone.h + 2600),
        orientation: { heading: 0, pitch: -55 * Math.PI / 180, roll: 0 },
      });
    }, { cone });
    await page.waitForTimeout(3000);
    await shot("v6b-cone-mid.png");
  }

  await browser.close();
  log(`pageerror: ${errs.length}` + (errs.length ? " :: " + errs.slice(0, 3).join(" | ") : ""));
  log("✅ v6b FATTO (verifica visiva manuale degli shot)");
})().catch((e) => {
  console.error("❌ ERRORE:", e);
  process.exit(1);
});
