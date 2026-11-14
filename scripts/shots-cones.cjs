// Screenshot mirato sui CONI TERMICI: legge __c3dCones, punta la camera sul
// primo stacco (istanze Cesium ricavate dal viewer, niente namespace globale)
// e scatta due screenshot a distanze diverse. Uso: node scripts/shots-cones.cjs [url]
const { chromium, devices } = require("playwright");
const URL = process.argv[2] || "http://localhost:4174/";
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices["iPhone 14"], locale: "it-IT" });
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.locator('button:has-text("Apri la mappa 3D")').first().waitFor({ state: "visible", timeout: 30000 });
  await page.locator('button:has-text("Apri la mappa 3D")').first().tap();
  await page.locator('[data-testid="cartina-3d"] canvas').first().waitFor({ state: "attached", timeout: 60000 });
  for (let i = 0; i < 50; i++) {
    await page.waitForTimeout(1000);
    const n = await page.evaluate(() => (window.__c3dWindFlow ? window.__c3dWindFlow.total : -1));
    if (n > 0) break;
  }
  await page.waitForTimeout(3000);
  // attendi che i trigger termici siano calcolati (pilot + stime)
  let cones = [];
  for (let i = 0; i < 90; i++) {
    cones = await page.evaluate(() => window.__c3dCones || []);
    if (cones.length > 0) break;
    await page.waitForTimeout(1000);
  }
  console.log("coni esposti:", cones.length, cones[0] ? `primo a ${cones[0].lat.toFixed(4)},${cones[0].lon.toFixed(4)} h=${Math.round(cones[0].h)} m` : "—");
  if (!cones.length) { await browser.close(); return; }
  await page.addStyleTag({ content: ".c3d-hud,.c3d-forecast,.c3d-legend,.c3d-toolbar,.c3d-credits{display:none!important}" });
  const c0 = cones[0];
  const shot = async (path) => {
    const box = await page.locator('[data-testid="cartina-3d"] canvas').first().boundingBox();
    if (!box) throw new Error("canvas non trovato");
    await page.screenshot({ path, clip: { x: box.x, y: box.y, width: Math.min(box.width, 900), height: Math.min(box.height, 900) } });
  };
  const lookAtCone = async (offsetLat, hAbove, pitchRad) => {
    await page.evaluate(({ lat, lon, h, offsetLat, hAbove, pitchRad }) => {
      const v = window.__c3dViewer;
      const Cartographic = Object.getPrototypeOf(v.camera.positionCartographic).constructor;
      const dest = v.scene.globe.ellipsoid.cartographicToCartesian(
        Cartographic.fromDegrees(lon, lat - offsetLat, h + hAbove),
      );
      v.camera.setView({ destination: dest, orientation: { heading: 0, pitch: pitchRad, roll: 0 } });
    }, { lat: c0.lat, lon: c0.lon, h: c0.h, offsetLat, hAbove, pitchRad });
  };
  await lookAtCone(0.02, 1400, -0.33);
  await page.waitForTimeout(3000);
  await shot("/tmp/render/cone-1.png");
  await lookAtCone(0.006, 450, -0.18);
  await page.waitForTimeout(3000);
  await shot("/tmp/render/cone-2.png");
  console.log("cone shots ok");
  await browser.close();
})().catch((e) => { console.error("FATAL:", e.message); process.exit(1); });
