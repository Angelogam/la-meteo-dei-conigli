/* Diagnostica fullscreen headless */
const { chromium } = require("playwright");
(async () => {
  const browser = await chromium.launch({ args: ["--use-gl=angle", "--enable-unsafe-swiftshader", "--disable-dev-shm-usage"] });
  const page = await browser.newPage({ viewport: { width: 1024, height: 640 } });
  await page.goto("http://localhost:8080", { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.evaluate(() => document.getElementById("vista3d")?.scrollIntoView({ block: "center" }));
  await page.waitForFunction(() => !!(window).__c3dViewer, null, { timeout: 90000 });
  const r = await page.evaluate(async () => {
    const el = document.getElementById("vista3d");
    const out = { hasFs: typeof el.requestFullscreen, support: document.fullscreenEnabled };
    try {
      await el.requestFullscreen();
      out.after = "resolved";
    } catch (e) {
      out.after = "rejected: " + String(e).slice(0, 80);
    }
    out.native = !!document.fullscreenElement;
    return out;
  });
  console.log(JSON.stringify(r));
  await browser.close();
})();
