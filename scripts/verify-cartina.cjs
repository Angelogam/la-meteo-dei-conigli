/**
 * Verifica "Cartina dei decolli" (CartinaMeteo) su build di preview o produzione.
 *
 *   node scripts/verify-cartina.js                       → http://localhost:8321 con mock Open-Meteo
 *   BASE_URL=http://localhost:8321 node scripts/...      → porta diversa
 *   MOCK=0 BASE_URL=https://la-meteo-dei-conigli.vercel.app node scripts/...
 *                                                         → dati reali del proxy Vercel (senza mock)
 */
const { chromium } = require("@playwright/test");

const BASE_URL = process.env.BASE_URL || "http://localhost:8321";
const USE_MOCK = process.env.MOCK !== "0";

const { installMock } = require("./lib/open-meteo-mock.cjs");

/* ------------------------------- verifica ------------------------------- */
const results = [];
function check(name, ok, extra = "") {
  results.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${extra ? " — " + extra : ""}`);
}

(async () => {
  const browser = await chromium.launch();
  const errors = [];
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, timezoneId: "Europe/Rome" });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(String(e)));

  if (USE_MOCK) await installMock(page);

  console.log(`\n=== CARTINA DECOLLI — ${BASE_URL} (mock: ${USE_MOCK}) ===\n`);
  await page.goto(BASE_URL, { waitUntil: "domcontentloaded", timeout: 60000 });

  await page.waitForSelector(".cmap-panel", { timeout: 45000 }).catch(() => {});
  check("Pannello Cartina presente", await page.locator(".cmap-panel").count() > 0);
  await page.locator(".cmap-panel").scrollIntoViewIfNeeded().catch(() => {});
  await page.waitForTimeout(4000); // dati + tiles + primo draw

  check("Mappa Leaflet inizializzata", await page.locator(".cmap-leaflet.leaflet-container").count() > 0);
  const markerCount = await page.locator(".cmap-marker").count();
  check("24 marker decolli", markerCount === 24, `trovati ${markerCount}`);
  check("Canvas aloni termici presente", await page.locator(".cmap-heat-canvas").count() > 0);

  const tiles = await page.locator(".leaflet-tile-loaded").count();
  if (tiles === 0) console.log("WARN: nessuna tile caricata (rete nel sandbox?) — non bloccante");

  const readout1 = (await page.locator(".cmap-readout").innerText().catch(() => "")) || "";
  check("Readout ora/giorno attivo", /\d{2}:00/.test(readout1), readout1.replace(/\n/g, " · "));

  // aloni termici dipendono dai dati: con mock devono esserci pixel colorati
  const heatPixels = await page.evaluate(() => {
    const c = document.querySelector(".cmap-heat-canvas");
    if (!c) return -1;
    const ctx = c.getContext("2d");
    const data = ctx.getImageData(0, 0, c.width, c.height).data;
    let n = 0;
    for (let i = 3; i < data.length; i += 40) if (data[i] > 0) n++;
    return n;
  });
  if (USE_MOCK) check("Aloni termici dipinti sul canvas", heatPixels > 50, `${heatPixels} pixel campionati`);
  else console.log(`INFO pixel aloni (dati reali): ${heatPixels}`);

  /* ---- BATCH: i dati dei decolli arrivano con una sola richiesta /api/decolli-batch ---- */
  const loadedTxt = (await page.locator(".cmap-loaded").innerText().catch(() => "")) || "";
  const batchOk = /^24\/24/.test(loadedTxt.trim());
  check("Batch decolli caricato (24/24 siti con dati)", batchOk, `"${loadedTxt.trim()}"`);

  /* ---- livello VENTO + scroller quota ---- */
  await page.locator('[data-testid="cartina-decolli"] .cmap-lbtn', { hasText: "Vento" }).click();
  await page.waitForTimeout(1200);
  const windMarkers = await page.locator(".cmap-marker.is-windlayer").count();
  check("Frecce vento sui 24 decolli", windMarkers === 24, `${windMarkers}`);
  const particlePixels = await page.evaluate(() => {
    const c = document.querySelector(".cmap-heat-canvas");
    if (!c) return -1;
    const ctx = c.getContext("2d");
    const data = ctx.getImageData(0, 0, c.width, c.height).data;
    let n = 0;
    for (let i = 3; i < data.length; i += 8) if (data[i] > 10) n++;
    return n;
  });
  check("Particelle di vento animate sul canvas", particlePixels > 120, `${particlePixels} px campionati`);
  const altStepsCount = await page.locator(".cmap-alt-step").count();
  check(`Scroller quota con livelli (≥5)`, altStepsCount >= 5, `${altStepsCount} livelli`);
  if (altStepsCount >= 5) {
    const label = (await page.locator(".cmap-alt-step").nth(2).innerText()).trim();
    await page.locator(".cmap-alt-step").nth(2).click();
    await page.waitForTimeout(700);
    const ro = await page.locator(".cmap-readout").innerText();
    check(`Selezione quota "${label}" aggiorna il readout`, ro.replace(/\s/g, "").toLowerCase().includes(label.replace(/\s/g, "").toLowerCase()), ro.replace(/\n/g, " · "));
  }
  const speedTxt = await page.locator(".cmap-speed").first().innerText().catch(() => "");
  check("Valore km/h sulla freccia", speedTxt.trim().length > 0, `"${speedTxt}"`);
  await page.screenshot({ path: "/home/z/my-project/download/cartina-venti.png", clip: await clipOf(page, ".cmap-panel") });

  /* ---- ritorno a TERMICHE ---- */
  await page.locator('[data-testid="cartina-decolli"] .cmap-lbtn', { hasText: "Termiche" }).click();
  await page.waitForTimeout(900);
  check("Scroller quota nascosto nel livello Termiche", (await page.locator(".cmap-alt").count()) === 0);

  /* ---- timeline: slider + readout ---- */
  const slider = page.locator('.cmap-slider input[type="range"]');
  await slider.evaluate((el) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
    setter.call(el, "15");
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await page.waitForTimeout(900);
  const ro15 = await page.locator(".cmap-readout").innerText();
  check("Cursore ora 15 aggiorna la cartina", ro15.includes("15:00"), ro15.replace(/\n/g, " · "));

  /* ---- PLAY anima la giornata ---- */
  const hourBefore = ro15.match(/(\d{2}):00/)?.[1];
  await page.locator(".cmap-play").click();
  await page.waitForTimeout(2600);
  const roPlay = await page.locator(".cmap-readout").innerText();
  const hourAfter = roPlay.match(/(\d{2}):00/)?.[1];
  check("PLAY avanza le ore", hourAfter !== hourBefore, `${hourBefore} → ${hourAfter}`);
  await page.locator(".cmap-play").click(); // pausa
  await page.waitForTimeout(300);

  /* ---- pannello dettaglio al click sul marker ---- */
  await page.locator(".cmap-marker").nth(4).click({ force: true });
  await page.waitForTimeout(700);
  const panelName = (await page.locator(".cmap-panelbox h3").innerText().catch(() => "")).trim();
  check("Click marker apre pannello dettaglio", panelName.length > 0, `"${panelName}"`);
  const bars = await page.locator(".cmap-bar").count();
  check("Barre orarie del pannello (6–22)", bars === 17, `${bars}`);
  if (bars >= 10) {
    await page.locator(".cmap-bar").nth(4).click(); // ora 10
    await page.waitForTimeout(700);
    const roBar = await page.locator(".cmap-readout").innerText();
    check("Click barra ora aggiorna la cartina", roBar.includes("10:00"), roBar.replace(/\n/g, " · "));
  }
  const verdictTxt = await page.locator(".cmap-verdict strong").innerText().catch(() => "");
  check("Verdetto di volo nel pannello", verdictTxt.length > 0, `"${verdictTxt}"`);
  await page.screenshot({ path: "/home/z/my-project/download/cartina-panel.png", clip: await clipOf(page, ".cmap-panel") });

  /* ---- "Vai a questo decollo" seleziona il sito ---- */
  const navBefore = (await page.locator(".flight-nav-current strong").innerText().catch(() => "")).trim();
  await page.locator(".cmap-use").click().catch(() => {});
  await page.waitForTimeout(1200);
  const navAfter = (await page.locator(".flight-nav-current strong").innerText().catch(() => "")).trim();
  check("«Vai a questo decollo» seleziona il sito", navAfter === panelName, `"${navBefore}" → "${navAfter}"`);

  /* ---- livelli Nuvole e Pioggia + cambio base ---- */
  await page.locator('[data-testid="cartina-decolli"] .cmap-lbtn', { hasText: "Nuvole" }).click();
  await page.waitForTimeout(600);
  await page.locator('[data-testid="cartina-decolli"] .cmap-lbtn', { hasText: "Pioggia" }).click();
  await page.waitForTimeout(600);
  check("Livelli Nuvole/Pioggia senza errori", errors.length === 0);
  await page.locator('[data-testid="cartina-decolli"] .cmap-bbtn', { hasText: "Terreno" }).click();
  await page.waitForTimeout(900);
  check("Cambio base cartografica", (await page.locator(".cmap-bbtn.is-active").innerText()).trim() === "Terreno");
  await page.locator('[data-testid="cartina-decolli"] .cmap-lbtn', { hasText: "Termiche" }).click();
  await page.locator('[data-testid="cartina-decolli"] .cmap-bbtn', { hasText: "Notturna" }).click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: "/home/z/my-project/download/cartina-desktop.png", clip: await clipOf(page, ".cmap-panel") });

  check("0 errori JavaScript (desktop)", errors.length === 0, errors.slice(0, 2).join(" | "));

  /* ------------------------------- mobile ------------------------------- */
  const mctx = await browser.newContext({ viewport: { width: 390, height: 844 }, timezoneId: "Europe/Rome" });
  const mpage = await mctx.newPage();
  const merrors = [];
  mpage.on("pageerror", (e) => merrors.push(String(e)));
  if (USE_MOCK) await installMock(mpage);
  await mpage.goto(BASE_URL, { waitUntil: "domcontentloaded", timeout: 60000 });
  await mpage.waitForSelector(".cmap-panel", { timeout: 45000 }).catch(() => {});
  await mpage.locator(".cmap-panel").scrollIntoViewIfNeeded().catch(() => {});
  await mpage.waitForTimeout(3500);
  const mMarkers = await mpage.locator(".cmap-marker").count();
  check("Mobile: 24 marker", mMarkers === 24, `${mMarkers}`);
  await mpage.locator(".cmap-marker").nth(2).click({ force: true });
  await mpage.waitForTimeout(800);
  const pb = await mpage.locator(".cmap-panelbox").boundingBox();
  const mapBox = await mpage.locator(".cmap-map").boundingBox();
  const isBottomSheet = pb && mapBox ? pb.y > mapBox.y + mapBox.height / 2 : false;
  check("Mobile: pannello come foglio inferiore", isBottomSheet, pb ? `y=${Math.round(pb.y)}` : "no panel");
  const overflow = await mpage.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check("Mobile: nessun overflow orizzontale", overflow <= 0, `${overflow}px`);
  await mpage.screenshot({ path: "/home/z/my-project/download/cartina-mobile.png" });
  check("Mobile: 0 errori JS", merrors.length === 0, merrors.slice(0, 2).join(" | "));

  await browser.close();

  const pass = results.filter((r) => r.ok).length;
  console.log(`\n=== ${pass}/${results.length} PASS ===`);
  process.exit(pass === results.length ? 0 : 1);

  async function clipOf(pg, sel) {
    const b = await pg.locator(sel).first().boundingBox();
    return b
      ? { x: Math.max(0, b.x - 4), y: Math.max(0, b.y - 4), width: Math.min(b.width + 8, 1430), height: Math.min(b.height + 8, 890) }
      : undefined;
  }
})().catch((e) => {
  console.error("ERRORE SCRIPT:", e);
  process.exit(2);
});
