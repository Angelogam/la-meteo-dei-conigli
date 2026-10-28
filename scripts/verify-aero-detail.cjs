/* Verifica dettaglio aerologico espandibile al click sulla card */
const { chromium } = require("@playwright/test");

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    timezoneId: "Europe/Rome",
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push("PAGEERROR: " + e.message.slice(0, 150)));

  await page.goto("http://localhost:8080/", { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(12000);

  const card = page.locator(".dxc-card").first();
  if (await card.count()) {
    await card.scrollIntoViewIfNeeded();
    await page.waitForTimeout(800);
    await card.click(); // seleziona -> espande il dettaglio aerologico
    await page.waitForTimeout(1500);

    console.log("dxc-aero presente:", await page.locator(".dxc-aero").count());
    console.log("barre grafico:", await page.locator(".dxc-aero-bar").count());
    console.log("tile dati:", await page.locator(".dxc-aero-tile").count());
    console.log("banner condizione:", (await page.locator(".dxc-aero-banner").textContent() || "").slice(0, 80));

    // clicca la barra delle 14 per cambiare ora
    const bar14 = page.locator('.dxc-aero-bar[data-hour="14"]');
    if (await bar14.count()) {
      await bar14.click();
      await page.waitForTimeout(1200);
      console.log("dopo click barra 14, kicker:", (await page.locator(".dxc-aero-kicker").textContent() || "").trim());
    }

    await page.screenshot({ path: "/home/z/my-project/shots-local/aero-detail.png" });
    const sidebar = page.locator("#flight-site-list");
    if (await sidebar.count()) await sidebar.screenshot({ path: "/home/z/my-project/shots-local/aero-sidebar.png" });
  } else {
    console.log("NESSUNA CARD TROVATA");
  }
  console.log("JS errors:", errors.length ? errors.join(" | ") : "nessuno");
  await browser.close();
})();
