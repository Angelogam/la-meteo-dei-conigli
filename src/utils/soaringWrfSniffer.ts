"use client";

/**
 * Analizza soaringmeteo.org/soarWRF per capire se ci sono API o dati
 * accessibili da integrare con Open-Meteo.
 * 
 * SoaringWRF è un modello WRF (Weather Research & Forecasting) ottimizzato
 * per il volo a vela, con risoluzione tipicamente 2-3km.
 * 
 * Questo sniffer cerca:
 * 1. API endpoints (/api/*, /data/*, /wrf/*, *.json, *.geojson)
 * 2. Pagine HTML che espongono dati strutturati
 * 3. GRIB o file di dati scaricabili
 */

interface WrfEndpoint {
  url: string;
  status: number;
  contentType: string;
  length: number;
  type: 'html' | 'json' | 'grib' | 'image' | 'unknown' | 'error';
}

// Lista di potenziali endpoint SoaringWRF da sondare
const PROBE_URLS = [
  // API endpoints comuni
  "https://soaringmeteo.org/",
  "https://soaringmeteo.org/soarWRF",
  "https://soaringmeteo.org/soarWRF?lang=en",
  "https://soaringmeteo.org/api/",
  "https://soaringmeteo.org/api/v1/",
  "https://soaringmeteo.org/api/v1/forecast",
  "https://soaringmeteo.org/api/v1/soarwrf",
  "https://soaringmeteo.org/api/forecast",
  "https://soaringmeteo.org/api/soarwrf",
  "https://soaringmeteo.org/data/",
  "https://soaringmeteo.org/data/forecast.json",
  "https://soaringmeteo.org/data/current.json",
  "https://soaringmeteo.org/forecast.json",
  "https://soaringmeteo.org/soarwrf.json",
  "https://soaringmeteo.org/soarwrf.geojson",
  "https://soaringmeteo.org/wrf/",
  "https://soaringmeteo.org/wrf/latest",
  "https://soaringmeteo.org/wrf/current",
  "https://soaringmeteo.org/static/data/",
  "https://soaringmeteo.org/static/data/forecast.json",
  "https://soaringmeteo.org/api/soaring/forecast",
  "https://soaringmeteo.org/api/soaring/current",
  // Tile/TMS endpoints (se usa mappe)
  "https://soaringmeteo.org/tiles/",
  "https://soaringmeteo.org/tms/",
  "https://soaringmeteo.org/wms",
  "https://soaringmeteo.org/geoserver/",
  // Possibili file di dati WRF
  "https://soaringmeteo.org/data/wrf/",
  "https://soaringmeteo.org/data/wrf/latest.grib2",
  "https://soaringmeteo.org/data/soarwrf/results.json",
];

export interface SoaringWrfAnalysis {
  endpoints: WrfEndpoint[];
  hasApi: boolean;
  apiEndpoints: WrfEndpoint[];
  dataEndpoints: WrfEndpoint[];
  htmlContent: string;
  summary: string;
  assessment: string;
}

export async function sniffSoaringWrf(): Promise<SoaringWrfAnalysis> {
  const endpoints: WrfEndpoint[] = [];
  const apiEndpoints: WrfEndpoint[] = [];
  const dataEndpoints: WrfEndpoint[] = [];
  let htmlContent = "";

  for (const url of PROBE_URLS) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      
      const resp = await fetch(url, {
        signal: controller.signal,
        headers: { "Accept": "application/json, text/html, */*" },
      });
      clearTimeout(timeout);
      
      const ct = resp.headers.get("content-type") || "";
      const text = await resp.text();
      
      let type: WrfEndpoint['type'] = 'unknown';
      if (ct.includes("html")) type = 'html';
      else if (ct.includes("json")) type = 'json';
      else if (ct.includes("grib")) type = 'grib';
      else if (ct.includes("image")) type = 'image';

      const ep: WrfEndpoint = {
        url,
        status: resp.status,
        contentType: ct,
        length: text.length,
        type,
      };
      endpoints.push(ep);

      if (resp.ok && (type === 'json' || type === 'html')) {
        if (type === 'json') {
          apiEndpoints.push(ep);
          dataEndpoints.push(ep);
        }
        if (url.includes('/api/') || url.includes('.json') || url.includes('.geojson')) {
          apiEndpoints.push(ep);
        }
      }

      if ((url === "https://soaringmeteo.org/" || url === "https://soaringmeteo.org/soarWRF?lang=en") && resp.ok) {
        htmlContent = text.slice(0, 5000);
      }

    } catch (e) {
      endpoints.push({
        url,
        status: 0,
        contentType: 'error',
        length: 0,
        type: 'error',
      });
    }
  }

  const hasApi = apiEndpoints.filter(e => e.status === 200 && e.contentType.includes('json')).length > 0;

  let summary = "";
  let assessment = "";

  if (hasApi) {
    summary = `Trovati ${apiEndpoints.length} endpoint API JSON funzionanti`;
    assessment = "SoaringWRF espone API JSON utilizzabili! Possiamo intrecciare i dati WRF ad alta risoluzione con Open-Meteo.";
  } else {
    const htmlEndpoints = endpoints.filter(e => e.type === 'html' && e.status === 200);
    summary = `Nessuna API JSON trovata. ${htmlEndpoints.length} pagine HTML disponibili.`;
    assessment = "SoaringWRF non espone API pubbliche. I dati sono probabilmente visualizzati solo tramite mappe interattive. Dovremmo valutare se i dati WRF sono accessibili tramite il sito https://wrftiles.com/ o altri servizi WRF pubblici.";
  }

  return { endpoints, hasApi, apiEndpoints, dataEndpoints, htmlContent, summary, assessment };
}

