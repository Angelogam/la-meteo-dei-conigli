/** Diagnostica: perché il viewer 3D non parte? */
const { chromium } = require("playwright");
(async () => {
  const browser = await chromium.launch({ args: ["--use-gl=angle", "--enable-unsafe-swiftshader"] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1050 } });
  page.on("console", (m) => console.log("console[" + m.type() + "]", m.text().slice(0, 200)));
  page.on("pageerror", (e) => console.log("PAGEERROR", String(e).slice(0, 300)));
  page.on("requestfailed", (r) => console.log("REQFAIL", r.url().slice(0, 110), r.failure()?.errorText));
  await page.goto("http://localhost:8080", { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(4000);
  const has3d = await page.evaluate(() => !!document.getElementById("vista3d"));
  console.log("sezione #vista3d presente:", has3d);
  if (!has3d) {
    const html = await page.evaluate(() => document.body.innerText.slice(0, 400));
    console.log("body:", html.replace(/\n+/g, " | ").slice(0, 380));
  } else {
    await page.evaluate(() => document.getElementById("vista3d").scrollIntoView({ block: "center" }));
    await page.waitForTimeout(15000);
    const st = await page.evaluate(() => ({
      viewer: !!(window).__c3dViewer,
      loading: !!document.querySelector('[data-testid="c3d-loading"]'),
      err: document.querySelector(".c3d-overlay.is-err")?.textContent?.slice(0, 160) ?? null,
    }));
    console.log("stato:", JSON.stringify(st));
  }
  await browser.close();
})();
