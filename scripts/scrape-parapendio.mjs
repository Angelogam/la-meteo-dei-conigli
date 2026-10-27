/**
 * Scraping di siti meteo parapendio per ricerca utente
 * Usiamo Playwright già installato nel progetto
 */
import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  console.log('🚀 Avvio scraping siti meteo parapendio...\n');
  
  const results = {};
  
  // Siti da studiare
  const sites = [
    {
      name: 'windy_com',
      url: 'https://www.windy.com/?/weather/44.6,7.2,3,5,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24'
    },
    {
      name: 'wingweather_main',
      url: 'https://www.wingweather.com/'
    },
    {
      name: 'xcweather_home',
      url: 'https://xcweather.co.uk/'
    }
  ];
  
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });
  
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });
  
  for (const site of sites) {
    console.log(`\n📡 Scraping: ${site.name}`);
    console.log(`   URL: ${site.url}`);
    
    try {
      const page = await context.newPage();
      
      await page.goto(site.url, { 
        waitUntil: 'domcontentloaded',
        timeout: 45000 
      });
      
      await page.waitForTimeout(4000);
      
      const textContent = await page.evaluate(() => {
        const clone = document.body.cloneNode(true);
        clone.querySelectorAll('script, style, noscript, iframe').forEach(el => el.remove());
        return clone.innerText.trim();
      });
      
      const title = await page.title();
      
      results[site.name] = `=== ${site.name} ===
URL: ${site.url}
Titolo: ${title}
Lunghezza: ${textContent.length} caratteri

--- CONTENUTO ---
${textContent.substring(0, 10000)}
`;
      
      console.log(`   ✅ OK — ${textContent.length} chars`);
      await page.close();
      
    } catch (err) {
      results[site.name] = `ERRORE: ${err.message}`;
      console.error(`   ❌ ERRORE: ${err.message}`);
    }
  }
  
  await browser.close();
  
  const outputPath = path.join(__dirname, '../research-parapendio-web.txt');
  fs.writeFileSync(outputPath, Object.values(results).join('\n\n'), 'utf-8');
  
  console.log(`\n✅ Salvato in: ${outputPath}`);
  console.log(`Dimensione: ${(Object.values(results).join('').length / 1024).toFixed(1)} KB`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
