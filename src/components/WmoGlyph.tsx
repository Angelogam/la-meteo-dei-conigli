"use client";

/**
 * WmoGlyph — icone meteo disegnate a mano in SVG con animazioni integrate:
 * sole con raggi rotanti e respiro, nuvole morbide sfumate che derivano,
 * gocce che cadono, fiocchi che ruotano, fulmini lampeggianti, nebbia che scorre.
 * Grafica duotone con gradienti interni; nessuna dipendenza da lucide.
 */

import { useId } from "react";
import "./wmo-glyph.css";

export type GlyphKind =
  | "clear" | "partly" | "cloudy" | "fog" | "drizzle" | "rain" | "snow" | "storm" | "unknown";

export function glyphKind(code: number | null): GlyphKind {
  if (code == null) return "unknown";
  if (code === 0) return "clear";
  if (code === 1 || code === 2) return "partly";
  if (code === 3) return "cloudy";
  if (code === 45 || code === 48) return "fog";
  if (code >= 51 && code <= 57) return "drizzle";
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return "rain";
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return "snow";
  if (code >= 95) return "storm";
  return "cloudy";
}

const RAY_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315];

function rays(cx: number, cy: number, r1: number, r2: number) {
  return RAY_ANGLES.map((a) => {
    const rad = (a * Math.PI) / 180;
    const c = Math.cos(rad), s = Math.sin(rad);
    return (
      <line
        key={a}
        x1={(cx + c * r1).toFixed(2)}
        y1={(cy + s * r1).toFixed(2)}
        x2={(cx + c * r2).toFixed(2)}
        y2={(cy + s * r2).toFixed(2)}
      />
    );
  });
}

/** nuvola morbida: due gobbe + base piatta, disegnata su 0..96 × 26..50 */
const CLOUD_PATH = "M16 50 A10 10 0 0 1 18 31 A15 15 0 0 1 47 26 A12 12 0 0 1 65 30 A10 10 0 0 1 68 50 Z";

function drops(xs: number[], y: number, len: number, cls: string, clsLine: string) {
  return xs.map((x, i) => (
    <g key={x} transform={`translate(${x} ${y})`}>
      <line
        className={`wglyph-drop ${clsLine}`}
        style={{ animationDelay: `${(-i * 0.28).toFixed(2)}s` }}
        x1="0" y1="0" x2="0" y2={len}
      />
    </g>
  ));
}

function flakes(xs: number[], y: number) {
  return xs.map((x, i) => (
    <g key={x} transform={`translate(${x} ${y})`}>
      <g className="wglyph-snow" style={{ animationDelay: `${(-i * 0.9).toFixed(2)}s` }}>
        <path d="M0 -3.5 V3.5 M-3 -1.8 L3 1.8 M-3 1.8 L3 -1.8" strokeLinecap="round" />
      </g>
    </g>
  ));
}

interface WmoGlyphProps {
  code: number | null;
  /** larghezza in px (altezza proporzionale 96:68) */
  size?: number;
  className?: string;
  /** etichetta accessibile */
  label?: string;
}

