/**
 * Scraping di siti meteo parapendio per ricerca utente
 * Usiamo Playwright già installato nel progetto
 */
import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';

async function main() {
  console.log('🚀 Avvio scraping siti meteo parapendio...\n');
  
  const results: Record<string, string> = {};
  
  // Siti da studiare
  const sites = [
    {
      name: 'windy_com_meteo_parapendio',
      url: 'https://www.windy.com/?/weather/28.488,7.599,3,5,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24'
    },
    {
      name: 'wingweather_main',
      url: 'https://www.wingweather.com/'
    },
    {
      name: 'xcweather_home',
      url: 'https://xcweather.co.uk/'
    },
    {
      name: 'meteo_parapente_home',
      url: 'https://meteo-parapente.com/'
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
      
      // Naviga e attende caricamento
      await page.goto(site.url, { 
        waitUntil: 'domcontentloaded',
        timeout: 45000 
      });
      
      // Attendi che il sito sia completamente renderizzato
      await page.waitForTimeout(4000);
      
      // Estrai il testo della pagina
      const textContent = await page.evaluate(() => {
        // Rimuovi script e style per testo più pulito
        const clone = document.body.cloneNode(true) as HTMLElement;
        clone.querySelectorAll('script, style, noscript, iframe').forEach(el => el.remove());
        return clone.innerText.trim();
      });
      
      // Estrai anche il titolo
      const title = await page.title();
      
      // Estrai i link principali
      const links = await page.evaluate(() => 
        Array.from(document.querySelectorAll('a[href]'))
          .map(a => a.href)
          .filter(h => h.includes('parapend') || h.includes('weather') || h.includes('wind') || h.includes('thermal') || h.includes('site') || h.includes('spot') || h.includes('fly') || h.includes('valley') || h.includes('decollo') || h.includes('takeoff'))
          .slice(0, 30)
      );
      
      // Estrai i titoli H1-H3
      const headings = await page.evaluate(() => 
        Array.from(document.querySelectorAll('h1, h2, h3'))
          .map(h => h.innerText.trim())
          .filter(t => t.length > 0 && t.length < 100)
          .slice(0, 40)
      );
      
      results[site.name] = `=== ${site.name} ===
URL: ${site.url}
Titolo: ${title}
Lunghezza contenuto: ${textContent.length} caratteri

--- TESTO PRINCIPALE ---
${textContent.substring(0, 12000)}

--- LINK RILEVANTI ---
${links.join('\n')}

--- TITOLI/H1-H3 ---
${headings.join('\n')}
`;
      
      console.log(`   ✅ OK — ${textContent.length} chars, ${links.length} link, ${headings.length} titoli`);
      await page.close();
      
    } catch (err) {
      results[site.name] = `ERRORE ${site.name}: ${err.message}`;
      console.error(`   ❌ ERRORE: ${err}`);
    }
  }
  
  await browser.close();
  
  // Salva risultato
  const outputPath = path.join(process.cwd(), 'research-parapendio-web.txt');
  fs.writeFileSync(outputPath, Object.values(results).join('\n\n'), 'utf-8');
  
  console.log(`\n✅ Salvato in: ${outputPath}`);
  console.log(`Dimensione totale: ${(Object.values(results).join('\n').length / 1024).toFixed(1)} KB`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
