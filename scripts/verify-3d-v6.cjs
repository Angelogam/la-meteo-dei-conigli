/**
 * VERIFICA VISTA 3D v6 — flusso vento «a pettine»: dardi brezze a cascata,
 * chevron meteo larghi a strati, riccioli di sottovento, coni termici rifatti
 * (texture gradiente + eliche + anello), venti in quota a chevron.
 * Ottimizzata per SwiftShader (software GL): screenshot non bloccanti.
 * Uso: node scripts/verify-3d-v6.cjs [baseUrl]
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
    require("fs").writeSync(1, `[${((Date.now() - T0) / 1000).toFixed(0)}s] ${s}\n`);
  } catch {
    /* ignore */
  }
};

(async () => {
  const errors = [];
  const browser = await chromium.launch({
    args: ["--use-gl=angle", "--enable-unsafe-swiftshader", "--disable-dev-shm-usage"],
  });
  const page = await browser.newPage({ viewport: { width: 900, height: 560 } });
  page.setDefaultTimeout(30000);
  page.on("crash", () => errors.push("PAGE CRASH"));
  page.on("pageerror", (e) => errors.push(String(e).slice(0, 200)));

  log("[1] apri " + BASE);
  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 60000 });

  log("[2] scroll su #vista3d e attesa viewer…");
  await page.evaluate(() => document.getElementById("vista3d")?.scrollIntoView({ block: "center" }));
  await page.waitForFunction(() => !!(window).__c3dViewer, null, { timeout: 90000 });
  await page.waitForTimeout(8000); // tile + campo + previsioni/stima

  const shot = async (name) => {
    try {
      const el = await page.$('[data-testid="cartina-3d"]');
      if (!el) throw new Error("cartina-3d non trovata");
      const box = await el.boundingBox();
      await page.screenshot({ path: path.join(OUT, name), clip: box, timeout: 60000, animations: "disabled" });
      log("    shot: " + name);
    } catch (e) {
      log("    shot FALLITO (non bloccante): " + name + " — " + String(e).slice(0, 90));
    }
  };

  /* [3] il nuovo flusso: dardi + pettine + riccioli */
  const flow = await page.evaluate(() => (window).__c3dWindFlow ?? null);
  log("[3] flusso vento (iniziale): " + JSON.stringify(flow));
  const prim0 = await page.evaluate(() => (window).__c3dViewer.scene.primitives.length);
  log("[3] primitives scena: " + prim0);

  const hud = async (t) =>
    page.$eval(`[data-testid="c3d-hud-${t}"]`, (e) => e.textContent).catch(() => "");
  log("[4] HUD suolo  : " + (await hud("surface")).trim().slice(0, 110));
  log("[4] HUD live   : " + (await hud("live")).trim().slice(0, 90));

  /* porto subito la scena a mezzogiorno: flusso diurno (anabatica + termiche) */
  const clickT = async (sel) => {
    const el = await page.$(sel);
    if (!el) throw new Error("elemento non trovato: " + sel);
    await el.evaluate((e) => e.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true })));
  };
  await clickT('[data-testid="c3d-slot-12"]').catch(() => {});
  await page.waitForTimeout(4000);
  const flow12 = await page.evaluate(() => (window).__c3dWindFlow ?? null);
  log("[4] flusso a mezzogiorno: " + JSON.stringify(flow12));
  log("[4] HUD termiche: " + (await hud("therm")).trim().slice(0, 90));

  const countEnt = async (kind) =>
    page.evaluate((k) => {
      const v = (window).__c3dViewer;
      let n = 0;
      for (const e of v.entities.values) if (e[k]) n++;
      return n;
    }, kind);

  const cyl = await countEnt("cylinder");
  log(`[5] coni termici (cilindri, corpo+nucleo): ${cyl}`);
  const helices = await countEnt("polyline");
  log(`[5] eliche (polilinee): ${helices}`);

  /* [6] screenshot d'insieme: pettine + dardi visibili */
  await page
    .waitForFunction(() => !document.querySelector(".c3d-progress"), null, { timeout: 30000 })
    .catch(() => {});
  await page.waitForTimeout(1500);
  await shot("v6-overview.png");

  /* [7] vista dall'alto nord-up: verifica orientamento frecce (vento di fallback 270° → punta a EST) */
  await page
    .evaluate(() => {
      const v = (window).__c3dViewer;
      v.camera.setView({
        destination: v.camera.positionWC,
        orientation: { heading: 0, pitch: -Math.PI / 2, roll: 0 },
      });
    })
    .catch(() => {});
  await page.waitForTimeout(2500);
  await shot("v6-topdown.png");

  /* [8] zoom sul versante sotto il decollo: dardi a cascata leggibili */
  await page
    .evaluate(() => {
      const Cesium = (window).__c3dCesium;
      const v = (window).__c3dViewer;
      const d = v.camera.positionCartographic;
      const lon = (d.longitude * 180) / Math.PI;
      const lat = (d.latitude * 180) / Math.PI - 0.018;
      v.camera.setView({
        destination: Cesium.Cartesian3.fromDegrees(lon, lat, 4200),
        orientation: { heading: 0, pitch: (-38 * Math.PI) / 180, roll: 0 },
      });
    })
    .catch(() => {});
  await page.waitForTimeout(2500);
  await shot("v6-slope.png");

  /* [9] toggle suolo OFF: le primitive BillboardCollection del flusso spariscono */
  await clickT('label.c3d-toggle button[role="switch"]');
  await page.waitForTimeout(2000);
  const primOff = await page.evaluate(() => (window).__c3dViewer.scene.primitives.length);
  log(`[9] toggle suolo off → primitives: ${primOff} (prima ${prim0})`);
  await shot("v6-flow-off.png");
  await clickT('label.c3d-toggle button[role="switch"]');
  await page.waitForTimeout(1500);
  const primOn = await page.evaluate(() => (window).__c3dViewer.scene.primitives.length);
  log(`[9] toggle suolo on → primitives: ${primOn}`);

  /* [10] colonna «tutte» in quota: chevron per ogni livello */
  await clickT('[data-testid="c3d-q-all"]').catch(() => {});
  await page.waitForTimeout(2500);
  const flowAll = await page.evaluate(() => (window).__c3dViewer.scene.primitives.length);
  log(`[10] quota «tutte» → primitives: ${flowAll}`);

  await page.close();
  await browser.close();

  const okFlow = (!!flow && flow.total > 400 && flow.chevrons > 120 && flow.darts > 60) ||
    (!!flow12 && flow12.total > 400 && flow12.chevrons > 120 && flow12.darts > 60);
  const okEddy = !!flow12 && flow12.eddies >= 0; // informativo: dipende dal vento del giorno
  const okPrim = prim0 >= 2; // flusso suolo + flusso quota
  const okToggle = primOff < prim0 && primOn >= prim0;
  const okCol = flowAll >= prim0;
  const okCone = cyl >= 2;
  const okHelix = helices >= 4; // 2 eliche × ≥2 coni
  const ok = okFlow && okPrim && okToggle && okCol && okCone && okHelix && errors.length === 0;
  log("—".repeat(52));
  log(
    `flusso OK: ${okFlow} (iniziale: ${flow ? `dardi ${flow.darts} · pettine ${flow.chevrons} · riccioli ${flow.eddies}` : "—"}; mezzogiorno: ${flow12 ? `dardi ${flow12.darts} · pettine ${flow12.chevrons} · riccioli ${flow12.eddies}` : "—"}) · ` +
      `prim OK: ${okPrim} · toggle OK: ${okToggle} · colonna OK: ${okCol} · coni OK: ${okCone} (${cyl}) · eliche OK: ${okHelix} (${helices}) · riccioli: ${okEddy}`,
  );
  log(`pageerror: ${errors.length}`);
  errors.slice(0, 5).forEach((e) => log("  pageerror: " + e));
  log(ok ? "✅ VERIFICA 3D v6 PASS" : "❌ VERIFICA 3D v6 FAIL");
  process.exit(ok ? 0 : 1);
})().catch((e) => {
  console.error("❌ ERRORE:", e);
  process.exit(1);
});
