// Contatori installati DENTRO la pagina (prima del freeze): chi genera i
// raycast/ getHeight? Uso: node scripts/probe-pickers.cjs [url] [throttle]
const { chromium, devices } = require("playwright");
const fs = require("fs");
const URL = process.argv[2] || "http://localhost:4173/";
const RATE = Number(process.argv[3] || 4);
const say = (m) => { fs.appendFileSync("/tmp/pickers.log", m + "\n"); console.log(m); };

(async () => {
  fs.writeFileSync("/tmp/pickers.log", `== PICKERS ${URL} throttle ${RATE}x ==\n`);
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices["iPhone 14"], locale: "it-IT" });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: RATE });
  await page.addInitScript(() => {
    (window).__pk = { pickWC: 0, ray: 0, gH: 0, frames: 0, stacks: [], wrapped: false };
    const iv = setInterval(() => {
      const C = window.__c3dCesium;
      const V = window.__c3dViewer;
      if (!C || !V || (window).__pk.wrapped) return;
      (window).__pk.wrapped = true;
      clearInterval(iv);
      const P = (window).__pk;
      const rec = (key) => {
        if (P.stacks.length < 8) {
          const st = new Error().stack || "";
          P.stacks.push(key + " ⟶\n" + st.split("\n").slice(2, 9).join("\n"));
        }
      };
      try {
        const g = V.scene.globe;
        const proto = Object.getPrototypeOf(g);
        if (proto.pickWorldCoordinates) {
          const o = proto.pickWorldCoordinates;
          proto.pickWorldCoordinates = function (...a) { P.pickWC++; rec("globe.pickWorldCoordinates"); return o.apply(this, a); };
        }
        if (proto.getHeight) {
          const o2 = proto.getHeight;
          proto.getHeight = function (...a) { P.gH++; return o2.apply(this, a); };
        }
        if (C.TerrainPicker && C.TerrainPicker.prototype && C.TerrainPicker.prototype.rayIntersect) {
          const o3 = C.TerrainPicker.prototype.rayIntersect;
          C.TerrainPicker.prototype.rayIntersect = function (...a) { P.ray++; rec("TerrainPicker.rayIntersect"); return o3.apply(this, a); };
        }
        V.scene.preRender.addEventListener(() => { P.frames++; });
      } catch (e) {
        (window).__pk.err = String(e);
      }
    }, 30);
  });

  await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(4000);
  await page.evaluate(() => document.querySelector('[data-testid="cartina-3d"]')?.scrollIntoView({ block: "center" }));
  await page.waitForTimeout(1500);
  const t0 = Date.now();
  await page.locator('button:has-text("Apri la mappa 3D")').first().tap();
  say("— tap");

  // leggi i contatori appena il thread risponde (max 3 tentativi da 15 s)
  for (let round = 0; round < 8; round++) {
    await page.waitForTimeout(15000);
    const res = await Promise.race([
      page.evaluate(() => JSON.stringify(window.__pk)).then((v) => v),
      new Promise((r) => setTimeout(() => r(null), 8000)),
    ]);
    const dt = ((Date.now() - t0) / 1000).toFixed(0);
    if (!res) {
      say(`t+${dt}s: thread ancora bloccato`);
      continue;
    }
    const p = JSON.parse(res);
    say(`t+${dt}s: pickWorldCoordinates=${p.pickWC} · TerrainPicker.rayIntersect=${p.ray} · globe.getHeight=${p.gH} · frames=${p.frames} · wrapped=${p.wrapped}`);
    if (p.stacks?.length) {
      for (const s of p.stacks.slice(0, 8)) say("— stack chiamante —\n" + s);
    }
    break;
  }
  await browser.close();
  say("FINE");
})().catch((e) => { say("FATAL: " + e.message); process.exit(1); });
