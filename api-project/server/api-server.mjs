// server/api-server.mjs
// Server API Meteo locale — ZERO dipendenze (solo moduli built-in Node)
// Avvio:  node server/api-server.mjs   (PORT default 3000)

import http from "node:http";
import https from "node:https";
import { URL } from "node:url";

const PORT = process.env.PORT || 3000;

function sendJSON(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
  });
  res.end(body);
}

// Proxy verso Open-Meteo (current) usando solo https built-in
function fetchOpenMeteoCurrent(lat, lon) {
  return new Promise((resolve, reject) => {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&current=temperature_2m,wind_speed_10m,wind_direction_10m,wind_gusts_10m` +
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

const server = http.createServer(async (req, res) => {
  let u;
  try {
    u = new URL(req.url, `http://localhost:${PORT}`);
  } catch {
    return sendJSON(res, 400, { error: "URL non valido" });
  }

  const path = u.pathname;

  // --- ENDPOINT PROVISIONALE DI TEST ---
  if (path === "/api/meteo/test") {
    return sendJSON(res, 200, {
      lat: 44.65,
      lon: 7.35,
      temperature: 22.4,
      wind_speed: 5.2,
      wind_dir: 180,
      gusts: 7.8,
      timestamp: new Date().toISOString(),
    });
  }

  // --- ENDPOINT DEFINITIVO ---
  if (path === "/api/meteo") {
    const lat = parseFloat(u.searchParams.get("lat"));
    const lon = parseFloat(u.searchParams.get("lon"));

    if (isNaN(lat) || isNaN(lon)) {
      return sendJSON(res, 400, {
        error: "Parametri mancanti o non validi. Usa ?lat=XX&lon=YY",
      });
    }
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      return sendJSON(res, 400, { error: "Coordinate fuori range" });
    }

    try {
      const om = await fetchOpenMeteoCurrent(lat, lon);
      const c = om.current || {};
      return sendJSON(res, 200, {
        lat,
        lon,
        temperature: c.temperature_2m ?? null,
        wind_speed: c.wind_speed_10m ?? null,
        wind_dir: c.wind_direction_10m ?? null,
        gusts: c.wind_gusts_10m ?? null,
        orario: c.time ?? null,
        timestamp: new Date().toISOString(),
      });
    } catch (e) {
      return sendJSON(res, 502, {
        error: "Errore proxy Open-Meteo",
        detail: String(e),
      });
    }
  }

  return sendJSON(res, 404, { error: "Endpoint non trovato" });
});

server.listen(PORT, () => {
  console.log(`✅ API Meteo in ascolto su http://localhost:${PORT}`);
  console.log(`   GET /api/meteo/test`);
  console.log(`   GET /api/meteo?lat=44.65&lon=7.35`);
});