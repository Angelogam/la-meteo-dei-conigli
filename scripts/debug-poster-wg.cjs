/* Diagnostica: cosa c'è dentro l'host del poster windgram? */
const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, timezoneId: "Europe/Rome" });
  const reqFailures = [];
  page.on("requestfailed", (r) => reqFailures.push(r.url().slice(0, 140) + " → " + (r.failure()?.errorText ?? "?")));
  page.on("response", (r) => { if (r.status() >= 400) reqFailures.push("HTTP " + r.status() + " " + r.url().slice(0, 140)); });

  await page.goto("http://localhost:8080/", { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForSelector("aside button", { timeout: 30000 });
  await page.waitForTimeout(5000);
  await page.locator("aside button").first().click();
  await page.waitForTimeout(3000);
  await page.getByRole("button", { name: /analisi/i }).first().click();
  await page.waitForTimeout(20000);

  const info = await page.evaluate(() => {
    const host = document.querySelector('[data-testid="poster-windgram-host"]');
    if (!host) return { host: "ASSENTE" };
    const svgs = [...host.querySelectorAll("svg")].map((s) => ({
      viewBox: s.getAttribute("viewBox"),
      w: s.clientWidth, h: s.clientHeight,
      texts: s.querySelectorAll("text").length,
    }));
    const spin = host.textContent?.includes("Caricamento") ?? false;
    const err = host.textContent?.includes("Impossibile") ?? false;
    return {
      host: "ok",
      dataReady: host.getAttribute("data-ready"),
      loading: spin,
      errorState: err,
      firstText: (host.textContent ?? "").slice(0, 160),
      svgs,
    };
  });
  console.log(JSON.stringify(info, null, 2));
  console.log("richieste fallite:", reqFailures.slice(0, 6));
  await browser.close();
})();
