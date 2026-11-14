// Profilo CPU del freeze: riproduce lo scenario e campiona il main thread
// durante il blocco. Il Profiler CDP campiona da thread separato → funziona
// anche col main thread inchiodato.
// Uso: node scripts/profile-freeze.cjs [url] [throttle=4]
const { chromium, devices } = require("playwright");
const fs = require("fs");

const URL = process.argv[2] || "https://la-meteo-dei-conigli.vercel.app/";
const RATE = Number(process.argv[3] || 4);
const LOG = "/tmp/profile.log";
const say = (m) => {
  fs.appendFileSync(LOG, m + "\n");
  console.log(m);
};

(async () => {
  fs.appendFileSync(LOG, `== PROFILI CPU · throttle ${RATE}x ==\n`);
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices["iPhone 14"], locale: "it-IT" });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: RATE });
  const errs = [];
  page.on("console", (m) => {
    const t = m.text();
    if (t.includes("[c3d]") || m.type() === "error") errs.push(t.slice(0, 160));
  });

  await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(4000);
  await page.evaluate(() => document.querySelector('[data-testid="cartina-3d"]')?.scrollIntoView({ block: "center" }));
  await page.waitForTimeout(1500);

  const btn = page.locator('button:has-text("Apri la mappa 3D")').first();
  await btn.tap();
  say("— tap «Apri la mappa 3D»");

  // aspetta il canvas (event-driven, senza poll)
  await page.waitForSelector('[data-testid="cartina-3d"] canvas', { timeout: 45000 }).catch(() => {});
  say("canvas presente");

  // lascia finire viewer+field (il freeze parte ~30-40 s dopo il tap a 4x)
  await page.waitForTimeout(10000);

  await cdp.send("Profiler.enable");
  await cdp.send("Profiler.setSamplingInterval", { interval: 4000 }); // 4 ms
  await cdp.send("Profiler.start");
  say("profilo ON per 60 s…");
  await page.waitForTimeout(60000);
  const { profile } = await cdp.send("Profiler.stop");
  fs.writeFileSync("/tmp/c3d-profile.cpuprofile", JSON.stringify(profile));
  say("profilo salvato");

  // top funzioni per self-time
  const byId = new Map(profile.nodes.map((n) => [n.id, n]));
  const self = new Map();
  for (const s of profile.samples) {
    const n = byId.get(s.nodeId);
    if (!n) continue;
    const key = `${n.callFrame.functionName || "(anon)"} @ ${(n.callFrame.url || "").split("/").pop()}:${n.callFrame.lineNumber + 1}`;
    self.set(key, (self.get(key) || 0) + 1);
  }
  const total = profile.samples.length || 1;
  say("— TOP 15 self-time —");
  [...self.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .forEach(([k, v]) => say(`  ${(100 * v / total).toFixed(1)}%  ${k}`));

  say(`console [c3d]/errori: ${errs.length ? "\n  " + errs.slice(0, 10).join("\n  ") : "0"}`);
  await browser.close();
  say("FINE profilo");
})().catch((e) => {
  say("FATAL: " + e.message);
  process.exit(1);
});
