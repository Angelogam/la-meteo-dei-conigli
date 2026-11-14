/* Verifica visiva del windgram sistemato (asse destro + masse d'aria stile Alpium). */
const { chromium } = require("playwright");

(async () => {
  const base = process.argv[2] || "http://localhost:8080/";
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    timezoneId: "Europe/Rome",
    deviceScaleFactor: 1.5,
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));

  await page.goto(base, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(4500);

  // apre il tab Venti
  const tab = page.locator('[data-testid="tab-venti"]');
  if (await tab.count()) {
    await tab.click();
    await page.waitForTimeout(5000); // attende il sounding dei livelli di pressione
  }

  const windgram = page.locator(".alpium-windgram").first();
  const visible = await windgram.isVisible().catch(() => false);
  console.log("windgram visibile:", visible);
  if (visible) {
    // diagnosi: celle di stabilità e palette
    const diag = await page.evaluate(() => {
      const svg = document.querySelector(".alpium-windgram svg");
      const cells = [...document.querySelectorAll('[data-testid="windgram-stability-cell"]')];
      const palette = new Set(cells.map((c) => c.getAttribute("data-stability-color")));
      const texts = svg ? [...svg.querySelectorAll("text")].map((t) => t.textContent.trim()) : [];
      return {
        cells: cells.length,
        palette: palette.size,
        pressureLabels: texts.filter((t) => /hPa$/.test(t)),
        altLabels: texts.filter((t) => /^\d+ m$/.test(t)),
      };
    });
    console.log("celle stabilità:", diag.cells, "· colori unici:", diag.palette);
    console.log("pressioni (sx):", diag.pressureLabels.join(" | "));
    console.log("quote (dx):", diag.altLabels.join(" | "));

    await windgram.scrollIntoViewIfNeeded();
    await windgram.screenshot({ path: "/home/z/my-project/shots-local/windgram-fixed-full.png" });
    // zoom sull'asse destro: curve pressione vs etichette metri
    const svg = page.locator(".alpium-windgram svg").first();
    const box = await svg.boundingBox();
    if (box) {
      await page.screenshot({
        path: "/home/z/my-project/shots-local/windgram-fixed-right.png",
        clip: { x: box.x + box.width * 0.62, y: box.y + box.height * 0.25, width: box.width * 0.38, height: box.height * 0.72 },
      });
    }
  } else {
    await page.screenshot({ path: "/home/z/my-project/shots-local/windgram-missing.png", fullPage: true });
  }

  console.log("errori JS:", errors.length, errors.slice(0, 3));
  await browser.close();
})();
