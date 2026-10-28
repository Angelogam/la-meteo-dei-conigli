/* Verifica ripristino card complete: profilo d'aria, windgram, bussola, timeline */
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

  const counts = {};
  for (const sel of [".dxc-card", ".dxc-wg2", ".dxc-air", ".dxc-compass", ".dxc-tl-wrap", ".dxc-verdict", ".dxc-windstrip", ".dxc-window"]) {
    counts[sel] = await page.locator(sel).count();
  }
  console.log("Elementi nella sidebar:", JSON.stringify(counts, null, 1));

  // Screenshot della prima card completa (scrollo dentro la sidebar)
  const firstCard = page.locator(".dxc-card").first();
  if (await firstCard.count()) {
    await firstCard.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1500);
    await firstCard.screenshot({ path: "/home/z/my-project/shots-local/card-restore-full.png" });
  }

  // Screenshot hero + cartina in alto
  await page.screenshot({ path: "/home/z/my-project/shots-local/home-top.png" });

  console.log("JS errors:", errors.length ? errors.join("\n") : "nessuno");
  await browser.close();
})();
