/* Screenshot della produzione per diagnosi visiva (come la vede l'utente) */
const { chromium } = require("@playwright/test");

(async () => {
  const outDir = "/home/z/my-project/shots";
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
    if (m.type() === "error") errors.push("CONSOLE: " + m.text().slice(0, 300));
  });

  await page.goto("https://la-meteo-dei-conigli.vercel.app/", {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await page.waitForTimeout(9000); // dati + DEM

  // hero
  await page.screenshot({ path: outDir + "/01-hero.png" });

  // cartina (scroll)
  const cartina = page.locator('[data-testid="cartina-decolli"]');
  if (await cartina.count()) {
    await cartina.scrollIntoViewIfNeeded();
    await page.waitForTimeout(3500);
    await cartina.screenshot({ path: outDir + "/02-cartina.png" });
  } else {
    console.log("CARTINA NON TROVATA");
  }

  // sidebar decolli
  const sidebar = page.locator("#flight-site-list");
  if (await sidebar.count()) {
    await sidebar.screenshot({ path: outDir + "/03-sidebar.png" }).catch(() => {});
  }

  // sezione analisi/tabs
  await page.evaluate(() => document.getElementById("details-section")?.scrollIntoView());
  await page.waitForTimeout(1500);
  await page.screenshot({ path: outDir + "/04-tabs.png" });

  console.log("JS errors:", errors.length ? errors.slice(0, 10).join("\n") : "nessuno");
  await browser.close();
})();
