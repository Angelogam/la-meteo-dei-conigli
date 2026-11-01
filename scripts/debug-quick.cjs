// Debug veloce: errori console + presenza bottone su localhost
const { chromium, devices } = require("playwright");
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices["iPhone 14"], locale: "it-IT" });
  const page = await ctx.newPage();
  const errs = [];
  page.on("pageerror", (e) => errs.push("PAGEERROR: " + String(e).slice(0, 200)));
  page.on("console", (m) => {
    if (m.type() === "error" || m.type() === "warning") errs.push(m.type() + ": " + m.text().slice(0, 160));
  });
  await page.goto("http://localhost:4174/", { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForTimeout(8000);
  const btn = await page.locator('button:has-text("Apri la mappa 3D")').count();
  const sec = await page.locator('[data-testid="cartina-3d"]').count();
  const poster = await page.locator('[data-testid="cartina-3d"]').first().innerText().catch(() => "n/d");
  console.log("bottoni «Apri la mappa 3D»:", btn, "· sezione 3D:", sec);
  console.log("poster:", poster.slice(0, 200).replace(/\n/g, " | "));
  console.log("errori:", errs.length ? "\n  " + errs.slice(0, 8).join("\n  ") : "0");
  await browser.close();
})().catch((e) => { console.error("FATAL:", e.message); process.exit(1); });
