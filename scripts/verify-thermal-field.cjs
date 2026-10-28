/**
 * Verifica CAMPO TERMICO stile Meteo-Parapente (CartinaMeteo + thermalField).
 *
 *   node scripts/verify-thermal-field.cjs                    → http://localhost:8321 con mock Open-Meteo
 *   BASE_URL=https://la-meteo-dei-conigli.vercel.app MOCK=0 node scripts/verify-thermal-field.cjs
 *
 * Controlla: DEM AWS caricato, campo dipinto sul canvas, il campo CAMBIA con l'ora
 * (sole che ruota), picco nel readout, pannello con barre colorate per valore,
 * livello vento, zoom senza errori, mobile senza overflow.
 */
const { chromium } = require("@playwright/test");

const BASE_URL = process.env.BASE_URL || "http://localhost:8321";
const USE_MOCK = process.env.MOCK !== "0";
const { installMock } = require("./lib/open-meteo-mock.cjs");

const results = [];
function check(name, ok, extra = "") {
  results.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${extra ? " — " + extra : ""}`);
}

async function fieldPixels(pg) {
  return pg.evaluate(() => {
    const c = document.querySelector(".cmap-heat-canvas");
    if (!c) return -1;
    const ctx = c.getContext("2d");
    const data = ctx.getImageData(0, 0, c.width, c.height).data;
    let n = 0;
    for (let i = 3; i < data.length; i += 64) if (data[i] > 12) n++;
    return n > 0 ? n : 0;
  });
}

/** impronta del pattern colori del campo: cambia se cambiano i valori/celle dipinti */
async function fieldHash(pg) {
  return pg.evaluate(() => {
    const c = document.querySelector(".cmap-heat-canvas");
    if (!c) return -1;
    const ctx = c.getContext("2d");
    const data = ctx.getImageData(0, 0, c.width, c.height).data;
    let h = 0;
    for (let i = 0; i < data.length; i += 256) {
      if (data[i + 3] > 12) h = (h + data[i] * 3 + data[i + 1] * 5 + data[i + 2] * 7) % 4294967296;
    }
    return h;
  });
}

async function setHour(pg, h) {
  await pg.locator('.cmap-slider input[type="range"]').evaluate((el, val) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
    setter.call(el, String(val));
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }, h);
}

(async () => {
  const browser = await chromium.launch();
  const errors = [];
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, timezoneId: "Europe/Rome" });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(String(e)));
  if (USE_MOCK) await installMock(page);

  console.log(`\n=== CAMPO TERMICO METEO-PARAPENTE — ${BASE_URL} (mock: ${USE_MOCK}) ===\n`);
  await page.goto(BASE_URL, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForSelector(".cmap-panel", { timeout: 45000 }).catch(() => {});
  await page.locator(".cmap-panel").scrollIntoViewIfNeeded().catch(() => {});

  check("Pannello Cartina presente", (await page.locator(".cmap-panel").count()) > 0);
  check("Nota didattica del livello presente", (await page.locator(".cmap-hint").count()) > 0);

  /* attende che il CAMPO sia davvero pronto: picco compilato (o fallback dichiarato) */
  const demReady = await page
    .waitForFunction(
      () => {
        const peak = document.querySelector('[data-testid="cartina-peak"]');
        if (peak && peak.textContent && /picco|stabile/i.test(peak.textContent)) return true;
        const warns = [...document.querySelectorAll(".cmap-hint.is-warn")];
        return warns.some((w) => /non disponibile/i.test(w.textContent || ""));
      },
      { timeout: 45000 },
    )
    .then(() => true)
    .catch(() => false);

  const warnText = (await page.locator(".cmap-hint.is-warn").allInnerTexts().catch(() => [])).join(" ");
  check("Terreno reale (DEM) caricato", demReady && !/non disponibile/i.test(warnText), warnText || "campo attivo");
  await page.waitForTimeout(1500);

  /* campo dipinto sull'ora iniziale (9-18, sempre di giorno col mock) */
  const px1 = await fieldPixels(page);
  check("Campo termico dipinto sul canvas", px1 > 150, `${px1} pixel campionati`);

  const peak1 = (await page.locator('[data-testid="cartina-peak"]').innerText().catch(() => "")) || "";
  check("Picco ascendenze nel readout", /picco \+\d([.,]\d)? m\/s|aria stabile/i.test(peak1), `"${peak1}"`);

  /* il campo CAMBIA con l'ora: il sole ruota, si accendono pendii diversi */
  await setHour(page, 9);
  await page.waitForTimeout(1100);
  const px9 = await fieldPixels(page);
  const hash9 = await fieldHash(page);
  await setHour(page, 16);
  await page.waitForTimeout(1100);
  const px16 = await fieldPixels(page);
  const hash16 = await fieldHash(page);
  const peak16 = (await page.locator('[data-testid="cartina-peak"]').innerText().catch(() => "")) || "";
  check("Il campo evolve con l'ora (9h vs 16h)", px9 > 500 && px16 > 500 && hash9 !== hash16, `px 9h=${px9} · 16h=${px16} · hash ${hash9 % 100000} → ${hash16 % 100000}`);
  check("Readout picco aggiornato all'ora 16", /picco \+\d([.,]\d)? m\/s|aria stabile/i.test(peak16), `"${peak16}"`);
  await page.screenshot({ path: "/home/z/my-project/download/field-16h.png", clip: await clipOf(page, ".cmap-panel") });

  /* pannello dettaglio con barre colorate per valore */
  await page.locator(".cmap-marker").nth(5).click({ force: true });
  await page.waitForTimeout(800);
  const panelName = ((await page.locator(".cmap-panelbox h3").innerText().catch(() => "")) || "").trim();
  check("Click marker apre la scheda di volo", panelName.length > 0, `"${panelName}"`);
  const bars = await page.locator(".cmap-bar").count();
  check("17 barre orarie (06–22)", bars === 17, `${bars}`);
  const filled = await page.evaluate(() => {
    const bars = [...document.querySelectorAll(".cmap-bar i")];
    let withColor = 0;
    for (const b of bars) {
      const bg = getComputedStyle(b).backgroundImage + getComputedStyle(b).backgroundColor;
      if (bg.includes("linear-gradient") || /rgb\((?!148, 163, 184)/.test(bg)) withColor++;
    }
    return withColor;
  });
  check("Barre colorate con la scala m/s", filled >= 8, `${filled}/17 con gradiente termico`);
  const hoursLabels = await page.locator(".cmap-slot small").allInnerTexts();
  check("Tacche orarie ogni 3h (06,09,12,15,18,21)", ["06", "09", "12", "15", "18", "21"].every((h) => hoursLabels.includes(h)), hoursLabels.filter(Boolean).join(","));
  await page.locator(".cmap-bar").nth(9).click(); // ora 15
  await page.waitForTimeout(800);
  const roBar = (await page.locator(".cmap-readout").innerText()) || "";
  check("Click barra ora 15 aggiorna la cartina", roBar.includes("15:00"), roBar.replace(/\n/g, " · "));
  await page.screenshot({ path: "/home/z/my-project/download/field-panel.png", clip: await clipOf(page, ".cmap-panel") });

  /* livello vento e ritorno */
  await page.locator('[data-testid="cartina-decolli"] .cmap-lbtn', { hasText: "Vento" }).click();
  await page.waitForTimeout(900);
  check("Livello Vento: 24 frecce", (await page.locator(".cmap-marker.is-windlayer").count()) === 24);
  await page.locator('[data-testid="cartina-decolli"] .cmap-lbtn', { hasText: "Termiche" }).click();
  await page.waitForTimeout(1200);
  const pxBack = await fieldPixels(page);
  check("Ritorno a Termiche: campo ridipinto", pxBack > 100, `${pxBack} pixel`);

  /* zoom in: la geometria si riproietta senza errori */
  await page.locator(".leaflet-control-zoom-in").click();
  await page.locator(".leaflet-control-zoom-in").click();
  await page.waitForTimeout(2200);
  const pxZoom = await fieldPixels(page);
  check("Dopo zoom: campo ancora dipinto", pxZoom > 100, `${pxZoom} pixel`);
  await page.screenshot({ path: "/home/z/my-project/download/field-zoom.png", clip: await clipOf(page, ".cmap-panel") });

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
  await mpage.waitForTimeout(4000);
  const mpx = await fieldPixels(mpage);
  check("Mobile: campo termico dipinto", mpx > 800, `${mpx} pixel`);
  await mpage.locator(".cmap-marker").nth(2).click({ force: true });
  await mpage.waitForTimeout(800);
  const pb = await mpage.locator(".cmap-panelbox").boundingBox();
  const mapBox = await mpage.locator(".cmap-map").boundingBox();
  const isBottomSheet = pb && mapBox ? pb.y > mapBox.y + mapBox.height / 2 : false;
  check("Mobile: scheda come foglio inferiore", isBottomSheet, pb ? `y=${Math.round(pb.y)}` : "no panel");
  const overflow = await mpage.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check("Mobile: nessun overflow orizzontale", overflow <= 0, `${overflow}px`);
  await mpage.screenshot({ path: "/home/z/my-project/download/field-mobile.png" });
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
