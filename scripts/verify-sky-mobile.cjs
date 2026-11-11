/* Verifica mobile: scena del cielo — clicca un marker visibile nel viewport */
const { chromium } = require("playwright");
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, timezoneId: "Europe/Rome" });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(process.env.URL || "http://localhost:8080/", { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForSelector(".cmap-marker", { timeout: 90000 });
  const cartina = page.locator('[data-testid="cartina-decolli"]');
  await cartina.scrollIntoViewIfNeeded();
  await page.waitForTimeout(2500);

  const mapBox = await page.locator(".cmap-leaflet").boundingBox();
  const n = await page.locator(".cmap-marker").count();
  let opened = false;
  for (let i = 0; i < n && !opened; i++) {
    const b = await page.locator(".cmap-marker").nth(i).boundingBox();
    if (!b || b.width === 0) continue;
    const cx = b.x + b.width / 2, cy = b.y + b.height / 2;
    // solo marker con il pallino dentro il viewport della mappa
    if (cx < mapBox.x + 10 || cx > mapBox.x + mapBox.width - 10) continue;
    if (cy < mapBox.y + 30 || cy > mapBox.y + mapBox.height - 10) continue;
    // il pallino è nella parte bassa del marker (dot sotto la label): punta lì
    await page.mouse.click(cx, b.y + b.height - 8);
    await page.waitForTimeout(1800);
    opened = (await page.locator('[data-testid="cartina-sky"]').count()) > 0;
  }
  console.log(JSON.stringify({ opened, clouds: await page.locator(".sky-cloud").count(), pg: await page.locator(".sky-pg").count(), errors }));
  if (opened) {
    const sky = page.locator('[data-testid="cartina-sky"]');
    await sky.scrollIntoViewIfNeeded();
    await page.waitForTimeout(800);
    await sky.screenshot({ path: "/home/z/my-project/shots-local/sky-mobile.png" });
  }
  await browser.close();
})();
