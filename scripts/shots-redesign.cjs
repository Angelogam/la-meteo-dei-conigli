// Screenshot della scena 3D ridisegnata: flusso sinuoso, coni fumo grigio,
// pin rossi. 3 frame: vista d'insieme, zoom sul decollo (coni visibili?),
// vista ravvicinata sui pin. Uso: node scripts/shots-redesign.cjs [url]
const { chromium, devices } = require("playwright");
const URL = process.argv[2] || "http://localhost:4174/";
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices["iPhone 14"], locale: "it-IT" });
  const page = await ctx.newPage();
  const errs = [];
  page.on("pageerror", (e) => errs.push(String(e).slice(0, 140)));
  await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.locator('button:has-text("Apri la mappa 3D")').first().waitFor({ state: "visible", timeout: 30000 });
  await page.locator('button:has-text("Apri la mappa 3D")').first().tap();
  await page.locator('[data-testid="cartina-3d"] canvas').first().waitFor({ state: "attached", timeout: 60000 });
  // attesa flusso pronto
  for (let i = 0; i < 50; i++) {
    await page.waitForTimeout(1000);
    const n = await page.evaluate(() => (window.__c3dWindFlow ? window.__c3dWindFlow.total : -1));
    if (n > 0) break;
  }
  await page.waitForTimeout(4000);
  const shot = async (path) => {
    const box = await page.locator('[data-testid="cartina-3d"] canvas').first().boundingBox();
    if (!box) throw new Error("canvas non trovato");
    await page.screenshot({ path, clip: { x: box.x, y: box.y, width: Math.min(box.width, 900), height: Math.min(box.height, 900) } });
  };
  await shot("/tmp/render/c3d-1-overview.png");
  // zoom verso il decollo via camera esposta per i test (__c3dViewer)
  await page.evaluate(() => {
    const v = window.__c3dViewer;
    if (v) v.camera.zoomIn(v.camera.positionCartographic.height * 0.75);
  });
  await page.waitForTimeout(2500);
  await shot("/tmp/render/c3d-2-zoom.png");
  await page.evaluate(() => {
    const v = window.__c3dViewer;
    if (v) v.camera.zoomIn(v.camera.positionCartographic.height * 0.7);
  });
  await page.waitForTimeout(2500);
  await shot("/tmp/render/c3d-3-close.png");
  console.log("screenshots: 3 · errori JS:", errs.length ? errs.slice(0, 4).join(" | ") : "0");
  await browser.close();
})().catch((e) => { console.error("FATAL:", e.message); process.exit(1); });
