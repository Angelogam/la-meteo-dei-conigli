// Verifica visiva produzione: homepage desktop, promo motion, mobile
const { chromium } = require('playwright');
const PROD = 'https://la-meteo-dei-conigli.vercel.app';

(async () => {
  const browser = await chromium.launch();
  const shots = [];
  async function shot(name, url, opts = {}) {
    const ctx = await browser.newContext({
      viewport: opts.viewport || { width: 1440, height: 900 },
      ...(opts.mobile ? { isMobile: true, hasTouch: true } : {}),
      deviceScaleFactor: 1,
    });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 });
      await page.waitForTimeout(opts.wait || 3000);
      if (opts.scroll) { await page.evaluate(opts.scroll); await page.waitForTimeout(1500); }
      await page.screenshot({ path: `/tmp/render/${name}.png`, fullPage: !!opts.fullpage });
      console.log(`OK ${name} | ${url}${errors.length ? ' | JS-ERRORS: ' + errors.join(' ; ').slice(0, 200) : ''}`);
      shots.push(name);
    } catch (e) { console.log(`FAIL ${name}: ${e.message.split('\n')[0]}`); }
    await ctx.close();
  }
  // 1. Homepage desktop (hero + animazione titolo)
  await shot('01-home-desktop', PROD);
  // 2. Promo motion opener (bang-motion)
  await shot('02-promo', PROD + '/promo/index.html', { wait: 6000 });
  // 3. Mobile homepage
  await shot('03-home-mobile', PROD, { viewport: { width: 390, height: 844 }, mobile: true, wait: 4000 });
  await browser.close();
  console.log('DONE', shots.join(','));
})();
