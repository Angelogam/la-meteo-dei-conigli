// Verifica hero senza stormo SVG: solo foto reale
const { chromium } = require('@playwright/test');
(async () => {
  const browser = await chromium.launch();
  for (const [name, vp, mobile] of [['hero-desktop', { width: 1440, height: 900 }, false], ['hero-mobile', { width: 390, height: 844 }, true]]) {
    const ctx = await browser.newContext({ viewport: vp, ...(mobile ? { isMobile: true, hasTouch: true } : {}) });
    const page = await ctx.newPage();
    const errs = []; page.on('pageerror', e => errs.push(e.message));
    await page.goto('http://localhost:8932/', { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(3500);
    await page.screenshot({ path: `/tmp/render/${name}.png` });
    console.log(name, errs.length ? 'ERRORI: ' + errs.join(';').slice(0, 200) : 'ok 0 errori');
    await ctx.close();
  }
  await browser.close();
})();
