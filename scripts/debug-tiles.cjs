/* Debug: verifica classe e filtro sulle tile terreno + conteggio pixel particelle */
const { chromium } = require("@playwright/test");

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, timezoneId: "Europe/Rome" });
  page.on("pageerror", (e) => console.log("PAGEERROR:", e.message));

  await page.goto("http://localhost:8080/", { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(9000);
  await page.locator('[data-testid="cartina-decolli"]').scrollIntoViewIfNeeded();
  await page.waitForTimeout(1500);

  const base = await page.evaluate(() => {
    const el = document.querySelector(".cmap-terreno-tiles");
    if (!el) return { classe: "MANCA", html: document.querySelector(".cmap-leaflet")?.innerHTML.slice(0, 400) };
    const cs = getComputedStyle(el);
    return { classe: "OK", filter: cs.filter, figli: el.children.length, sampleClass: el.firstElementChild?.className };
  });
  console.log("BASE:", JSON.stringify(base));

  const vento = await page.evaluate(async () => {
    const btn = [...document.querySelectorAll(".cmap-lbtn")].find((b) => b.textContent.includes("Vento"));
    if (btn) btn.click();
    await new Promise((r) => setTimeout(r, 3000));
    const canvas = document.querySelector(".cmap-heat-canvas");
    const ctx = canvas.getContext("2d");
    const d = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let n = 0;
    for (let i = 3; i < d.length; i += 4) if (d[i] > 10) n++;
    return { px: n };
  });
  console.log("VENTO:", JSON.stringify(vento));
  await browser.close();
})();
