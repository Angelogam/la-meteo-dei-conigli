// server/api-server.mjs
// Server API Meteo per app mobile Android - "Meteo dei Conigli"
// v3.0 - Proxy trasparente Open-Meteo + endpoint nativi app
// ZERO dipendenze (solo moduli built-in Node)
// Avvio:  node server/api-server.mjs   (PORT default 3000)

import http from "node:http";
import https from "node:https";
import { URL } from "node:url";

const PORT = process.env.PORT || 3000;
const VERSION = "3.0.0";
const APP_NAME = "Meteo dei Conigli API";
const ANDROID_PACKAGE = "com.meteodeiconigli.app";
const OPEN_METEO_BASE = "https://api.open-meteo.com/v1/forecast";

// ============================================================
// UTILITIES
// ============================================================

function sendJSON(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-App-Version",
  });
  res.end(body);
}

function logRequest(req, status, time) {
  const timestamp = new Date().toISOString();
  const ua = req.headers["user-agent"] || "unknown";
  const isMobile = ua.includes("MeteoConigli") || ua.includes("Capacitor");
  console.log(
    `[${timestamp}] ${req.method} ${req.url} → ${status} (${time}ms) ${isMobile ? "📱" : "🌐"}`
  );
}

// Cache semplice per evitare chiamate ripetute a Open-Meteo
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minuti

function getCached(key) {
  const item = cache.get(key);
  if (!item) return null;
  if (Date.now() - item.timestamp > CACHE_TTL) {
    cache.delete(key);
    return null;
  }
  return item.data;
}

function setCache(key, data) {
  cache.set(key, { data, timestamp: Date.now() });
}

// ============================================================
// OPEN-METEO PROXY
// ============================================================

// Current weather
function fetchOpenMeteoCurrent(lat, lon) {
  return new Promise((resolve, reject) => {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&current=temperature_2m,relative_humidity_2m,dew_point_2m,apparent_temperature,` +
      `precipitation,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m,` +
      `wind_gusts_10m,cape,uv_index` +
      `&timezone=Europe/Rome`;
    https
      .get(url, (apiRes) => {
        let data = "";
        apiRes.on("data", (c) => (data += c));
        apiRes.on("end", () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(e);
          }
        });
      })
      .on("error", reject);
  });
}

// Hourly forecast
function fetchOpenMeteoHourly(lat, lon, hours = 24) {
  return new Promise((resolve, reject) => {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&hourly=temperature_2m,relative_humidity_2m,dew_point_2m,precipitation,` +
      `precipitation_probability,weather_code,cloud_cover,cloud_cover_low,` +
      `cloud_cover_mid,cloud_cover_high,wind_speed_10m,wind_direction_10m,` +
      `wind_gusts_10m,cape,lifted_index,shortwave_radiation,uv_index,visibility` +
      `&forecast_hours=${hours}&timezone=Europe/Rome`;
    https
      .get(url, (apiRes) => {
        let data = "";
        apiRes.on("data", (c) => (data += c));
        apiRes.on("end", () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(e);
          }
        });
      })
      .on("error", reject);
  });
}

