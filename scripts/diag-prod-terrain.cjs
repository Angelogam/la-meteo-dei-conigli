/**
 * DIAGNOSTICA PRODUZIONE — perché il terreno sembra piatto in 3D?
 * Misura oggettiva: richieste DEM/satellite, frame renderizzati (FPS reale),
 * camera (height/pitch) nel tempo, terrainProvider attivo, exaggeration,
 * badge «terreno in caricamento», dimensione schermo.
 * Uso: node scripts/diag-prod-terrain.cjs [baseUrl]
 */
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const BASE = process.argv[2] || "https://la-meteo-dei-conigli.vercel.app";
const OUT = "/home/z/my-project/shots-diag";
fs.mkdirSync(OUT, { recursive: true });
const T0 = Date.now();
const log = (s) => {
  try {
    fs.writeSync(1, `[${((Date.now() - T0) / 1000).toFixed(0)}s] ${s}\n`);
  } catch {
    /* noop */
  }
};

(async () => {
  const browser = await chromium.launch({
    args: ["--use-gl=angle", "--enable-unsafe-swiftshader", "--disable-dev-shm-usage"],
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 760 } });
  page.setDefaultTimeout(45000);

  const net = { dem: 0, demFail: 0, sat: 0, satFail: 0, cesium: 0 };
  page.on("response", (r) => {
    const u = r.url();
    if (u.includes("elevation-tiles-prod")) {
      net.dem++;
      if (r.status() >= 400) net.demFail++;
    } else if (u.includes("arcgisonline")) {
      net.sat++;
      if (r.status() >= 400) net.satFail++;
    } else if (u.includes("/cesium/")) net.cesium++;
  });
  const errs = [];
  page.on("pageerror", (e) => errs.push(String(e).slice(0, 150)));

  log("[1] apri " + BASE);
  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.evaluate(() => document.getElementById("vista3d")?.scrollIntoView({ block: "center" }));
  await page.waitForFunction(() => !!(window).__c3dViewer, null, { timeout: 90000 });

  /* contatore frame via postRender */
  await page.evaluate(() => {
    const v = window.__c3dViewer;
    window.__frames = 0;
    v.scene.postRender.addEventListener(() => {
      window.__frames++;
    });
  });

  log("[2] attesa 25s per caricamento DEM + render…");
  const cams = [];
  for (let i = 0; i < 5; i++) {
    await page.waitForTimeout(5000);
    const st = await page.evaluate(() => {
      const v = window.__c3dViewer;
      const c = v.camera;
      const carto = c.positionCartographic;
      const badge = document.body.textContent.includes("terreno in caricamento");
      const tProv = v.terrainProvider;
      return {
        height: Math.round(carto.height),
        pitch: Math.round(((c.pitch * 180) / Math.PI) * 10) / 10,
        frames: window.__frames,
        badge,
        prov: tProv ? (tProv.constructor?.name ?? "?") : "none",
        ready: !!tProv?.ready,
        exagger: v.scene.verticalExaggeration ?? v.scene.globe?.exaggeration ?? null,
        tilesToRender: v.scene.globe._surface ? v.scene.globe._surface._tileLoadQueueHigh?.length + v.scene.globe._surface._tileLoadQueueMedium?.length + v.scene.globe._surface._tileLoadQueueLow?.length : null,
        tileCache: v.scene.globe._surface ? v.scene.globe._surface._tileCache?._list?.length ?? null : null,
      };
    });
    cams.push(st);
    log(`[2] t=${(i + 1) * 5}s  h=${st.height}m  pitch=${st.pitch}  frames=${st.frames}  badge=${st.badge}  prov=${st.prov}(ready=${st.ready})  exag=${st.exagger}  tileQ=${st.tilesToRender}  cache=${st.tileCache}`);
  }

  /* screenshot + dettaglio provider */
  const el = await page.$('[data-testid="cartina-3d"]');
  const box = await el.boundingBox();
  await page
    .screenshot({ path: path.join(OUT, "diag-terrain-final.png"), clip: box, timeout: 90000, animations: "disabled" })
    .then(() => log("[3] screenshot: diag-terrain-final.png"))
    .catch((e) => log("    shot fallito (non bloccante): " + String(e).slice(0, 80)));

  const detail = await page.evaluate(() => {
    const v = window.__c3dViewer;
    const tp = v.terrainProvider;
    const req = v.scene.globe?._surface?._tileProvider;
    return {
      provName: tp?.constructor?.name,
      provReady: !!tp?.ready,
      hasAvailability: !!(tp && tp.availability),
      errorEvent: !!tp?.errorEvent,
      credit: tp?.credit ? "yes" : "no",
      globeDepth: v.scene.globe?._surface?._debug?.maxDepth ?? null,
      canRender: v.scene.canRender,
      globeVisible: v.scene.globe.show,
      sphere: v.scene.globe?.ellipsoid ? "ok" : "?",
    };
  });
  log("[4] provider: " + JSON.stringify(detail));
  log("[4] rete: " + JSON.stringify(net));
  log("[4] pageerror: " + errs.length + (errs.length ? " → " + errs.slice(0, 3).join(" | ") : ""));

  await browser.close();
  const fps = cams.length ? cams[cams.length - 1].frames / 25 : 0;
  const ok = net.dem > 0 && net.demFail === 0 && fps > 2 && detail.provName !== "PLAIN" && !cams.some((c) => c.badge && c.frames > 300);
  log("—".repeat(50));
  log(`dem=${net.dem} (fail ${net.demFail}) · sat=${net.sat} · fps~${fps.toFixed(1)} · prov=${detail.provName} · exagger=${cams[0]?.exagger}`);
  log(ok ? "✅ DIAG PASS — terreno sta caricando/renderendo" : "❌ DIAG FAIL — vedi log sopra");
  process.exit(0); // diagnostica: mai bloccante
})().catch((e) => {
  console.error("ERRORE:", e);
  process.exit(0);
});
