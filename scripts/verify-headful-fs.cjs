/* Test HEADFUL (xvfb): fullscreen NATIVO + shot coni con tilt — da girare con xvfb-run */
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const BASE = process.argv[2] || "https://la-meteo-dei-conigli.vercel.app";
const OUT = "/home/z/my-project/shots-local";
fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const browser = await chromium.launch({
    headless: false,
    args: ["--use-gl=angle", "--enable-unsafe-swiftshader", "--disable-dev-shm-usage", "--window-size=1280,800"],
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.evaluate(() => document.getElementById("vista3d")?.scrollIntoView({ block: "center" }));
  /* WebGL su Xvfb può non partire: il viewer non è requisito per il fullscreen */
  const hasViewer = await page
    .waitForFunction(() => !!(window).__c3dViewer, null, { timeout: 40000 })
    .then(() => true)
    .catch(() => false);
  console.log("viewer inizializzato:", hasViewer);
  await page.waitForTimeout(3000);

  if (hasViewer) {
    /* porto la scena a mezzogiorno (termiche) */
    await page.evaluate(() => document.querySelector('[data-testid="c3d-slot-12"]')?.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    await page.waitForTimeout(3000);

    /* TILT: alzo lo sguardo 2 volte per vedere i coni di lato */
    for (let i = 0; i < 2; i++) {
      await page.evaluate(() => document.querySelector('[data-testid="c3d-nav"] button:nth-child(3)')?.dispatchEvent(new MouseEvent("click", { bubbles: true })));
      await page.waitForTimeout(900);
    }
    await page.waitForTimeout(5000);
    const el = await page.$('[data-testid="cartina-3d"]');
    const box = await el.boundingBox();
    await page
      .screenshot({ path: path.join(OUT, "v5-prod-coni-tilt.png"), clip: box, timeout: 90000, animations: "disabled" })
      .then(() => console.log("shot coni-tilt ok"))
      .catch((e) => console.log("shot fail:", String(e).slice(0, 80)));
  }

  /* FULLSCREEN NATIVO con click trusted */
  const fb = await page.$eval('[data-testid="c3d-fs"]', (e) => {
    const r = e.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  });
  await page.mouse.click(fb.x, fb.y);
  await page.waitForTimeout(1500);
  const st = await page.evaluate(() => ({
    fse: !!document.fullscreenElement,
    isFs: !!document.querySelector(".cartina3d.is-fs"),
    label: document.querySelector('[data-testid="c3d-fs"]')?.textContent?.trim(),
  }));
  console.log("FULLSCREEN:", JSON.stringify(st));
  const el2 = await page.$('[data-testid="cartina-3d"]');
  const box2 = await el2.boundingBox();
  await page
    .screenshot({ path: path.join(OUT, "v5-prod-fullscreen.png"), clip: box2, timeout: 90000, animations: "disabled" })
    .then(() => console.log("shot fullscreen ok"))
    .catch((e) => console.log("shot fs fail:", String(e).slice(0, 80)));

  /* esci dal fullscreen (secondo click) */
  if (st.fse || st.isFs) {
    const fb2 = await page.$eval('[data-testid="c3d-fs"]', (e) => {
      const r = e.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    });
    await page.mouse.click(fb2.x, fb2.y);
    await page.waitForTimeout(1000);
    const st2 = await page.evaluate(() => ({
      fse: !!document.fullscreenElement,
      isFs: !!document.querySelector(".cartina3d.is-fs"),
    }));
    console.log("ESCI FULLSCREEN:", JSON.stringify(st2));
  }
  await browser.close();
  const ok = st.fse || st.isFs;
  console.log(ok ? "✅ FULLSCREEN PASS" : "❌ FULLSCREEN FAIL");
  process.exit(ok ? 0 : 1);
})();
