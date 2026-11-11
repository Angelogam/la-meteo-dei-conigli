// Verifica visiva v17 «PLOTONE A PETTINE»: apre la 3D, sceglie un'ora
// DIURNA presente nella timeline (10-16), attende il rebuild del flusso e
// scatta screenshot vicini + lontani. Uso: node scripts/shots-flow-v17.cjs [url]
const { chromium, devices } = require("playwright");
const URL = process.argv[2] || "http://localhost:4174/";
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices["iPhone 14"], locale: "it-IT" });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.log("PAGEERROR:", e.message));
  await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.locator('button:has-text("Apri la mappa 3D")').first().waitFor({ state: "visible", timeout: 30000 });
  await page.locator('button:has-text("Apri la mappa 3D")').first().tap();
  await page.locator('[data-testid="cartina-3d"] canvas').first().waitFor({ state: "attached", timeout: 60000 });
  let total = -1;
  for (let i = 0; i < 60; i++) {
    await page.waitForTimeout(1000);
    total = await page.evaluate(() => (window.__c3dWindFlow ? window.__c3dWindFlow.total : -1));
    if (total > 0) break;
  }
  console.log("flusso iniziale: billboards", total);
  // elenca le ore disponibili e clicca la prima diurna (10-16)
  const labels = await page.evaluate(() =>
    Array.from(document.querySelectorAll("button.hourly-weather-moment")).map((b) => b.getAttribute("aria-label") || ""),
  );
  console.log("ore in timeline:", labels.slice(0, 14).map((l) => l.slice(0, 5)).join(" "));
  const dayLbl = labels.find((l) => { const h = parseInt(l.slice(0, 2), 10); return h >= 10 && h <= 16; });
  if (dayLbl) {
    await page.locator(`button.hourly-weather-moment[aria-label^="${dayLbl.slice(0, 5)}"]`).first().evaluate((el) => el.click());
    console.log("cliccata ora:", dayLbl.slice(0, 5));
  } else {
    console.log("NESSUNA ora diurna in timeline: screenshot all'ora corrente");
  }
  let sun = null;
  for (let i = 0; i < 40; i++) {
    await page.waitForTimeout(1000);
    const n = await page.evaluate(() => (window.__c3dWindFlow ? window.__c3dWindFlow.total : -1));
    sun = await page.evaluate(() => (window.__c3dWindFlow ? window.__c3dWindFlow.sun : null));
    const sp = await page.evaluate(() => (window.__c3dWindFlow ? window.__c3dWindFlow.sp : null));
    if (n > 0 && (!dayLbl || (sun && sun.alt > 5))) {
      console.log("flusso rebuild: billboards", n, "sole:", JSON.stringify(sun), "passo fronti:", sp, "m");
      break;
    }
  }
  if (!sun) console.log("ATTENZIONE: sole non letto:", JSON.stringify(sun));
  await page.waitForTimeout(2500);
  await page.addStyleTag({ content: ".c3d-hud,.c3d-forecast,.c3d-legend,.c3d-toolbar,.c3d-credits,.c3d-progress{display:none!important}" });
  const box = await page.locator('[data-testid="cartina-3d"] canvas').first().boundingBox();
  const clip = box ? { x: box.x, y: box.y, width: Math.min(box.width, 900), height: Math.min(box.height, 900) } : undefined;
  await page.screenshot({ path: "/tmp/v17-1.png", clip });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: "/tmp/v17-2.png", clip });
  if (box) {
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    for (let i = 0; i < 2; i++) {
      await page.mouse.wheel(0, 1200); // deltaY positivo = zoom OUT in Cesium
      await page.waitForTimeout(350);
    }
    await page.waitForTimeout(2500);
    await page.screenshot({ path: "/tmp/v17-mid1.png", clip });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: "/tmp/v17-mid2.png", clip });
    for (let i = 0; i < 4; i++) {
      await page.mouse.wheel(0, 1200);
      await page.waitForTimeout(350);
    }
    await page.waitForTimeout(2500);
    await page.screenshot({ path: "/tmp/v17-far.png", clip });
  }
  console.log("screenshot v17 salvati (1, 2, mid1, mid2, far)");
  await browser.close();
})().catch((e) => { console.error("FATAL:", e.message); process.exit(1); });
