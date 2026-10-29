/* Verifica lato destro: curve di pressione vs etichette dei metri (stessa scala). */
const { chromium } = require("playwright");

(async () => {
  const base = process.argv[2] || "http://localhost:8080/";
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1920, height: 1100 },
    timezoneId: "Europe/Rome",
    deviceScaleFactor: 1.5,
  });
  await page.goto(base, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(4500);
  const tab = page.locator('[data-testid="tab-venti"]');
  if (await tab.count()) {
    await tab.click();
    await page.waitForTimeout(5000);
  }
  const windgram = page.locator(".alpium-windgram:visible").first();
  await windgram.scrollIntoViewIfNeeded();
  await windgram.screenshot({ path: "/home/z/my-project/shots-local/windgram-alpium-wide.png" });

  // scroll del contenitore orizzontale fino a destra: deve mostrare l'asse dei metri
  const scrolled = await page.evaluate(() => {
    const scrollers = [...document.querySelectorAll(".alpium-windgram .overflow-x-auto")];
    for (const s of scrollers) {
      if (s.scrollWidth > s.clientWidth + 10) {
        s.scrollLeft = s.scrollWidth;
        return { from: s.clientWidth, to: s.scrollWidth };
      }
    }
    return null;
  });
  console.log("scroll orizzontale:", JSON.stringify(scrolled));
  await page.waitForTimeout(400);
  await windgram.screenshot({ path: "/home/z/my-project/shots-local/windgram-alpium-right.png" });
  await browser.close();
})();
