/* Test e2e della locandina DENTRO l'app vera (vite dev su :8080):
   1. apre il sito, seleziona un decollo
   2. va sul tab Analisi e aspetta la cattura del windgram REALE della pagina
   3. scarica retro e PDF e li salva in /tmp/render
   Verifica che il retro contenga il grafico identico alla scheda Venti. */
const { chromium } = require("playwright");
const fs = require("fs");

const OUT = "/tmp/render";
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    timezoneId: "Europe/Rome",
    deviceScaleFactor: 1,
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push("PAGEERROR: " + e.message.slice(0, 300)));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push("CONSOLE: " + m.text().slice(0, 200));
  });

  console.log("• apro il sito…");
  await page.goto("http://localhost:8080/", { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForSelector("aside button", { timeout: 30000 });
  await page.waitForTimeout(6000);

  console.log("• seleziono un decollo…");
  await page.locator("aside button").first().click();
  await page.waitForTimeout(4000);

  console.log("• vado al tab Analisi…");
  const analisiTab = page.getByRole("button", { name: /analisi/i }).first();
  await analisiTab.click();
  await page.waitForTimeout(2500);

  /* la cattura del windgram vero: host nascosto pronto */
  const host = page.locator('[data-testid="poster-windgram-host"]');
  const hostCount = await host.count();
  console.log("• host poster-windgram presente:", hostCount);
  if (hostCount > 0) {
    await host.waitFor({ state: "visible", timeout: 5000 }).catch(() => {});
    console.log("• attendo la cattura del windgram della pagina (fino a 40s)…");
    const deadline = Date.now() + 40000;
    let ready = false;
    while (Date.now() < deadline) {
      ready = (await host.getAttribute("data-ready")) === "true";
      if (ready) break;
      await page.waitForTimeout(1000);
    }
    console.log("• windgram catturato:", ready);
  }

  /* screenshot della paletta per verifica visiva */
  const card = page.locator(".report-ai-card");
  if (await card.count()) {
    await card.scrollIntoViewIfNeeded();
    await page.waitForTimeout(800);
    await card.screenshot({ path: OUT + "/app-palette.png" });
    console.log("• screenshot paletta salvato");
  }

  /* download del retro: playwright intercetta il download */
  const retroBtn = page.locator(".report-ai-card button", { hasText: "Retro" }).first();
  if (await retroBtn.count()) {
    const [dl] = await Promise.all([
      page.waitForEvent("download", { timeout: 120000 }),
      retroBtn.click(),
    ]);
    const retroPath = OUT + "/app-retro-download.jpg";
    await dl.saveAs(retroPath);
    console.log("• retro scaricato:", retroPath, fs.statSync(retroPath).size, "byte");
  } else {
    console.log("• bottone Retro non trovato!");
  }

  /* download del fronte JPG */
  const jpgBtn = page.locator(".report-ai-card button", { hasText: "JPG" }).first();
  if (await jpgBtn.count()) {
    const [dlJ] = await Promise.all([
      page.waitForEvent("download", { timeout: 120000 }),
      jpgBtn.click(),
    ]);
    const jpgPath = OUT + "/app-fronte-download.jpg";
    await dlJ.saveAs(jpgPath);
    console.log("• fronte JPG scaricato:", jpgPath, fs.statSync(jpgPath).size, "byte");
  }

  /* download del PDF (fronte + retro) */
  const pdfBtn = page.locator(".report-ai-card button", { hasText: "PDF" }).first();
  if (await pdfBtn.count()) {
    const [dl2] = await Promise.all([
      page.waitForEvent("download", { timeout: 120000 }),
      pdfBtn.click(),
    ]);
    const pdfPath = OUT + "/app-locandina-download.pdf";
    await dl2.saveAs(pdfPath);
    console.log("• PDF scaricato:", pdfPath, fs.statSync(pdfPath).size, "byte");
  }

  console.log("JS errors:", errors.length ? "\n" + errors.slice(0, 10).join("\n") : "nessuno");
  await browser.close();
})().catch((e) => {
  console.error("TEST FALLITO:", e.message);
  process.exit(1);
});
