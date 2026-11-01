const { chromium } = require("playwright");
(async () => {
  const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: 1440, height: 1000 }, timezoneId: "Europe/Rome" })).newPage();
  const errs = [];
  p.on("pageerror", (e) => errs.push(String(e)));
  await p.goto("http://localhost:8080/", { waitUntil: "domcontentloaded", timeout: 60000 });

  // aspetta che i marker siano visibili (dati caricati)
  await p.waitForSelector(".cmap-marker", { timeout: 60000 });
  const cartina = p.locator('[data-testid="cartina-decolli"]');
  await cartina.scrollIntoViewIfNeeded();
  await p.waitForTimeout(2500);

  const marker = p.locator(".cmap-marker").nth(5);
  await marker.waitFor({ state: "visible", timeout: 30000 });
  await marker.click({ force: true, timeout: 15000 });
  await p.waitForTimeout(1800);

  const head = await p.locator('[data-testid="cartina-analysis-v"]').innerText();
  console.log("analysis:", head.replace(/\n/g, " "));

  const bars = p.locator('[data-testid="cartina-bars"] .cmap-bar');
  await bars.first().click({ force: true });
  await p.waitForTimeout(900);
  const banner1 = await p.locator('[data-testid="cartina-banner"]').innerText();
  await bars.nth(7).click({ force: true });
  await p.waitForTimeout(900);
  const banner2 = await p.locator('[data-testid="cartina-banner"]').innerText();
  const hourLabel = await p.locator('[data-testid="cartina-panel"] .cmap-verdict span').innerText();
  console.log("banner alba:", banner1.slice(0, 45));
  console.log("banner 13:", banner2.slice(0, 45), "| verdict hour:", hourLabel);

  await p.locator('[data-testid="cartina-panel"]').screenshot({ path: "/home/z/my-project/shots-local/panel-element.png" });
  await p.screenshot({ path: "/home/z/my-project/shots-local/panel-inpage.png" });
  console.log("errors:", errs.slice(0, 3));
  await b.close();
})();
