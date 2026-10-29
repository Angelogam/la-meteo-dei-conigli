/** Shot rapido: solo caricamento + screenshot d'insieme (per check visivi). */
const { chromium } = require("playwright");
const fs = require("fs");
const NAME = process.argv[2] || "v3-quick.png";
const WAIT = Number(process.argv[3] || 20000);
const flog = (s) => fs.writeSync(1, s + "\n");
(async () => {
  const browser = await chromium.launch({ args: ["--use-gl=angle", "--enable-unsafe-swiftshader"] });
  const page = await browser.newPage({ viewport: { width: 1024, height: 640 } });
  page.setDefaultTimeout(30000);
  page.on("pageerror", (e) => flog("PAGEERROR " + String(e).slice(0, 140)));
  await page.goto("http://localhost:8080", { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.evaluate(() => document.getElementById("vista3d")?.scrollIntoView({ block: "center" }));
  await page.waitForFunction(() => !!(window).__c3dViewer, null, { timeout: 90000 });
  await page.waitForTimeout(WAIT);
  await page.waitForFunction(() => !document.querySelector(".c3d-progress"), null, { timeout: 40000 }).catch(() => {});
  await page.waitForTimeout(1500);
  const ent = await page.evaluate(() => {
    const v = (window).__c3dViewer;
    const n = { polyline: 0, billboard: 0 };
    for (const e of v.entities.values) {
      if (e.polyline) n.polyline++;
      else if (e.billboard) n.billboard++;
    }
    return n;
  });
  flog("entità: " + JSON.stringify(ent));
  const el = await page.$('[data-testid="cartina-3d"]');
  const box = await el.boundingBox();
  await page.screenshot({ path: "/home/z/my-project/shots-local/" + NAME, clip: box, timeout: 60000, animations: "disabled" });
  flog("shot ok: " + NAME);
  await browser.close();
})();
