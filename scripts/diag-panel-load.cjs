const { chromium } = require("playwright");
(async () => {
  const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: 1440, height: 1000 }, timezoneId: "Europe/Rome" })).newPage();
  const errs = [];
  p.on("pageerror", (e) => errs.push(String(e)));
  await p.goto("http://localhost:8080/", { waitUntil: "domcontentloaded", timeout: 60000 });
  for (let i = 1; i <= 10; i++) {
    await p.waitForTimeout(3000);
    const c = await p.locator('[data-testid="cartina-decolli"]').count();
    const m = await p.locator(".cmap-marker").count();
    console.log((i * 3) + "s cartina=" + c + " markers=" + m);
    if (c > 0 && m > 0) break;
  }
  console.log("errors:", errs.slice(0, 3));
  await p.screenshot({ path: "/home/z/my-project/shots-local/panel-diag.png" });
  await b.close();
})();
