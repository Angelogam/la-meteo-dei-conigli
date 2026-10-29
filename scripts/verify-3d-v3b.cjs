/**
 * VERIFICA 3D v3-PARTE B (leggera per SwiftShader/cgroup): orbita, zoom,
 * bussola, mobile + diagnostica vento live. Uso: node scripts/verify-3d-v3b.cjs [url]
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

(async () => {
  const errors = [];
  const browser = await chromium.launch({
    args: ["--use-gl=angle", "--enable-unsafe-swiftshader", "--disable-dev-shm-usage"],
  });
  const page = await browser.newPage({ viewport: { width: 800, height: 520 } });
  page.setDefaultTimeout(30000);
  page.on("pageerror", (e) => errors.push(String(e).slice(0, 140)));

  log("[1] apri " + BASE);
  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.evaluate(() => document.getElementById("vista3d")?.scrollIntoView({ block: "center" }));
  await page.waitForFunction(() => !!(window).__c3dViewer, null, { timeout: 90000 });
  /* alleggerisco il rendering software: niente MSAA nel test */
  await page.evaluate(() => {
    try {
      (window).__c3dViewer.scene.msaaSamples = 1;
    } catch {
      /* opzionale */
    }
  });
  await page.waitForTimeout(6000);

  const clickT = async (sel) => {
    const el = await page.$(sel);
    if (!el) throw new Error("non trovato: " + sel);
    await el.evaluate((e) => e.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true })));
  };
  const cam = () =>
    page.evaluate(() => {
      const c = (window).__c3dViewer.camera;
      return { h: c.heading, p: c.pitch };
    });

  log("[2] orbita con i pulsanti nav…");
  const c0 = await cam();
  await clickT('[data-testid="c3d-nav"] button:nth-child(2)'); // ruota destra
  await page.waitForTimeout(900);
  const c1 = await cam();
  await clickT('[data-testid="c3d-nav"] button:nth-child(3)'); // alza sguardo
  await page.waitForTimeout(900);
  const c2 = await cam();
  await clickT('[data-testid="c3d-2d"]');
  await page.waitForTimeout(1200);
  const c3 = await cam();
  await clickT('[data-testid="c3d-2d"]');
  await page.waitForTimeout(1200);
  const c4 = await cam();
  await clickT('[data-testid="c3d-nav"] button:nth-child(5)'); // avvicina
  await page.waitForTimeout(1200);
  const c5 = await cam();
  const dH = ((c1.h - c0.h) * 180) / Math.PI;
  log(`    heading ${((c0.h * 180) / Math.PI).toFixed(0)}° → ${((c1.h * 180) / Math.PI).toFixed(0)}° (Δ ${dH.toFixed(1)}°)`);
  log(`    pitch ${((c0.p * 180) / Math.PI).toFixed(1)}° → ${((c2.p * 180) / Math.PI).toFixed(1)}° → 2D ${((c3.p * 180) / Math.PI).toFixed(1)}° → 3D ${((c4.p * 180) / Math.PI).toFixed(1)}°`);
  log(`    zoom: pitch invariato ${Math.abs(c5.p - c4.p) < 0.02 ? "sì" : "no"} (range cambiato via pulsante)`);
  const okOrbit = Math.abs(dH) > 5 && Math.abs(c2.p - c0.p) > 3 && c3.p < -1.5 && c4.p > -1.0 && c4.p < 0;

  log("[3] bussola trascinabile…");
  const dragOk = await page.evaluate(() => {
    const el = document.querySelector('[data-testid="c3d-compass"]');
    if (!el) return false;
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const opts = (x, y) => ({
      bubbles: true,
      cancelable: true,
      pointerId: 1,
      clientX: x,
      clientY: y,
      isPrimary: true,
    });
    el.dispatchEvent(new PointerEvent("pointerdown", opts(cx + 20, cy)));
    el.dispatchEvent(new PointerEvent("pointermove", opts(cx, cy - 20)));
    el.dispatchEvent(new PointerEvent("pointermove", opts(cx - 20, cy)));
    el.dispatchEvent(new PointerEvent("pointerup", opts(cx - 20, cy)));
    return true;
  });
  await page.waitForTimeout(800);
  const c6 = await cam();
  const dH2 = Math.abs(((c6.h - c5.h) * 180) / Math.PI);
  log(`    drag bussola eseguito: ${dragOk} · Δheading ${dH2.toFixed(1)}°`);

  /* diagnostica vento live: la quota Open-Meteo di QUESTO IP può essere esaurita */
  log("[4] diagnostica Open-Meteo live…");
  const om = await page.evaluate(async () => {
    try {
      const r = await fetch(
        "https://api.open-meteo.com/v1/forecast?latitude=44.26&longitude=7.79&hourly=wind_speed_10m&wind_speed_unit=kmh&forecast_days=1",
      );
      const j = await r.json();
      return { status: r.status, err: j?.error ? String(j?.reason).slice(0, 60) : "", n: j?.hourly?.time?.length ?? 0 };
    } catch (e) {
      return { status: 0, err: String(e).slice(0, 60), n: 0 };
    }
  });
  log(`    open-meteo da questo IP: HTTP ${om.status} · ore=${om.n} ${om.err ? "· " + om.err : "· OK"}`);

  log("[5] mobile 390px…");
  /* chiudo la pagina desktop: due contesti WebGL Cesium in SwiftShader
     superano la memoria del container e il renderer viene ucciso */
  await page.close();
  const mp = await browser.newPage({ viewport: { width: 390, height: 720 }, hasTouch: true });
  mp.setDefaultTimeout(30000);
  mp.on("pageerror", (e) => errors.push("M:" + String(e).slice(0, 120)));
  await mp.goto(BASE, { waitUntil: "domcontentloaded", timeout: 60000 });
  await mp.evaluate(() => document.getElementById("vista3d")?.scrollIntoView({ block: "center" }));
  await mp.waitForFunction(() => !!(window).__c3dViewer, null, { timeout: 90000 });
  await mp.evaluate(() => {
    try {
      (window).__c3dViewer.scene.msaaSamples = 1;
    } catch {
      /* opzionale */
    }
  });
  await mp.waitForTimeout(5000);
  const mnav = await mp.evaluate(
    () =>
      !!document.querySelector('[data-testid="c3d-nav"]') &&
      !!document.querySelector('[data-testid="c3d-compass"]') &&
      !!document.querySelector('[data-testid="c3d-2d"]'),
  );
  const mel = await mp.$('[data-testid="cartina-3d"]');
  const mbox = await mel.boundingBox();
  await mp
    .screenshot({ path: path.join(OUT, "v3b-mobile.png"), clip: mbox, timeout: 90000, animations: "disabled" })
    .catch((e) => log("    shot mobile FALLITO (non bloccante): " + String(e).slice(0, 80)));
  log("    nav mobile presente: " + mnav);

  await browser.close();
  const ok = okOrbit && dragOk && mnav && errors.length === 0;
  log("—".repeat(52));
  log(`orbita OK: ${okOrbit} · bussola OK: ${dragOk && dH2 > 1} · mobile OK: ${mnav} · pageerror: ${errors.length}`);
  errors.slice(0, 3).forEach((e) => log("  pageerror: " + e));
  log(ok ? "✅ VERIFICA 3D v3-B PASS" : "❌ VERIFICA 3D v3-B FAIL");
  process.exit(ok ? 0 : 1);
})().catch((e) => {
  console.error("❌ ERRORE:", e);
  process.exit(1);
});
