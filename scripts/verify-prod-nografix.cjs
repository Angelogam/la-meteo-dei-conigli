// Verifica produzione: promo senza grafica vettoriale (post-push 13557ba)
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 960, height: 540 } });
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto('https://la-meteo-dei-conigli.vercel.app/promo/index.html?clean=1', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(2500);
  for (const [t, name] of [[8.5, 'prod-02-bollettino'], [19.5, 'prod-05-decollo'], [24.6, 'prod-06-titolo'], [28.5, 'prod-07-brand']]) {
    await page.evaluate(tt => window.OPENER.seek(tt), t);
    await page.waitForTimeout(420);
    await page.screenshot({ path: `/tmp/render/${name}.png` });
    console.log('OK', name);
  }
  console.log(errs.length ? 'JS-ERRORS: ' + errs.join(';').slice(0, 200) : '0 errori JS promo');
  await browser.close();
})();
