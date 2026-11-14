const { chromium, devices } = require("playwright");
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices["iPhone 14"], locale: "it-IT" });
  const page = await ctx.newPage();
  await page.goto("http://localhost:4174/", { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.locator('button:has-text("Apri la mappa 3D")').first().waitFor({ state: "visible", timeout: 30000 });
  await page.locator('button:has-text("Apri la mappa 3D")').first().tap();
  await page.locator('[data-testid="cartina-3d"] canvas').first().waitFor({ state: "attached", timeout: 60000 });
  for (let i = 0; i < 60; i++) {
    await page.waitForTimeout(1000);
    const n = await page.evaluate(() => (window.__c3dWindFlow ? window.__c3dWindFlow.total : -1));
    if (n > 0) break;
  }
  await page.waitForTimeout(2000);
  const box = await page.locator('[data-testid="cartina-3d"] canvas').first().boundingBox();
  const clip = box ? { x: box.x, y: box.y, width: Math.min(box.width, 900), height: Math.min(box.height, 900) } : undefined;
  // prova A: polilinee GROSSE e opache, billboard NASCOSTI
  await page.evaluate(() => {
    const v = window.__c3dViewer, C = window.__c3dCesium;
    const walk = (coll, depth) => {
      for (let i = 0; i < coll.length; i++) {
        const p = coll.get(i);
        if (p instanceof C.PolylineCollection) {
          for (let j = 0; j < p.length; j++) {
            const pl = p.get(j);
            pl.width = 18;
            pl.material.uniforms.color = C.Color.RED.withAlpha(1.0);
          }
        } else if (p instanceof C.BillboardCollection) p.show = false;
        else if (p instanceof C.PrimitiveCollection && depth < 3) walk(p, depth + 1);
      }
    };
    walk(v.scene.primitives, 0);
    v.scene.requestRender && v.scene.requestRender();
  });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: "/tmp/poly-test.png", clip });
  console.log("shot salvato");
  await browser.close();
})().catch((e) => { console.error("FATAL:", e.message); process.exit(1); });
