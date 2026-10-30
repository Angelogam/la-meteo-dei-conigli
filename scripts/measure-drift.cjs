/* Misura la deriva reale delle frecce del campo vento: spostamento del punto
 * medio di N polilinee tra due istanti (4 s). Attesa: ~speedVis (11-62 m/s). */
const { chromium } = require("playwright");

const BASE = process.argv[2] || "http://localhost:4173";

(async () => {
  const browser = await chromium.launch({
    args: ["--use-gl=angle", "--enable-unsafe-swiftshader", "--disable-dev-shm-usage"],
  });
  const page = await browser.newPage({ viewport: { width: 1024, height: 640 } });
  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.evaluate(() => document.getElementById("vista3d")?.scrollIntoView({ block: "center" }));
  await page.waitForFunction(() => !!(window).__c3dViewer, null, { timeout: 90000 });
  await page.waitForTimeout(9000);

  const measure = () =>
    page.evaluate(() => {
      const v = (window).__c3dViewer;
      const out = [];
      let k = 0;
      for (const e of v.entities.values) {
        if (e.polyline && k % 40 === 0) {
          const pos = e.polyline.positions.getValue(v.clock.currentTime);
          if (pos && pos.length === 2) out.push(pos);
        }
        k++;
        if (out.length >= 6) break;
      }
      const C = (window).Cesium || null;
      // distanza in metri con formula equirettangolare approssimata sui gradi
      return out.map(([a, b]) => {
        const la = (Cesium_Math(a) + Cesium_Math(b)) / 2;
        const mx = (b.x - a.x), my = (b.y - a.y);
        function Cesium_Math() {}
        return { mid: [(a.x + b.x) / 2, (a.y + b.y) / 2], len: Math.hypot(mx, my) };
      });
      function carto(p) {
        return p;
      }
    });

  // misura diretta con Cesium reale (disponibile come modulo nel bundle? no) → uso fromDegrees manuale
  const snap = () =>
    page.evaluate(() => {
      const v = (window).__c3dViewer;
      const out = [];
      let k = 0;
      for (const e of v.entities.values) {
        if (e.polyline && k % 40 === 0) {
          const pos = e.polyline.positions.getValue(v.clock.currentTime);
          if (pos && pos.length === 2) {
            const toLL = (p) => {
              const r = Math.hypot(p.x, p.y);
              const lon = Math.atan2(p.y, p.x);
              const lat = Math.atan2(p.z, r);
              return [lat * 180 / Math.PI, lon * 180 / Math.PI];
            };
            out.push({ id: e.id, ll: toLL(pos[0]).concat(toLL(pos[1])) });
          }
        }
        k++;
        if (out.length >= 8) break;
      }
      return { total: v.entities.values.length, out };
    });

  const s0 = await snap();
  console.log("total:", s0.total, " s0[0..2]:", JSON.stringify(s0.out.slice(0, 3)));
  await page.waitForTimeout(4000);
  const s1 = await snap();
  console.log("total:", s1.total, " s1[0..2]:", JSON.stringify(s1.out.slice(0, 3)));

  const M_LAT = 111320;
  const speeds = [];
  const byId0 = new Map(s0.out.map((o) => [o.id, o.ll]));
  for (const o1 of s1.out) {
    const ll0 = byId0.get(o1.id);
    if (!ll0) continue;
    const dN = (o1.ll[0] - ll0[0]) * M_LAT;
    const dE = (o1.ll[1] - ll0[1]) * M_LAT * Math.cos((ll0[0] * Math.PI) / 180);
    speeds.push({ id: o1.id, mps: Math.hypot(dN, dE) / 4 });
  }
  console.log("campioni accoppiati per id:", speeds.length);
  console.log("deriva (m/s):", speeds.map((s) => `${s.id.slice(-4)}:${s.mps.toFixed(1)}`).join(", "));
  if (speeds.length) {
    const avg = speeds.reduce((a, b) => a + b.mps, 0) / speeds.length;
    console.log("deriva media (m/s):", avg.toFixed(1));
  }
  await browser.close();
})().catch((e) => { console.error("FATAL", String(e).slice(0, 300)); process.exit(1); });
