/* Verifica caselle brezza: alla apertura 3D parte la richiesta bulk
   Open-Meteo (current=wind_*) e arriva una risposta valida. */
const { chromium, devices } = require("playwright");
const URL = process.argv[2] || "http://localhost:4174/";
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices["iPhone 14"], locale: "it-IT" });
  const page = await ctx.newPage();
  let breezeReq = 0, breezeOk = 0;
  page.on("response", async (r) => {
    const u = r.url();
    if (u.includes("api.open-meteo.com") && u.includes("current=wind_")) {
      breezeReq++;
      if (r.ok()) {
        try {
          const j = await r.json();
          const arr = Array.isArray(j) ? j : [j];
          if (arr.some((x) => x && x.current && Number.isFinite(Number(x.current.wind_speed_10m)))) breezeOk++;
        } catch { /* risposta non JSON */ }
      }
    }
  });
  await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.locator('button:has-text("Apri la mappa 3D")').first().waitFor({ state: "visible", timeout: 30000 });
  await page.locator('button:has-text("Apri la mappa 3D")').first().tap();
  for (let i = 0; i < 30; i++) {
    await page.waitForTimeout(1000);
    const flow = await page.evaluate(() => (window.__c3dWindFlow ? window.__c3dWindFlow.total : -1));
    if (flow > 0 && breezeReq > 0) break;
  }
  console.log("richieste breeze bulk:", breezeReq, "· risposte con vento valido:", breezeOk);
  console.log(breezeOk > 0 ? "CASELLE BREZZA: DATI OK ✓" : "CASELLE BREZZA: NESSUN DATO ✗");
  await browser.close();
  process.exit(breezeOk > 0 ? 0 : 1);
})().catch((e) => { console.error("FATAL:", e.message); process.exit(1); });
