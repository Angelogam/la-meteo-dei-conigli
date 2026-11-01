/**
 * SMOKE TEST v4 (locale): etichette, scala Windy, previsioni mockate,
 * termiche, schermo intero. Open-Meteo è MOCKATO (quota sandbox esaurita).
 * Uso: node scripts/smoke-3d-v4.cjs [url]
 */
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const BASE = process.argv[2] || "http://localhost:8080";
const OUT = "/home/z/my-project/shots-local";
fs.mkdirSync(OUT, { recursive: true });
const T0 = Date.now();
const log = (s) => {
  try {
    require("fs").writeSync(1, `[${((Date.now() - T0) / 1000).toFixed(0)}s] ${s}\n`);
  } catch {
    /* ignore */
  }
};

/* fixture Open-Meteo: 4 giorni × 24 h × 9 punti, venti variabili 2-42 km/h */
function mockOpenMeteo() {
  const times = [];
  const d0 = new Date();
  for (let d = 0; d < 4; d++) {
    const dd = new Date(d0.getTime() + d * 86400000);
    const ds = dd.toISOString().slice(0, 10);
    for (let h = 0; h < 24; h++) times.push(`${ds}T${String(h).padStart(2, "0")}:00`);
  }
  const pts = [];
  for (let p = 0; p < 9; p++) {
    const ws = times.map((_, i) => 4 + 16 * (1 + Math.sin(i / 3.7 + p)) + (i % 24 >= 12 && i % 24 <= 17 ? 8 : 0));
    const wd = times.map((_, i) => (120 + i * 7 + p * 15) % 360);
    pts.push({
      hourly: {
        time: times,
        wind_speed_10m: ws.map((v) => Math.round(v * 10) / 10),
        wind_direction_10m: wd,
      },
    });
  }
  return pts;
}

