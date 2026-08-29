import { NextRequest, NextResponse } from "next/server";

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama-3.3-70b-versatile";

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
  if (!GROQ_API_KEY) {
    return NextResponse.json({ success: false, error: "GROQ_API_KEY mancante" }, { status: 500 });
  }

  try {
    const { data, decollo } = await req.json();
    if (!data || !decollo) {
      return NextResponse.json({ success: false, error: "Parametri mancanti" }, { status: 400 });
    }

    const prompt = buildPrompt(data, decollo);

    const res = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: "Sei un meteorologo esperto per volo libero. Rispondi SOLO JSON." },
          { role: "user", content: prompt },
        ],
        temperature: 0.1,
        max_tokens: 300,
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ success: false, error: `Groq ${res.status}: ${err}` }, { status: 502 });
    }

    const json = await res.json();
    const content = json.choices?.[0]?.message?.content;
    if (!content) return NextResponse.json({ success: false, error: "Risposta vuota" }, { status: 502 });

    const validazione = JSON.parse(content);
    return NextResponse.json({ success: true, validazione });

  } catch (e: any) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}