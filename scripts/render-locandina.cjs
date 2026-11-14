// Render docs/locandine/locandina.html -> public/locandine/*.png|.pdf|.jpg
// Usage: node scripts/render-locandina.cjs
const path = require("path");
const fs = require("fs");
const { chromium } = require("playwright");

const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "docs", "locandine", "locandina.html");
const OUT = path.join(ROOT, "public", "locandine");
const SLUG = "locandina-montoso-rucas-2026-10-06";

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1200 }, deviceScaleFactor: 1 });
  await page.goto("file://" + SRC, { waitUntil: "networkidle" });
  await page.waitForTimeout(1800); // fonts + images settle
  await page.evaluate(() => document.fonts ? document.fonts.ready : true);
  await page.emulateMedia({ media: "print" }); // disable the screen auto-scale transform
  await page.waitForTimeout(400);

  const poster = page.locator(".poster");
  await poster.screenshot({ path: path.join(OUT, SLUG + ".png"), type: "png" });

  // PDF: single tall page, 1080 px wide
  const box = await poster.boundingBox();
  await page.pdf({
    path: path.join(OUT, SLUG + ".pdf"),
    width: "1080px",
    height: Math.ceil(box.height + 2) + "px",
    printBackground: true,
    pageRanges: "1",
  });

  // JPG (for WhatsApp / light sharing)
  const png = fs.readFileSync(path.join(OUT, SLUG + ".png"));
  const sharp = require("sharp");
  await sharp(png).jpeg({ quality: 88, mozjpeg: true }).toFile(path.join(OUT, SLUG + ".jpg"));

  const h = Math.ceil(box.height);
  console.log("rendered:", SLUG, "height:", h);
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
