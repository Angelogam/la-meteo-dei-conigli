"use client";

import { useId } from "react";

/**
 * Glifo meteo animato per le schede delle previsioni giornaliere.
 *
 * Usa i codici WMO di Open-Meteo (weathercode) e non inventa condizioni:
 * un codice assente o sconosciuto mostra un segnaposto neutro.
 */
type WeatherGlyphKind =
  | "clear"
  | "partly"
  | "cloudy"
  | "fog"
  | "drizzle"
  | "rain"
  | "snow"
  | "storm"
  | "unknown";

function weatherGlyphKind(code: number | null | undefined): WeatherGlyphKind {
  if (code == null || !Number.isFinite(code)) return "unknown";
  if (code === 0) return "clear";
  if (code === 1 || code === 2) return "partly";
  if (code === 3) return "cloudy";
  if (code === 45 || code === 48) return "fog";
  if ([51, 53, 55, 56, 57].includes(code)) return "drizzle";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "rain";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "snow";
  if ([95, 96, 99].includes(code)) return "storm";
  return "unknown";
}

const KIND_DESCRIPTION: Record<WeatherGlyphKind, string> = {
  clear: "sole",
  partly: "sole con nuvole",
  cloudy: "cielo coperto",
  fog: "nebbia",
  drizzle: "pioviggine",
  rain: "pioggia",
  snow: "neve",
  storm: "temporale",
  unknown: "condizione non disponibile",
};

interface WeatherGlyphProps {
  code: number | null | undefined;
  size?: number;
  /** Disattiva le animazioni (es. per liste molto lunghe). */
  animated?: boolean;
  className?: string;
}

function Sun({ cx, cy, r, spin }: { cx: number; cy: number; r: number; spin?: boolean }) {
  const rays = Array.from({ length: 8 }, (_, index) => {
    const angle = (index * Math.PI) / 4;
    const inner = r + 3.5;
    const outer = r + 8;
    return {
      x1: cx + Math.cos(angle) * inner,
      y1: cy + Math.sin(angle) * inner,
      x2: cx + Math.cos(angle) * outer,
      y2: cy + Math.sin(angle) * outer,
    };
  });

  return (
    <g>
      <g className={spin ? "glyph-sun-rays glyph-spin" : "glyph-sun-rays"}>
        {rays.map((ray, index) => (
          <line
            key={index}
            x1={ray.x1}
            y1={ray.y1}
            x2={ray.x2}
            y2={ray.y2}
            stroke="#fbbf24"
            strokeWidth={2.4}
            strokeLinecap="round"
            opacity={0.9}
          />
        ))}
      </g>
      <circle className="glyph-sun-disc" cx={cx} cy={cy} r={r} fill="#fbbf24" />
      <circle cx={cx - r * 0.28} cy={cy - r * 0.28} r={r * 0.55} fill="#fde68a" opacity={0.55} />
    </g>
  );
}

function Cloud({ x = 0, y = 0, tone = "light", drift = true }: { x?: number; y?: number; tone?: "light" | "dark"; drift?: boolean }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <g className={drift ? "glyph-cloud glyph-drift" : "glyph-cloud"}>
        <path
          d="M14 40a8 8 0 0 1 1.3-15.9 12 12 0 0 1 22.6-2.2A9.2 9.2 0 0 1 40 40Z"
          fill={tone === "dark" ? "#64748b" : "#cbd5e1"}
        />
        <path
          d="M17 36a5.6 5.6 0 0 1 .9-11 8.4 8.4 0 0 1 15.8-1.5A6.4 6.4 0 0 1 33 36Z"
          fill={tone === "dark" ? "#94a3b8" : "#e2e8f0"}
          opacity={0.75}
        />
      </g>
    </g>
  );
}

