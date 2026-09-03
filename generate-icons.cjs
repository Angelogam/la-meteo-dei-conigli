// generate-icons.cjs
// 🐰 Genera icone PNG "Meteo dei Conigli" (coniglio con paracadute)
// Esegui: node generate-icons.cjs   oppure   npm run generate-icons

const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

// SVG coniglio con paracadute - Meteo dei Conigli
const RABBIT_SVG = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="parachuteGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#FF6B35"/>
      <stop offset="50%" style="stop-color:#F7931E"/>
      <stop offset="100%" style="stop-color:#FF4500"/>
    </linearGradient>
    <linearGradient id="parachuteShine" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#FFB347;stop-opacity:0.9"/>
      <stop offset="50%" style="stop-color:#FFD700;stop-opacity:0.7"/>
      <stop offset="100%" style="stop-color:#FF6B35;stop-opacity:0"/>
    </linearGradient>
  </defs>
  
  <!-- Paracadute -->
  <g>
    <ellipse cx="256" cy="135" rx="180" ry="60" fill="#000000" opacity="0.15"/>
    <path d="M 76 140 Q 76 50 256 40 Q 436 50 436 140 Z" 
          fill="url(#parachuteGrad)" 
          stroke="#C2410C" 
          stroke-width="4"
          stroke-linejoin="round"/>
    <path d="M 120 90 Q 180 60 250 65 L 240 90 Q 180 95 130 110 Z" 
          fill="url(#parachuteShine)"/>
    <path d="M 140 45 Q 145 95 165 140" stroke="#C2410C" stroke-width="3" fill="none"/>
    <path d="M 200 40 Q 210 95 220 140" stroke="#C2410C" stroke-width="3" fill="none"/>
    <path d="M 256 38 Q 256 90 256 140" stroke="#C2410C" stroke-width="3" fill="none"/>
    <path d="M 312 40 Q 302 95 292 140" stroke="#C2410C" stroke-width="3" fill="none"/>
    <path d="M 372 45 Q 367 95 347 140" stroke="#C2410C" stroke-width="3" fill="none"/>
  </g>
  
  <!-- Corde -->
  <g stroke="#8B4513" stroke-width="3" fill="none" stroke-linecap="round">
    <line x1="140" y1="140" x2="195" y2="250"/>
    <line x1="200" y1="140" x2="210" y2="250"/>
    <line x1="256" y1="140" x2="256" y2="250"/>
    <line x1="312" y1="140" x2="302" y2="250"/>
    <line x1="372" y1="140" x2="317" y2="250"/>
  </g>
  
  <!-- Coniglio -->
  <g transform="translate(256, 320)">
    <ellipse cx="-30" cy="-95" rx="18" ry="55" fill="white" stroke="#3D2817" stroke-width="4" transform="rotate(-10, -30, -95)"/>
    <ellipse cx="30" cy="-95" rx="18" ry="55" fill="white" stroke="#3D2817" stroke-width="4" transform="rotate(10, 30, -95)"/>
    <ellipse cx="-30" cy="-95" rx="10" ry="42" fill="#FFB6C1" transform="rotate(-10, -30, -95)"/>
    <ellipse cx="30" cy="-95" rx="10" ry="42" fill="#FFB6C1" transform="rotate(10, 30, -95)"/>
    
    <ellipse cx="0" cy="-30" rx="65" ry="60" fill="white" stroke="#3D2817" stroke-width="4"/>
    <ellipse cx="0" cy="50" rx="60" ry="55" fill="white" stroke="#3D2817" stroke-width="4"/>
    
    <ellipse cx="-55" cy="-15" rx="14" ry="25" fill="white" stroke="#3D2817" stroke-width="3" transform="rotate(-30, -55, -15)"/>
    <ellipse cx="55" cy="-15" rx="14" ry="25" fill="white" stroke="#3D2817" stroke-width="3" transform="rotate(30, 55, -15)"/>
    
    <ellipse cx="-30" cy="105" rx="20" ry="15" fill="white" stroke="#3D2817" stroke-width="3"/>
    <ellipse cx="30" cy="105" rx="20" ry="15" fill="white" stroke="#3D2817" stroke-width="3"/>
    
    <ellipse cx="-30" cy="115" rx="12" ry="6" fill="#FF9999" opacity="0.7"/>
    <ellipse cx="30" cy="115" rx="12" ry="6" fill="#FF9999" opacity="0.7"/>
    
    <ellipse cx="-20" cy="-35" rx="9" ry="11" fill="#1A1A1A"/>
    <ellipse cx="20" cy="-35" rx="9" ry="11" fill="#1A1A1A"/>
    <circle cx="-17" cy="-38" r="3" fill="white"/>
    <circle cx="23" cy="-38" r="3" fill="white"/>
    
    <ellipse cx="-35" cy="-20" rx="10" ry="6" fill="#FFB6C1" opacity="0.8"/>
    <ellipse cx="35" cy="-20" rx="10" ry="6" fill="#FFB6C1" opacity="0.8"/>
    
    <ellipse cx="0" cy="-18" rx="5" ry="4" fill="#FF6B9D"/>
    <path d="M -8,-10 Q 0,-3 8,-10" stroke="#3D2817" stroke-width="2.5" fill="#FF6B9D" stroke-linecap="round"/>
    <path d="M 0,-10 L 0,-5" stroke="#3D2817" stroke-width="2" stroke-linecap="round"/>
    
    <line x1="-50" y1="-18" x2="-25" y2="-15" stroke="#3D2817" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="-50" y1="-12" x2="-25" y2="-12" stroke="#3D2817" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="50" y1="-18" x2="25" y2="-15" stroke="#3D2817" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="50" y1="-12" x2="25" y2="-12" stroke="#3D2817" stroke-width="1.5" stroke-linecap="round"/>
  </g>
  
  <g transform="translate(256, 460)">
    <text x="0" y="0" 
          font-family="Arial Black, Arial, sans-serif" 
          font-size="48" 
          font-weight="900" 
          text-anchor="middle" 
          fill="#FF6B35">
      Meteo dei Conigli
    </text>
  </g>
</svg>`;

const DENSITIES = {
  "mdpi": 48,
  "hdpi": 72,
  "xhdpi": 96,
  "xxhdpi": 144,
  "xxxhdpi": 192,
};

const RES_DIR = path.join("android", "app", "src", "main", "res");

async function generateIcons() {
  console.log("🐰 Generazione icone 'Meteo dei Conigli' (con paracadute)...\n");

  for (const [density, size] of Object.entries(DENSITIES)) {
    const dir = path.join(RES_DIR, `mipmap-${density}`);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    await sharp(Buffer.from(RABBIT_SVG))
      .resize(size, size)
      .png()
      .toFile(path.join(dir, "ic_launcher.png"));

    await sharp(Buffer.from(RABBIT_SVG))
      .resize(size, size)
      .png()
      .toFile(path.join(dir, "ic_launcher_round.png"));

    console.log(`✅ ${density}: ${size}x${size}px`);
  }

  // Anteprima web
  const publicDir = "public";
  if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

  await sharp(Buffer.from(RABBIT_SVG)).resize(512, 512).png()
    .toFile(path.join(publicDir, "icon-512.png"));
  await sharp(Buffer.from(RABBIT_SVG)).resize(192, 192).png()
    .toFile(path.join(publicDir, "icon-192.png"));

  console.log("\n✅ Fatto! Ora esegui:");
  console.log("   npx cap sync android");
  console.log("   cd android && ./gradlew assembleDebug");
}

generateIcons().catch((err) => {
  console.error("❌ Errore:", err);
  process.exit(1);
});
