/* Diagnostica: screenshot pagina + console errors */
const { chromium } = require("@playwright/test");

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    timezoneId: "Europe/Rome",
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push("PAGEERROR: " + e.message.slice(0, 200)));
  page.on("console", (m) => {
    if (m.type() === "error" || m.type() === "warning") errors.push(m.type().toUpperCase() + ": " + m.text().slice(0, 200));
  });

  await page.goto("http://localhost:8080/", { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(15000);

  console.log("dxc-panel:", await page.locator(".dxc-panel").count());
  console.log("dxc-card:", await page.locator(".dxc-card").count());
  console.log("flight-site-list:", await page.locator("#flight-site-list").count());
  console.log("dxc-fallback (dxc-empty):", await page.locator(".dxc-empty").count());
  console.log("--- messages ---");
  console.log(errors.length ? errors.slice(0, 10).join("\n") : "nessuno");
  await page.screenshot({ path: "/home/z/my-project/shots-local/diag-page.png", fullPage: false });
  await browser.close();
})();
