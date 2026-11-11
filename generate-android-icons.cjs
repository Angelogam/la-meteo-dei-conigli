// generate-android-icons.cjs
// 🐰 Converte app-icon.svg → ic_launcher.png e genera tutte le icone Android
// Esegui: node generate-android-icons.cjs   oppure   npm run generate-icons

const { Resvg } = require("@resvg/resvg-js");
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const SOURCE_SVG = path.join("public", "app-icon.svg");
const OUTPUT_PNG = path.join("public", "ic_launcher.png");

const DENSITIES = {
  "mipmap-mdpi": 48,
  "mipmap-hdpi": 72,
  "mipmap-xhdpi": 96,
  "mipmap-xxhdpi": 144,
  "mipmap-xxxhdpi": 192,
};

const RES_DIR = path.join("android", "app", "src", "main", "res");

async function main() {
  console.log("🐰 Meteo dei Conigli - Generazione Icone Personalizzate\n");

  if (!fs.existsSync(SOURCE_SVG)) {
    console.error(`❌ File sorgente mancante: ${SOURCE_SVG}`);
    process.exit(1);
  }

  // 1. SVG → PNG 512x512
  console.log("📐 Conversione SVG → PNG 512×512...");
  const svgContent = fs.readFileSync(SOURCE_SVG, "utf8");
  const resvg = new Resvg(svgContent, {
    fitTo: { mode: "width", value: 512 },
  });
  const pngBuffer = resvg.render().asPng();
  fs.writeFileSync(OUTPUT_PNG, pngBuffer);
  console.log(`✅ ${OUTPUT_PNG} (512×512)`);

  // 2. Icone Android (non round)
  console.log("\n🤖 Generazione icone Android...");
  for (const [dir, size] of Object.entries(DENSITIES)) {
    const dirPath = path.join(RES_DIR, dir);
    if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });

    await sharp(pngBuffer)
      .resize(size, size, { fit: "cover" })
      .png()
      .toFile(path.join(dirPath, "ic_launcher.png"));
    await sharp(pngBuffer)
      .resize(size, size, { fit: "cover" })
      .png()
      .toFile(path.join(dirPath, "ic_launcher_round.png"));
    console.log(`  ✅ ${dir}: ${size}×${size}px`);
  }

  // 3. Foreground adaptive icon (drawable-v24)
  const drawableV24Dir = path.join(RES_DIR, "drawable-v24");
  if (!fs.existsSync(drawableV24Dir))
    fs.mkdirSync(drawableV24Dir, { recursive: true });

  // Rimuovi XML conflittuale se esiste
  const foregroundXml = path.join(drawableV24Dir, "ic_launcher_foreground.xml");
  if (fs.existsSync(foregroundXml)) {
    fs.unlinkSync(foregroundXml);
    console.log("  🗑️ Rimosso ic_launcher_foreground.xml (conflitto con PNG)");
  }

  await sharp(pngBuffer)
    .resize(108, 108, { fit: "cover" })
    .png()
    .toFile(path.join(drawableV24Dir, "ic_launcher_foreground.png"));
  console.log("  ✅ drawable-v24/ic_launcher_foreground.png (108×108)");

  // 4. Aggiorna icone web
  console.log("\n🌐 Aggiornamento icone web...");
  await sharp(pngBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join("public", "icon-512.png"));
  await sharp(pngBuffer)
    .resize(192, 192)
    .png()
    .toFile(path.join("public", "icon-192.png"));
  console.log("  ✅ public/icon-512.png");
  console.log("  ✅ public/icon-192.png");

  console.log("\n✅ Tutto completato!");
  console.log("\nOra esegui nel terminale:");
  console.log("   npx cap sync android");
  console.log("   cd android && ./gradlew assembleDebug");
}

main().catch((err) => {
  console.error("❌ Errore:", err.message);
  process.exit(1);
});
