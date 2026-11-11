/* Verifica locale: scena del cielo — ore 15 (con cumuli) e ore 17 (secca) */
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

  await page.goto("http://localhost:8080/", { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForSelector(".cmap-marker", { timeout: 90000 });
  const cartina = page.locator('[data-testid="cartina-decolli"]');
  await cartina.scrollIntoViewIfNeeded();
  await page.waitForTimeout(2500);

  await page.locator(".cmap-marker").nth(5).click({ force: true, timeout: 15000 });
  await page.waitForTimeout(2500);

  const count = async (sel) => await page.locator(sel).count();
  const out = {
    clouds15: await count(".sky-cloud"),
    pg: await count(".sky-pg"),
    wrows: await count(".cmap-sky-wrow"),
  };

  await page.locator('[data-testid="cartina-sky"]').screenshot({ path: "/home/z/my-project/shots-local/sky-h15.png" });

  // ore 17: cielo secco
  const chips = page.locator('[data-testid="cartina-bars"] .cmap-bar');
  await chips.nth(11).click(); // 17:00
  await page.waitForTimeout(1500);
  out.clouds17 = await count(".sky-cloud");
  await page.locator('[data-testid="cartina-sky"]').screenshot({ path: "/home/z/my-project/shots-local/sky-h17.png" });

  // torna su 15 e scatta il pannello completo
  await chips.nth(9).click(); // 15:00
  await page.waitForTimeout(1500);
  await page.locator('[data-testid="cartina-panel"]').screenshot({ path: "/home/z/my-project/shots-local/panel-sky.png" });

  out.errors = errors;
  console.log(JSON.stringify(out, null, 2));
  await browser.close();
})();
