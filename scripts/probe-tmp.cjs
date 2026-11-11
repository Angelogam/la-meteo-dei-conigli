const { chromium, devices } = require("playwright");
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices["iPhone 14"], locale: "it-IT" });
  const page = await ctx.newPage();
  const errs = [], fails = [];
  page.on("pageerror", (e) => errs.push("PAGEERROR: " + String(e).slice(0, 250)));
  page.on("console", (m) => { if (m.type() === "error") errs.push("console: " + m.text().slice(0, 200)); });
  page.on("response", (r) => { if (r.status() >= 400) fails.push(r.status() + " " + r.url().slice(0, 140)); });
  await page.goto("http://localhost:4174/", { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(12000);
  const btn = await page.locator('button:has-text("Apri la mappa 3D")').count();
  const body = (await page.locator("body").innerText().catch(() => "")).slice(0, 300).replace(/\n+/g, " | ");
  console.log("bottone:", btn, "| body:", body);
  console.log("risposte >=400:", fails.length ? fails.slice(0, 8).join("\n  ") : "0");
  console.log("errori JS:", errs.length ? errs.slice(0, 6).join("\n  ") : "0");
  await browser.close();
})().catch((e) => { console.error("FATAL:", e.message); process.exit(1); });