function Drops({ heavy }: { heavy?: boolean }) {
  const drops = heavy ? [0, 1, 2, 3] : [0, 1, 2];
  return (
    <g className="glyph-precip">
      {drops.map((index) => (
        <line
          key={index}
          className="glyph-drop"
          style={{ animationDelay: `${index * 0.22}s` }}
          x1={18 + index * 7}
          y1={42}
          x2={16 + index * 7}
          y2={heavy ? 55 : 51}
          stroke="#7dd3fc"
          strokeWidth={2.6}
          strokeLinecap="round"
        />
      ))}
    </g>
  );
}

function Flakes() {
  return (
    <g className="glyph-precip">
      {[0, 1, 2].map((index) => (
        <circle
          key={index}
          className="glyph-flake"
          style={{ animationDelay: `${index * 0.5}s` }}
          cx={19 + index * 8}
          cy={45}
          r={2.2}
          fill="#e2e8f0"
        />
      ))}
    </g>
  );
}

export default function WeatherGlyph({ code, size = 44, animated = true, className = "" }: WeatherGlyphProps) {
  const kind = weatherGlyphKind(code);
  const reactId = useId().replace(/[:]/g, "");
  const cloudFadeId = `glyph-cloud-fade-${reactId}`;

  return (
    <span
      className={`weather-glyph ${animated ? "is-animated" : ""} ${className}`.trim()}
      style={{ width: size, height: size }}
      data-kind={kind}
      role="img"
      aria-label={`Condizione prevista: ${KIND_DESCRIPTION[kind]}`}
    >
      <svg viewBox="4 4 56 56" width={size} height={size} focusable="false" aria-hidden="true">
        <defs>
          <linearGradient id={cloudFadeId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e2e8f0" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#cbd5e1" stopOpacity="0.35" />
          </linearGradient>
        </defs>

        {kind === "clear" && <Sun cx={32} cy={32} r={13} spin />}

        {kind === "partly" && (
          <>
            <Sun cx={42} cy={24} r={9.5} spin />
            <Cloud x={-6} y={6} drift />
          </>
        )}

        {kind === "cloudy" && (
          <>
            <Cloud x={10} y={-8} tone="dark" drift={false} />
            <Cloud x={-6} y={8} drift />
          </>
        )}

        {kind === "fog" && (
          <>
            <Cloud x={-4} y={-4} tone="light" drift={false} />
            <g className="glyph-fog-lines">
              {[0, 1, 2].map((index) => (
                <line
                  key={index}
                  className="glyph-fog-line"
                  style={{ animationDelay: `${index * 0.4}s` }}
                  x1={14 + index * 2}
                  y1={46 + index * 5}
                  x2={50 - index * 3}
                  y2={46 + index * 5}
                  stroke="#cbd5e1"
                  strokeWidth={2.4}
                  strokeLinecap="round"
                  opacity={0.8 - index * 0.2}
                />
              ))}
            </g>
          </>
        )}

        {kind === "drizzle" && (
          <>
            <Cloud x={-6} y={-4} />
            <Drops />
          </>
        )}

        {kind === "rain" && (
          <>
            <Cloud x={-6} y={-6} tone="dark" />
            <Drops heavy />
          </>
        )}

        {kind === "snow" && (
          <>
            <Cloud x={-6} y={-6} />
            <Flakes />
          </>
        )}

        {kind === "storm" && (
          <>
            <Cloud x={-6} y={-10} tone="dark" drift={false} />
            <polygon
              className="glyph-bolt"
              points="35,32 24,50 31,50 27,62 43,43 34,43 40,32"
              fill="#fde047"
              stroke="#f59e0b"
              strokeWidth={0.8}
            />
          </>
        )}

        {kind === "unknown" && (
          <g opacity={0.6}>
            <circle cx={32} cy={32} r={17} fill="none" stroke="#94a3b8" strokeWidth={2.4} strokeDasharray="4 5" />
            <text x={32} y={38} textAnchor="middle" fill="#94a3b8" fontSize={16} fontWeight={700}>
              ?
            </text>
          </g>
        )}
      </svg>
    </span>
  );
}
