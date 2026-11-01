/* Verifica visiva DIURNA: ore 12 → anabatica sui versanti al sole.
   Apre la pagina, clicca la fascia 12:00, aspetta il flusso, salva shot. */
const { chromium } = require("playwright");
const fs = require("fs");

const BASE = process.argv[2] || "http://localhost:8080";
const OUT = "/home/z/my-project/shots-local";
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const errors = [];
  const browser = await chromium.launch({
    args: ["--use-gl=angle", "--enable-unsafe-swiftshader", "--disable-dev-shm-usage"],
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 760 } });
  page.on("pageerror", (e) => errors.push(String(e).slice(0, 150)));
  await page.goto(BASE + "/", { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForSelector('[data-testid="cartina-3d"]', { timeout: 90000 });
  await page.evaluate(() => {
    const el = document.querySelector('[data-testid="cartina-3d"]');
    if (el) el.scrollIntoView({ block: "center", behavior: "instant" });
  });
  await page.waitForSelector('[data-testid="c3d-hud"]', { timeout: 240000 });

  /* clic la fascia oraria 12:00 (dispatchEvent: WebGL + SwiftShader) */
  await page.waitForSelector('[data-testid="c3d-slot-12"]', { timeout: 120000 });
  await page.evaluate(() => {
    const el = document.querySelector('[data-testid="c3d-slot-12"]');
    el?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
  });
  await page.waitForFunction(
    () => {
      const w = window.__c3dWindFlow;
      const on = document.querySelector(".c3d-slot.is-on")?.textContent || "";
      return w && w.darts > 0 && on.startsWith("12");
    },
    undefined,
    { timeout: 120000 },
  );
  await page.waitForTimeout(4000);
  const wf = await page.evaluate(() => window.__c3dWindFlow);
  console.log(JSON.stringify({ ...wf, errors }, null, 2));
  await page.screenshot({ path: `${OUT}/v11-mezzogiorno.png`, timeout: 90000 });
  await browser.close();
  if (errors.length) process.exit(1);
  console.log("V12 OK");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
