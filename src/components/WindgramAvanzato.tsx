import React, { useEffect, useState } from "react";

const ALT_STEP = 250;
const ALT_MAX = 4000;
const CHART_W = 1000;
const CHART_H = 700;

// Lapse rate standard ~ -6.5°C/km
function tempAtAltitude(surfaceTemp: number, alt: number): number {
  return surfaceTemp + (-6.5 * (alt / 1000));
}

// Stima LCL (molto semplificata)
function estimateLCL(temp: number, dew: number): number {
  const diff = temp - dew;
  return Math.max(500, Math.min(3000, diff * 125)); // m
}

// Icona parapendio - enlarged for phone visibility
const ParapendioIcon = ({ x, y }: { x: number; y: number }) => (
  <svg x={x - 14} y={y - 14} width="30" height="30">
    <path d="M2 14 Q11 -4 22 14" stroke="#ff6600" strokeWidth="3" fill="none" />
    <line x1="11" y1="14" x2="7" y2="22" stroke="#ff6600" strokeWidth="3" />
    <line x1="11" y1="14" x2="15" y2="22" stroke="#ff6600" strokeWidth="3" />
    <circle cx="0" cy="16" r="7" fill="#fff" stroke="#0f172a" strokeWidth="2" />
  </svg>
);

// Nuvoletta - enlarged
const CloudIcon = ({ x, y }: { x: number; y: number }) => (
  <svg x={x - 14} y={y - 14} width="30" height="30">
    <path
      d="M8 18 Q8 12 14 12 Q16 8 20 11 Q24 11 25 17 Q25 21 19 22 L11 22 Q7 21 7 18"
      fill="white"
      opacity="0.9"
    />
  </svg>
);

