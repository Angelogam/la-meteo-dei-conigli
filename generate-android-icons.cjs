#!/usr/bin/env node
/**
 * Generate all Android icon sizes from a single source image
 * Uses sharp for image resizing
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const SOURCE = path.join(__dirname, 'public', 'ic_launcher.png');
const OUTPUT_DIR = path.join(__dirname, 'android', 'app', 'src', 'main', 'res');

const SIZES = {
  'mipmap-mdpi': 48,
  'mipmap-hdpi': 72,
  'mipmap-xhdpi': 96,
  'mipmap-xxhdpi': 144,
  'mipmap-xxxhdpi': 192,
};

const ROUND_SIZES = {
  'mipmap-mdpi': 48,
  'mipmap-hdpi': 72,
  'mipmap-xhdpi': 96,
  'mipmap-xxhdpi': 144,
  'mipmap-xxxhdpi': 192,
};

async function generateIcons() {
  console.log('Generating Android icons...');
  
  if (!fs.existsSync(SOURCE)) {
    console.error('Source image not found:', SOURCE);
    process.exit(1);
  }

  for (const [dir, size] of Object.entries(SIZES)) {
    const outDir = path.join(OUTPUT_DIR, dir);
    fs.mkdirSync(outDir, { recursive: true });
    
    const outPath = path.join(outDir, 'ic_launcher.png');
    await sharp(SOURCE)
      .resize(size, size, { fit: 'cover' })
      .png()
      .toFile(outPath);
    console.log(`  ✓ ${dir}/ic_launcher.png (${size}x${size})`);
  }

  // Generate round icons
  for (const [dir, size] of Object.entries(ROUND_SIZES)) {
    const outDir = path.join(OUTPUT_DIR, dir);
    fs.mkdirSync(outDir, { recursive: true });
    
    const outPath = path.join(outDir, 'ic_launcher_round.png');
    await sharp(SOURCE)
      .resize(size, size, { fit: 'cover' })
      .png()
      .toFile(outPath);
    console.log(`  ✓ ${dir}/ic_launcher_round.png (${size}x${size})`);
  }

  // Generate foreground (for adaptive icons)
  const drawableV24Dir = path.join(OUTPUT_DIR, 'drawable-v24');
  fs.mkdirSync(drawableV24Dir, { recursive: true });
  
  await sharp(SOURCE)
    .resize(108, 108, { fit: 'cover' })
    .png()
    .toFile(path.join(drawableV24Dir, 'ic_launcher_foreground.png'));
  console.log(`  ✓ drawable-v24/ic_launcher_foreground.png (108x108)`);

  console.log('\n✅ All icons generated successfully!');
}

generateIcons().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});