/* Verifica PRODUZIONE: card complete ripristinate (windgram, bussola, verdetto) */
const { chromium } = require("@playwright/test");

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    timezoneId: "Europe/Rome",
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push("PAGEERROR: " + e.message));

  await page.goto("https://la-meteo-dei-conigli.vercel.app/", { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForTimeout(15000);

  const counts = {};
  for (const sel of [".dxc-card", ".dxc-wg2", ".dxc-compass", ".dxc-verdict", ".dxc-windstrip"]) {
    counts[sel] = await page.locator(sel).count();
  }
  console.log("PRODUZIONE:", JSON.stringify(counts));

  const card = page.locator(".dxc-card").first();
  if (await card.count()) {
    await card.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1500);
    await card.screenshot({ path: "/home/z/my-project/shots-local/prod-card.png" });
  }
  console.log("JS errors:", errors.length ? errors.slice(0, 5).join("\n") : "nessuno");
  await browser.close();
})();
