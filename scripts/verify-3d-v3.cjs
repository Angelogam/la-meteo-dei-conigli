/**
 * VERIFICA VISTA 3D v3 — campo vento live animato + nav Google Earth.
 * Ottimizzata per SwiftShader (software GL): gli step interattivi girano col
 * campo suolo DISATTIVATO (32 polilinee), dopo lo screenshot d'insieme.
 * Uso: node scripts/verify-3d-v3.cjs [baseUrl]
 */
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const BASE = process.argv[2] || "http://localhost:8080";
const OUT = "/home/z/my-project/shots-local";
fs.mkdirSync(OUT, { recursive: true });
const T0 = Date.now();
/* log SINCRONO su stdout: sopravvive ai SIGKILL del tool runner */
const log = (s) => {
  try {
    require("fs").writeSync(1, `[${((Date.now() - T0) / 1000).toFixed(0)}s] ${s}\n`);
  } catch {
    /* ignore */
  }
};

(async () => {
  const errors = [];
  const renderErrors = [];
  const browser = await chromium.launch({ args: ["--use-gl=angle", "--enable-unsafe-swiftshader"] });
  const page = await browser.newPage({ viewport: { width: 1024, height: 640 } });
  page.setDefaultTimeout(30000);
  page.on("crash", () => errors.push("PAGE CRASH"));
  page.on("pageerror", (e) => errors.push(String(e).slice(0, 160)));
  page.on("console", (m) => {
    if (m.type() === "warning" && m.text().includes("c3d] renderError")) renderErrors.push(m.text().slice(0, 160));
  });

  log("[1] apri " + BASE);
  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 60000 });

  log("[2] scroll su #vista3d e attesa viewer…");
  await page.evaluate(() => document.getElementById("vista3d")?.scrollIntoView({ block: "center" }));
  await page.waitForFunction(() => !!(window).__c3dViewer, null, { timeout: 90000 });
  await page.waitForTimeout(9000); // tile + campo vento + live

  const shot = async (name) => {
    const el = await page.$('[data-testid="cartina-3d"]');
    if (!el) throw new Error("cartina-3d non trovata");
    const box = await el.boundingBox();
    await page.screenshot({ path: path.join(OUT, name), clip: box, timeout: 60000, animations: "disabled" });
    log("    shot: " + name);
  };

  const entCount = async () =>
    page.evaluate(() => {
      const v = (window).__c3dViewer;
      const n = { polyline: 0, billboard: 0, ellipse: 0 };
      for (const e of v.entities.values) {
        if (e.polyline) n.polyline++;
        else if (e.billboard) n.billboard++;
        else if (e.ellipse) n.ellipse++;
      }
      return n;
    });

  const ent = await entCount();
  log("[3] entità: " + JSON.stringify(ent));

  const hudLive = await page.$eval('[data-testid="c3d-hud-live"]', (e) => e.textContent).catch(() => "");
  const hudWind = await page.$eval('[data-testid="c3d-hud-wind"]', (e) => e.textContent).catch(() => "");
  log("[4] HUD live : " + hudLive.trim().slice(0, 80));
  log("[4] HUD quota: " + hudWind.trim().slice(0, 80));

  const nav = await page.evaluate(() => {
    const q = (s) => document.querySelector(s);
    return {
      nav: !!q('[data-testid="c3d-nav"]'),
      compass: !!q('[data-testid="c3d-compass"]'),
      b2d: !!q('[data-testid="c3d-2d"]'),
      home: !!q('[data-testid="c3d-home"]'),
    };
  });
  log("[5] nav: " + JSON.stringify(nav));

  /* screenshot d'insieme CON campo vento completo (dopo il caricamento tile) */
  log("[5b] attesa tile complete…");
  await page
    .waitForFunction(() => !document.querySelector(".c3d-progress"), null, { timeout: 45000 })
    .catch(() => {});
  await page.waitForTimeout(2000);
  log("[6] screenshot d'insieme…");
  await shot("v3-overview.png");

  /* attiva/disattiva campo suolo per la fase interattiva (SwiftShader) */
  const clickT = async (sel) => {
    const el = await page.$(sel);
    if (!el) throw new Error("elemento non trovato: " + sel);
    await el.evaluate((e) => e.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true })));
  };
  await clickT('label.c3d-toggle button[role="switch"]');
  await page.waitForTimeout(1500);
  const entOff = await entCount();
  log("[7] campo suolo off → entità: " + JSON.stringify(entOff));

  log("[8] stress quote 2000→4000…");
  for (const q of ["2000", "2500", "3000", "3500", "4000", "off", "3000"]) {
    await clickT(`[data-testid="c3d-q-${q}"]`);
    await page.waitForTimeout(700);
  }
  const entAfter = await entCount();
  log("    dopo stress: " + JSON.stringify(entAfter));
  await shot("v3-quota3000.png");

  log("[9] orbita (rotazione, 2D/3D)…");
  const h0 = await page.evaluate(() => (window).__c3dViewer.camera.heading);
  await clickT('[data-testid="c3d-nav"] button:nth-child(2)');
  await page.waitForTimeout(500);
  const h1 = await page.evaluate(() => (window).__c3dViewer.camera.heading);
  await clickT('[data-testid="c3d-2d"]');
  await page.waitForTimeout(800);
  const p2d = await page.evaluate(() => (window).__c3dViewer.camera.pitch);
  await clickT('[data-testid="c3d-2d"]');
  await page.waitForTimeout(800);
  const p3d = await page.evaluate(() => (window).__c3dViewer.camera.pitch);
  log(`    heading ${((h0 * 180) / Math.PI).toFixed(0)}° → ${((h1 * 180) / Math.PI).toFixed(0)}° · pitch 2D ${((p2d * 180) / Math.PI).toFixed(1)}° · pitch 3D ${((p3d * 180) / Math.PI).toFixed(1)}°`);

  log("[10] zoom-in nitidezza…");
  await clickT('[data-testid="c3d-nav"] button:nth-child(5)');
  await clickT('[data-testid="c3d-nav"] button:nth-child(5)');
  await page.waitForTimeout(5000);
  await shot("v3-zoom.png");

  log("[11] mobile 390px…");
  const mp = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
  mp.setDefaultTimeout(30000);
  mp.on("pageerror", (e) => errors.push("M:" + String(e).slice(0, 140)));
  await mp.goto(BASE, { waitUntil: "domcontentloaded", timeout: 60000 });
  await mp.evaluate(() => document.getElementById("vista3d")?.scrollIntoView({ block: "center" }));
  await mp.waitForFunction(() => !!(window).__c3dViewer, null, { timeout: 90000 });
  await mp.waitForTimeout(6000);
  const mnav = await mp.evaluate(() => !!document.querySelector('[data-testid="c3d-nav"]'));
  const mel = await mp.$('[data-testid="cartina-3d"]');
  const mbox = await mel.boundingBox();
  await mp.screenshot({ path: path.join(OUT, "v3-mobile.png"), clip: mbox, timeout: 60000, animations: "disabled" });
  log("    shot: v3-mobile.png · nav: " + mnav);

  await browser.close();

  const okEnt = ent.polyline >= 100 && ent.billboard >= 8 && ent.ellipse === 0;
  const okOff = entOff.polyline < ent.polyline && entOff.ellipse === 0; // il toggle svuota il campo
  const okNav = nav.nav && nav.compass && nav.b2d && mnav;
  const okOrbit = Math.abs(h1 - h0) > 0.01 && p2d < -1.5 && p3d > -1.0 && p3d < 0;
  const ok = okEnt && okOff && okNav && okOrbit && errors.length === 0 && renderErrors.length === 0;
  log("—".repeat(52));
  log(`entità OK: ${okEnt} · toggle OK: ${okOff} · nav OK: ${okNav} · orbita OK: ${okOrbit}`);
  log(`pageerror: ${errors.length} · renderError: ${renderErrors.length}`);
  errors.slice(0, 4).forEach((e) => log("  pageerror: " + e));
  renderErrors.slice(0, 4).forEach((e) => log("  renderError: " + e));
  log(ok ? "✅ VERIFICA 3D v3 PASS" : "❌ VERIFICA 3D v3 FAIL");
  process.exit(ok ? 0 : 1);
})().catch((e) => {
  console.error("❌ ERRORE:", e);
  process.exit(1);
});
