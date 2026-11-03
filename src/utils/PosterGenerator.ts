export interface PosterData {
  siteName: string;
  date: string;
  province: string;
  elevation: number;
  verdictLabel: string;
  semaforo: "GO" | "ATTENZIONE" | "NO GO";
  report: string;
  params: {
    thermals: string;
    cloudBase: string;
    maxAltitude: string;
    zeroIsotherm: string;
    visibility: string;
    rain: string;
    storm: string;
  };
  probabilities: {
    flyable: number;
    thermal: number;
    wind: number;
    rain: number;
    storm: number;
  };
  windows: {
    morning: string;
    midday: string;
    afternoon: string;
    evening: string;
  };
}

export function generatePoster(data: PosterData): string {
  const palette = {
    navy: "#0F4C81",
    blue: "#46A6FF",
    green: "#41B853",
    orange: "#FF9F1C",
    red: "#E63946",
    white: "#FFFFFF",
    ink: "#0F172A",
    mist: "#EDF6FF",
  };

  const base = `
  <svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920">
    <defs>
      <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
        <stop offset="0%" stop-color="#ffffff"/>
        <stop offset="100%" stop-color="#eef6ff"/>
      </linearGradient>
      <linearGradient id="header" x1="0" x2="1" y1="0" y2="0">
        <stop offset="0%" stop-color="${palette.navy}"/>
        <stop offset="100%" stop-color="${palette.blue}"/>
      </linearGradient>
    </defs>
    <rect width="1080" height="1920" fill="url(#bg)"/>
    <rect x="0" y="0" width="1080" height="576" fill="url(#header)"/>
    <circle cx="830" cy="130" r="180" fill="rgba(255,255,255,0.08)"/>
    <circle cx="980" cy="220" r="120" fill="rgba(255,255,255,0.08)"/>
    <text x="68" y="116" font-size="28" font-family="Arial, sans-serif" fill="rgba(255,255,255,0.8)" letter-spacing="4">REPORT AI METEO</text>
    <text x="68" y="214" font-size="52" font-family="Arial, sans-serif" font-weight="700" fill="white">${escapeXml(data.siteName)}</text>
    <text x="68" y="270" font-size="22" font-family="Arial, sans-serif" fill="rgba(255,255,255,0.8)">${escapeXml(data.date)} · ${escapeXml(data.province)}</text>
    <text x="68" y="318" font-size="22" font-family="Arial, sans-serif" fill="rgba(255,255,255,0.85)">Quota decollo: ${data.elevation} m</text>
    <rect x="687" y="130" width="288" height="110" rx="28" fill="${getSemaforoColor(data.semaforo)}"/>
    <text x="810" y="188" text-anchor="middle" font-size="44" font-family="Arial, sans-serif" font-weight="700" fill="white">${data.verdictLabel}</text>
    <text x="810" y="218" text-anchor="middle" font-size="18" font-family="Arial, sans-serif" fill="rgba(255,255,255,0.9)">${data.semaforo}</text>

    <rect x="62" y="640" width="956" height="242" rx="30" fill="white" stroke="rgba(15,76,129,0.12)"/>
    <text x="94" y="698" font-size="24" font-family="Arial, sans-serif" font-weight="700" fill="${palette.navy}">REPORT AI</text>
    <foreignObject x="94" y="724" width="922" height="116">
      <div xmlns="http://www.w3.org/1999/xhtml" style="font-family:Arial, sans-serif; font-size:22px; line-height:1.45; color:#17324a;">${escapeHtmlText(data.report)}</div>
    </foreignObject>

    <rect x="62" y="915" width="956" height="170" rx="26" fill="white" stroke="rgba(15,76,129,0.12)"/>
    <text x="94" y="968" font-size="24" font-family="Arial, sans-serif" font-weight="700" fill="${palette.navy}">PARAMETRI OPERATIVI</text>
    <text x="94" y="1012" font-size="20" font-family="Arial, sans-serif" fill="${palette.ink}">♨️ Termiche: ${escapeXml(data.params.thermals)}</text>
    <text x="480" y="1012" font-size="20" font-family="Arial, sans-serif" fill="${palette.ink}">☁️ Base cumuli: ${escapeXml(data.params.cloudBase)}</text>
    <text x="94" y="1056" font-size="20" font-family="Arial, sans-serif" fill="${palette.ink}">🏔 Quota massima: ${escapeXml(data.params.maxAltitude)}</text>
    <text x="480" y="1056" font-size="20" font-family="Arial, sans-serif" fill="${palette.ink}">❄️ Zero termico: ${escapeXml(data.params.zeroIsotherm)}</text>
    <text x="94" y="1102" font-size="20" font-family="Arial, sans-serif" fill="${palette.ink}">👁 Visibilità: ${escapeXml(data.params.visibility)}</text>
    <text x="480" y="1102" font-size="20" font-family="Arial, sans-serif" fill="${palette.ink}">🌧 Pioggia: ${escapeXml(data.params.rain)}</text>
    <text x="770" y="1102" font-size="20" font-family="Arial, sans-serif" fill="${palette.ink}">⛈ Temporali: ${escapeXml(data.params.storm)}</text>

    <rect x="62" y="1115" width="956" height="170" rx="26" fill="white" stroke="rgba(15,76,129,0.12)"/>
    <text x="94" y="1170" font-size="24" font-family="Arial, sans-serif" font-weight="700" fill="${palette.navy}">PROBABILITÀ AI</text>
    <text x="94" y="1220" font-size="22" font-family="Arial, sans-serif" fill="${palette.ink}">✅ Probabilità volabile: ${data.probabilities.flyable}%</text>
    <text x="480" y="1220" font-size="22" font-family="Arial, sans-serif" fill="${palette.ink}">✅ Probabilità termiche: ${data.probabilities.thermal}%</text>
    <text x="94" y="1268" font-size="22" font-family="Arial, sans-serif" fill="${palette.ink}">✅ Probabilità vento favorevole: ${data.probabilities.wind}%</text>
    <text x="480" y="1268" font-size="22" font-family="Arial, sans-serif" fill="${palette.ink}">⚠️ Probabilità pioggia: ${data.probabilities.rain}%</text>
    <text x="94" y="1316" font-size="22" font-family="Arial, sans-serif" fill="${palette.ink}">⚠️ Probabilità temporali: ${data.probabilities.storm}%</text>

    <rect x="62" y="1345" width="956" height="190" rx="26" fill="white" stroke="rgba(15,76,129,0.12)"/>
    <text x="94" y="1400" font-size="24" font-family="Arial, sans-serif" font-weight="700" fill="${palette.navy}">GIUDIZIO OPERATIVO</text>
    <text x="94" y="1456" font-size="20" font-family="Arial, sans-serif" fill="${palette.ink}">Mattina: ${escapeXml(data.windows.morning)}</text>
    <text x="94" y="1498" font-size="20" font-family="Arial, sans-serif" fill="${palette.ink}">Mezzogiorno: ${escapeXml(data.windows.midday)}</text>
    <text x="94" y="1542" font-size="20" font-family="Arial, sans-serif" fill="${palette.ink}">Pomeriggio: ${escapeXml(data.windows.afternoon)}</text>
    <text x="94" y="1584" font-size="20" font-family="Arial, sans-serif" fill="${palette.ink}">Sera: ${escapeXml(data.windows.evening)}</text>

    <rect x="62" y="1588" width="956" height="235" rx="26" fill="white" stroke="rgba(15,76,129,0.12)"/>
    <text x="94" y="1646" font-size="24" font-family="Arial, sans-serif" font-weight="700" fill="${palette.navy}">WINDGRAM</text>
    <rect x="120" y="1672" width="842" height="102" rx="16" fill="${palette.mist}"/>
    <text x="520" y="1728" text-anchor="middle" font-size="24" font-family="Arial, sans-serif" font-weight="700" fill="${palette.navy}">Windgram Open-Meteo / Meteoblue</text>
  </svg>
  `;

  return base;
}

function getSemaforoColor(semaforo: "GO" | "ATTENZIONE" | "NO GO") {
  if (semaforo === "GO") return "#41B853";
  if (semaforo === "ATTENZIONE") return "#FF9F1C";
  return "#E63946";
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function escapeHtmlText(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/\n/g, "<br/>");
}
