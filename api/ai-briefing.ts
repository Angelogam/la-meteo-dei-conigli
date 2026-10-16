type WeatherHour = {
  time?: string;
  temperatureC?: number | null;
  dewPointC?: number | null;
  windKmh?: number | null;
  gustsKmh?: number | null;
  windDirectionDeg?: number | null;
  cloudCoverPercent?: number | null;
  precipitationMm?: number | null;
  precipitationProbabilityPercent?: number | null;
  capeJkg?: number | null;
  boundaryLayerHeightM?: number | null;
  visibilityM?: number | null;
};

type RequestBody = {
  siteName?: string;
  altitude?: number;
  dateLabel?: string;
  hours?: WeatherHour[];
};

function text(value: unknown, max = 160): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export default async function handler(req: any, res: any) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Metodo non consentito." });
  }

  // llmfaucet is the hosted, OpenAI-compatible AI gateway. The default endpoint
  // works with its documented anonymous access; an optional private key can be
  // configured server-side without ever exposing it to the browser.
  const baseUrl = (process.env.LLMFAUCET_BASE_URL || "https://api.llmfaucet.dev/v1").trim();
  if (!/^https:\/\//i.test(baseUrl)) {
    return res.status(500).json({ error: "LLMFAUCET_BASE_URL deve essere un indirizzo HTTPS." });
  }

  const body = (req.body ?? {}) as RequestBody;
  const siteName = text(body.siteName, 100) || "Decollo non specificato";
  const dateLabel = text(body.dateLabel, 80) || "giorno selezionato";
  const altitude = typeof body.altitude === "number" && Number.isFinite(body.altitude)
    ? Math.max(-500, Math.min(9000, Math.round(body.altitude)))
    : null;
  const hours = Array.isArray(body.hours) ? body.hours.slice(0, 24) : [];
  if (hours.length === 0) return res.status(400).json({ error: "Non sono arrivati dati orari da analizzare." });

  const safeHours = hours.map((hour) => ({
    time: text(hour.time, 40),
    temperatureC: finite(hour.temperatureC),
    dewPointC: finite(hour.dewPointC),
    windKmh: finite(hour.windKmh),
    gustsKmh: finite(hour.gustsKmh),
    windDirectionDeg: finite(hour.windDirectionDeg),
    cloudCoverPercent: finite(hour.cloudCoverPercent),
    precipitationMm: finite(hour.precipitationMm),
    precipitationProbabilityPercent: finite(hour.precipitationProbabilityPercent),
    capeJkg: finite(hour.capeJkg),
    boundaryLayerHeightM: finite(hour.boundaryLayerHeightM),
    visibilityM: finite(hour.visibilityM),
  }));

  const prompt = [
    "Sei un assistente che spiega in italiano dati meteorologici per il parapendio.",
    "Analizza esclusivamente i dati JSON forniti. Non inventare valori, osservazioni locali, previsioni o soglie normative.",
    "Produci un briefing conciso con: andamento orario, vento e raffiche, nuvolosità/pioggia, segnali da approfondire e dati mancanti.",
    "Se i dati non bastano, dichiaralo. Non dire mai che volare è sicuro e non dare un'autorizzazione al decollo.",
    "Distingui sempre i dati del modello dalle inferenze. Velocità del vento e raffiche sono in km/h; direzione in gradi; nuvolosità e probabilità in percentuale.",
    JSON.stringify({ siteName, altitudeM: altitude, date: dateLabel, hourlyForecast: safeHours }),
  ].join("\n\n");

  const endpoint = baseUrl.replace(/\/+$/, "") + "/chat/completions";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 55000);
  try {
    const apiKey = process.env.LLMFAUCET_API_KEY?.trim() || "free";
    const upstream = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.LLMFAUCET_MODEL?.trim() || "auto:fast",
        messages: [
          { role: "system", content: "Sei un assistente meteorologico prudente. Non sostituisci il giudizio del pilota né i bollettini ufficiali." },
          { role: "user", content: prompt },
        ],
        temperature: 0.2,
        max_tokens: 900,
      }),
      signal: controller.signal,
    });
    if (!upstream.ok) {
      const retryAfter = upstream.headers.get("retry-after");
      return res.status(502).json({
        error: upstream.status === 429
          ? "Il servizio AI gratuito ha raggiunto il limite temporaneo. Riprova più tardi."
          : `Il servizio AI remoto ha risposto con errore HTTP ${upstream.status}. Riprova più tardi.`,
        ...(retryAfter ? { retryAfter } : {}),
      });
    }
    const payload = await upstream.json() as any;
    const briefing = payload?.choices?.[0]?.message?.content;
    if (typeof briefing !== "string" || !briefing.trim()) {
      return res.status(502).json({ error: "La risposta del servizio AI remoto non contiene testo." });
    }
    return res.status(200).json({ briefing: briefing.trim().slice(0, 12000) });
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "AbortError";
    return res.status(502).json({
      error: timedOut
        ? "Il servizio AI remoto ha impiegato troppo tempo a rispondere."
        : "Non riesco a raggiungere il servizio AI remoto. Riprova più tardi.",
    });
  } finally {
    clearTimeout(timeout);
  }
}

function finite(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
