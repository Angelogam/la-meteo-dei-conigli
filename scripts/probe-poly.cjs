const { chromium, devices } = require("playwright");
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices["iPhone 14"], locale: "it-IT" });
  const page = await ctx.newPage();
  const errs = [];
  page.on("pageerror", (e) => errs.push(String(e).slice(0, 200)));
  await page.goto("http://localhost:4174/", { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.locator('button:has-text("Apri la mappa 3D")').first().waitFor({ state: "visible", timeout: 30000 });
  await page.locator('button:has-text("Apri la mappa 3D")').first().tap();
  await page.locator('[data-testid="cartina-3d"] canvas').first().waitFor({ state: "attached", timeout: 60000 });
  for (let i = 0; i < 60; i++) {
    await page.waitForTimeout(1000);
    const n = await page.evaluate(() => (window.__c3dWindFlow ? window.__c3dWindFlow.total : -1));
    if (n > 0) break;
  }
  const info = await page.evaluate(() => {
    const v = window.__c3dViewer, C = window.__c3dCesium;
    if (!v || v.isDestroyed()) return { err: "no viewer" };
    const out = { prims: [], poly: null, bb: [] };
    const walk = (coll, depth) => {
      const len = coll.length;
      for (let i = 0; i < len; i++) {
        const p = coll.get(i);
        if (p instanceof C.PolylineCollection) {
          const polys = [];
          for (let j = 0; j < p.length; j++) {
            const pl = p.get(j);
            polys.push({ w: pl.width, show: pl.show, n: pl.positions.length, mat: pl.material ? pl.material.type : null });
          }
          out.poly = { count: p.length, sample: polys.slice(0, 2) };
        } else if (p instanceof C.BillboardCollection) {
          out.bb.push(p.length);
        } else if (p instanceof C.PrimitiveCollection && depth < 3) {
          walk(p, depth + 1);
        } else out.prims.push(p.constructor.name);
      }
    };
    walk(v.scene.primitives, 0);
    // entità polilinea a terra?
    let ent = 0;
    v.entities.values.forEach((e) => { if (e.polyline) ent++; });
    out.entities = v.entities.values.length;
    out.entPoly = ent;
    out.dpr = window.devicePixelRatio;
    out.camH = Math.round(v.camera.positionCartographic.height);
    return out;
  });
  console.log(JSON.stringify(info, null, 1));
  console.log("pageerror:", errs.length ? errs.join(" | ") : "0");
  await browser.close();
})().catch((e) => { console.error("FATAL:", e.message); process.exit(1); });
