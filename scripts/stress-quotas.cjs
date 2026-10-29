/* Stress test quote: cambia quota rapidamente e cattura renderError di Cesium */
const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({ args: ["--enable-unsafe-swiftshader"] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const pageErrs = [];
  page.on("pageerror", (e) => pageErrs.push(String(e).slice(0, 200)));
  await page.goto("http://localhost:8080/", { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForSelector('[data-testid="cartina-3d"]', { timeout: 60000 });
  await page.evaluate(() => document.querySelector("#vista3d")?.scrollIntoView({ behavior: "instant" }));
  await page.waitForSelector('[data-testid="c3d-hud"]', { timeout: 150000 });
  await page.waitForTimeout(20000);
  await page.evaluate(() => {
    window.__renderErrs = [];
    window.__c3dViewer.scene.renderError.addEventListener((s, e) => {
      window.__renderErrs.push((e && (e.stack || e.message)) || String(e));
    });
  });
  for (const q of ["c3d-q-3000", "c3d-q-4000", "c3d-q-2000", "c3d-q-3500", "c3d-q-2500"]) {
    await page.locator(`[data-testid="${q}"]`).click({ force: true });
    await page.waitForTimeout(2000);
  }
  await page.waitForTimeout(15000);
  const errs = await page.evaluate(() => window.__renderErrs);
  const ents = await page.evaluate(() => {
    const k = { polyline: 0, billboard: 0, ellipse: 0 };
    for (const e of window.__c3dViewer.entities.values) {
      if (e.polyline) k.polyline++;
      else if (e.billboard) k.billboard++;
      else if (e.ellipse) k.ellipse++;
    }
    return k;
  });
  console.log("renderErrors:", errs.length, errs[0] ? String(errs[0]).slice(0, 300) : "");
  console.log("pageErrors:", pageErrs.length);
  console.log("entities:", JSON.stringify(ents));
  await browser.close();
  process.exit(errs.length || pageErrs.length ? 1 : 0);
})().catch((e) => {
  console.error("FAIL:", String(e).slice(0, 250));
  process.exit(1);
});
