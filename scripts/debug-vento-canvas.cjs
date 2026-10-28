/* Debug: campiona il canvas della cartina sul livello Vento */
const { chromium } = require("@playwright/test");

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, timezoneId: "Europe/Rome" });
  page.on("pageerror", (e) => console.log("PAGEERROR:", e.message));
  page.on("console", (m) => { if (m.type() === "error") console.log("CONSOLE-ERR:", m.text().slice(0, 300)); });

  await page.goto("http://localhost:8080/", { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(9000);
  await page.locator('[data-testid="cartina-decolli"]').scrollIntoViewIfNeeded();

  const info = await page.evaluate(async () => {
    await new Promise((r) => setTimeout(r, 1500));
    const canvas = document.querySelector(".cmap-heat-canvas");
    if (!canvas) return { canvas: "MANCA" };
    const clickVento = [...document.querySelectorAll(".cmap-lbtn")].find((b) => b.textContent.includes("Vento"));
    if (clickVento) clickVento.click();
    await new Promise((r) => setTimeout(r, 2500));
    const ctx = canvas.getContext("2d");
    const d = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let nonZero = 0;
    for (let i = 3; i < d.length; i += 4) if (d[i] > 10) nonZero++;
    return {
      canvas: "OK",
      w: canvas.width,
      h: canvas.height,
      nonTransparentPx: nonZero,
      totPx: canvas.width * canvas.height,
    };
  });
  console.log(JSON.stringify(info));
  await browser.close();
})();
