// generate-icons.cjs
// 🐰 Generatore icone "Meteo dei Conigli" per Android
// Esegui: node generate-icons.cjs   oppure   npm run generate-icons

const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

// SVG del coniglio "Meteo dei Conigli"
const RABBIT_SVG = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0EA5E9;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#0284C7;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="rabbitGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#FFFFFF;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#F1F5F9;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Background -->
  <rect width="512" height="512" fill="url(#bgGrad)"/>
  
  <!-- Sun rays -->
  <g opacity="0.25" stroke="white" stroke-width="4" stroke-linecap="round">
    <line x1="80" y1="80" x2="100" y2="100"/>
    <line x1="432" y1="80" x2="412" y2="100"/>
    <line x1="256" y1="40" x2="256" y2="60"/>
    <line x1="60" y1="256" x2="80" y2="256"/>
    <line x1="432" y1="256" x2="452" y2="256"/>
  </g>
  
  <!-- Clouds -->
  <g opacity="0.35" fill="white">
    <ellipse cx="100" cy="380" rx="45" ry="15"/>
    <ellipse cx="140" cy="370" rx="35" ry="12"/>
    <ellipse cx="400" cy="120" rx="50" ry="16"/>
    <ellipse cx="430" cy="110" rx="30" ry="11"/>
  </g>
  
  <!-- Rabbit -->
  <g transform="translate(256, 260)">
    <!-- Body -->
    <ellipse cx="0" cy="20" rx="95" ry="80" fill="url(#rabbitGrad)" stroke="#94A3B8" stroke-width="4"/>
    
    <!-- Head -->
    <circle cx="0" cy="-80" r="68" fill="url(#rabbitGrad)" stroke="#94A3B8" stroke-width="4"/>
    
    <!-- Left ear -->
    <ellipse cx="-35" cy="-190" rx="20" ry="62" fill="url(#rabbitGrad)" stroke="#94A3B8" stroke-width="4" transform="rotate(-15, -35, -190)"/>
    <ellipse cx="-35" cy="-190" rx="11" ry="45" fill="#FCA5A5" transform="rotate(-15, -35, -190)"/>
    
    <!-- Right ear -->
    <ellipse cx="35" cy="-190" rx="20" ry="62" fill="url(#rabbitGrad)" stroke="#94A3B8" stroke-width="4" transform="rotate(15, 35, -190)"/>
    <ellipse cx="35" cy="-190" rx="11" ry="45" fill="#FCA5A5" transform="rotate(15, 35, -190)"/>
    
    <!-- Eyes -->
    <circle cx="-22" cy="-88" r="9" fill="#0F172A"/>
    <circle cx="22" cy="-88" r="9" fill="#0F172A"/>
    <circle cx="-19" cy="-90" r="3.5" fill="white"/>
    <circle cx="25" cy="-90" r="3.5" fill="white"/>
    
    <!-- Nose -->
    <ellipse cx="0" cy="-65" rx="7" ry="5" fill="#F472B6"/>
    
    <!-- Mouth -->
    <path d="M -10,-58 Q 0,-52 10,-58" stroke="#0F172A" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    
    <!-- Whiskers -->
    <line x1="-58" y1="-65" x2="-28" y2="-62" stroke="#94A3B8" stroke-width="2" stroke-linecap="round"/>
    <line x1="-58" y1="-58" x2="-28" y2="-58" stroke="#94A3B8" stroke-width="2" stroke-linecap="round"/>
    <line x1="58" y1="-65" x2="28" y2="-62" stroke="#94A3B8" stroke-width="2" stroke-linecap="round"/>
    <line x1="58" y1="-58" x2="28" y2="-58" stroke="#94A3B8" stroke-width="2" stroke-linecap="round"/>
    
    <!-- Cheeks -->
    <circle cx="-40" cy="-70" r="10" fill="#FCA5A5" opacity="0.6"/>
    <circle cx="40" cy="-70" r="10" fill="#FCA5A5" opacity="0.6"/>
    
    <!-- Feet -->
    <ellipse cx="-40" cy="95" rx="25" ry="18" fill="url(#rabbitGrad)" stroke="#94A3B8" stroke-width="4"/>
    <ellipse cx="40" cy="95" rx="25" ry="18" fill="url(#rabbitGrad)" stroke="#94A3B8" stroke-width="4"/>
    
    <!-- Tail -->
    <circle cx="85" cy="40" r="22" fill="url(#rabbitGrad)" stroke="#94A3B8" stroke-width="4"/>
    
    <!-- Belly -->
    <ellipse cx="0" cy="30" rx="55" ry="50" fill="#FFFFFF" opacity="0.6"/>
  </g>
  
  <!-- Text "Meteo dei Conigli" -->
  <g transform="translate(256, 480)">
    <rect x="-160" y="-24" width="320" height="48" rx="24" fill="#0F172A" opacity="0.9"/>
    <text x="0" y="8" 
          font-family="Arial, sans-serif" 
          font-size="26" 
          font-weight="bold" 
          text-anchor="middle" 
          fill="white">
      Meteo dei Conigli
    </text>
  </g>
</svg>`;

// Densità Android
const DENSITIES = {
  "mdpi": 48,
  "hdpi": 72,
  "xhdpi": 96,
  "xxhdpi": 144,
  "xxxhdpi": 192,
};

const RES_DIR = path.join("android", "app", "src", "main", "res");

async function generateIcons() {
  console.log("🐰 Generazione icone 'Meteo dei Conigli'...\n");

  for (const [density, size] of Object.entries(DENSITIES)) {
    const dir = path.join(RES_DIR, `mipmap-${density}`);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`📁 Creata cartella: ${dir}`);
    }

    // Genera icona quadrata
    const squarePath = path.join(dir, "ic_launcher.png");
    await sharp(Buffer.from(RABBIT_SVG))
      .resize(size, size)
      .png()
      .toFile(squarePath);

    // Genera icona tonda
    const roundPath = path.join(dir, "ic_launcher_round.png");
    await sharp(Buffer.from(RABBIT_SVG))
      .resize(size, size)
      .png()
      .toFile(roundPath);

    console.log(`✅ ${density}: ${size}x${size}px - ${path.basename(squarePath)}, ${path.basename(roundPath)}`);
  }

  // Genera anche icone ad alta risoluzione per web
  const publicDir = "public";
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  await sharp(Buffer.from(RABBIT_SVG))
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, "icon-512.png"));

  await sharp(Buffer.from(RABBIT_SVG))
    .resize(192, 192)
    .png()
    .toFile(path.join(publicDir, "icon-192.png"));

  console.log("\n✅ Icone generate con successo!");
  console.log("\n📱 Prossimi passi:");
  console.log("   1. npx cap sync android");
  console.log("   2. cd android && ./gradlew assembleDebug");
  console.log("   3. APK: android/app/build/outputs/apk/debug/app-debug.apk");
}

generateIcons().catch((err) => {
  console.error("❌ Errore:", err);
  process.exit(1);
});
