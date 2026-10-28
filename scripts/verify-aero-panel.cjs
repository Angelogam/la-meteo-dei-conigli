/* Verifica pannello aerologico della cartina: click su un marker, screenshot, conteggi */
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

  await page.goto("http://localhost:8080/", { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(9000); // dati + campo termico

  // scroll alla cartina
  const cartina = page.locator('[data-testid="cartina-decolli"]');
  if (!(await cartina.count())) {
    console.log("CARTINA NON TROVATA");
    await page.screenshot({ path: "/home/z/my-project/shots-local/panel-diag.png", fullPage: true });
    process.exit(1);
  }
  await cartina.scrollIntoViewIfNeeded();
  await page.waitForTimeout(2500);

  // click sul primo marker del decollo
  const marker = page.locator(".cmap-marker").first();
  const nMarkers = await page.locator(".cmap-marker").count();
  await marker.click({ force: true });
  await page.waitForTimeout(1800);

  const panel = page.locator('[data-testid="cartina-panel"]');
  const nPanel = await panel.count();
  const nBanner = await page.locator('[data-testid="cartina-banner"]').count();
  const nScale = await page.locator('[data-testid="cartina-scale"]').count();
  const nPills = await page.locator(".cmap-pill").count();
  const nCards = await page.locator(".cmap-card").count();
  const nBars = await page.locator('[data-testid="cartina-bars"] .cmap-bar').count();
  const nWind = await page.locator('[data-testid="cartina-windrow"]').count();
  const nWarn = await page.locator('[data-testid="cartina-warn"]').count();
  const bannerText = nBanner ? (await page.locator('[data-testid="cartina-banner"]').innerText()).slice(0, 90) : "—";
  const windText = nWind ? await page.locator('[data-testid="cartina-windrow"] strong').innerText() : "—";
  const cardKeys = await page.locator(".cmap-card-k").allInnerTexts();
  const zeroTermico = nCards ? (await page.locator(".cmap-card").nth(0).innerText()).replace(/\n/g, " | ") : "—";

  // click su una barra per cambiare ora (verificare interattività)
  const bars = page.locator('[data-testid="cartina-bars"] .cmap-bar');
  if ((await bars.count()) > 6) {
    await bars.nth(9).click({ force: true });
    await page.waitForTimeout(1200);
  }
  const bannerAfter = nBanner ? (await page.locator('[data-testid="cartina-banner"]').innerText()).slice(0, 90) : "—";

  console.log(JSON.stringify({
    nMarkers, nPanel, nBanner, nScale, nPills, nCards, nBars, nWind, nWarn,
    bannerText, bannerAfter, windText, cardKeys, zeroTermico, errors,
  }, null, 2));

  await page.screenshot({ path: "/home/z/my-project/shots-local/panel-aero-full.png" });
  // shot del pannello da solo (clip a sinistra)
  await page.screenshot({ path: "/home/z/my-project/shots-local/panel-aero-zoom.png", clip: { x: 0, y: 80, width: 420, height: 920 } });

  await browser.close();
})();
