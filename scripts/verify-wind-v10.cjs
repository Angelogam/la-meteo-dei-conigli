/**
 * VERIFICA v10 — frecce ONDULATE 3D BLU per le brezze, PIATTE per il meteo,
 * ROTORI rossi di sottovento che girano su se stessi (richiesta pilota):
 *  1. barra: toggle «Brezze del pendio» presente
 *  2. default: SOLO brezze blu a coda lunga su TUTTI i rilievi (dardi > 900,
 *     chevron 0) + ROTORI rossi di sottovento presenti
 *  3. clic su una QUOTA → SOLO il vento a quel livello: brezze SPARITE,
 *     frecce meteo in quota + etichette «km/h · da X · Y m»
 *  4. «off» → tornano le brezze, i venti in quota spariscono
 *  5. nessuna pagina in errore
 * Uso: node scripts/verify-wind-v10.cjs [baseUrl]
 */
const { chromium } = require("playwright");
const fs = require("fs");

const BASE = process.argv[2] || "http://localhost:8080";
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
  const page = await browser.newPage({ viewport: { width: 1280, height: 760 } });
  page.setDefaultTimeout(40000);
  page.on("pageerror", (e) => errors.push(String(e).slice(0, 150)));

  const shot = async (name) => {
    try {
      await page.screenshot({ path: `${OUT}/${name}.png`, timeout: 90000 });
    } catch (e) {
      log(`shot ${name} fallito (non bloccante)`);
    }
  };

  log("[1] apro la pagina");
  await page.goto(BASE + "/", { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForSelector('[data-testid="cartina-3d"]', { timeout: 90000 });
  await page.evaluate(() => {
    const el = document.querySelector('[data-testid="cartina-3d"]');
    if (el) el.scrollIntoView({ block: "center", behavior: "instant" });
  });
  await page.waitForTimeout(1200);
  await page.waitForSelector('[data-testid="c3d-hud"]', { timeout: 240000 });

  /* 1. toggle rinominato */
  const out = {};
  out.toggleBrezze = await page.getByText("Brezze del pendio").count();
  out.hudBlu = await page.getByText(/frecce blu/).count();

  /* 2. default: solo brezze blu + rotori (aspetta il campo vento) */
  await page.waitForFunction(
    () => {
      const w = window.__c3dWindFlow;
      return w && w.darts > 0;
    },
    undefined,
    { timeout: 180000 },
  );
  let wf = await page.evaluate(() => window.__c3dWindFlow);
  out.dartsDefault = wf.darts;
  out.chevronsDefault = wf.chevrons;
  out.eddies = wf.eddies;
  out.rotors = wf.rotors;
  await page.waitForTimeout(2500);
  await shot("v10-brezze-blu");

  /* 3. clic su una quota → solo vento a quel livello (dispatchEvent: i check
     di actionabilità di Playwright possono bloccarsi con WebGL in SwiftShader) */
  const clickTid = async (tid) => {
    await page.evaluate((t) => {
      const el = document.querySelector(`[data-testid="${t}"]`);
      el?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    }, tid);
  };
  const qLabel = await page.evaluate(() => {
    const els = Array.from(document.querySelectorAll('[data-testid^="c3d-q-"]')).filter(
      (e) => e.getAttribute("data-testid") !== "c3d-q-off",
    );
    return els.length ? (els[0].textContent || "").trim() : "";
  });
  const firstTid = await page.evaluate(() => {
    const els = Array.from(document.querySelectorAll('[data-testid^="c3d-q-"]')).filter(
      (e) => e.getAttribute("data-testid") !== "c3d-q-off",
    );
    return els.length ? els[0].getAttribute("data-testid") : "";
  });
  await clickTid(firstTid);
  await page.waitForFunction(
    () => {
      const w = window.__c3dWindFlow;
      const hud = document.querySelector('[data-testid="c3d-hud-wind"]');
      return w && w.darts === 0 && hud && /Vento a \d+ m/.test(hud.textContent || "");
    },
    undefined,
    { timeout: 120000 },
  );
  out.quotaCliccata = qLabel;
  out.hudQuota = ((await page.locator('[data-testid="c3d-hud-wind"]').textContent()) || "").trim();
  await page.waitForTimeout(2500);
  await shot("v10-quota");

  /* etichetta quota: velocità + direzione (+ quota) nell'HUD */
  out.labQuota = /\d+ km\/h · da [A-Z]{1,3}/.test(out.hudQuota) && /Vento a \d+ m/.test(out.hudQuota);

  /* 4. off → tornano le brezze */
  await clickTid("c3d-q-off");
  await page.waitForFunction(
    () => {
      const w = window.__c3dWindFlow;
      return w && w.darts > 0;
    },
    undefined,
    { timeout: 120000 },
  );
  wf = await page.evaluate(() => window.__c3dWindFlow);
  out.dartsDopoOff = wf.darts;
  out.rotorsDopoOff = wf.rotors;
  await shot("v10-ritorno");

  out.errors = errors;
  console.log(JSON.stringify(out, null, 2));
  await browser.close();

  const fail = [];
  if (!out.toggleBrezze) fail.push("manca il toggle «Brezze del pendio»");
  if (!out.hudBlu) fail.push("l'HUD non parla di «frecce blu» (testi non aggiornati)");
  if (!(out.dartsDefault > 900)) fail.push(`brezze insufficienti: ${out.dartsDefault}`);
  if (out.chevronsDefault !== 0) fail.push("pettine meteo ancora presente a terra");
  if (!(out.rotors > 0)) fail.push("nessun rotore di sottovento visibile");
  if (!out.labQuota) fail.push("etichetta quota senza velocità/direzione/quota");
  if (out.dartsDopoOff <= 0) fail.push("le brezze non tornano con «off»");
  if (errors.length) fail.push(`pageerror: ${errors[0]}`);
  if (fail.length) {
    console.error("FAIL: " + fail.join(" | "));
    process.exit(1);
  }
  console.log("VERIFY-WIND-V10 OK");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
