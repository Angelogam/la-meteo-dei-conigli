// Verifica visiva del flusso BREZZA in ORARIO DIURNO: clicca la fascia oraria
// 13:00 nella HourlyTable (fonte di selectedHour per Cartina3D), attende il
// rebuild del flusso e scatta 2 screenshot a 2,5 s.
// Uso: node scripts/shots-flow-day.cjs [url]
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
  for (let i = 0; i < 60; i++) {
    await page.waitForTimeout(1000);
    const n = await page.evaluate(() => (window.__c3dWindFlow ? window.__c3dWindFlow.total : -1));
    if (n > 0) break;
  }
  // clic sulla fascia oraria 13:00 (la tabella resta nel DOM anche con la mappa aperta)
  await page.locator('button[aria-label^="13:00"]').first().evaluate((el) => el.click());
  // attendi il rebuild del flusso (total torna > 0 e il sole è alto)
  let sun = null;
  for (let i = 0; i < 40; i++) {
    await page.waitForTimeout(1000);
    const n = await page.evaluate(() => (window.__c3dWindFlow ? window.__c3dWindFlow.total : -1));
    sun = await page.evaluate(() => (window.__c3dWindFlow ? window.__c3dWindFlow.sun : null));
    if (n > 0 && sun && sun.alt > 5) { console.log("flusso rebuild: billboards", n, "sole:", JSON.stringify(sun)); break; }
  }
  if (!sun || sun.alt <= 5) console.log("ATTENZIONE: sole ancora basso:", JSON.stringify(sun));
  await page.waitForTimeout(2500);
  await page.addStyleTag({ content: ".c3d-hud,.c3d-forecast,.c3d-legend,.c3d-toolbar,.c3d-credits,.c3d-progress{display:none!important}" });
  const box = await page.locator('[data-testid="cartina-3d"] canvas').first().boundingBox();
  const clip = box ? { x: box.x, y: box.y, width: Math.min(box.width, 900), height: Math.min(box.height, 900) } : undefined;
  await page.screenshot({ path: "/tmp/flowday-1.png", clip });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: "/tmp/flowday-2.png", clip });
  console.log("screenshot diurni salvati");
  await browser.close();
})().catch((e) => { console.error("FATAL:", e.message); process.exit(1); });
