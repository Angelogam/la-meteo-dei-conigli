/* Screenshot card espansa completa (tile inclusi) */
const { chromium } = require("@playwright/test");

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, timezoneId: "Europe/Rome" });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message.slice(0, 120)));

  await page.goto("http://localhost:8080/", { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(12000);

  const card = page.locator(".dxc-card").first();
  await card.scrollIntoViewIfNeeded();
  await page.waitForTimeout(600);
  await card.click();
  await page.waitForTimeout(1500);
  await card.screenshot({ path: "/home/z/my-project/shots-local/aero-card-full.png" });

  console.log("JS errors:", errors.length ? errors.join(" | ") : "nessuno");
  await browser.close();
})();