// Daily forecast
function fetchOpenMeteoDaily(lat, lon, days = 7) {
  return new Promise((resolve, reject) => {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,` +
      `precipitation_probability_max,wind_speed_10m_max,wind_gusts_10m_max,` +
      `wind_direction_10m_dominant,uv_index_max,sunrise,sunset` +
      `&forecast_days=${days}&timezone=Europe/Rome`;
    https
      .get(url, (apiRes) => {
        let data = "";
        apiRes.on("data", (c) => (data += c));
        apiRes.on("end", () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(e);
          }
        });
      })
      .on("error", reject);
  });
}

// Combined forecast (current + hourly + daily)
async function fetchFullForecast(lat, lon) {
  const [current, hourly, daily] = await Promise.all([
    fetchOpenMeteoCurrent(lat, lon),
    fetchOpenMeteoHourly(lat, lon, 48),
    fetchOpenMeteoDaily(lat, lon, 7),
  ]);
  return { current, hourly, daily };
}

// ============================================================
// SITI DI DECOLLO (24 siti - Valle Piemontesi)
// ============================================================

const SITES = [
  { id: "malanotte", name: "Malanotte", valley: "Valle Ellero", exposure: "S/SE", elevation: 1740, lat: 44.25874571728482, lon: 7.794304664370852, difficulty: 2 },
  { id: "colle-di-tenda", name: "Colle di Tenda", valley: "Valle Roya/Vermenagna", exposure: "S", elevation: 1990, lat: 44.15093973937469, lon: 7.569262924652476, difficulty: 1 },
  { id: "boves", name: "Boves", valley: "Cuneese", exposure: "NE", elevation: 900, lat: 44.32113720462757, lon: 7.544697617792515, difficulty: 1 },
  { id: "monte-male", name: "Monte Male – Dronero", valley: "Valle Maira", exposure: "S", elevation: 950, lat: 44.43163071064606, lon: 7.362886778152897, difficulty: 2 },
  { id: "iretta", name: "Iretta", valley: "Valle Maira", exposure: "SO", elevation: 1050, lat: 44.49893744007536, lon: 7.382036612070795, difficulty: 1 },
  { id: "pratoni-val-mala", name: "Pratoni di Val Mala", valley: "Valle Maira", exposure: "S", elevation: 1400, lat: 44.50780117336976, lon: 7.346618978966227, difficulty: 1 },
  { id: "monte-birrone", name: "Monte Birrone", valley: "Valle Maira", exposure: "S", elevation: 2131, lat: 44.5398927839592, lon: 7.25293945830122, difficulty: 3 },
  { id: "colle-agnello", name: "Colle dell'Agnello", valley: "Valle Varaita", exposure: "S", elevation: 2748, lat: 44.68282592463814, lon: 6.978200601250462, difficulty: 3 },
  { id: "pian-mune-seggiovia", name: "Pian Munè – Seggiovia", valley: "Valle Po", exposure: "S/SW", elevation: 1870, lat: 44.63861029121272, lon: 7.230889474766025, difficulty: 1 },
  { id: "pian-mune-lombatera", name: "Pian Munè – Bric Lombatera", valley: "Valle Po", exposure: "S", elevation: 1350, lat: 44.65736521807557, lon: 7.260017009542715, difficulty: 1 },
  { id: "martiniana-po", name: "Martiniana Po", valley: "Valle Po", exposure: "NE", elevation: 1400, lat: 44.60695265332723, lon: 7.38322612877631, difficulty: 1 },
  { id: "rucas-alto", name: "Rucas Alto", valley: "Valle Infernotto", exposure: "S/SE", elevation: 1500, lat: 44.74213930591463, lon: 7.220118689737356, difficulty: 1 },
  { id: "montoso", name: "Montoso – Decollo Basso", valley: "Valle Infernotto", exposure: "SE", elevation: 1250, lat: 44.7643723437882, lon: 7.249757926713178, difficulty: 1 },
  { id: "monte-vandalino", name: "Monte Vandalino", valley: "Val Pellice", exposure: "S/SE", elevation: 2120, lat: 44.83671231480542, lon: 7.173866924055591, difficulty: 3 },
  { id: "pian-dell-alpe", name: "Pian dell'Alpe", valley: "Val Chisone", exposure: "S", elevation: 1990, lat: 45.06396153999711, lon: 7.028266530872771, difficulty: 2 },
  { id: "roletto-piggi", name: "Roletto – Piggi", valley: "Pinerolese", exposure: "S", elevation: 820, lat: 44.93249288285819, lon: 7.310959031722244, difficulty: 1 },
  { id: "piossasco", name: "Piossasco – Monte S. Giorgio", valley: "Collina Torinese", exposure: "S", elevation: 673, lat: 44.99671840144012, lon: 7.44800217882953, difficulty: 1 },
  { id: "truccetti", name: "Truccetti", valley: "Canavese", exposure: "S", elevation: 900, lat: 45.07973511679036, lon: 7.342018342463826, difficulty: 1 },
  { id: "val-della-torre", name: "Val della Torre", valley: "Val della Torre", exposure: "S", elevation: 970, lat: 45.16262748864921, lon: 7.463716167415302, difficulty: 1 },
  { id: "rocca-canavese", name: "Rocca Canavese – M. della Neve", valley: "Canavese", exposure: "S", elevation: 1100, lat: 45.32757754837493, lon: 7.572793582322621, difficulty: 1 },
  { id: "santa-elisabetta", name: "Santa Elisabetta", valley: "Canavese", exposure: "S", elevation: 1000, lat: 45.4182733880574, lon: 7.641945041749434, difficulty: 1 },
  { id: "santa-elisabetta-alto", name: "Santa Elisabetta Alto", valley: "Canavese", exposure: "S", elevation: 1400, lat: 45.44019393073506, lon: 7.648025947229948, difficulty: 1 },
  { id: "monte-cavallaria", name: "Monte Cavallaria", valley: "Canavese", exposure: "S", elevation: 1430, lat: 45.51729363773779, lon: 7.798808327293107, difficulty: 1 },
  { id: "andrate", name: "Andrate", valley: "Canavese", exposure: "S", elevation: 1000, lat: 45.55063933418272, lon: 7.880775591143394, difficulty: 1 },
];

// ============================================================
// OPEN-METEO PROXY (trasparente)
// Restituisce esattamente lo stesso formato di Open-Meteo
// ============================================================

function proxyOpenMeteo(targetUrl) {
  return new Promise((resolve, reject) => {
    const startProxy = Date.now();
    https.get(targetUrl, (apiRes) => {
      let data = "";
      apiRes.on("data", (c) => (data += c));
      apiRes.on("end", () => {
        console.log(`  ↳ Open-Meteo risponso in ${Date.now() - startProxy}ms`);
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on("error", (err) => {
      console.error(`  ↳ Errore Open-Meteo: ${err.message}`);
      reject(err);
    });
  });
}

// Endpoint proxy: /api/open-meteo?latitude=XX&longitude=YY&current=...&hourly=...&daily=...
// Inoltra la richiesta a Open-Meteo e restituisce la risposta tale e quale
async function handleOpenMeteoProxy(params) {
  // Costruisci URL Open-Meteo
  const omParams = new URLSearchParams();
  
  // Mappa i parametri latitude/longitude
  const lat = params.get("latitude") || params.get("lat");
  const lon = params.get("longitude") || params.get("lon");
  if (lat) omParams.set("latitude", lat);
  if (lon) omParams.set("longitude", lon);
  
  // Copia tutti gli altri parametri
  for (const [key, value] of params.entries()) {
    if (key !== "latitude" && key !== "longitude" && key !== "lat" && key !== "lon") {
      omParams.set(key, value);
    }
  }
  
  // Default timezone se non specificato
  if (!omParams.has("timezone")) {
    omParams.set("timezone", "Europe/Rome");
  }
  
  const url = `${OPEN_METEO_BASE}?${omParams.toString()}`;
  console.log(`  ↳ Proxy Open-Meteo: ${url.substring(0, 120)}...`);
  
  return proxyOpenMeteo(url);
}

// ============================================================
// SERVER
// ============================================================

const server = http.createServer(async (req, res) => {
  const start = Date.now();
  let u;
  try {
    u = new URL(req.url, `http://localhost:${PORT}`);
  } catch {
    sendJSON(res, 400, { error: "URL non valido" });
    return logRequest(req, 400, Date.now() - start);
  }

  const path = u.pathname;
  const params = u.searchParams;

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    sendJSON(res, 200, {});
    return;
  }

  // --- ROOT / INFO ---
  if (path === "/" || path === "/api") {
    sendJSON(res, 200, {
      name: APP_NAME,
      version: VERSION,
      package: ANDROID_PACKAGE,
      endpoints: [
        "GET /api/health",
        "GET /api/version",
        "GET /api/sites",
        "GET /api/sites/:id",
        "GET /api/meteo/test",
        "GET /api/meteo?lat=XX&lon=YY",
        "GET /api/forecast?lat=XX&lon=YY&days=7",
        "GET /api/hourly?lat=XX&lon=YY&hours=24",
      ],
    });
    return logRequest(req, 200, Date.now() - start);
  }

  // --- HEALTH CHECK (per app mobile) ---
  if (path === "/api/health") {
    sendJSON(res, 200, {
      status: "ok",
      version: VERSION,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      cache_size: cache.size,
    });
    return logRequest(req, 200, Date.now() - start);
  }

  // --- VERSION ---
  if (path === "/api/version") {
    sendJSON(res, 200, {
      api: VERSION,
      app: APP_NAME,
      package: ANDROID_PACKAGE,
      build_date: "2025-01-19",
    });
    return logRequest(req, 200, Date.now() - start);
  }

  // --- SITI DI DECOLLO ---
  if (path === "/api/sites") {
    sendJSON(res, 200, {
      count: SITES.length,
      sites: SITES,
    });
    return logRequest(req, 200, Date.now() - start);
  }

  // --- SINGOLO SITO ---
  const siteMatch = path.match(/^\/api\/sites\/(.+)$/);
  if (siteMatch) {
    const site = SITES.find((s) => s.id === siteMatch[1]);
    if (!site) {
      sendJSON(res, 404, { error: "Sito non trovato" });
      return logRequest(req, 404, Date.now() - start);
    }
    sendJSON(res, 200, site);
    return logRequest(req, 200, Date.now() - start);
  }

  // --- PROXY OPEN-METEO (trasparente) ---
  // Inoltra la richiesta a Open-Meteo e restituisce la risposta tale e quale
  if (path === "/api/open-meteo" || path === "/api/openmeteo" || path === "/v1/forecast") {
    try {
      const data = await handleOpenMeteoProxy(params);
      res.writeHead(200, {
        "Content-Type": "application/json; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, X-App-Version",
      });
      res.end(JSON.stringify(data));
      return logRequest(req, 200, Date.now() - start);
    } catch (e) {
      sendJSON(res, 502, {
        error: "Errore proxy Open-Meteo",
        detail: String(e),
      });
      return logRequest(req, 502, Date.now() - start);
    }
  }

  // --- TEST ENDPOINT (hardcoded) ---
  if (path === "/api/meteo/test") {
    sendJSON(res, 200, {
      lat: 44.65,
      lon: 7.35,
      temperature: 22.4,
      wind_speed: 5.2,
      wind_dir: 180,
      gusts: 7.8,
      timestamp: new Date().toISOString(),
    });
    return logRequest(req, 200, Date.now() - start);
  }

  // --- CURRENT METEO ---
  if (path === "/api/meteo") {
    const lat = parseFloat(params.get("lat"));
    const lon = parseFloat(params.get("lon"));

    if (isNaN(lat) || isNaN(lon)) {
      sendJSON(res, 400, {
        error: "Parametri mancanti o non validi. Usa ?lat=XX&lon=YY",
      });
      return logRequest(req, 400, Date.now() - start);
    }
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      sendJSON(res, 400, { error: "Coordinate fuori range" });
      return logRequest(req, 400, Date.now() - start);
    }

    const cacheKey = `current:${lat.toFixed(4)}:${lon.toFixed(4)}`;
    const cached = getCached(cacheKey);
    if (cached) {
      sendJSON(res, 200, { ...cached, cached: true });
      return logRequest(req, 200, Date.now() - start);
    }

    try {
      const om = await fetchOpenMeteoCurrent(lat, lon);
      const c = om.current || {};
      const result = {
        lat,
        lon,
        temperature: c.temperature_2m ?? null,
        feels_like: c.apparent_temperature ?? null,
        humidity: c.relative_humidity_2m ?? null,
        dew_point: c.dew_point_2m ?? null,
        precipitation: c.precipitation ?? null,
        weather_code: c.weather_code ?? null,
        cloud_cover: c.cloud_cover ?? null,
        wind_speed: c.wind_speed_10m ?? null,
        wind_dir: c.wind_direction_10m ?? null,
        gusts: c.wind_gusts_10m ?? null,
        cape: c.cape ?? null,
        uv_index: c.uv_index ?? null,
        orario: c.time ?? null,
        timestamp: new Date().toISOString(),
      };
      setCache(cacheKey, result);
      sendJSON(res, 200, result);
      return logRequest(req, 200, Date.now() - start);
    } catch (e) {
      sendJSON(res, 502, {
        error: "Errore proxy Open-Meteo",
        detail: String(e),
      });
      return logRequest(req, 502, Date.now() - start);
    }
  }

  // --- HOURLY FORECAST ---
  if (path === "/api/hourly") {
    const lat = parseFloat(params.get("lat"));
    const lon = parseFloat(params.get("lon"));
    const hours = parseInt(params.get("hours") || "24");

    if (isNaN(lat) || isNaN(lon)) {
      sendJSON(res, 400, { error: "Parametri lat/lon mancanti" });
      return logRequest(req, 400, Date.now() - start);
    }
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      sendJSON(res, 400, { error: "Coordinate fuori range" });
      return logRequest(req, 400, Date.now() - start);
    }

    const cacheKey = `hourly:${lat.toFixed(4)}:${lon.toFixed(4)}:${hours}`;
    const cached = getCached(cacheKey);
    if (cached) {
      sendJSON(res, 200, { ...cached, cached: true });
      return logRequest(req, 200, Date.now() - start);
    }

    try {
      const om = await fetchOpenMeteoHourly(lat, lon, hours);
      sendJSON(res, 200, {
        lat,
        lon,
        hours,
        hourly: om.hourly || {},
        timestamp: new Date().toISOString(),
      });
      return logRequest(req, 200, Date.now() - start);
    } catch (e) {
      sendJSON(res, 502, { error: "Errore proxy Open-Meteo", detail: String(e) });
      return logRequest(req, 502, Date.now() - start);
    }
  }

  // --- FULL FORECAST (current + hourly + daily) ---
  if (path === "/api/forecast") {
    const lat = parseFloat(params.get("lat"));
    const lon = parseFloat(params.get("lon"));
    const days = parseInt(params.get("days") || "7");

    if (isNaN(lat) || isNaN(lon)) {
      sendJSON(res, 400, { error: "Parametri lat/lon mancanti" });
      return logRequest(req, 400, Date.now() - start);
    }
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      sendJSON(res, 400, { error: "Coordinate fuori range" });
      return logRequest(req, 400, Date.now() - start);
    }

    const cacheKey = `forecast:${lat.toFixed(4)}:${lon.toFixed(4)}:${days}`;
    const cached = getCached(cacheKey);
    if (cached) {
      sendJSON(res, 200, { ...cached, cached: true });
      return logRequest(req, 200, Date.now() - start);
    }

    try {
      const result = await fetchFullForecast(lat, lon);
      const response = {
        lat,
        lon,
        days,
        current: result.current?.current || {},
        hourly: result.hourly?.hourly || {},
        daily: result.daily?.daily || {},
        timestamp: new Date().toISOString(),
      };
      setCache(cacheKey, response);
      sendJSON(res, 200, response);
      return logRequest(req, 200, Date.now() - start);
    } catch (e) {
      sendJSON(res, 502, { error: "Errore proxy Open-Meteo", detail: String(e) });
      return logRequest(req, 502, Date.now() - start);
    }
  }

  // --- 404 ---
  sendJSON(res, 404, { error: "Endpoint non trovato", path });
  logRequest(req, 404, Date.now() - start);
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`✅ ${APP_NAME} v${VERSION}`);
  console.log(`${"=".repeat(60)}`);
  console.log(`📦 Package Android: ${ANDROID_PACKAGE}`);
  console.log(`🌐 Server: http://localhost:${PORT}`);
  console.log(`📡 Endpoints disponibili:`);
  console.log(`   GET /api/health              - Health check`);
  console.log(`   GET /api/version             - Versione API`);
  console.log(`   GET /api/sites               - Lista 24 siti di decollo`);
  console.log(`   GET /api/sites/:id           - Singolo sito`);
  console.log(`   GET /api/meteo/test          - Test (hardcoded)`);
  console.log(`   GET /api/meteo?lat=XX&lon=YY - Meteo corrente`);
  console.log(`   GET /api/hourly?lat=XX&lon=YY&hours=24 - Forecast orario`);
  console.log(`   GET /api/forecast?lat=XX&lon=YY&days=7 - Forecast completo`);
  console.log(`${"=".repeat(60)}\n`);
});
