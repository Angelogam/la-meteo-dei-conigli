// Verifica cartina 3D (Cesium) in produzione
const { chromium } = require('playwright');
const PROD = 'https://la-meteo-dei-conigli.vercel.app';

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  try {
    await page.goto(PROD, { waitUntil: 'networkidle', timeout: 45000 });
    await page.waitForTimeout(2500);
    // clic su "Cartina termiche"
    const btn = page.locator('button, a').filter({ hasText: /Cartina termiche/i }).first();
    await btn.click({ timeout: 10000 });
    // attendi caricamento Cesium (lungo)
    await page.waitForTimeout(14000);
    await page.screenshot({ path: '/tmp/render/04-cartina3d.png' });
    console.log(`OK 04-cartina3d${errors.length ? ' | JS-ERRORS: ' + errors.join(' ; ').slice(0, 300) : ' | no js errors'}`);
  } catch (e) {
    await page.screenshot({ path: '/tmp/render/04-cartina3d-fail.png' }).catch(() => {});
    console.log(`FAIL 04-cartina3d: ${e.message.split('\n')[0]}`);
  }
  await browser.close();
})();
