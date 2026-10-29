/* Shot dedicato: fasce 12:00 + zoom-in sui coni termici */
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const BASE = process.argv[2] || "http://localhost:4173";
const OUT = "/home/z/my-project/shots-local";
fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const browser = await chromium.launch({ args: ["--use-gl=angle", "--enable-unsafe-swiftshader", "--disable-dev-shm-usage"] });
  const page = await browser.newPage({ viewport: { width: 1024, height: 700 } });
  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.evaluate(() => document.getElementById("vista3d")?.scrollIntoView({ block: "center" }));
  await page.waitForFunction(() => !!(window).__c3dViewer, null, { timeout: 90000 });
  await page.waitForTimeout(7000);
  await page.evaluate(() => document.querySelector('[data-testid="c3d-slot-12"]')?.dispatchEvent(new MouseEvent("click", { bubbles: true })));
  await page.waitForTimeout(2500);
  await page.waitForFunction(() => !document.querySelector(".c3d-progress"), null, { timeout: 45000 }).catch(() => {});
  /* TILT: alzo lo sguardo 2 volte per vedere i coni di lato in 3D */
  for (let i = 0; i < 2; i++) {
    await page.evaluate(() => document.querySelector('[data-testid="c3d-nav"] button:nth-child(3)')?.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    await page.waitForTimeout(1200);
  }
  /* zoom in due volte verso i coni */
  for (let i = 0; i < 2; i++) {
    await page.evaluate(() => document.querySelector('[data-testid="c3d-nav"] button:nth-child(5)')?.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    await page.waitForTimeout(1600);
  }
  await page.waitForTimeout(6000);
  const el = await page.$('[data-testid="cartina-3d"]');
  const box = await el.boundingBox();
  await page.screenshot({ path: path.join(OUT, "v5-coni-zoom.png"), clip: box, timeout: 90000, animations: "disabled" })
    .then(() => console.log("shot ok"))
    .catch((e) => console.log("shot fail:", String(e).slice(0, 80)));
  await browser.close();
})();
