/* Debug mobile: perché il click sul marker non apre la finestra? */
const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    timezoneId: "Europe/Rome",
    hasTouch: true,
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));

  await page.goto("https://la-meteo-dei-conigli.vercel.app/", { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForSelector(".cmap-marker", { timeout: 90000 });
  await page.locator('[data-testid="cartina-decolli"]').scrollIntoViewIfNeeded();
  await page.waitForTimeout(2500);

  const nMarkers = await page.locator(".cmap-marker").count();
  const debug = { nMarkers, errors };

  // prova click sul marker 5 con tap
  await page.locator(".cmap-marker").nth(5).dispatchEvent("click");
  await page.waitForTimeout(2000);
  debug.afterDispatchPanel = await page.locator('[data-testid="cartina-panel"]').count();
  debug.afterDispatchEmpty = await page.locator(".cmap-panelbox.is-empty").count();
  debug.afterDispatchSky = await page.locator('[data-testid="cartina-sky"]').count();

  if (debug.afterDispatchSky === 0) {
    // prova tap nativo
    await page.locator(".cmap-marker").nth(3).tap({ timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(2000);
    debug.afterTapSky = await page.locator('[data-testid="cartina-sky"]').count();
    debug.afterTapPG = await page.locator(".sky-pg").count();
    debug.afterTapWindRows = await page.locator(".cmap-sky-wrow").count();
  }

  await page.screenshot({ path: "/home/z/my-project/shots-local/debug-mobile-cartina.png", fullPage: false });
  const panelBox = await page.locator('[data-testid="cartina-panel"]').boundingBox();
  debug.panelBox = panelBox;
  if (debug.afterTapSky || debug.afterDispatchSky) {
    await page.locator('[data-testid="cartina-panel"]').screenshot({ path: "/home/z/my-project/shots-local/prod-sky-mobile.png" });
  }

  console.log(JSON.stringify(debug, null, 2));
  await browser.close();
})();
