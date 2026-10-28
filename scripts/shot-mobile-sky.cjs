/* Screenshot scena cielo mobile: scroll del pannello + cattura elemento
   Uso: node shot-mobile-sky.cjs [url] */
const { chromium } = require("playwright");
const BASE = process.argv[2] || "https://la-meteo-dei-conigli.vercel.app";

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    timezoneId: "Europe/Rome",
    hasTouch: true,
  });
  const page = await ctx.newPage();
  await page.goto(BASE + "/", { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForSelector(".cmap-marker", { timeout: 90000 });
  await page.locator('[data-testid="cartina-decolli"]').scrollIntoViewIfNeeded();
  await page.waitForTimeout(2500);
  await page.locator(".cmap-marker").nth(5).dispatchEvent("click");
  await page.waitForTimeout(2500);

  const sky = page.locator('[data-testid="cartina-sky"]');
  await sky.scrollIntoViewIfNeeded();
  await page.waitForTimeout(800);

  const out = {
    sky: await sky.count(),
    pg: await page.locator(".sky-pg").count(),
    cumuli: await page.locator(".sky-cloud").count(),
    windRows: await page.locator(".cmap-sky-wrow").count(),
  };
  if (out.windRows) {
    const texts = [];
    for (let i = 0; i < out.windRows; i++) {
      texts.push(((await page.locator(".cmap-sky-wrow").nth(i).textContent()) || "").replace(/\s+/g, " ").trim());
    }
    out.windSample = texts;
  }

  await sky.screenshot({ path: "/home/z/my-project/shots-local/prod-sky-mobile.png" });
  console.log(JSON.stringify(out, null, 2));
  await browser.close();
})();