(async () => {
  const errors = [];
  const browser = await chromium.launch({
    args: ["--use-gl=angle", "--enable-unsafe-swiftshader", "--disable-dev-shm-usage"],
  });
  const page = await browser.newPage({ viewport: { width: 1024, height: 640 } });
  page.setDefaultTimeout(30000);
  page.on("pageerror", (e) => errors.push(String(e).slice(0, 150)));
  await page.route("**/api.open-meteo.com/**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mockOpenMeteo()) }),
  );

  log("[1] apri " + BASE);
  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.evaluate(() => document.getElementById("vista3d")?.scrollIntoView({ block: "center" }));
  await page.waitForFunction(() => !!(window).__c3dViewer, null, { timeout: 90000 });
  await page.evaluate(() => {
    try {
      (window).__c3dViewer.scene.msaaSamples = 1;
    } catch {}
  });
  await page.waitForTimeout(9000);

  const counts = await page.evaluate(() => {
    const v = (window).__c3dViewer;
    const n = { polyline: 0, billboard: 0, ellipse: 0, label: 0 };
    for (const e of v.entities.values) {
      if (e.polyline) n.polyline++;
      if (e.billboard) n.billboard++;
      if (e.ellipse) n.ellipse++;
      if (e.label) n.label++;
    }
    return n;
  });
  log(`[2] entità: ${JSON.stringify(counts)}`);

  const dom = await page.evaluate(() => ({
    forecast: !!document.querySelector('[data-testid="c3d-forecast"]'),
    days: document.querySelectorAll('[data-testid^="c3d-day-"]').length,
    slots: document.querySelectorAll('[data-testid^="c3d-slot-"]').length,
    fs: !!document.querySelector('[data-testid="c3d-fs"]'),
    legScale: !!document.querySelector('[data-testid="c3d-leg-scale"]'),
    hudTherm: document.querySelector('[data-testid="c3d-hud-therm"]')?.textContent?.slice(0, 50) || "",
    title: document.querySelector(".c3d-sub")?.textContent?.slice(0, 70) || "",
  }));
  log(`[3] DOM: ${JSON.stringify(dom)}`);

  /* cambia giorno → il titolo deve aggiornarsi */
  await page.evaluate(() => {
    const b = document.querySelector('[data-testid="c3d-day-1"]');
    b?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
  });
  await page.waitForTimeout(1200);
  const title2 = await page.evaluate(() => document.querySelector(".c3d-sub")?.textContent?.slice(0, 40) || "");
  log(`[4] giorno+1 → titolo: ${title2.trim()}`);

  /* fascia oraria 15 → titolo ora */
  await page.evaluate(() => {
    const b = document.querySelector('[data-testid="c3d-slot-15"]');
    b?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
  });
  await page.waitForTimeout(1200);
  const title3 = await page.evaluate(() => document.querySelector(".c3d-sub")?.textContent?.slice(0, 40) || "");
  log(`[5] fascia 15 → titolo: ${title3.trim()}`);

  /* schermo intero: click → fullscreenElement o fallback (attesa condizionale:
     il main thread può essere saturo dalla ricostruzione entità SwiftShader) */
  await page.evaluate(() => {
    const b = document.querySelector('[data-testid="c3d-fs"]');
    b?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
  });
  await page
    .waitForFunction(() => !!document.fullscreenElement || !!document.querySelector(".cartina3d.is-fs"), null, { timeout: 12000 })
    .catch(() => {});
  const fs = await page.evaluate(() => ({
    native: !!document.fullscreenElement,
    fallback: !!document.querySelector(".cartina3d.is-fs"),
  }));
  log(`[6] fullscreen: ${JSON.stringify(fs)}`);
  await page.evaluate(() => {
    const b = document.querySelector('[data-testid="c3d-fs"]');
    b?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    if (document.fullscreenElement) document.exitFullscreen();
  });
  await page.waitForTimeout(1200);

  /* entità con ora diurna 15:00: termiche (ellissi) + etichette quota */
  const counts2 = await page.evaluate(() => {
    const v = (window).__c3dViewer;
    const n = { polyline: 0, billboard: 0, ellipse: 0, label: 0 };
    for (const e of v.entities.values) {
      if (e.polyline) n.polyline++;
      if (e.billboard) n.billboard++;
      if (e.ellipse) n.ellipse++;
      if (e.label) n.label++;
    }
    return n;
  });
  log(`[8] entità a ore 15: ${JSON.stringify(counts2)}`);

  const el = await page.$('[data-testid="cartina-3d"]');
  const box = await el.boundingBox();
  await page
    .screenshot({ path: path.join(OUT, "v4-smoke.png"), clip: box, timeout: 90000, animations: "disabled" })
    .catch((e) => log("shot fail: " + String(e).slice(0, 80)));
  log("[7] shot v4-smoke.png");

  await browser.close();
  const okDom = dom.forecast && dom.days >= 3 && dom.slots >= 3 && dom.fs && dom.legScale;
  const okEnt = counts.polyline >= 250 && counts.label >= 20;
  const okDay = /Domani/.test(title2) && /15/.test(title3);
  const okFs = fs.native || fs.fallback;
  const okTherm = counts2.ellipse >= 6;
  log("—".repeat(52));
  log(`entità OK: ${okEnt} · termiche OK: ${okTherm} (${counts2.ellipse} aloni) · DOM OK: ${okDom} · giorno/ora OK: ${okDay} · fs OK: ${okFs} · pageerror: ${errors.length}`);
  errors.slice(0, 3).forEach((e) => log("  pageerror: " + e));
  const ok = okDom && okEnt && okDay && okFs && okTherm && errors.length === 0;
  log(ok ? "✅ SMOKE v4 PASS" : "❌ SMOKE v4 FAIL");
  process.exit(ok ? 0 : 1);
})().catch((e) => {
  console.error("❌ ERRORE:", String(e).slice(0, 300));
  process.exit(1);
});
