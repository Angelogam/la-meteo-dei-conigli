// Probe rapido: dopo il tap, il main thread risponde? Quando arriva il flusso?
// Uso: node scripts/probe-alive.cjs [url] [throttle=4]
const { chromium, devices } = require("playwright");
const fs = require("fs");
const URL = process.argv[2] || "http://localhost:4173/";
const RATE = Number(process.argv[3] || 4);
const say = (m) => { fs.appendFileSync("/tmp/probe.log", m + "\n"); console.log(m); };

(async () => {
  fs.writeFileSync("/tmp/probe.log", `== PROBE ${URL} throttle ${RATE}x ==\n`);
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices["iPhone 14"], locale: "it-IT" });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: RATE });
  await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(4000);
  await page.evaluate(() => document.querySelector('[data-testid="cartina-3d"]')?.scrollIntoView({ block: "center" }));
  await page.waitForTimeout(1500);
  const t0 = Date.now();
  await page.locator('button:has-text("Apri la mappa 3D")').first().tap();
  say("— tap");

  await page.waitForSelector('[data-testid="cartina-3d"] canvas', { timeout: 60000 }).catch(() => {});
  say(`canvas: ${((Date.now() - t0) / 1000).toFixed(1)} s`);

  // ogni 10 s: il main thread risponde entro 6 s? e il flusso è arrivato?
  for (let i = 0; i < 18; i++) {
    await page.waitForTimeout(10000);
    const alive = await Promise.race([
      page.evaluate(() => ({
        tot: window.__c3dWindFlow ? window.__c3dWindFlow.total : -1,
      })).then((v) => ({ ok: true, v })),
      new Promise((r) => setTimeout(() => r({ ok: false }), 6000)),
    ]);
    const dt = ((Date.now() - t0) / 1000).toFixed(0);
    if (alive.ok) {
      say(`t+${dt}s: THREAD VIVO · flusso totale=${alive.v.tot}`);
      if (alive.v.tot > 0) break;
    } else {
      say(`t+${dt}s: THREAD BLOCCATO (evaluate >6 s)`);
    }
  }
  await browser.close();
  say("FINE probe");
})().catch((e) => { say("FATAL: " + e.message); process.exit(1); });
