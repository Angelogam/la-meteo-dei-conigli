/* Screenshot card senza windgram */
const { chromium } = require("@playwright/test");

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    timezoneId: "Europe/Rome",
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push("PAGEERROR: " + e.message));

  await page.goto("http://localhost:8080/", { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(12000);

  const counts = {
    card: await page.locator(".dxc-card").count(),
    windgramResiduo: await page.locator(".dxc-card .dxc-wg2").count(),
    infobar: await page.locator(".dxc-infobar").count(),
    bussola: await page.locator(".dxc-compass").count(),
  };
  console.log("Card:", JSON.stringify(counts));

  const card = page.locator(".dxc-card").first();
  if (await card.count()) {
    await card.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1200);
    await card.screenshot({ path: "/home/z/my-project/shots-local/card-no-windgram.png" });
  }
  console.log("JS errors:", errors.length ? errors.slice(0, 5).join("\n") : "nessuno");
  await browser.close();
})();
