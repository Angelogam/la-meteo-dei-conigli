/* Verifica PRODUZIONE LIVE (dati reali, nessun mock):
   hero+sponsor, report (giorni+WhatsApp), sincronizzazione giorno→card orarie,
   cartina 2D/3D, card orarie cliccabili, mobile, audit errori console. */
const { chromium } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

const BASE = process.env.BASE_URL || 'https://la-meteo-dei-conigli.vercel.app';
const outDir = '/home/z/my-project/shots/prod-live';
fs.mkdirSync(outDir, { recursive: true });

(async () => {
  const browser = await chromium.launch();
  const errors = [];
  const notes = [];

  const newPage = (name, viewport, opts = {}) => browser.newContext({ viewport, ...opts }).then(async (ctx) => {
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errors.push(`[${name}] pageerror: ${e.message}`));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(`[${name}] console: ${m.text().slice(0, 200)}`); });
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(6000);
    return { ctx, page };
  });

  /* 1 · HERO + SPONSOR (desktop) */
  {
    const { ctx, page } = await newPage('hero', { width: 1440, height: 900 });
    const hero = page.locator('.hero-foto');
    if (await hero.count()) { await hero.screenshot({ path: path.join(outDir, '1-hero.png') }); notes.push('hero: presente'); }
    else errors.push('[hero] .hero-foto assente');
    const strip = page.locator('.sponsor-strip');
    if (await strip.count()) {
      const imgs = await page.locator('.sponsor-strip__card img').count();
      const first = await page.locator('.sponsor-strip__card img').first().getAttribute('src');
      const ribbons = await page.locator('.sponsor-strip__ribbon').count();
      notes.push(`sponsor: ${imgs} loghi (x2 loop), primo=${first}, nastri SPONSOR=${ribbons}`);
      await strip.scrollIntoViewIfNeeded();
      await page.waitForTimeout(400);
      await strip.screenshot({ path: path.join(outDir, '2-sponsor.png') });
    } else errors.push('[hero] sponsor-strip assente');
    await ctx.close();
  }

  /* 2 · GIORNALIERE: selezione giorno condivisa */
  {
    const { ctx, page } = await newPage('giornaliere', { width: 1440, height: 900 });
    const dayCards = page.locator('.forecast-day-card-premium');
    try { await dayCards.first().waitFor({ state: 'visible', timeout: 25000 }); } catch {}
    const n = await dayCards.count();
    notes.push(`card giornaliere: ${n}`);
    if (n >= 3) {
      await dayCards.first().scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
      await page.locator('.forecast-section').screenshot({ path: path.join(outDir, '3-giornaliere.png') }).catch(() => {});
    }
    await ctx.close();
  }

  /* 3 · REPORT: bottoni giorni + WhatsApp, cambio giorno sincronizzato */
  {
    const { ctx, page } = await newPage('report', { width: 1440, height: 900 });
    const stage = page.locator('[data-testid="report-giornata-stage"]');
    try { await stage.waitFor({ state: 'visible', timeout: 30000 }); } catch {}
    if (await stage.count()) {
      await stage.scrollIntoViewIfNeeded();
      await page.waitForTimeout(3500);
      const days = page.locator('[data-testid^="report-giorno-"]');
      const nDays = await days.count();
      const wa = page.locator('.report-giornata__export--wa');
      notes.push(`report: bottoni giorno=${nDays}, WhatsApp=${await wa.count()}`);
      await page.locator('.report-giornata').screenshot({ path: path.join(outDir, '4-report.png') }).catch(() => {});
      // prova clic su WhatsApp (in produzione potrebbe aprire wa.me in nuova scheda: intercetta popup)
      const [popup] = await Promise.all([
        page.waitForEvent('popup', { timeout: 4000 }).catch(() => null),
        wa.first().click({ timeout: 5000 }).catch((e) => errors.push(`[report] click WhatsApp: ${e.message.slice(0, 80)}`)),
      ]);
      if (popup) { const u = popup.url(); notes.push(`WhatsApp popup: ${u.slice(0, 60)}`); await popup.close(); }
      // cambio giorno → la data nelle card orarie deve cambiare
      const hourLabel = page.locator('.flight-hourly-section .flight-subsection-heading small');
      const labelBefore = (await hourLabel.count()) ? await hourLabel.first().innerText() : '(n/d)';
      if (nDays >= 2) { await days.nth(1).click().catch((e) => errors.push(`[report] click giorno: ${e.message.slice(0, 80)}`)); await page.waitForTimeout(3000); }
      const labelAfter = (await hourLabel.count()) ? await hourLabel.first().innerText() : '(n/d)';
      notes.push(`sync giorno: label card orarie "${labelBefore.trim()}" → "${labelAfter.trim()}" cambiata=${labelBefore !== labelAfter}`);
      await page.locator('.flight-hourly-section').scrollIntoViewIfNeeded().catch(() => {});
      await page.waitForTimeout(800);
      await page.locator('.flight-hourly-section').screenshot({ path: path.join(outDir, '5-card-orarie-domani.png') }).catch(() => {});
    } else errors.push('[report] report-giornata-stage non visibile');
    await ctx.close();
  }

  /* 4 · CARD ORARIE: click su una card → selezione */
  {
    const { ctx, page } = await newPage('ore', { width: 1440, height: 900 });
    const cards = page.locator('[data-testid^="hour-card-"]');
    try { await cards.first().waitFor({ state: 'visible', timeout: 30000 }); } catch {}
    const nCards = await cards.count();
    notes.push(`card orarie: ${nCards}`);
    if (nCards > 2) {
      await cards.nth(2).scrollIntoViewIfNeeded();
      await page.waitForTimeout(600);
      await cards.nth(2).click().catch((e) => errors.push(`[ore] click card: ${e.message.slice(0, 80)}`));
      await page.waitForTimeout(1200);
      const pressed = await page.locator('[data-testid^="hour-card-"][aria-pressed="true"]').count();
      notes.push(`card orarie: selezionate dopo click = ${pressed} (attese 1)`);
      await page.locator('.flight-hourly-section').screenshot({ path: path.join(outDir, '6-card-orarie-click.png') }).catch(() => {});
    } else errors.push('[ore] meno di 3 card orarie');
    await ctx.close();
  }

  /* 5 · CARTINA 2D */
  {
    const { ctx, page } = await newPage('cartina', { width: 1440, height: 900 });
    const cartina = page.getByTestId('cartina-decolli');
    try {
      await cartina.waitFor({ state: 'visible', timeout: 30000 });
      await cartina.scrollIntoViewIfNeeded();
      await page.waitForTimeout(4000);
      await cartina.screenshot({ path: path.join(outDir, '7-cartina.png') });
      notes.push('cartina 2D: visibile');
    } catch { errors.push('[cartina] cartina-decolli non visibile entro 30s'); }
    await ctx.close();
  }

  /* 6 · MOBILE */
  {
    const { ctx, page } = await newPage('mobile', { width: 390, height: 844 });
    await page.screenshot({ path: path.join(outDir, '8-mobile-top.png') });
    const cards = page.locator('[data-testid^="hour-card-"]');
    try { await cards.first().waitFor({ state: 'visible', timeout: 25000 }); notes.push(`mobile: card orarie=${await cards.count()}`); }
    catch { errors.push('[mobile] card orarie non visibili'); }
    await page.locator('.flight-hourly-section').scrollIntoViewIfNeeded().catch(() => {});
    await page.waitForTimeout(800);
    await page.locator('.flight-hourly-section').screenshot({ path: path.join(outDir, '9-mobile-card.png') }).catch(() => {});
    await ctx.close();
  }

  await browser.close();
  console.log('=== NOTE ===');
  notes.forEach((n) => console.log('·', n));
  console.log(errors.length ? `=== ERRORI (${errors.length}) ===\n${errors.slice(0, 20).join('\n')}` : '=== NESSUN ERRORE JS/CONSOLE ===');
})();