export default function WmoGlyph({ code, size = 48, className = "", label }: WmoGlyphProps) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const kind = glyphKind(code);
  const idSun = `wg-sun-${uid}`, idCloud = `wg-cloud-${uid}`, idDark = `wg-dark-${uid}`, idMoon = `wg-moon-${uid}`;
  const h = Math.round((size * 68) / 96);

  const sunGrad = (
    <linearGradient id={idSun} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor="#fff3b8" />
      <stop offset="0.55" stopColor="#ffd25e" />
      <stop offset="1" stopColor="#f59e0b" />
    </linearGradient>
  );
  const cloudGrad = (
    <linearGradient id={idCloud} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor="#ffffff" />
      <stop offset="0.5" stopColor="#e6f0fa" />
      <stop offset="1" stopColor="#a9c6e2" />
    </linearGradient>
  );
  const darkGrad = (
    <linearGradient id={idDark} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor="#c7d3e2" />
      <stop offset="1" stopColor="#7b8ea3" />
    </linearGradient>
  );

  return (
    <svg
      className={`wglyph wglyph--${kind} ${className}`}
      width={size}
      height={h}
      viewBox="0 0 96 68"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      fill="none"
    >
      <defs>
        {sunGrad}
        {cloudGrad}
        {darkGrad}
        <mask id={idMoon}>
          <rect width="96" height="68" fill="#fff" />
          <circle cx="58" cy="26" r="10.5" fill="#000" />
        </mask>
      </defs>

      {kind === "clear" && (
        <>
          <g className="wglyph-rays" stroke="#ffcf5e" strokeWidth="3" strokeLinecap="round">
            {rays(48, 30, 19, 26)}
          </g>
          <g className="wglyph-sunbody">
            <circle cx="48" cy="30" r="14" fill={`url(#${idSun})`} />
            <circle cx="43" cy="25" r="4.5" fill="rgba(255,255,255,.5)" />
          </g>
        </>
      )}

      {kind === "partly" && (
        <>
          <g className="wglyph-rays" stroke="#ffcf5e" strokeWidth="2.6" strokeLinecap="round">
            {rays(30, 24, 15, 21)}
          </g>
          <g className="wglyph-sunbody">
            <circle cx="30" cy="24" r="11" fill={`url(#${idSun})`} />
          </g>
          <g transform="translate(14 8)">
            <g className="wglyph-cloud">
              <path d={CLOUD_PATH} fill={`url(#${idCloud})`} />
            </g>
          </g>
        </>
      )}

      {kind === "cloudy" && (
        <>
          <g transform="translate(0 -3)" opacity="0.5">
            <g className="wglyph-cloud wglyph-cloud--slow">
              <path d={CLOUD_PATH} fill={`url(#${idCloud})`} />
            </g>
          </g>
          <g transform="translate(14 6)">
            <g className="wglyph-cloud">
              <path d={CLOUD_PATH} fill={`url(#${idCloud})`} />
            </g>
          </g>
        </>
      )}

      {(kind === "drizzle" || kind === "rain") && (
        <>
          <g transform="translate(6 2)">
            <g className="wglyph-cloud">
              <path d={CLOUD_PATH} fill={`url(#${idCloud})`} />
            </g>
          </g>
          {kind === "drizzle"
            ? drops([38, 48, 58], 52, 5, "", "wglyph-drop--thin")
            : drops([33, 41, 49, 57, 64], 51, 8, "", "")}
        </>
      )}

      {kind === "snow" && (
        <>
          <g transform="translate(6 2)">
            <g className="wglyph-cloud">
              <path d={CLOUD_PATH} fill={`url(#${idCloud})`} />
            </g>
          </g>
          <g stroke="#dff1ff" strokeWidth="1.6">{flakes([37, 49, 61], 56)}</g>
        </>
      )}

      {kind === "storm" && (
        <>
          <g transform="translate(6 2)">
            <g className="wglyph-cloud">
              <path d={CLOUD_PATH} fill={`url(#${idDark})`} />
            </g>
          </g>
          {drops([28, 36, 60, 68], 51, 7, "", "")}
          <path
            className="wglyph-bolt"
            d="M50 42 L43 55 L49 55 L44 66 L57 51 L50.5 51 L56 42 Z"
            fill="#ffd94a"
          />
        </>
      )}

      {kind === "fog" && (
        <>
          <g transform="translate(6 -1)" opacity="0.85">
            <g className="wglyph-cloud">
              <path d={CLOUD_PATH} fill={`url(#${idCloud})`} />
            </g>
          </g>
          <g strokeLinecap="round" strokeWidth="3">
            <line className="wglyph-fogline" x1="24" y1="54" x2="72" y2="54" />
            <line className="wglyph-fogline" style={{ animationDelay: "-.9s" }} x1="30" y1="59" x2="66" y2="59" />
            <line className="wglyph-fogline" style={{ animationDelay: "-1.6s" }} x1="20" y1="64" x2="62" y2="64" />
          </g>
        </>
      )}

      {kind === "unknown" && (
        <>
          <circle cx="48" cy="30" r="13" fill="#dfe9f4" mask={`url(#${idMoon})`} />
          <circle className="wglyph-star" cx="70" cy="18" r="1.6" fill="#e8f1fb" />
          <circle className="wglyph-star" style={{ animationDelay: "-1.3s" }} cx="28" cy="46" r="1.3" fill="#e8f1fb" />
        </>
      )}
    </svg>
  );
}
