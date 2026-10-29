/* Sanity check finale locale: entità 3D + errori pagina + screenshot */
const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({ args: ["--enable-unsafe-swiftshader"] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errs = [];
  page.on("pageerror", (e) => errs.push(String(e).slice(0, 150)));
  await page.goto("http://localhost:8080/", { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForSelector('[data-testid="cartina-3d"]', { timeout: 60000 });
  await page.evaluate(() => document.querySelector("#vista3d")?.scrollIntoView({ behavior: "instant" }));
  await page.waitForSelector('[data-testid="c3d-hud"]', { timeout: 120000 });
  await page.waitForTimeout(50000);
  const diag = await page.evaluate(() => {
    const v = window.__c3dViewer;
    if (!v) return { total: -1 };
    const ents = v.entities.values;
    const byKind = { polyline: 0, billboard: 0, ellipse: 0 };
    for (const e of ents) {
      if (e.polyline) byKind.polyline++;
      else if (e.billboard) byKind.billboard++;
      else if (e.ellipse) byKind.ellipse++;
    }
    return { total: ents.length, byKind };
  });
  console.log("DIAG:", JSON.stringify(diag), "pageErrors:", errs.length);
  const box = await page.locator('[data-testid="cartina-3d"]').boundingBox();
  await page.screenshot({ path: "/home/z/my-project/shots-local/final-3d.png", clip: box, timeout: 120000 });
  await browser.close();
  process.exit(errs.length || diag.total < 45 ? 1 : 0);
})().catch((e) => {
  console.error("FAIL:", String(e).slice(0, 200));
  process.exit(1);
});
