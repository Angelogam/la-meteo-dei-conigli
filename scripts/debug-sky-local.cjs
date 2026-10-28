/* Debug locale: errori JS e presenza scena cielo */
const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, timezoneId: "Europe/Rome", hasTouch: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push("PAGEERROR: " + String(e)));
  page.on("console", (m) => { if (m.type() === "error") errors.push("CONSOLE: " + m.text().slice(0, 300)); });

  await page.goto("http://localhost:8080/", { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForSelector(".cmap-marker", { timeout: 90000 });
  await page.locator('[data-testid="cartina-decolli"]').scrollIntoViewIfNeeded();
  await page.waitForTimeout(2500);
  await page.locator(".cmap-marker").nth(5).dispatchEvent("click");
  await page.waitForTimeout(2500);

  const out = {
    errors,
    sky: await page.locator('[data-testid="cartina-sky"]').count(),
    panelEmpty: await page.locator(".cmap-panelbox.is-empty").count(),
    icos: await page.locator(".cmap-sky-ico").count(),
  };
  await page.screenshot({ path: "/home/z/my-project/shots-local/debug-sky-local.png" });
  console.log(JSON.stringify(out, null, 2));
  await browser.close();
})();
