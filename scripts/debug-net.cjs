/* Debug rete: quali richieste API falliscono nella pagina locale */
const { chromium } = require("playwright");
const { installProdApiProxy } = require("./lib/proxy-prod-api.cjs");

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, timezoneId: "Europe/Rome", hasTouch: true });
  const page = await ctx.newPage();
  await installProdApiProxy(ctx, "http://localhost:8080");

  const reqs = [];
  page.on("request", (r) => { if (r.url().includes("/api/")) reqs.push("→ " + r.url().slice(0, 110)); });
  page.on("response", (r) => { if (r.url().includes("/api/")) reqs.push("← " + r.status() + " " + r.url().slice(0, 110)); });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e).slice(0, 250)));
  page.on("console", (m) => { if (m.type() === "error") errors.push("CONSOLE: " + m.text().slice(0, 200)); });

  await page.goto("http://localhost:8080/", { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(12000);
  const markers = await page.locator(".cmap-marker").count();
  console.log(JSON.stringify({ markers, reqs: reqs.slice(0, 30), errors: errors.slice(0, 10) }, null, 2));
  await browser.close();
})();
