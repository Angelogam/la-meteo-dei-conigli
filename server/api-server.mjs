import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = join(__dirname, "..", "dist");

// Configurazione Groq API
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

// Endpoint di test statico
const testResponse = {
  lat: 44.65,
  lon: 7.35,
  temperature: 22.4,
  wind_speed: 5.2,
  wind_dir: 180,
  gusts: 7.8,
  timestamp: new Date().toISOString(),
};

// Endpoint AI per analisi completa delle previsioni
async function analisiCompletaAI(datiMeteo, decollo) {
  if (!GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY non configurata");
  }

  const prompt = `
Sei un meteorologo esperto per il volo libero (parapendio e deltaplano). 
Analizza i seguenti dati meteo per il decollo "${decollo.name}" situato a ${decollo.altitude}m s.l.m. in Piemonte, Italia.

DATI METEO:
- Temperatura: ${datiMeteo.temperature}°C
- Umidità: ${datiMeteo.humidity}%
- Vento: ${datiMeteo.windSpeed} km/h da ${datiMeteo.windDir}°
- Raffiche: ${datiMeteo.gusts} km/h
- Nuvolosità: ${datiMeteo.cloudCover}%
- Precipitazioni: ${datiMeteo.precipitation} mm
- Pressione: ${datiMeteo.pressure} hPa
- CAPE: ${datiMeteo.cape} J/kg
- Lifted Index: ${datiMeteo.liftedIndex}
- Zero termico: ${datiMeteo.freezingLevel}m
- Base nuvole: ${datiMeteo.cloudBase}m

Fornisci un'analisi completa in formato JSON con questi campi:
{
  "giudizio": "Ottimo|Buono|Discreto|Rischioso|Non volabile",
  "punteggio": numero 0-100,
  "termiche": "descrizione delle termiche attese",
  "ventoQuota": "descrizione del vento in quota",
  "stabilita": "descrizione della stabilità atmosferica",
  "rischioTemporali": "descrizione del rischio temporali",
  "finestraVolo": "miglior finestra oraria per il volo",
  "quotaConsigliata": numero (quota massima consigliata in metri),
  "consigli": ["array di 3-5 consigli pratici per il pilota"],
  "segnaliPericolo": ["array di segnali di pericolo, vuoto se nessuno"],
  "sintesi": "breve sintesi della situazione"
}
`;

  const response = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 1024,
    }),
  });

  if (!response.ok) {
    throw new Error(`Groq API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices[0].message.content;
  
  // Estrai il JSON dalla risposta
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Risposta AI non valida");
  }
  
  return JSON.parse(jsonMatch[0]);
}

// Endpoint per validazione singolo decollo (esistente)
async function validazioneDecollo(datiMeteo, decollo) {
  if (!GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY non configurata");
  }

  const prompt = `
Valuta le condizioni di volo per il decollo "${decollo.name}" a ${decollo.altitude}m in Piemonte.

DATI:
- Temp: ${datiMeteo.temperature}°C, Umidità: ${datiMeteo.humidity}%
- Vento: ${datiMeteo.windSpeed} km/h da ${datiMeteo.windDir}°, Raffiche: ${datiMeteo.gusts} km/h
- Nuvole: ${datiMeteo.cloudCover}%, Pioggia: ${datiMeteo.precipitation}mm
- CAPE: ${datiMeteo.cape} J/kg, LI: ${datiMeteo.liftedIndex}

Rispondi SOLO con JSON:
{
  "valid": true|false,
  "score": 0-100,
  "giudizio": "Ottimo|Buono|Discreto|Rischioso|Non volabile",
  "motivi": ["array di motivi"],
  "alert": "stringa descrittiva",
  "finestra_volo": "orario consigliato",
  "quota_max_consigliata": numero metri
}
`;

  const response = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 512,
    }),
  });

  if (!response.ok) {
    throw new Error(`Groq API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices[0].message.content;
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Risposta AI non valida");
  
  return JSON.parse(jsonMatch[0]);
}

// Server HTTP
const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname;

  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  // Health check
  if (path === "/api/health" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", groq: !!GROQ_API_KEY }));
    return;
  }

  // Endpoint test statico
  if (path === "/api/meteo/test" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(testResponse));
    return;
  }

  // Endpoint meteo proxy
  if (path === "/api/meteo" && req.method === "GET") {
    const lat = parseFloat(url.searchParams.get("lat"));
    const lon = parseFloat(url.searchParams.get("lon"));

    if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Parametri lat/lon mancanti o non validi" }));
      return;
    }

    try {
      const params = new URLSearchParams({
        latitude: lat.toString(),
        longitude: lon.toString(),
        current: "temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,wind_gusts_10m,weather_code,cloud_cover,pressure_msl,precipitation",
        timezone: "Europe/Rome",
        forecast_days: "1",
      });

      const omRes = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
      if (!omRes.ok) throw new Error(`Open-Meteo HTTP ${omRes.status}`);
      const omData = await omRes.json();
      const c = omData.current;

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        lat,
        lon,
        temperature: c.temperature_2m,
        wind_speed: c.wind_speed_10m,
        wind_dir: c.wind_direction_10m,
        gusts: c.wind_gusts_10m,
        orario: c.time,
        timestamp: new Date().toISOString(),
      }));
    } catch (err) {
      res.writeHead(502, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Errore proxy Open-Meteo", detail: err.message }));
    }
    return;
  }

  // NUOVO: Endpoint AI per analisi completa delle previsioni
  if (path === "/api/ai/analisi-completa" && req.method === "POST") {
    let body = "";
    req.on("data", chunk => body += chunk);
    req.on("end", async () => {
      try {
        const { datiMeteo, decollo } = JSON.parse(body);
        
        if (!datiMeteo || !decollo) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "datiMeteo e decollo richiesti" }));
          return;
        }

        const analisi = await analisiCompletaAI(datiMeteo, decollo);
        
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          success: true,
          analisi,
          timestamp: new Date().toISOString(),
        }));
      } catch (err) {
        console.error("[AI Analisi Completa] Errore:", err.message);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ 
          error: "Errore analisi AI", 
          detail: err.message 
        }));
      }
    });
    return;
  }

  // Endpoint validazione singolo decollo (esistente)
  if (path === "/api/weather/validate" && req.method === "POST") {
    let body = "";
    req.on("data", chunk => body += chunk);
    req.on("end", async () => {
      try {
        const { data, decollo } = JSON.parse(body);
        
        if (!data || !decollo) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "data e decollo richiesti" }));
          return;
        }

        const validazione = await validazioneDecollo(data, decollo);
        
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          success: true,
          validazione,
          timestamp: new Date().toISOString(),
        }));
      } catch (err) {
        console.error("[Validazione] Errore:", err.message);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ 
          error: "Errore validazione", 
          detail: err.message 
        }));
      }
    });
    return;
  }

  // Endpoint analisi multi-decollo
  if (path === "/api/ai/analisi-multipla" && req.method === "POST") {
    let body = "";
    req.on("data", chunk => body += chunk);
    req.on("end", async () => {
      try {
        const { decolli, datiMeteoPerDecollo } = JSON.parse(body);
        
        if (!decolli || !datiMeteoPerDecollo) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "decolli e datiMeteoPerDecollo richiesti" }));
          return;
        }

        const risultati = {};
        
        // Analizza ogni decollo in sequenza per non sovraccaricare l'API
        for (const decollo of decolli) {
          const dati = datiMeteoPerDecollo[decollo.id];
          if (!dati) continue;
          
          try {
            const analisi = await analisiCompletaAI(dati, decollo);
            risultati[decollo.id] = { success: true, analisi };
          } catch (err) {
            risultati[decollo.id] = { success: false, error: err.message };
          }
          
          // Piccola pausa tra le richieste
          await new Promise(r => setTimeout(r, 500));
        }
        
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          success: true,
          risultati,
          timestamp: new Date().toISOString(),
        }));
      } catch (err) {
        console.error("[Analisi Multipla] Errore:", err.message);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ 
          error: "Errore analisi multipla", 
          detail: err.message 
        }));
      }
    });
    return;
  }

  // Static files
  if (path === "/" || path === "/index.html") {
    try {
      const html = readFileSync(join(distDir, "index.html"));
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(html);
    } catch {
      res.writeHead(404);
      res.end("Not Found");
    }
    return;
  }

  // 404 per endpoint sconosciuti
  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Endpoint non trovato" }));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server in ascolto sulla porta ${PORT}`);
  console.log(`   - Health: http://localhost:${PORT}/api/health`);
  console.log(`   - AI Analisi Completa: POST http://localhost:${PORT}/api/ai/analisi-completa`);
  console.log(`   - AI Analisi Multipla: POST http://localhost:${PORT}/api/ai/analisi-multipla`);
  console.log(`   - Validazione: POST http://localhost:${PORT}/api/weather/validate`);
  console.log(`   - Meteo Test: GET http://localhost:${PORT}/api/meteo/test`);
  console.log(`   - Meteo Proxy: GET http://localhost:${PORT}/api/meteo?lat=44.65&lon=7.35`);
  if (GROQ_API_KEY) {
    console.log(`✅ Groq API configurata`);
  } else {
    console.log(`⚠️  GROQ_API_KEY non impostata - endpoint AI disattivati`);
  }
});

