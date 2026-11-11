// Screenshot del NUOVO FLUSSO BREZZA: attende __c3dWindFlow.total > 0, poi
// scatta 3 frame della vista default (2 s di distanza) per vedere il moto.
// Uso: node scripts/shots-flow.cjs [url]
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
  let total = -1;
  for (let i = 0; i < 60; i++) {
    await page.waitForTimeout(1000);
    total = await page.evaluate(() => (window.__c3dWindFlow ? window.__c3dWindFlow.total : -1));
    if (total > 0) break;
  }
  console.log("flusso pronto, billboards:", total, "darts:", await page.evaluate(() => window.__c3dWindFlow.darts));
  await page.waitForTimeout(2500);
  await page.addStyleTag({ content: ".c3d-hud,.c3d-forecast,.c3d-legend,.c3d-toolbar,.c3d-credits,.c3d-progress{display:none!important}" });
  const box = await page.locator('[data-testid="cartina-3d"] canvas').first().boundingBox();
  const clip = box ? { x: box.x, y: box.y, width: Math.min(box.width, 900), height: Math.min(box.height, 900) } : undefined;
  for (const k of [1, 2, 3]) {
    await page.screenshot({ path: `/tmp/flow-${k}.png`, clip });
    await page.waitForTimeout(2000);
  }
  console.log("3 screenshot salvati in /tmp/flow-*.png");
  await browser.close();
})().catch((e) => { console.error("FATAL:", e.message); process.exit(1); });
