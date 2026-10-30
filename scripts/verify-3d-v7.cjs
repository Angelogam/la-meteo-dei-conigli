/**
 * VERIFICA 3D v7 — termiche dai voli reali (XCTherm), link Google Earth,
 * camera bassa/inclinata, exaggeration 1.35, caricamento con percentuale.
 * Uso: node scripts/verify-3d-v7.cjs [baseUrl]
 */
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const BASE = process.argv[2] || "http://localhost:4173";
const OUT = "/home/z/my-project/shots-local";
fs.mkdirSync(OUT, { recursive: true });
const T0 = Date.now();
const log = (s) => {
  try {
    fs.writeSync(1, `[${((Date.now() - T0) / 1000).toFixed(0)}s] ${s}\n`);
  } catch {}
};

(async () => {
  const errors = [];
  const browser = await chromium.launch({
    args: ["--use-gl=angle", "--enable-unsafe-swiftshader", "--disable-dev-shm-usage"],
  });
  const page = await browser.newPage({ viewport: { width: 1024, height: 640 } });
  page.setDefaultTimeout(30000);
  page.on("pageerror", (e) => errors.push(String(e).slice(0, 150)));

  let kk7 = 0;
  page.on("response", (r) => {
    if (r.url().includes("thermal.kk7.ch")) kk7++;
  });

  log("[1] apri " + BASE);
  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.evaluate(() => document.getElementById("vista3d")?.scrollIntoView({ block: "center" }));
  await page.waitForFunction(() => !!(window).__c3dViewer, null, { timeout: 90000 });

  log("[2] attesa camera + campo + XCTherm…");
  await page.waitForTimeout(9000);

  /* [3] link Google Earth */
  const ge = await page.evaluate(() => {
    const a = document.querySelector('[data-testid="c3d-gearth"]');
    return a ? { href: a.getAttribute("href") ?? "" } : null;
  });
  const geOk = !!ge && ge.href.includes("earth.google.com/web/@") && /\d{2}\.\d{4}/.test(ge.href);
  log(`[3] Google Earth: ${geOk ? "OK" : "MANCA"} ${ge ? ge.href.slice(0, 90) : ""}`);

  /* [4] XCTherm: richieste + punti pilot */
  await page.waitForFunction(() => !!((window).__c3dPilot?.length > 0), null, { timeout: 45000 }).catch(() => {});
  const pilotN = await page.evaluate(() => (window).__c3dPilot?.length ?? 0);
  log(`[4] richieste tile kk7: ${kk7} · punti pilot: ${pilotN}`);

  /* [5] camera bassa/inclinata + exaggeration */
  const cam = await page.evaluate(() => {
    const v = (window).__c3dViewer;
    const c = v.camera;
    return {
      h: Math.round(c.positionCartographic.height),
      pitch: +((c.pitch * 180) / Math.PI).toFixed(1),
      exagger: v.scene.verticalExaggeration,
    };
  });
  const camOk = cam.h < 12500 && cam.pitch < -45 && cam.exagger > 1.2;
  log(`[5] camera h=${cam.h} pitch=${cam.pitch} exag=${cam.exagger} → ${camOk ? "OK" : "FAIL"}`);

  /* [6] fasce: porta a mezzogiorno per i coni (se notte) */
  const clickT = async (sel) => {
    const el = await page.$(sel);
    if (!el) throw new Error("elemento non trovato: " + sel);
    await el.evaluate((e) => e.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true })));
  };
  const entCount = async () =>
    page.evaluate(() => {
      const v = (window).__c3dViewer;
      const n = { polyline: 0, cylinder: 0, label: 0 };
      for (const e of v.entities.values) {
        if (e.polyline) n.polyline++;
        else if (e.cylinder) n.cylinder++;
        else if (e.label) n.label++;
      }
      return n;
    });
  const hud = (t) => page.$eval(`[data-testid="c3d-hud-${t}"]`, (e) => e.textContent).catch(() => "");
  const ent0 = await entCount();
  log(`[6] entità iniziali: ${JSON.stringify(ent0)} · HUD: ${(await hud("therm")).trim().slice(0, 80)}`);
  if (ent0.cylinder === 0) {
    await clickT('[data-testid="c3d-slot-12"]').catch(() => {});
    await page.waitForTimeout(2500);
  }
  const ent1 = await entCount();
  const hudTh = (await hud("therm")).trim();
  log(`[6] dopo fascia 12: coni=${ent1.cylinder} · HUD: ${hudTh.slice(0, 100)}`);
  const hudOk = ent1.cylinder > 0 && /confermati dai voli reali/.test(hudTh);
  log(`[6] HUD «confermati dai voli reali»: ${/confermati dai voli reali/.test(hudTh) ? "OK" : "ASSENTE"}`);

  /* [7] credit XCTherm in legenda */
  const credit = await page.$eval('[data-testid="c3d-xccredit"]', (e) => e.textContent).catch(() => "");
  log(`[7] credit legenda: ${credit ? "OK — " + credit.slice(0, 60) : "MANCA"}`);

  /* [8] screenshot */
  await page.waitForFunction(() => !document.querySelector(".c3d-progress"), null, { timeout: 50000 }).catch(() => {});
  await page.waitForTimeout(1500);
  const el = await page.$('[data-testid="cartina-3d"]');
  const box = await el.boundingBox();
  await page
    .screenshot({ path: path.join(OUT, "v7-overview.png"), clip: box, timeout: 90000, animations: "disabled" })
    .then(() => log("[8] screenshot: v7-overview.png"))
    .catch((e) => log("    shot fallito (non bloccante): " + String(e).slice(0, 80)));

  await browser.close();

  const ok = geOk && pilotN > 10 && kk7 > 0 && camOk && ent1.cylinder > 0 && hudOk && !!credit && errors.length === 0;
  log("—".repeat(52));
  log(`GE OK: ${geOk} · pilot: ${pilotN} (kk7 ${kk7} req) · camera OK: ${camOk} · coni: ${ent1.cylinder} · HUD OK: ${hudOk} · pageerror: ${errors.length}`);
  errors.slice(0, 3).forEach((e) => log("  pageerror: " + e));
  log(ok ? "✅ VERIFICA 3D v7 PASS" : "❌ VERIFICA 3D v7 FAIL");
  process.exit(ok ? 0 : 1);
})().catch((e) => {
  console.error("❌ ERRORE:", e);
  process.exit(1);
});
