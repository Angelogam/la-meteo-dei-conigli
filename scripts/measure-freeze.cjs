/**
 * MEASURE-FREEZE — riproduce un telefono di fascia bassa: iPhone 14 emulato
 * + CPU throttle 4x via CDP. Misura i long task (>100 ms = jank percepito)
 * in tre scenari: homepage a riposo, windgram in vista, arrivo fermo sulla
 * sezione 3D (arm + parse Cesium + viewer + entità) e fps dopo il ready.
 *
 * Uso: node scripts/measure-freeze.cjs [url] [throttle]
 */
const { chromium, devices } = require("playwright");

const URL = process.argv[2] || "https://la-meteo-dei-conigli.vercel.app";
const RATE = Number(process.argv[3] || 4);

const snapLT = () => ({
  n: window.__lt.filter((e) => e.dur > 100).length,
  tot: window.__lt.reduce((a, e) => a + e.dur, 0),
  worst: window.__lt.reduce((a, e) => Math.max(a, e.dur), 0),
});

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices["iPhone 14"], locale: "it-IT" });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: RATE });
  await page.addInitScript(() => {
    window.__lt = [];
    try {
      new PerformanceObserver((l) => {
        for (const e of l.getEntries()) window.__lt.push({ t: Math.round(e.startTime), dur: Math.round(e.duration) });
      }).observe({ entryTypes: ["longtask"] });
    } catch {}
  });

  const out = { url: URL, rate: RATE };

  // 1) homepage a riposo (10 s)
  const t0 = Date.now();
  await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForTimeout(6000);
  out.homepage = await page.evaluate(snapLT);
  out.homepage.loadMs = Date.now() - t0;

  // 2) windgram in vista (6 s)
  await page.evaluate(() => {
    const el = document.getElementById("windgram-section");
    if (el) el.scrollIntoView({ behavior: "instant", block: "start" });
  });
  await page.waitForTimeout(4000);
  out.windgram = await page.evaluate(snapLT);

  // 3) sezione 3D: arrivo FERMO e attesa ready (finché canvas non cresce o 30 s)
  const t3 = Date.now();
  await page.evaluate(() => {
    const el = document.querySelector('[data-testid="cartina-3d"]');
    if (el) el.scrollIntoView({ behavior: "instant", block: "center" });
  });
  for (let i = 0; i < 60; i++) {
    await page.waitForTimeout(500);
    const ok = await page.evaluate(() => {
      const c = document.querySelector('[data-testid="cartina-3d"] canvas');
      return !!(c && c.width > 100 && !document.querySelector('[data-testid="c3d-loading"]'));
    });
    if (ok) break;
  }
  out.arm3d = await page.evaluate(snapLT);
  out.arm3d.readyMs = Date.now() - t3;
  out.arm3d.canvas = await page.evaluate(() => {
    const c = document.querySelector('[data-testid="cartina-3d"] canvas');
    return c ? `${c.width}x${c.height}` : "NO";
  });

  // 4) fps su 5 s a scena ferma
  out.fps = await page.evaluate(
    () =>
      new Promise((res) => {
        let n = 0;
        const s = performance.now();
        const loop = () => {
          n++;
          if (performance.now() - s < 5000) requestAnimationFrame(loop);
          else res(Math.round((n / 5) * 10) / 10);
        };
        requestAnimationFrame(loop);
      })
  );

  // 5) interazione: zoom/pan sulla scena e fps durante (5 s)
  const box = await page.evaluate(() => {
    const c = document.querySelector('[data-testid="cartina-3d"] canvas');
    if (!c) return null;
    const r = c.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });
  if (box) {
    const before = await page.evaluate(snapLT);
    await page.mouse.move(box.x, box.y);
    await page.mouse.wheel(0, -400);
    await page.mouse.down();
    await page.mouse.move(box.x + 60, box.y - 40, { steps: 10 });
    await page.mouse.up();
    out.fpsDuringInteract = await page.evaluate(
      () =>
        new Promise((res) => {
          let n = 0;
          const s = performance.now();
          const loop = () => {
            n++;
            if (performance.now() - s < 5000) requestAnimationFrame(loop);
            else res(Math.round((n / 5) * 10) / 10);
          };
          requestAnimationFrame(loop);
        })
    );
    out.interactLT = await page.evaluate(snapLT);
    out.interactLT.delta = out.interactLT.tot - before.tot;
  }

  console.log(JSON.stringify(out, null, 2));
  await browser.close();
})().catch((e) => {
  console.error("FATAL:", e.message);
  process.exit(1);
});
