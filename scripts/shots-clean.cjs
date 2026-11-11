// Screenshot PULITI della scena ridisegnata: overlay nascosti, ore 12 (sole
// pieno → brezze ambra + coni termici attivi), due livelli di zoom.
// Uso: node scripts/shots-clean.cjs [url]
const { chromium, devices } = require("playwright");
const URL = process.argv[2] || "http://localhost:4174/";
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices["iPhone 14"], locale: "it-IT" });
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 60000 });
  // ore 12: mezzogiorno — anabatica al sole e termiche allo stacco massimo
  const chip12 = page.locator('[data-testid="c3d-forecast"] button', { hasText: /^12/ }).first();
  await chip12.scrollIntoViewIfNeeded().catch(() => {});
  await chip12.tap({ timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(800);
  await page.locator('button:has-text("Apri la mappa 3D")').first().waitFor({ state: "visible", timeout: 30000 });
  await page.locator('button:has-text("Apri la mappa 3D")').first().tap();
  await page.locator('[data-testid="cartina-3d"] canvas').first().waitFor({ state: "attached", timeout: 60000 });
  for (let i = 0; i < 50; i++) {
    await page.waitForTimeout(1000);
    const n = await page.evaluate(() => (window.__c3dWindFlow ? window.__c3dWindFlow.total : -1));
    if (n > 0) break;
  }
  // nascondi TUTTI gli overlay UI per vedere la scena nuda
  await page.addStyleTag({ content: ".c3d-hud,.c3d-forecast,.c3d-legend,.c3d-toolbar,.c3d-credits{display:none!important}" });
  await page.waitForTimeout(6000);
  const shot = async (path) => {
    const box = await page.locator('[data-testid="cartina-3d"] canvas').first().boundingBox();
    if (!box) throw new Error("canvas non trovato");
    await page.screenshot({ path, clip: { x: box.x, y: box.y, width: Math.min(box.width, 900), height: Math.min(box.height, 900) } });
  };
  await shot("/tmp/render/clean-1.png");
  await page.evaluate(() => {
    const v = window.__c3dViewer;
    if (v) v.camera.zoomIn(v.camera.positionCartographic.height * 0.8);
  });
  await page.waitForTimeout(3500);
  await shot("/tmp/render/clean-2.png");
  console.log("clean shots ok");
  await browser.close();
})().catch((e) => { console.error("FATAL:", e.message); process.exit(1); });
