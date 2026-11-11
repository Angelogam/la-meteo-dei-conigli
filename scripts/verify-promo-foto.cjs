// Verifica promo senza grafica vettoriale: seek a momenti chiave (?clean=1)
const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 960, height: 540 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://localhost:8931/promo/index.html?clean=1', { waitUntil: 'networkidle', timeout: 45000 });
  await page.waitForTimeout(2500); // font + foto
  const times = [[2.2,'01-alba-domanda'],[8.5,'02-bollettino'],[15.6,'03-timbro-go'],
                 [16.5,'04-transizione-luce'],[19.5,'05-decollo-foto'],[24.6,'06-titolo-valle'],[28.5,'07-brand']];
  for (const [t,name] of times) {
    await page.evaluate(tt => window.OPENER.seek(tt), t);
    await page.waitForTimeout(420);
    await page.screenshot({ path: `/tmp/render/promo-${name}.png` });
    console.log('OK', name);
  }
  // loop check: torna a 0 e riparte
  await page.evaluate(() => window.OPENER.seek(30.98));
  await page.waitForTimeout(600);
  const state = await page.evaluate(() => ({ t: window.OPENER.tl.time(), paused: window.OPENER.tl.paused() }));
  console.log('fine loop →', JSON.stringify(state));
  console.log(errors.length ? 'JS-ERRORS: ' + errors.join(' ; ') : '0 errori JS');
  await browser.close();
})();
