/* Verifica produzione: pannello aerologico della cartina con dettaglio completo */
const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    timezoneId: "Europe/Rome",
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));

  await page.goto("https://la-meteo-dei-conigli.vercel.app/", { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForSelector(".cmap-marker", { timeout: 90000 });
  const cartina = page.locator('[data-testid="cartina-decolli"]');
  await cartina.scrollIntoViewIfNeeded();
  await page.waitForTimeout(2500);

  await page.locator(".cmap-marker").nth(5).click({ force: true, timeout: 15000 });
  await page.waitForTimeout(2000);

  const nBanner = await page.locator('[data-testid="cartina-banner"]').count();
  const nScale = await page.locator('[data-testid="cartina-scale"]').count();
  const nPills = await page.locator(".cmap-pill").count();
  const nCards = await page.locator(".cmap-card").count();
  const nBars = await page.locator('[data-testid="cartina-bars"] .cmap-bar').count();
  const nWind = await page.locator('[data-testid="cartina-windrow"]').count();
  const nRel = await page.locator(".cmap-relbadge").count();
  const banner = nBanner ? (await page.locator('[data-testid="cartina-banner"]').innerText()).slice(0, 60) : "—";
  const analysis = await page.locator('[data-testid="cartina-analysis-v"]').count()
    ? (await page.locator('[data-testid="cartina-analysis-v"]').innerText()).replace(/\n/g, " ")
    : "—";
  const wind = nWind ? await page.locator('[data-testid="cartina-windrow"] strong').innerText() : "—";

  // le card NON devono avere il dettaglio espandibile (revert)
  const nCardAero = await page.locator(".dxc-aero").count();
  const nCardInfobar = await page.locator(".dxc-infobar").count();

  console.log(JSON.stringify({
    nBanner, nScale, nPills, nCards, nBars, nWind, nRel,
    banner, analysis, wind, nCardAero, nCardInfobar, errors,
  }, null, 2));

  await page.locator('[data-testid="cartina-panel"]').screenshot({ path: "/home/z/my-project/shots-local/prod-panel.png" });
  await browser.close();
})();