/**
 * Analizza le pagine HTML per trovare script embed, data JSON inline,
 * o riferimenti a servizi esterni di tile WRF.
 */
export function parseHtmlForDataSources(html: string): {
  scripts: string[];
  dataSources: string[];
  tileServers: string[];
  externalApis: string[];
} {
  const scripts: string[] = [];
  const tileServers: string[] = [];
  const dataSources: string[] = [];
  const externalApis: string[] = [];

  // Cerca script tag con src
  const scriptRegex = /<script[^>]*src=["']([^"']+)["'][^>]*>/gi;
  let m;
  while ((m = scriptRegex.exec(html)) !== null) {
    scripts.push(m[1]);
  }

  // Cerca tile server / TMS / WMS
  const tileRegex = /(https?:\/\/[^"'\s]*(?:tile|tms|wms|tiles|wmts|geoserver)[^"'\s]*)/gi;
  while ((m = tileRegex.exec(html)) !== null) {
    tileServers.push(m[1]);
  }

  // Crea URL di API / JSON / data
  const apiRegex = /(https?:\/\/[^"'\s]*(?:api|json|data|forecast|soaring|wrf)[^"'\s]*\.(?:json|api|js|php)[^"'\s]*)/gi;
  while ((m = apiRegex.exec(html)) !== null) {
    externalApis.push(m[1]);
  }

  // Cerca menzioni a fonti dati
  const sourceRegex = /(open-meteo|ecmwf|gfs|icon|wrf|nam|hrrr|rap)[^"'\s]{0,30}/gi;
  while ((m = sourceRegex.exec(html)) !== null) {
    dataSources.push(m[0]);
  }

  return { scripts, dataSources, tileServers, externalApis };
}

/**
 * Alternative API pubbliche WRF per il volo a vela
 */
export const WRF_ALTERNATIVES = [
  {
    name: "Open-Meteo WRF (GFS-based)",
    url: "https://open-meteo.com/",
    description: "Usiamo già Open-Meteo come fonte primaria",
    free: true,
  },
  {
    name: "WRF-Tiles.com",
    url: "https://wrftiles.com/",
    description: "Tile server WRF ad alta risoluzione per Nord America e Europa",
    type: "tile" as const,
    free: true,
  },
  {
    name: "NOAA NOMADS (GFS/NAM/HRRR)",
    url: "https://nomads.ncep.noaa.gov/",
    description: "Dati grezzi in GRIB2 dai modelli NOAA",
    type: "grib" as const,
    free: true,
  },
  {
    name: "ECMWF Open Data",
    url: "https://www.ecmwf.int/en/forecasts/datasets/open-data",
    description: "Dati aperti ECMWF (risoluzione 9km/18km)",
    type: "grib" as const,
    free: true,
  },
  {
    name: "DWD ICON-D2",
    url: "https://www.dwd.de/DE/leistungen/icon_d2/icon_d2.html",
    description: "Modello tedesco ad alta risoluzione (2km)",
    type: "grib" as const,
    free: true,
  },
];
