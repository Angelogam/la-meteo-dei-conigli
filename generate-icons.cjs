// generate-icons.cjs
// 🐰 Genera icone PNG "Meteo dei Conigli" usando l'icona personalizzata
// Esegui: node generate-icons.cjs   oppure   npm run generate-icons

const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const SOURCE_ICON = path.join("public", "ic_launcher.png");

const DENSITIES = {
  "mdpi": 48,
  "hdpi": 72,
  "xhdpi": 96,
  "xxhdpi": 144,
  "xxxhdpi": 192,
};

const RES_DIR = path.join("android", "app", "src", "main", "res");

async function generateIcons() {
  if (!fs.existsSync(SOURCE_ICON)) {
    console.error(`❌ File sorgente mancante: ${SOURCE_ICON}`);
    console.error(`   Assicurati che public/ic_launcher.png esista.`);
    process.exit(1);
  }

  console.log("🐰 Generazione icone 'Meteo dei Conigli' dalla tua immagine...\n");

  for (const [density, size] of Object.entries(DENSITIES)) {
    const dir = path.join(RES_DIR, `mipmap-${density}`);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    await sharp(SOURCE_ICON)
      .resize(size, size, { fit: "cover" })
      .png()
      .toFile(path.join(dir, "ic_launcher.png"));

    await sharp(SOURCE_ICON)
      .resize(size, size, { fit: "cover" })
      .png()
      .toFile(path.join(dir, "ic_launcher_round.png"));

    console.log(`✅ ${density}: ${size}x${size}px`);
  }

  // Aggiorna anche le icone web
  const publicDir = "public";
  if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

  await sharp(SOURCE_ICON).resize(512, 512).png()
    .toFile(path.join(publicDir, "icon-512.png"));
  await sharp(SOURCE_ICON).resize(192, 192).png()
    .toFile(path.join(publicDir, "icon-192.png"));

  console.log("\n✅ Fatto! Ora esegui:");
  console.log("   npx cap sync android");
  console.log("   cd android && ./gradlew assembleDebug");
}

generateIcons().catch((err) => {
  console.error("❌ Errore:", err);
  process.exit(1);
});
