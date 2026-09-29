import { defineHandler } from "nitro";
import { getQuery, createError } from "nitro/h3";

/**
 * API Route: Scraping di siti meteo parapendio
 * Usato per ricerca e studio dei siti di riferimento
 */

interface SiteToScrape {
  name: string;
  url: string;
  description?: string;
}

const SITES: SiteToScrape[] = [
  {
    name: 'wingweather',
    url: 'https://www.wingweather.com/',
    description: 'Sito UK di meteo per parapendio e deltaplano'
  },
  {
    name: 'xcweather',
    url: 'https://xcweather.co.uk/',
    description: 'Meteo cross-country per volo libero'
  },
  {
    name: 'paragliding_hub',
    url: 'https://www.paragliding-hub.com/',
    description: 'Portale internazionale parapendio'
  },
  {
    name: 'soaring_engine',
    url: 'https://soaring.engine/',
    description: 'Strumento meteo per alianti e parapendio'
  },
  {
    name: 'meteofrance_parapente',
    url: 'https://www.meteofrance.com/parapente',
    description: 'Meteo Francia sezione parapendio'
  }
];

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractMetaInfo(html: string): { title: string; description: string; h1: string[]; h2: string[]; keywords: string[] } {
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const descMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i);
  const h1Matches = [...html.matchAll(/<h1[^>]*>([^<]+)<\/h1>/gi)].map(m => m[1].trim());
  const h2Matches = [...html.matchAll(/<h2[^>]*>([^<]+)<\/h2>/gi)].map(m => m[1].trim());
  const keywordMatch = html.match(/<meta\s+name=["']keywords["']\s+content=["']([^"']+)["']/i);
  
  return {
    title: titleMatch?.[1]?.trim() || '',
    description: descMatch?.[1]?.trim() || '',
    h1: h1Matches.slice(0, 5),
    h2: h2Matches.slice(0, 10),
    keywords: keywordMatch?.[1]?.split(',').map(k => k.trim()) || []
  };
}

async function fetchSite(site: SiteToScrape): Promise<{ success: boolean; content?: string; error?: string }> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    
    const response = await fetch(site.url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'it-IT,it;q=0.9,en;q=0.8'
      },
      signal: controller.signal
    });
    
    clearTimeout(timeout);
    
    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}: ${response.statusText}` };
    }
    
    const html = await response.text();
    const text = stripHtml(html);
    const meta = extractMetaInfo(html);
    
    return {
      success: true,
      content: JSON.stringify({
        url: site.url,
        status: response.status,
        title: meta.title,
        description: meta.description,
        headings: { h1: meta.h1, h2: meta.h2 },
        keywords: meta.keywords,
        textPreview: text.substring(0, 5000),
        fullTextLength: text.length
      }, null, 2)
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export default defineHandler(async (event) => {
  const query = getQuery(event);
  const siteName = query.site as string;
  
  // Se specificato un sito, scarica solo quello
  if (siteName) {
    const site = SITES.find(s => s.name === siteName);
    if (!site) {
      throw createError({
        statusCode: 404,
        statusMessage: `Sito "${siteName}" non trovato`,
        data: { available: SITES.map(s => s.name) }
      });
    }
    
    const result = await fetchSite(site);
    return {
      site: site.name,
      url: site.url,
      description: site.description,
      ...result
    };
  }
  
  // Altrimenti scarica tutti i siti
  const results = [];
  for (const site of SITES) {
    console.log(`[scrape] Fetching ${site.name}...`);
    const result = await fetchSite(site);
    results.push({
      site: site.name,
      url: site.url,
      description: site.description,
      ...result
    });
    // Small delay to be polite
    await new Promise(r => setTimeout(r, 500));
  }
  
  return {
    timestamp: new Date().toISOString(),
    sitesScraped: results.length,
    results
  };
});
