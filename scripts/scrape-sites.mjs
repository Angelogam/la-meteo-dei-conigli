import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';

async function scrape() {
  const results: Record<string, string> = {};
  
  const sites = [
    {
      name: 'windy_com_metoparapendio',
      url: 'https://www.windy.com/?28.488,7.599,3'
    },
    {
      name: 'windy_com_italy',
      url: 'https://www.windy.com/?-/italy'
    },
    {
      name: 'meteo_parapente_home',
      url: 'https://meteo-parapente.com/'
    },
    {
      name: 'wingweather',
      url: 'https://www.wingweather.com/'
    },
    {
      name: 'xcweather',
      url: 'https://xcweather.co.uk/'
    }
  ];

  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  
  for (const site of sites) {
    console.log(`Scraping ${site.name}...`);
    try {
      const page = await browser.newPage();
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto(site.url, { waitUntil: 'networkidle', timeout: 30000 });
      
      // Wait a bit more for dynamic content
      await page.waitForTimeout(3000);
      
      // Get text content
      const text = await page.evaluate(() => document.body.innerText);
      results[site.name] = `=== ${site.name} ===\nURL: ${site.url}\n\nContent (${text.length} chars):\n${text.substring(0, 8000)}\n`;
      
      // Also get page title
      const title = await page.title();
      results[site.name] += `\nTitle: ${title}\n`;
      
      console.log(`  -> Got ${text.length} chars`);
      await page.close();
    } catch (e) {
      results[site.name] = `ERROR: ${e.message}`;
      console.error(`  -> Error: ${e.message}`);
    }
  }
  
  await browser.close();
  
  const outputPath = path.join(process.cwd(), 'scraped-research.txt');
  fs.writeFileSync(outputPath, Object.values(results).join('\n\n'), 'utf-8');
  console.log(`\nSaved to ${outputPath}`);
}

scrape().catch(console.error);
