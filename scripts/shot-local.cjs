/* Screenshot locale: cartina (termiche + vento) e sidebar */
const { chromium } = require("@playwright/test");

(async () => {
  const outDir = "/home/z/my-project/shots-local";
  require("fs").mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    timezoneId: "Europe/Rome",
    deviceScaleFactor: 1,
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push("PAGEERROR: " + e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push("CONSOLE: " + m.text().slice(0, 200));
  });

  await page.goto("http://localhost:8080/", { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(10000);

  const cartina = page.locator('[data-testid="cartina-decolli"]');
  if (await cartina.count()) {
    await cartina.scrollIntoViewIfNeeded();
    await page.waitForTimeout(5000);
    await cartina.screenshot({ path: outDir + "/cartina-termiche.png" });
  }

  const sidebar = page.locator("#flight-site-list");
  if (await sidebar.count()) await sidebar.screenshot({ path: outDir + "/sidebar.png" }).catch(() => {});

  // livello VENTO (particelle animate)
  const ventoBtn = page.locator(".cmap-lbtn", { hasText: "Vento" });
  if (await ventoBtn.count()) {
    await ventoBtn.click();
    await page.waitForTimeout(2600);
    await cartina.screenshot({ path: outDir + "/cartina-vento.png" });
  }

  // pagina /termiche
  await page.goto("http://localhost:8080/termiche", { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(9000);
  await page.screenshot({ path: outDir + "/termiche-page.png" });

  console.log("JS errors:", errors.length ? errors.slice(0, 8).join("\n") : "nessuno");
  await browser.close();
})();
