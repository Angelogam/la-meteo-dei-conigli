// Profilo CPU del freeze via TRACING (il tracer gira nel browser process e
// sopravvive al blocco del main thread, a differenza di Profiler.*).
// Categoria "disabled-by-default-v8.cpu_profiler" → sample per funzione.
// Uso: node scripts/trace-freeze.cjs [url] [throttle=4]
const { chromium, devices } = require("playwright");
const fs = require("fs");

const URL = process.argv[2] || "https://la-meteo-dei-conigli.vercel.app/";
const RATE = Number(process.argv[3] || 4);
const LOG = "/tmp/trace.log";
const say = (m) => {
  fs.appendFileSync(LOG, m + "\n");
  console.log(m);
};

(async () => {
  fs.appendFileSync(LOG, `== TRACE · throttle ${RATE}x ==\n`);
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices["iPhone 14"], locale: "it-IT" });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: RATE });

  await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(4000);
  await page.evaluate(() => document.querySelector('[data-testid="cartina-3d"]')?.scrollIntoView({ block: "center" }));
  await page.waitForTimeout(1500);

  await page.locator('button:has-text("Apri la mappa 3D")').first().tap();
  say("— tap «Apri la mappa 3D»");

  await page.waitForSelector('[data-testid="cartina-3d"] canvas', { timeout: 60000 }).catch(() => {});
  say("canvas presente");

  // tracing ON (non bloccante: il main thread potrebbe già essere carico)
  const chunks = [];
  let done = false;
  cdp.on("Tracing.dataCollected", (e) => {
    if (e.value && e.value.length) chunks.push(...e.value);
  });
  cdp.on("Tracing.tracingComplete", () => {
    done = true;
  });
  await Promise.race([
    cdp.send("Tracing.start", {
      categories: "disabled-by-default-v8.cpu_profiler,devtools.timeline,v8.execute",
      options: "sampling-frequency=1000",
    }),
    new Promise((r) => setTimeout(r, 5000)),
  ]);
  say("trace ON 100 s…");
  await page.waitForTimeout(100000);
  cdp.send("Tracing.end").catch(() => {});
  for (let i = 0; i < 30 && !done; i++) await page.waitForTimeout(1000);
  say(`trace chiuso: ${chunks.length} eventi`);

  // ricostruisci i profili (uno per thread) dai ProfileChunk
  const prof = new Map(); // threadId -> {nodes byId, samples[], deltas[]}
  for (const ev of chunks) {
    if (ev.name !== "ProfileChunk" && ev.name !== "Profile") continue;
    const tid = ev.tid ?? 0;
    const p = prof.get(tid) ?? { nodes: new Map(), samples: [], deltas: [] };
    const d = ev.args?.data?.cpuProfile;
    if (d) {
      for (const n of d.nodes || []) p.nodes.set(n.id, n);
      if (d.samples) p.samples.push(...d.samples);
      if (ev.args.data.timeDeltas) p.deltas.push(...ev.args.data.timeDeltas);
    }
    prof.set(tid, p);
  }

  for (const [tid, p] of prof) {
    const total = p.samples.length;
    if (!total) continue;
    const self = new Map();
    for (const s of p.samples) {
      const n = p.nodes.get(s);
      if (!n) continue;
      const f = n.callFrame;
      const key = `${f.functionName || "(anon)"} @ ${(f.url || "").split("/").pop()}:${f.lineNumber + 1}`;
      self.set(key, (self.get(key) || 0) + 1);
    }
    say(`— thread ${tid}: ${total} campioni — TOP 12 self-time —`);
    [...self.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .forEach(([k, v]) => say(`  ${((100 * v) / total).toFixed(1)}%  ${k}`));
  }
  fs.writeFileSync("/tmp/c3d-trace.json", JSON.stringify(chunks));
  await browser.close();
  say("FINE trace");
})().catch((e) => {
  say("FATAL: " + e.message);
  process.exit(1);
});
