import { NextRequest, NextResponse } from "next/server";

const OPENROUTER_API_KEY = process.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY;
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

const MODELS = {
  fast: "meta-llama/llama-3.1-8b-instruct:free",
  faster: "google/gemma-2-9b-it:free",
  coding: "deepseek/deepseek-coder-v2-lite-instruct:free",
  coding2: "qwen/qwen-2.5-coder-32b-instruct:free",
  quality: "qwen/qwen-2.5-7b-instruct:free",
  quality2: "mistralai/mistral-nemo:free",
  reasoning: "nvidia/nemotron-3-ultra:free",
  reasoning2: "gryphe/mythomax-l2-13b:free",
  italian: "qwen/qwen-2.5-7b-instruct:free",
  italian2: "techsini/llama-3-taide-lx-8b-chat:free",
  balanced: "meta-llama/llama-3.1-70b-instruct:free",
};

const MODEL = MODELS.coding;

function buildPrompt(data: any, decollo: any): string {
  const h = data?.hourly?.[0] || data?.current || {};
  const daily = data?.daily?.[0] || {};
  return `Sei un meteorologo per parapendio. Analizza SOLO con questi dati reali Open-Meteo:

DECOLLO: ${decollo.name} (${decollo.elevation_m}m, esposizione ${decollo.orientation})
ORA ATTUALE: ${new Date().toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}

DATI REALI:
- Temp: ${h.temperature_2m ?? h.temperature ?? "N/D"}°C
- Umidità: ${h.relative_humidity_2m ?? h.humidity ?? "N/D"}%
- Vento: ${h.wind_speed_10m ?? h.windSpeed ?? "N/D"} km/h da ${h.wind_direction_10m ?? h.windDir ?? "N/D"}°
- Raffiche: ${h.wind_gusts_10m ?? h.windGusts ?? "N/D"} km/h
- Nuvolosità: ${h.cloud_cover ?? h.cloudCover ?? "N/D"}%
- Pioggia ora: ${h.precipitation ?? "0"} mm
- Weather code WMO: ${h.weather_code ?? h.weatherCode ?? "N/D"}
- CAPE: ${h.cape ?? "N/D"} J/kg
- Temp max oggi: ${daily.temperature_2m_max ?? "N/D"}°C
- Temp min oggi: ${daily.temperature_2m_min ?? "N/D"}°C
- Pioggia prevista oggi: ${daily.precipitation_sum ?? "N/D"} mm

Rispondi SOLO JSON valido:
{
  "valid": boolean,
  "score": 0-100,
  "giudizio": "Ottimo"|"Buono"|"Discreto"|"Rischioso"|"Non volabile",
  "motivi": ["stringa"],
  "alert": "stringa breve (max 160 char)",
  "finestra_volo": "es. 10:00-16:00",
  "quota_max_consigliata": numero
}

REGOLE:
- Pioggia > 0.5mm o temporale (code 95/96/99) → "Non volabile", score 0
- Vento > 25 km/h o raffiche > 35 → "Rischioso" max
- Vento < 3 km/h → "Discreto" max (termiche deboli)
- Esposizione vs direzione vento: se coda (>135° diff) → penalizza forte
- CAPE > 1000 + pioggia → temporale probabile
- Termiche: spread T-Td > 8°C + sole + vento 5-15 km/h → buone`;
}

export async function POST(req: NextRequest) {
  if (!OPENROUTER_API_KEY) {
    return NextResponse.json(
      { success: false, error: "OPENROUTER_API_KEY mancante nelle variabili d'ambiente" },
      { status: 500 }
    );
  }

  try {
    const { data, decollo } = await req.json();
    if (!data || !decollo) {
      return NextResponse.json(
        { success: false, error: "Parametri mancanti: data e decollo richiesti" },
        { status: 400 }
      );
    }

    const prompt = buildPrompt(data, decollo);

    const res = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "HTTP-Referer": "https://meteo-dei-conigli.dyad.sh",
        "X-Title": "Meteo dei Conigli - Validazione Meteo",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: "Sei un meteorologo esperto per volo libero. Rispondi SOLO con JSON valido seguendo le regole fornite." },
          { role: "user", content: prompt },
        ],
        temperature: 0.1,
        max_tokens: 300,
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json(
        { 
          success: false, 
          error: `OpenRouter API Error ${res.status}: ${errText.substring(0, 200)}` 
        },
        { status: 502 }
      );
    }

    const json = await res.json();
    const content = json.choices?.[0]?.message?.content;
    
    if (!content) {
      return NextResponse.json(
        { success: false, error: "Risposta vuota dal modello AI" },
        { status: 502 }
      );
    }

    try {
      const validazione = JSON.parse(content);
      
      if (typeof validazione.valid !== "boolean" ||
          typeof validazione.score !== "number" ||
          !["Ottimo", "Buono", "Discreto", "Rischioso", "Non volabile"].includes(validazione.giudizio) ||
          !Array.isArray(validazione.motivi) ||
          typeof validazione.alert !== "string" ||
          typeof validazione.finestra_volo !== "string" ||
          typeof validazione.quota_max_consigliata !== "number") {
        return NextResponse.json(
          { success: false, error: "Formato risposta AI non valido" },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true, validazione });
    } catch (parseError) {
      return NextResponse.json(
        { success: false, error: "Impossibile parsare la risposta JSON dall'AI" },
        { status: 500 }
      );
    }

  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: `Errore interno: ${e.message || String(e)}` },
      { status: 500 }
    );
  }
}