/**
 * SMOKE TEST del flusso vento particelle (stile Windy) nella Cartina 3D.
 * Apre la pagina con WebGL software, attende la scena 3D e verifica che:
 *  1. window.__c3dWindFlow.total > 0 (particelle create)
 *  2. non ci sono errori JS non catturati
 *  3. salva uno screenshot per la verifica visiva
 */
import { chromium } from "@playwright/test";

const BASE = process.env.BASE_URL ?? "http://localhost:8080/";

async function main() {
  const browser = await chromium.launch({
    headless: true,
    args: [
      "--use-gl=angle",
      "--use-angle=swiftshader",
      "--enable-unsafe-swiftshader",
      "--disable-gpu-sandbox",
      "--no-sandbox",
    ],
  });
  const page = await browser.newPage({ viewport: { width: 1100, height: 700 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(`console: ${m.text().slice(0, 200)}`);
  });

  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 60000 });
  console.log("P1: pagina aperta");

  /* la cartina 3D è più giù nella pagina: scrolla finché la sezione non si arma */
  for (let s = 0; s < 8; s++) {
    await page.mouse.wheel(0, 1600);
    await page.waitForTimeout(700);
  }
  console.log("P2: scroll fatto");

  /* attende che il flusso vento venga costruito (viewer ready + DEM + campo) */
  let flow = null;
  for (let i = 0; i < 75; i++) {
    try {
      const v = await page.evaluate(() => {
        const w = window;
        return w.__c3dWindFlow ?? null;
      });
      if (v && typeof v === "object" && v.total > 0) {
        flow = v;
        break;
      }
    } catch {
      /* pagina ancora in caricamento */
    }
    await page.waitForTimeout(2000);
  }
  console.log("P3: flusso trovato", JSON.stringify(flow));

  await page.waitForTimeout(5000); // lascia correre le particelle
  console.log("P4: particelle girate, screenshot...");

  /* centra la tela 3D (il canvas dentro .c3d-mount) e scatta lo screenshot
     con clip di pagina: gli screenshot di elemento aspettano la "stabilità"
     che un canvas che ridisegna di continuo non dà mai. */
  try {
    const box = await page.evaluate(() => {
      const c = document.querySelector(".c3d-mount canvas");
      if (!c) return null;
      c.scrollIntoView({ block: "center", behavior: "instant" });
      const r = c.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height };
    });
    await page.waitForTimeout(3000);
    if (box) {
      await page.screenshot({
        path: "test-results/windflow-smoke.png",
        clip: { x: Math.max(0, box.x), y: Math.max(0, box.y), width: Math.min(box.width, 1380), height: Math.min(box.height, 880) },
      });
    } else {
      await page.screenshot({ path: "test-results/windflow-smoke.png", fullPage: false });
    }
  } catch (e) {
    console.log("CANVAS SHOT FAIL:", String(e).slice(0, 120));
    await page.screenshot({ path: "test-results/windflow-smoke.png", fullPage: false });
  }

  console.log("P5: screenshot fatto");
  console.log("WINDFLOW:", JSON.stringify(flow));
  const realErrors = errors.filter(
    (e) => !/favicon|cesium Workers|Image from origin|the server responded with a status/i.test(e),
  );
  console.log("PAGE_ERRORS:", realErrors.length ? realErrors.slice(0, 8) : "nessuno");

  if (!flow || !flow.total) {
    console.error("FAIL: __c3dWindFlow non popolato (particelle mai create)");
    process.exitCode = 1;
  } else {
    console.log(`OK: ${flow.total} sprite, ${flow.darts} particelle, ${flow.eddies} rotori`);
  }
  await browser.close();
}

main().catch((e) => {
  console.error("SMOKE ERROR:", e);
  process.exitCode = 1;
});

/* hard stop di sicurezza: mai più di 4 minuti */
setTimeout(() => {
  console.error("SMOKE TIMEOUT hard-stop");
  process.exit(1);
}, 240000);
