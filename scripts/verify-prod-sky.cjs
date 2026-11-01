/* Verifica produzione: scena del cielo (parapendio, cumuli, venti in quota) nella finestra della cartina
   Uso: node verify-prod-sky.cjs [url]  (default: https://la-meteo-dei-conigli.vercel.app) */
const { chromium } = require("playwright");
const BASE = process.argv[2] || "https://la-meteo-dei-conigli.vercel.app";

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    timezoneId: "Europe/Rome",
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));

  await page.goto(BASE + "/", { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForSelector(".cmap-marker", { timeout: 90000 });
  const cartina = page.locator('[data-testid="cartina-decolli"]');
  await cartina.scrollIntoViewIfNeeded();
  await page.waitForTimeout(2500);

  // apri la finestra di un decollo
  await page.locator(".cmap-marker").nth(5).click({ force: true, timeout: 15000 });
  await page.waitForTimeout(2500);

  const out = { errors };

  // scena del cielo presente?
  out.sky = await page.locator('[data-testid="cartina-sky"]').count();
  out.skyHead = out.sky
    ? ((await page.locator(".cmap-skyhead").textContent()) || "").replace(/\s+/g, " ").trim()
    : "—";

  // parapendio alla sommità
  out.parapendio = await page.locator(".sky-pg").count();

  // cumuli (possono mancare se aria secca)
  out.cumuli = await page.locator(".sky-cloud").count();

  // colonna dei venti: righe quota con freccia + km/h + direzione
  out.windRows = await page.locator(".cmap-sky-wrow").count();
  if (out.windRows) {
    const texts = [];
    const n = Math.min(out.windRows, 8);
    for (let i = 0; i < n; i++) {
      texts.push(((await page.locator(".cmap-sky-wrow").nth(i).textContent()) || "").replace(/\s+/g, " ").trim());
    }
    out.windSample = texts;
  }

  // fascia ore cliccabile (chip) + legenda scala
  out.hourChips = await page.locator('[data-testid="cartina-bars"] .cmap-bar').count();
  out.scalePills = await page.locator(".cmap-pill").count();
  out.banner = await page.locator('[data-testid="cartina-banner"]').count()
    ? (await page.locator('[data-testid="cartina-banner"]').innerText()).slice(0, 50)
    : "—";
  out.dataCards = await page.locator(".cmap-card").count();

  // cambio ora: clicco un'altra ora e controllo che la scena si aggiorni
  const beforeHead = out.skyHead;
  if (out.hourChips > 1) {
    const idx = out.hourChips > 6 ? 6 : out.hourChips - 1;
    await page.locator('[data-testid="cartina-bars"] .cmap-bar').nth(idx).click({ force: true });
    await page.waitForTimeout(1200);
    out.afterPickHead = ((await page.locator(".cmap-skyhead").textContent()) || "").replace(/\s+/g, " ").trim();
    out.headChanged = out.afterPickHead !== beforeHead;
  }

  // screenshot del pannello intero + zoom sulla scena
  await page.locator('[data-testid="cartina-panel"]').screenshot({ path: "/home/z/my-project/shots-local/prod-sky-panel.png" });
  const skyBox = await page.locator('[data-testid="cartina-sky"]').boundingBox();
  if (skyBox) {
    await page.screenshot({
      path: "/home/z/my-project/shots-local/prod-sky-zoom.png",
      clip: { x: skyBox.x - 6, y: skyBox.y - 6, width: skyBox.width + 12, height: skyBox.height + 12 },
    });
  }

  // mobile
  const mpage = await ctx.browser().newContext({ viewport: { width: 390, height: 844 }, timezoneId: "Europe/Rome" }).then((c) => c.newPage());
  mpage.on("pageerror", (e) => errors.push("mobile: " + String(e)));
  await mpage.goto(BASE + "/", { waitUntil: "domcontentloaded", timeout: 90000 });
  await mpage.waitForSelector(".cmap-marker", { timeout: 90000 });
  await mpage.locator('[data-testid="cartina-decolli"]').scrollIntoViewIfNeeded();
  await mpage.waitForTimeout(2000);
  await mpage.locator(".cmap-marker").nth(5).click({ force: true, timeout: 15000 });
  await mpage.waitForTimeout(2500);
  out.mobileSky = await mpage.locator('[data-testid="cartina-sky"]').count();
  out.mobilePG = await mpage.locator(".sky-pg").count();
  out.mobileWindRows = await mpage.locator(".cmap-sky-wrow").count();
  await mpage.locator('[data-testid="cartina-panel"]').screenshot({ path: "/home/z/my-project/shots-local/prod-sky-mobile.png" });

  console.log(JSON.stringify(out, null, 2));
  await browser.close();
})();
