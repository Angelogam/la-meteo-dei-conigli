/* Screenshot scena cielo: due ore (10:00 secca, 15:00 con cumuli) + desktop
   Uso: node shot-sky-states.cjs [url] */
const { chromium } = require("playwright");
const { installProdApiProxy } = require("./lib/proxy-prod-api.cjs");
const BASE = process.argv[2] || "http://localhost:8080";

(async () => {
  const browser = await chromium.launch();

  async function shot(vp, tag) {
    const ctx = await browser.newContext({ viewport: vp, timezoneId: "Europe/Rome", hasTouch: true });
    const page = await ctx.newPage();
    if (BASE.includes("localhost")) await installProdApiProxy(ctx, BASE);
    const errs = [];
    page.on("pageerror", (e) => errs.push(String(e)));
    await page.goto(BASE + "/", { waitUntil: "domcontentloaded", timeout: 90000 });
    await page.waitForSelector(".cmap-marker", { timeout: 90000 });
    await page.locator('[data-testid="cartina-decolli"]').scrollIntoViewIfNeeded();
    await page.waitForTimeout(2200);
    await page.locator(".cmap-marker").nth(5).dispatchEvent("click");
    await page.waitForTimeout(2200);
    // trova un'ora con cumuli: prova 15, 14, 16
    const chips = page.locator('[data-testid="cartina-bars"] .cmap-bar');
    const n = await chips.count();
    let cumuli = 0;
    for (const h of [15, 14, 16, 13]) {
      if (h < 6 + n) {
        await chips.nth(h - 6).click({ force: true }).catch(() => {});
        await page.waitForTimeout(900);
        cumuli = await page.locator(".sky-cloud").count();
        if (cumuli >= 3) break;
      }
    }
    const sky = page.locator('[data-testid="cartina-sky"]');
    await sky.scrollIntoViewIfNeeded();
    await page.waitForTimeout(700);
    await sky.screenshot({ path: `/home/z/my-project/shots-local/sky-${tag}-cumuli.png` });
    const out = {
      tag,
      cumuli,
      sun: await page.locator(".cmap-sky-ico.is-sun").count(),
      pg: await page.locator(".sky-pg").count(),
      windRows: await page.locator(".cmap-sky-wrow").count(),
      zero: await page.locator(".cmap-sky-zero").count(),
      errs,
    };
    await ctx.close();
    return out;
  }

  const mobile = await shot({ width: 390, height: 844 }, "mobile");
  const desktop = await shot({ width: 1440, height: 1000 }, "desktop");
  console.log(JSON.stringify({ mobile, desktop }, null, 2));
  await browser.close();
})();
