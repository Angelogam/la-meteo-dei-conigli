// Smoke locale: tap «Apri la mappa 3D» → canvas → pill «calcolo brezze…»
// visibile nel buco di init e SPARITA quando il flusso è pronto (0 errori JS).
// Uso: node scripts/smoke-local-windpill.cjs [url]
const { chromium, devices } = require("playwright");
const URL = process.argv[2] || "http://localhost:4174/";
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices["iPhone 14"], locale: "it-IT" });
  const page = await ctx.newPage();
  const errs = [];
  page.on("pageerror", (e) => errs.push("PAGEERROR: " + String(e).slice(0, 160)));
  page.on("console", (m) => { if (m.type() === "error") errs.push("console: " + m.text().slice(0, 140)); });
  await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.locator('button:has-text("Apri la mappa 3D")').first().waitFor({ state: "visible", timeout: 30000 });
  await page.locator('button:has-text("Apri la mappa 3D")').first().tap();
  await page.locator('[data-testid="cartina-3d"] canvas').first().waitFor({ state: "attached", timeout: 60000 });
  // finestra init: la pill deve comparire entro 20 s (almeno una volta)
  let pillSeen = false, pillGone = false, flow = 0;
  for (let i = 0; i < 60; i++) {
    await page.waitForTimeout(1000);
    const pill = await page.locator('[data-testid="c3d-wind-busy"]').count();
    if (pill > 0) pillSeen = true;
    flow = await page.evaluate(() => (window.__c3dWindFlow ? window.__c3dWindFlow.total : -1));
    if (pill > 0) continue; // finché lavora resta
    if (flow > 0 || i > 40) { pillGone = pill === 0; break; }
  }
  console.log("pill «calcolo brezze» vista:", pillSeen, "· sparita col flusso pronto (total=" + flow + "):", pillGone);
  const chiudi = await page.locator('button:has-text("Chiudi")').count();
  console.log("tasto «Chiudi»:", chiudi > 0 ? "presente" : "MANCANTE ✗");
  console.log("errori JS:", errs.length ? "\n  " + errs.slice(0, 6).join("\n  ") : "0");
  await browser.close();
  process.exit(errs.length ? 1 : 0);
})().catch((e) => { console.error("FATAL:", e.message); process.exit(1); });