async function getMeteo(lat: number, lon: number) {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&hourly=windspeed_10m,winddirection_10m,precipitation,temperature_2m,dewpoint_2m`;
  const res = await fetch(url);
  return (await res.json()).hourly;
}

type Props = { lat: number; lon: number; takeoff: number };

const WindgramAvanzato: React.FC<Props> = ({ lat, lon, takeoff }) => {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    getMeteo(lat, lon).then(setData);
  }, [lat, lon]);

  if (!data) return <div>Caricamento dati da Open‑Meteo…</div>;

  const times: string[] = data.time.map((t: string) => t.slice(11, 16));
  const n = times.length;

  // curva sinusoidale per tasso di salita (m/s) in funzione di ora e temperatura
  const climbRates: number[] = data.temperature_2m.map((temp: number, i: number) => {
    const base = Math.max(0, (temp - 10) / 5); // più caldo → più salita
    const phase = Math.sin((Math.PI * i) / (n - 1)); // massimo a metà giornata
    return base * phase; // m/s
  });

  return (
    <svg
      viewBox={`0 0 ${CHART_W} ${CHART_H}`}
      width="100%"
      height="auto"
      style={{ background: "#050505", borderRadius: 10 }}
    >
      {/* sfondo massa instabile */}
      <defs>
        <linearGradient id="instability" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#003300" />
          <stop offset="50%" stopColor="#666600" />
          <stop offset="100%" stopColor="#990000" />
        </linearGradient>
      </defs>

      {/* area principale grafico */}
      <rect x={80} y={40} width={CHART_W - 160} height={CHART_H - 120} fill="url(#instability)" />

      const chartTop = 40;
      const chartBottom = CHART_H - 80;
      const chartLeft = 80;
      const chartRight = CHART_W - 80;

      {/* quote altimetriche dentro il grafico (ogni 250m da takeoff a 4000m) */}
      {[...Array(Math.floor((ALT_MAX - takeoff) / ALT_STEP) + 1)].map((_, i) => {
        const alt = takeoff + i * ALT_STEP;
        const y =
          chartBottom -
          ((alt - takeoff) / (ALT_MAX - takeoff)) * (chartBottom - chartTop);
        return (
          <g key={alt}>
            <line x1={chartLeft} x2={chartRight} y1={y} y2={y} stroke="#333" strokeWidth={0.8} />
            {/* Label a sinistra dentro il grafico */}
            <text
              x={chartLeft - 10}
              y={y + 4}
              fill="#fff"
              fontSize={10}
              fontWeight="bold"
              textAnchor="end"
            >
              {alt} m
            </text>
          </g>
        );
      })}

      {/* quote altimetriche a destra fuori dal grafico - scala completa takeoff a 4000m */}
      {[...Array(Math.floor((ALT_MAX - takeoff) / ALT_STEP) + 1)].map((_, i) => {
        const alt = takeoff + i * ALT_STEP;
        const y =
          chartBottom -
          ((alt - takeoff) / (ALT_MAX - takeoff)) * (chartBottom - chartTop);
        return (
          <text
            key={`alt-right-${alt}`}
            x={CHART_W - 20}
            y={y + 4}
            fill="#fff"
            fontSize={11}
            fontWeight="bold"
            textAnchor="start"
          >
            {alt} m
          </text>
        );
      })}

      {/* orari in basso */}
      {times.map((t, i) => {
        const x = chartLeft + (i / (n - 1)) * (chartRight - chartLeft);
        return (
          <text key={t} x={x} y={CHART_H - 40} fill="#ccc" fontSize={12} textAnchor="middle">
            {t}
          </text>
        );
      })}

      {/* profilo temperatura verticale (stimato) – a sinistra */}
      {[...Array(Math.floor((ALT_MAX - takeoff) / ALT_STEP) + 1)].map((_, i) => {
        const alt = takeoff + i * ALT_STEP;
        const y =
          chartBottom -
          ((alt - takeoff) / (ALT_MAX - takeoff)) * (chartBottom - chartTop);
        const surfaceTemp = data.temperature_2m[Math.floor(n / 2)] ?? 15;
        const tAlt = tempAtAltitude(surfaceTemp, alt);
        return (
          <text
            key={`temp-${alt}`}
            x={40}
            y={y + 4}
            fill="#ffcc88"
            fontSize={11}
            fontWeight="bold"
            textAnchor="end"
          >
            {tAlt.toFixed(1)}°C
          </text>
        );
      })}

      {/* frecce vento + pioggia + parapendi + nuvoletta */}
      {data.windspeed_10m.map((speed: number, i: number) => {
        const dir = data.winddirection_10m[i];
        const precip = data.precipitation[i];
        const temp = data.temperature_2m[i];
        const dew = data.dewpoint_2m[i];

        const x = chartLeft + (i / (n - 1)) * (chartRight - chartLeft);
        const yBase = chartBottom - 80; // lowered base for more space

        const len = 32; // increased from 24 to 32
        const rad = (dir * Math.PI) / 180;
        const dx = Math.sin(rad) * len;
        const dy = -Math.cos(rad) * len;

        const color =
          speed > 80 ? "#ff0000" :
          speed > 60 ? "#ffcc00" :
          "#ffffff";

        const lcl = estimateLCL(temp, dew);
        const yLcl =
          chartBottom -
          ((lcl - takeoff) / (ALT_MAX - takeoff)) * (chartBottom - chartTop);

        const climb = climbRates[i]; // m/s
        const climbNorm = Math.min(2, climb); // increased max for better visibility
        const yThermalBase = yBase + 50 - climbNorm * 35; // adjusted positioning

        return (
          <g key={i}>
            {/* pioggia - wider and more visible */}
            {precip > 0.2 && (
              <rect
                x={x - (chartRight - chartLeft) / (n * 1.5)} // wider rect
                y={chartTop}
                width={(chartRight - chartLeft) / n * 1.3}
                height={chartBottom - chartTop}
                fill="rgba(0,0,255,0.25)" // more opaque
              />
            )}

            {/* freccia vento - larger, stroke wider */}
            <line x1={x} y1={yBase} x2={x + dx} y2={yBase + dy} stroke={color} strokeWidth={4} /> {/* was 2.5 */

            {/* velocità vento - larger text */}
            <text
              x={x}
              y={yBase - 12} // moved up slightly
              fill="#000"
              fontSize={14} // was 11
              fontWeight="bold"
              textAnchor="middle"
            >
              {Math.round(speed)} km/h
            </text>

            {/* parapendio su curva sinusoidale (tasso di salita) - larger */}
            <ParapendioIcon x={x} y={yThermalBase} />

            {/* nuvoletta alla base di condensa (LCL) - larger, positioned ABOVE paraglider */}
            {/* Cloud positioned above paraglider: yLcl - 30 vs yThermalBase */}
            <CloudIcon x={x} y={yLcl - 35} /> {/* was yLcl - 20, now higher for above paraglider */
          </g>
        );
      })}

      {/* curva sinusoidale continua delle ascendenze (solo linea) - thicker */}
      <path
        d={
          data.temperature_2m
            .map((temp: number, i: number) => {
              const x = chartLeft + (i / (n - 1)) * (chartRight - chartLeft);
              const climb = climbRates[i];
              const climbNorm = Math.min(2, climb);
              const y = chartBottom - 30 - climbNorm * 40; // adjusted for new scale
              return `${i === 0 ? "M" : "L"} ${x} ${y}`;
            })
            .join(" ")
        }
        stroke="#ff8800"
        strokeWidth={3} // was 2
        fill="none"
      />

      {/* titolo - larger */}
      <text x={chartLeft} y={30} fill="#fff" fontSize={16} fontWeight="bold"> {/* was 14 */}
        Windgram Avanzato · Decollo {takeoff} m · Fonte Open‑Meteo
      </text>
      <text x={chartLeft} y={50} fill="#ccc" fontSize={12}> {/* was 10 */}
        Vento, pioggia, profilo termico, LCL, tasso di salita (parapendi su curva sinusoidale)
      </text>
    </svg>
  );
};

export default WindgramAvanzato;