</dyad-file>

<dyad-write path="package.json">
{
  "name": "vite_react_shadcn_ts",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "build:dev": "vite build --mode development",
    "lint": "eslint .",
    "preview": "vite preview",
    "test:e2e": "playwright test",
    "server": "node server/api-server.mjs",
    "server:dev": "node --watch server/api-server.mjs"
  },
  "dependencies": {
    "@capacitor/android": "^6.2.1",
    "@capacitor/cli": "7.4.4",
    "@capacitor/core": "^6.2.1",
    "@capacitor/ios": "7.4.4",
    "@capacitor/network": "^8.0.1",
    "@hookform/resolvers": "^3.9.0",
    "@radix-ui/react-accordion": "^1.2.0",
    "@radix-ui/react-alert-dialog": "^1.1.1",
    "@radix-ui/react-aspect-ratio": "^1.1.0",
    "@radix-ui/react-avatar": "^1.1.0",
    "@radix-ui/react-checkbox": "^1.1.1",
    "@radix-ui/react-collapsible": "^1.1.0",
    "@radix-ui/react-context-menu": "^2.2.1",
    "@radix-ui/react-dialog": "^1.1.2",
    "@radix-ui/react-dropdown-menu": "^2.1.1",
    "@radix-ui/react-hover-card": "^1.1.1",
    "@radix-ui/react-label": "^2.1.0",
    "@radix-ui/react-menubar": "^1.1.1",
    "@radix-ui/react-navigation-menu": "^1.2.0",
    "@radix-ui/react-popover": "^1.1.1",
    "@radix-ui/react-progress": "^1.1.0",
    "@radix-ui/react-radio-group": "^1.2.0",
    "@radix-ui/react-scroll-area": "^1.1.0",
    "@radix-ui/react-select": "^2.1.1",
    "@radix-ui/react-separator": "^1.1.0",
    "@radix-ui/react-slider": "^1.2.0",
    "@radix-ui/react-slot": "^1.1.0",
    "@radix-ui/react-switch": "^1.1.0",
    "@radix-ui/react-tabs": "^1.1.0",
    "@radix-ui/react-toast": "^1.2.1",
    "@radix-ui/react-toggle": "^1.1.0",
    "@radix-ui/react-toggle-group": "^1.1.0",
    "@radix-ui/react-tooltip": "^1.1.4",
    "@tanstack/react-query": "^5.56.2",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "cmdk": "^1.0.0",
    "date-fns": "^3.6.0",
    "embla-carousel-react": "^8.3.0",
    "input-otp": "^1.2.4",
    "lucide-react": "^0.462.0",
    "next-themes": "^0.3.0",
    "react": "^19.2.3",
    "react-day-picker": "^9.13.0",
    "react-dom": "^19.2.3",
    "react-hook-form": "^7.53.0",
    "react-resizable-panels": "^2.1.3",
    "react-router-dom": "^6.30.4",
    "recharts": "^2.15.2",
    "sonner": "^1.5.0",
    "tailwind-merge": "^2.5.2",
    "tailwindcss-animate": "^1.0.7",
    "vaul": "^0.9.3",
    "zod": "^3.25.0"
  },
  "devDependencies": {
    "@dyad-sh/react-vite-component-tagger": "^0.9.0",
    "@eslint/js": "^9.9.0",
    "@playwright/test": "^1.50.0",
    "@tailwindcss/typography": "^0.5.15",
    "@types/node": "^22.5.5",
    "@types/react": "^19.2.8",
    "@types/react-dom": "^19.2.3",
    "@vitejs/plugin-react": "^4.3.0",
    "@vitejs/plugin-react-swc": "^4.3.0",
    "autoprefixer": "^10.4.20",
    "eslint": "^9.9.0",
    "eslint-plugin-react-hooks": "^5.1.0-rc.0",
    "eslint-plugin-react-refresh": "^0.4.9",
    "globals": "^15.9.0",
    "postcss": "^8.4.47",
    "tailwindcss": "^3.4.11",
    "typescript": "^5.5.3",
    "typescript-eslint": "^8.0.1",
    "vite": "^8.0.0"
  }
}