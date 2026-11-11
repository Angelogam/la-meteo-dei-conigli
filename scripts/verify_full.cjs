/* Verifica estesa: hero+sponsor, report toolbar (giorni+WhatsApp), cartina,
   mobile, reduced-motion, audit errori console/pageerror. Mock Open-Meteo. */
const { chromium } = require('@playwright/test');
const path = require('path');
const fs = require('fs');
const ts = require('typescript');

const mockTs = path.join(__dirname, '..', 'e2e', 'helpers', 'mockOpenMeteo.ts');
const source = fs.readFileSync(mockTs, 'utf8');
const js = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
}).outputText;
const mockModule = { exports: {} };
new Function('module', 'exports', 'require', js)(mockModule, mockModule.exports, require);
const { installOpenMeteoMock } = mockModule.exports;

(async () => {
  const outDir = '/home/z/my-project/shots/verify';
  fs.mkdirSync(outDir, { recursive: true });
  const base = process.env.BASE_URL || 'http://localhost:4173';
  const browser = await chromium.launch();
  const errors = [];

  const newPage = async (name, viewport, opts = {}) => {
    const ctx = await browser.newContext({ viewport, ...opts });
    const page = await ctx.newPage();
    await installOpenMeteoMock(page);
    page.on('pageerror', (e) => errors.push(`[${name}] pageerror: ${e.message}`));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(`[${name}] console: ${m.text().slice(0, 160)}`); });
    await page.goto(base, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(3000);
    return { ctx, page };
  };

  /* 1 · HERO + SPONSOR (desktop) */
  {
    const { ctx, page } = await newPage('hero', { width: 1440, height: 900 });
    const hero = page.locator('.hero-foto');
    await hero.screenshot({ path: path.join(outDir, '1-hero-desktop.png') });
    const strip = page.locator('.sponsor-strip');
    const nLogos = await page.locator('.sponsor-strip__card img').count();
    console.log('sponsor card renderizzate:', nLogos);
    await strip.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await strip.screenshot({ path: path.join(outDir, '2-sponsor.png') });
    await ctx.close();
  }

  /* 2 · REPORT TOOLBAR: giorni + WhatsApp, cambio giorno */
  {
    const { ctx, page } = await newPage('report', { width: 1440, height: 900 });
    // vai al tab Report
    await page.getByTestId('tab-meteo').click();
    await page.waitForTimeout(1500);
    const stage = page.locator('[data-testid="report-giornata-stage"]');
    await stage.scrollIntoViewIfNeeded();
    await page.waitForTimeout(2500);
    const days = page.locator('[data-testid^="report-giorno-"]');
    const nDays = await days.count();
    console.log('bottoni giorno nel report:', nDays);
    const waBtn = page.locator('.report-giornata__export--wa');
    console.log('bottone WhatsApp presente:', await waBtn.count());
    await page.locator('.report-giornata').screenshot({ path: path.join(outDir, '3-report-oggi.png') });
    // clicca Domani → la data nel titolo deve cambiare
    const heading = page.locator('.report-giornata .flight-subsection-heading h2').first();
    const titleBefore = await heading.innerText();
    await days.nth(1).click();
    await page.waitForTimeout(2500);
    const titleAfter = await heading.innerText();
    console.log('titolo report prima:', titleBefore.trim(), '| dopo Domani:', titleAfter.trim(), '| cambiato:', titleBefore !== titleAfter);
    await page.locator('.report-giornata').screenshot({ path: path.join(outDir, '4-report-domani.png') });
    await ctx.close();
  }

  /* 3 · CARTINA 2D visibile e marker */
  {
    const { ctx, page } = await newPage('cartina', { width: 1440, height: 900 });
    const cartina = page.getByTestId('cartina-decolli');
    try {
      await cartina.waitFor({ state: 'visible', timeout: 25000 });
      await cartina.scrollIntoViewIfNeeded();
      await page.waitForTimeout(3000);
      await cartina.screenshot({ path: path.join(outDir, '5-cartina.png') });
      console.log('cartina 2D: visibile');
    } catch { errors.push('[cartina] cartina-decolli non visibile'); }
    await ctx.close();
  }

  /* 4 · MOBILE: hero + sponsor + card orarie */
  {
    const { ctx, page } = await newPage('mobile', { width: 390, height: 844 });
    await page.screenshot({ path: path.join(outDir, '6-mobile-top.png') });
    const cards = page.locator('[data-testid^="hour-card-"]');
    try {
      await cards.first().waitFor({ state: 'visible', timeout: 20000 });
      console.log('mobile: card orarie =', await cards.count());
    } catch { errors.push('[mobile] card orarie non visibili'); }
    await ctx.close();
  }

  /* 5 · REDUCED MOTION: tutto visibile statico */
  {
    const { ctx, page } = await newPage('reduced', { width: 1440, height: 900 }, { reducedMotion: 'reduce' });
    const heroTitle = page.locator('.hero-foto__title');
    const visible = await heroTitle.isVisible();
    console.log('reduced-motion: titolo hero visibile =', visible);
    const stripImgs = await page.locator('.sponsor-strip__card img').count();
    console.log('reduced-motion: sponsor visibili =', stripImgs);
    await page.locator('.hero-foto').screenshot({ path: path.join(outDir, '7-hero-reduced.png') });
    await ctx.close();
  }

  await browser.close();
  console.log(errors.length ? `ERRORI (${errors.length}):\n` + errors.slice(0, 15).join('\n') : 'NESSUN ERRORE JS/CONSOLE');
})();
