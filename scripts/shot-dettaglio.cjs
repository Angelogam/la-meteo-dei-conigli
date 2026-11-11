// Screenshot di verifica: home (webcam), pagina dettaglio desktop+mobile
const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch();
  async function shot(url, out, viewport) {
    const page = await browser.newPage({ viewport: viewport || { width: 1440, height: 1000 } });
    await page.goto(url, { waitUntil: "networkidle", timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(2500);
    await page.screenshot({ path: out, fullPage: false });
    await page.close();
    console.log("saved", out);
  }
  const base = "http://localhost:8080";
  // home: webcam section visibile
  const p1 = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await p1.goto(base, { waitUntil: "networkidle", timeout: 60000 }).catch(() => {});
  await p1.waitForTimeout(3000);
  await p1.evaluate(() => document.querySelector(".webcam-nearby-section")?.scrollIntoView({ block: "center" }));
  await p1.waitForTimeout(1200);
  await p1.screenshot({ path: "shots-local/webcam-redesign.png" });
  console.log("saved webcam");
  // dettaglio desktop
  await shot(base + "/decollo/ao-doues", "shots-local/dettaglio-doues.png");
  // dettaglio FRN con foto
  const list = await p1.evaluate(() => fetch("/api/webcams?site=malanotte").then(r => r.json()).then(j => j.cameras?.length));
  console.log("webcam malanotte:", list);
  await p1.close();
  // dettaglio mobile
  const p2 = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await p2.goto(base + "/decollo/ao-doues", { waitUntil: "networkidle", timeout: 60000 }).catch(() => {});
  await p2.waitForTimeout(2500);
  await p2.screenshot({ path: "shots-local/dettaglio-mobile.png" });
  await p2.evaluate(() => window.scrollTo(0, 1400));
  await p2.waitForTimeout(900);
  await p2.screenshot({ path: "shots-local/dettaglio-mobile-2.png" });
  console.log("saved mobile");
  await p2.close();
  await browser.close();
})();
