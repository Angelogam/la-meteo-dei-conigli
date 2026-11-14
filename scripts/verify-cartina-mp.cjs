/* Verifica cartina stile meteo-parapente:
   1. marker decolli più grandi (pin 42px, etichette 11.5px)
   2. QUOTA interattiva anche sul livello TERMICHE (campo + valori +m/s sui marker)
   3. font del pannello ingranditi
   4. scena cielo: parapendio nuovo, correnti e sorgente nella colonna termica
   Uso: node verify-cartina-mp.cjs [url]  (default: http://localhost:8080) */
const { chromium } = require("playwright");
const BASE = process.argv[2] || "http://localhost:8080";
const OUT = "/home/z/my-project/shots-local";

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, timezoneId: "Europe/Rome" });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  const out = { errors };

  await page.goto(BASE + "/", { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForSelector(".cmap-marker", { timeout: 90000 });
  const cartina = page.locator('[data-testid="cartina-decolli"]');
  await cartina.scrollIntoViewIfNeeded();
  /* i livelli di pressione (e quindi il selettore QUOTA) arrivano col batch: aspetta i dati */
  await page.waitForSelector(".cmap-alt", { timeout: 90000 });
  await page.waitForTimeout(1500);

  /* --- 1. marker più grandi --- */
  const pin = page.locator(".cmap-marker .cmap-pin").first();
  const pinBox = await pin.boundingBox();
  out.pinSize = pinBox ? Math.round(pinBox.width) : null;
  out.tagFont = await pin
    .locator("..")
    .locator(".cmap-tag")
    .first()
    .evaluate((el) => getComputedStyle(el).fontSize);

  /* --- 2. QUOTA sul livello TERMICHE (di default attivo) --- */
  out.quotaOnTermiche = await page.locator(".cmap-alt").count();
  out.quotaSteps = await page.locator(".cmap-alt-step").count();
  out.readoutBefore = ((await page.locator(".cmap-readout").textContent()) || "").replace(/\s+/g, " ").trim();

  if (out.quotaSteps > 3) {
    await page.locator(".cmap-alt-step").nth(3).click({ force: true });
    await page.waitForTimeout(2000);
    out.readoutAfter = ((await page.locator(".cmap-readout").textContent()) || "").replace(/\s+/g, " ").trim();
    out.legendAfter = ((await page.locator(".cmap-legend").textContent()) || "").replace(/\s+/g, " ").trim();
    /* chip +m/s sui marker in modalità termiche */
    out.thermChips = await page.locator(".cmap-marker.is-thermlayer .cmap-speed").count();
    const chipSample = [];
    for (let i = 0; i < Math.min(4, out.thermChips); i++) {
      chipSample.push(((await page.locator(".cmap-marker .cmap-speed").nth(i).textContent()) || "").trim());
    }
    out.chipSample = chipSample;
    await cartina.screenshot({ path: OUT + "/mp-termiche-quota.png" });
  }

  /* --- 3. pannello: apri un decollo (dopo che i dati sono caricati) --- */
  await page.waitForSelector(".cmap-loaded", { timeout: 90000 });
  await page.waitForFunction(() => (document.querySelector(".cmap-loaded")?.textContent || "").includes("24/24"), { timeout: 90000 }).catch(() => {});
  await page.locator(".cmap-marker").nth(5).click({ force: true, timeout: 15000 });
  await page.waitForTimeout(2000);
  /* se il pannello è uscito senza dati, riprova una volta */
  if ((await page.locator("[data-testid=cartina-sky]").count()) === 0) {
    await page.waitForTimeout(2500);
    await page.locator(".cmap-marker").nth(5).click({ force: true, timeout: 15000 });
    await page.waitForTimeout(2000);
  }

  const h3 = page.locator(".cmap-pb-title h3").first();
  out.panelH3 = (await h3.count()) ? await h3.evaluate((el) => getComputedStyle(el).fontSize) : null;
  const cardV = page.locator(".cmap-card-v").first();
  out.cardFont = (await cardV.count()) ? await cardV.evaluate((el) => getComputedStyle(el).fontSize) : null;
  const wspd = page.locator(".cmap-sky-wspd").first();
  out.windFont = (await wspd.count()) ? await wspd.evaluate((el) => getComputedStyle(el).fontSize) : null;

  /* --- 4. scena cielo nuova --- */
  out.sky = await page.locator('[data-testid="cartina-sky"]').count();
  out.parapendio = await page.locator(".sky-pg").count();
  out.cumuli = await page.locator(".sky-cloud").count();
  out.streaks = await page.locator(".sky-streak").count();
  out.chev = await page.locator(".sky-chev").count();
  out.sorgente = await page.locator(".sky-src").count();
  out.bolle = await page.locator(".sky-bub").count();
  out.windRows = await page.locator(".cmap-sky-wrow").count();

  await page.locator('[data-testid="cartina-panel"]').screenshot({ path: OUT + "/mp-panel.png" });
  const skyBox = await page.locator('[data-testid="cartina-sky"]').boundingBox();
  if (skyBox) {
    await page.screenshot({
      path: OUT + "/mp-sky-zoom.png",
      clip: { x: skyBox.x - 6, y: skyBox.y - 6, width: skyBox.width + 12, height: skyBox.height + 12 },
    });
  }

  /* cambio quota col pannello aperto: il campo dietro deve aggiornarsi senza errori */
  if (out.quotaSteps > 5) {
    await page.locator(".cmap-alt-step").nth(1).click({ force: true });
    await page.waitForTimeout(1500);
    await page.locator(".cmap-alt-step").nth(6).click({ force: true });
    await page.waitForTimeout(1500);
    out.readoutHigh = ((await page.locator(".cmap-readout").textContent()) || "").replace(/\s+/g, " ").trim();
  }

  /* --- mobile --- */
  const mctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    timezoneId: "Europe/Rome",
  });
  const mpage = await mctx.newPage();
  mpage.on("pageerror", (e) => errors.push("mobile: " + String(e)));
  await mpage.goto(BASE + "/", { waitUntil: "domcontentloaded", timeout: 90000 });
  await mpage.waitForSelector(".cmap-marker", { timeout: 90000 });
  await mpage.locator('[data-testid="cartina-decolli"]').scrollIntoViewIfNeeded();
  await mpage.waitForSelector(".cmap-alt", { timeout: 90000 });
  await mpage.waitForTimeout(1500);
  await mpage.locator(".cmap-marker").nth(5).dispatchEvent("click");
  await mpage.waitForTimeout(2500);
  out.mobileQuota = await mpage.locator(".cmap-alt-step").count();
  out.mobileSky = await mpage.locator('[data-testid="cartina-sky"]').count();
  out.mobilePG = await mpage.locator(".sky-pg").count();
  out.mobileWindRows = await mpage.locator(".cmap-sky-wrow").count();
  await mpage.locator('[data-testid="cartina-panel"]').screenshot({ path: OUT + "/mp-panel-mobile.png" });

  console.log(JSON.stringify(out, null, 2));
  await browser.close();
  if (errors.length) process.exitCode = 1;
})();
