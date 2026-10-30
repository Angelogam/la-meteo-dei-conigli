/* Verifica NUEVO flusso vento (richiesta utente):
   1. frecce con coda + punta affusolata (marker SVG nuovo)
   2. QUOTA bassa (Suolo/≤1800 m) → BREZZE di valle: colori teal/ciano, tirano verso i decolli
   3. QUOTA alta (>1800 m) → VENTO METEO: scala colori per velocità (legenda is-m*)
   4. card velocità + direzione (data-testid="cartina-wind-cards")
   5. animazione viva: il canvas cambia pesantemente in <1 s (flusso veloce)
   Uso: node verify-wind-flow.cjs [url]  (default: http://localhost:8080) */
const { chromium } = require("playwright");
const { installProdApiProxy } = require("./lib/proxy-prod-api.cjs");
const BASE = process.argv[2] || "http://localhost:8080";
const OUT = "/home/z/my-project/shots-local";

/* campiona il canvas del campo vento: conteggi per famiglie di colore + hash di movimento */
function canvasStats(page) {
  return page.evaluate(() => {
    const c = document.querySelector(".cmap-heat-canvas");
    if (!c) return null;
    const ctx = c.getContext("2d");
    const { width: W, height: H } = c;
    const img = ctx.getImageData(0, 0, W, H).data;
    let breeze = 0; // teal/ciano/verde-acqua: G dominante su R
    let meteo = 0;  // giallo/arancio/rosso: R dominante con G medio-basso
    let any = 0;
    for (let i = 0; i < img.length; i += 16) {
      const r = img[i], g = img[i + 1], b = img[i + 2], a = img[i + 3];
      if (a < 12) continue;
      any++;
      if (g > 140 && g > r + 30) breeze++;
      else if (r > 140 && r > b + 40) meteo++;
    }
    let hash = 0;
    for (let i = 0; i < img.length; i += 4013) hash = (hash * 31 + img[i]) % 100000007;
    return { breeze, meteo, any, hash, W, H };
  });
}

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, timezoneId: "Europe/Rome" });
  if (BASE.includes("localhost")) await installProdApiProxy(ctx, BASE);
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  const out = { errors };

  /* screenshot non bloccante: i font esterni possono non arrivare mai nel sandbox */
  const shot = async (p, opts = {}) => {
    try {
      await p.screenshot({ path: opts.path, timeout: 45000, clip: opts.clip });
      return true;
    } catch (e) {
      console.warn("shot fallito (" + (opts.path || "?") + "): " + String(e).split("\n")[0]);
      return false;
    }
  };

  await page.goto(BASE + "/", { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForSelector(".cmap-marker", { timeout: 90000 });
  await page.locator('[data-testid="cartina-decolli"]').scrollIntoViewIfNeeded();
  await page.waitForSelector(".cmap-alt", { timeout: 90000 });
  await page.waitForFunction(() => (document.querySelector(".cmap-loaded")?.textContent || "").includes("24/24"), { timeout: 90000 }).catch(() => {});

  /* --- livello VENTO --- */
  await page.locator(".cmap-lbtn").nth(1).click();
  await page.waitForTimeout(2200);
  await page.locator(".cmap-map").scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);

  /* 1. marker: freccia con coda (line) + punta affusolata, chip direzione */
  out.arrowWithTail = await page.locator(".cmap-marker.is-windlayer .cmap-arrow line").count();
  out.dirChips = await page.locator(".cmap-marker.is-windlayer .cmap-dirchip").count();
  const dirSample = [];
  for (let i = 0; i < Math.min(4, out.dirChips); i++) {
    dirSample.push(((await page.locator(".cmap-marker .cmap-dirchip").nth(i).textContent()) || "").trim());
  }
  out.dirSample = dirSample;

  /* 2. SUOLO → brezze */
  out.readoutSurface = ((await page.locator(".cmap-readout").textContent()) || "").replace(/\s+/g, " ").trim();
  out.legendSurface = ((await page.locator(".cmap-legend").textContent()) || "").replace(/\s+/g, " ").trim();
  out.cards = await page.locator(".cmap-wcard").count();
  out.cardsTitle = ((await page.locator(".cmap-wcards-title").textContent()) || "").trim();
  const cardTxt = [];
  for (let i = 0; i < Math.min(3, out.cards); i++) {
    cardTxt.push(((await page.locator(".cmap-wcard").nth(i).textContent()) || "").replace(/\s+/g, " ").trim());
  }
  out.cardSample = cardTxt;

  const s1 = await canvasStats(page);
  await page.waitForTimeout(900);
  const s2 = await canvasStats(page);
  out.breezePixels = s1 && s1.breeze;
  out.canvasAny = s1 && s1.any;
  out.motionDelta = s1 && s2 ? Math.abs(s1.hash - s2.hash) : null;
  await shot(page, { path: OUT + "/wind-breeze.png" });
  const cardsBox = await page.locator('[data-testid="cartina-wind-cards"]').boundingBox();
  if (cardsBox) {
    await shot(page, {
      path: OUT + "/wind-cards-zoom.png",
      clip: { x: Math.max(0, cardsBox.x - 8), y: Math.max(0, cardsBox.y - 8), width: Math.min(1440, cardsBox.width + 16), height: Math.min(1000, cardsBox.height + 16) },
    });
  }

  /* 3. QUOTA ALTA → vento meteo (primo step > 1800 m) */
  const stepCount = await page.locator(".cmap-alt-step").count();
  out.stepCount = stepCount;
  let highIdx = -1;
  for (let i = 0; i < stepCount; i++) {
    const label = ((await page.locator(".cmap-alt-step").nth(i).textContent()) || "").trim();
    const m = /([\d.]+)/.exec(label.replace(/\./g, ""));
    if (m && Number(m[1]) > 1800) { highIdx = i; break; }
  }
  if (highIdx >= 0) {
    await page.locator(".cmap-alt-step").nth(highIdx).click({ force: true });
    await page.waitForTimeout(2200);
    await page.locator(".cmap-map").scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    out.highLabel = ((await page.locator(".cmap-alt-step").nth(highIdx).textContent()) || "").trim();
    out.readoutHigh = ((await page.locator(".cmap-readout").textContent()) || "").replace(/\s+/g, " ").trim();
    out.legendHigh = ((await page.locator(".cmap-legend").textContent()) || "").replace(/\s+/g, " ").trim();
    const s3 = await canvasStats(page);
    out.meteoPixels = s3 && s3.meteo;
    out.meteoBreezePixels = s3 && s3.breeze;
    out.cardsHigh = await page.locator(".cmap-wcard").count();
    await shot(page, { path: OUT + "/wind-meteo.png" });
  }

  /* 4. mobile: card ridotte a 3 */
  const mctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, timezoneId: "Europe/Rome" });
  if (BASE.includes("localhost")) await installProdApiProxy(mctx, BASE);
  const mpage = await mctx.newPage();
  mpage.on("pageerror", (e) => errors.push("mobile: " + String(e)));
  await mpage.goto(BASE + "/", { waitUntil: "domcontentloaded", timeout: 90000 });
  await mpage.waitForSelector(".cmap-marker", { timeout: 90000 });
  await mpage.locator('[data-testid="cartina-decolli"]').scrollIntoViewIfNeeded();
  await mpage.waitForSelector(".cmap-alt", { timeout: 90000 });
  await mpage.locator(".cmap-lbtn").nth(1).click();
  await mpage.waitForTimeout(2000);
  await mpage.locator(".cmap-map").scrollIntoViewIfNeeded();
  await mpage.waitForTimeout(500);
  out.mobileCardsVisible = await mpage.locator(".cmap-wcard:visible").count();
  await shot(mpage, { path: OUT + "/wind-mobile.png" });

  out.errors = errors;
  console.log(JSON.stringify(out, null, 2));
  await browser.close();

  /* criteri minimi */
  const fail = [];
  if (!out.arrowWithTail) fail.push("freccia marker senza coda");
  if (!out.dirChips) fail.push("chip direzione assenti");
  if (!out.cards) fail.push("card vento assenti");
  if (!out.motionDelta) fail.push("canvas statico (nessun flusso)");
  if (out.breezePixels != null && out.breezePixels < 40) fail.push("colori brezza non visibili a Suolo");
  if (out.cards > 5) fail.push("troppe card (>5)");
  if (fail.length) {
    console.error("FAIL: " + fail.join(" | "));
    process.exit(1);
  }
  console.log("VERIFY-WIND-FLOW OK");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
