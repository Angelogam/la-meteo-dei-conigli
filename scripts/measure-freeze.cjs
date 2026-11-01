// Misura dei BLOCCHI del main thread sulla PRODUZIONE (throttle CPU).
// Uso: node scripts/measure-freeze.cjs [url] [throttle=4]
// Il log va in /tmp/measure.log (append sincrono: sopravvive ai kill).
const { chromium, devices } = require("playwright");
const fs = require("fs");

const URL = process.argv[2] || "https://la-meteo-dei-conigli.vercel.app/";
const RATE = Number(process.argv[3] || 4);
const LOG = "/tmp/measure.log";
const say = (m) => {
  fs.appendFileSync(LOG, m + "\n");
  console.log(m);
};

(async () => {
  fs.appendFileSync(LOG, `== PRODUZIONE · throttle ${RATE}x · iPhone 14 ==\n`);
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices["iPhone 14"], locale: "it-IT" });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: RATE });

  await page.addInitScript(() => {
    (window).__lt = [];
    try {
      new PerformanceObserver((l) => {
        for (const e of l.getEntries()) (window).__lt.push({ t: performance.now(), dur: Math.round(e.duration) });
      }).observe({ entryTypes: ["longtask"] });
    } catch {}
  });
  const lt = () => page.evaluate(() => (window).__lt || []);
  const summary = (list) => {
    const tot = list.reduce((a, b) => a + b.dur, 0);
    const worst = list.reduce((a, b) => Math.max(a, b.dur), 0);
    return `${list.length} longtask · tot ${Math.round(tot)} ms · worst ${Math.round(worst)} ms`;
  };
  const fps = (ms) =>
    page.evaluate(
      (ms) =>
        new Promise((res) => {
          let n = 0;
          const t0 = performance.now();
          const tick = () => {
            n++;
            if (performance.now() - t0 < ms) requestAnimationFrame(tick);
            else res(Math.round((n / ms) * 1000));
          };
          requestAnimationFrame(tick);
        }),
      ms,
    );

  const t0 = Date.now();
  await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(4000);
  say(`homepage: ${summary(await lt())}`);

  await page.evaluate(() => document.querySelector('[data-testid="cartina-3d"]')?.scrollIntoView({ block: "center" }));
  await page.waitForTimeout(2000);
  say(`scroll alla sezione 3D: ${summary(await lt())}`);

  const btn = page.locator('button:has-text("Apri la mappa 3D")').first();
  if (!(await btn.isVisible().catch(() => false))) {
    say("!! bottone «Apri la mappa 3D» NON visibile");
    await browser.close();
    return;
  }
  const tOpen = Date.now();
  await btn.tap();
  say("— tap «Apri la mappa 3D»");

  let tCanvas = null;
  for (let i = 0; i < 60; i++) {
    await page.waitForTimeout(500);
    if ((await page.locator('[data-testid="cartina-3d"] canvas').count()) > 0) {
      tCanvas = Date.now();
      break;
    }
  }
  say(`canvas 3D: ${tCanvas ? `creato in ${((tCanvas - tOpen) / 1000).toFixed(1)} s` : "MAI arrivato ✗"}`);

  for (let i = 0; i < 12; i++) {
    await page.waitForTimeout(1000);
    const n = await page.evaluate(() => (window.__c3dWindFlow ? window.__c3dWindFlow.total : -1));
    if (n > 0) {
      tFlow = Date.now();
      break;
    }
  }
  say(`flusso vento: ${tFlow ? `pronto in ${((tFlow - tOpen) / 1000).toFixed(1)} s` : "non rilevato entro 12 s"}`);

  const pAll = await lt();
  const fromOpen = pAll.filter((x) => x.t >= tOpen - t0 - 100);
  say(`caricamento 3D (dal tap): ${summary(fromOpen)}`);
  const top = [...fromOpen].sort((a, b) => b.dur - a.dur).slice(0, 6);
  say(`   peggiori: ${top.map((x) => `${x.dur}ms@${Math.round(x.t / 1000)}s`).join("  ")}`);

  say(`fps steady (2.5 s): ${await fps(2500)}`);
  const box = await page.locator('[data-testid="cartina-3d"] canvas').first().boundingBox().catch(() => null);
  if (box) {
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    for (let i = 0; i < 8; i++) {
      await page.mouse.move(box.x + box.width / 2 + i * 10, box.y + box.height / 2 + i * 5);
      await page.waitForTimeout(60);
    }
    await page.mouse.up();
  }
  say(`fps dopo drag (2.5 s): ${await fps(2500)}`);

  const mem = await page.evaluate(() =>
    performance.memory ? `${Math.round(performance.memory.usedJSHeapSize / 1048576)} MB` : "n/d",
  );
  say(`heap JS: ${mem}`);
  await page.screenshot({ path: "/tmp/render/measure-final.jpg", quality: 55, type: "jpeg" }).catch(() => {});
  await browser.close();
  say("FINE misurazione");
})().catch((e) => {
  say("FATAL: " + e.message);
  process.exit(1);
});
