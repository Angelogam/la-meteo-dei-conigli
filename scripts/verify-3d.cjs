/* Verifica PRODUZIONE: cielo Alpium + vista 3D del terreno (desktop + mobile)
   Uso: node scripts/verify-3d.cjs [url]  (default: https://la-meteo-dei-conigli.vercel.app) */
const { chromium } = require("playwright");
const SHOTS = "/home/z/my-project/shots-local";
const BASE = process.argv[2] || "https://la-meteo-dei-conigli.vercel.app";

(async () => {
  const browser = await chromium.launch({
    args: ["--enable-unsafe-swiftshader", "--use-angle=swiftshader"],
  });
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    timezoneId: "Europe/Rome",
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push("desktop: " + String(e).slice(0, 220)));

  await page.goto(BASE + "/", { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForSelector(".cmap-marker", { timeout: 90000 });
  await page.locator('[data-testid="cartina-decolli"]').scrollIntoViewIfNeeded();
  await page.waitForTimeout(8000); // dati meteo in arrivo

  await page.locator(".cmap-marker").nth(5).click({ force: true, noWaitAfter: true, timeout: 15000 });
  await page.waitForTimeout(2500);

  const out = { base: BASE, errors: [] };

  /* ---------- 1) scena del cielo ---------- */
  out.sky = await page.locator('[data-testid="cartina-sky"]').count();
  out.windRows = await page.locator(".cmap-sky-wrow").count();
  if (out.windRows) {
    const rows = [];
    for (let i = 0; i < Math.min(out.windRows, 3); i++) {
      rows.push(((await page.locator(".cmap-sky-wrow").nth(i).textContent()) || "").replace(/\s+/g, " ").trim());
    }
    out.windSample = rows;
  }
  out.bands = {
    instabile: await page.locator(".cmap-sky-band.is-un").count(),
    stabile: await page.locator(".cmap-sky-band.is-st").count(),
  };
  const skyBox = await page.locator('[data-testid="cartina-sky"]').boundingBox();
  if (skyBox) {
    await page.screenshot({
      path: SHOTS + "/prod-v2-sky.png",
      clip: { x: skyBox.x - 6, y: skyBox.y - 6, width: skyBox.width + 12, height: skyBox.height + 14 },
      timeout: 60000,
    });
  }

  /* ---------- 2) vista 3D ---------- */
  const c3d = page.locator('[data-testid="cartina-3d"]');
  out.c3dPresent = await c3d.count();
  await c3d.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1500);

  let ready = false;
  try {
    await page.waitForSelector('[data-testid="c3d-hud"]', { timeout: 150000 });
    ready = true;
    await page.waitForTimeout(25000);
  } catch {
    out.c3dTimeout = true;
  }
  out.c3dReady = ready;
  out.c3dCanvas = await page.locator('[data-testid="cartina-3d"] canvas').count();
  if (ready) {
    out.hud = ((await page.locator('[data-testid="c3d-hud-wind"]').textContent()) || "").replace(/\s+/g, " ").trim();
    await page.locator('[data-testid="c3d-q-3000"]').click({ force: true });
    await page.waitForTimeout(2500);
    out.hud3000 = ((await page.locator('[data-testid="c3d-hud-wind"]').textContent()) || "").replace(/\s+/g, " ").trim();
    const diag = await page.evaluate(() => {
      const v = window.__c3dViewer;
      if (!v) return null;
      const ents = v.entities.values;
      const k = { polyline: 0, billboard: 0, ellipse: 0 };
      for (const e of ents) {
        if (e.polyline) k.polyline++;
        else if (e.billboard) k.billboard++;
        else if (e.ellipse) k.ellipse++;
      }
      return k;
    });
    out.entities = diag;
  }
  const c3dBox = await c3d.boundingBox();
  if (c3dBox) {
    await page.waitForTimeout(3000);
    await page.screenshot({ path: SHOTS + "/prod-v2-3d.png", clip: c3dBox, timeout: 120000 });
  }

  out.errors = errors;
  console.log(JSON.stringify(out, null, 2));
  await browser.close();
  process.exit(out.errors.length || !out.c3dReady ? 1 : 0);
})().catch((e) => {
  console.error("FAIL:", String(e).slice(0, 200));
  process.exit(1);
});
