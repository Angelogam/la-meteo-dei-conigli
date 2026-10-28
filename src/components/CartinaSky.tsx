"use client";

/**
 * CIELO DELLE ORE — il profilo della risalita nella finestra della cartina.
 * Grafica professionale costruita su Meteocons (basmilius/weather-icons, MIT):
 * nuvole e sole animati ufficiali, cielo sfumato con bagliore solare, montagne
 * stratificate in prospettiva, colonna della termica con glow e bolle in salita.
 * - a sinistra le quote (dal decollo fino a 4000 m)
 * - al centro la COLONNA DELLA TERMICA: sale dal decollo fino alla quota di arrivo,
 *   colorata con la scala dell'instabilità (blu = debole → giallo/arancio → rosso = cross)
 * - i CUMULI (Meteocons animati) sono posizionati alla base nubi = quota di arrivo
 * - il PARAPENDIO dettagliato (vela a celle, sospensioni, pilota) segna la sommità
 * - la linea tratteggiata rossa col fiocco di neve segna lo ZERO TERMICO
 * - a destra la COLONNA DEI VENTI: a ogni quota (decolo → 4000 m) freccia = direzione
 *   dove spinge il vento, valore in km/h e direzione in parole ("da NO")
 *
 * Icone: Meteocons © Bas Milius — MIT license (public/meteocons/).
 */

import { useMemo } from "react";
import type { HourlyPoint } from "@/services/threeSourceWeather";
import { windAtAltitude } from "@/components/CartinaMeteo";

export interface SkyProps {
  quota: number; // quota del decollo (m s.l.m.)
  rateo: number; // m/s di risalita stimata all'ora selezionata
  baseNubi: number | null; // base dei cumuli stimata (m s.l.m.)
  freezing: number | null; // zero termico (m s.l.m.)
  cloud: number | null; // copertura nuvolosa % all'ora selezionata
  wind: number | null; // vento al suolo km/h
  dir: number | null; // direzione vento al suolo (gradi, da cui proviene)
  point: HourlyPoint | null; // ora selezionata (con il sounding a livelli)
  hour: number;
}

const TOP = 4000; // tetto della scena
const W = 328; // larghezza viewBox
const H = 286; // altezza viewBox
const PLOT_L = 38; // inizio area cielo (dopo le quote)
const PLOT_R = 238; // fine area cielo (prima dei venti)
const PLOT_T = 14;
const PLOT_B = 262; // linea del suolo
const COL_X = 138; // asse della colonna termica

const DIR8 = ["N", "NE", "E", "SE", "S", "SO", "O", "NO"];

function dir8(deg: number | null | undefined): string {
  if (deg == null || !Number.isFinite(deg)) return "N/D";
  return DIR8[Math.round((((deg % 360) + 360) % 360) / 45) % 8];
}

function fmtM(v: number): string {
  return Math.round(v).toLocaleString("it-IT");
}

/* Colore del vento per intensità (km/h) */
function windColor(ws: number | null): string {
  if (ws == null) return "#5a6f88";
  if (ws < 8) return "#7dd3fc";
  if (ws < 15) return "#9fe870";
  if (ws < 22) return "#facc15";
  if (ws < 32) return "#fb923c";
  return "#f87171";
}

/* posizione in percentuale (le icone overlay seguono il ridimensionamento dell'SVG) */
const px = (v: number) => `${((v / W) * 100).toFixed(3)}%`;
const py = (v: number) => `${((v / H) * 100).toFixed(3)}%`;

/* Nuvola Meteocons animata (positionata in coordinate della scena) */
function Cumulus({ x, y, w }: { x: number; y: number; w: number }) {
  return (
    <img
      className="cmap-sky-ico sky-cloud"
      src="/meteocons/cloud.svg"
      alt=""
      aria-hidden="true"
      draggable={false}
      style={{ left: px(x), top: py(y), width: `${((w / W) * 100).toFixed(3)}%` }}
    />
  );
}

/* Sole Meteocons animato (raggi rotanti) — opacità ridotta se cielo coperto */
function Sun({ x, y, w, opacity }: { x: number; y: number; w: number; opacity: number }) {
  return (
    <img
      className="cmap-sky-ico is-sun"
      src="/meteocons/sun.svg"
      alt=""
      aria-hidden="true"
      draggable={false}
      style={{ left: px(x), top: py(y), width: `${((w / W) * 100).toFixed(3)}%`, opacity }}
    />
  );
}

/* Parapendio dettagliato: vela a celle con gradiente, sospensioni, pilota in seduta */
function Paraglider() {
  return (
    <g className="sky-pg" aria-hidden="true">
      <defs>
        <linearGradient id="cs-wing" gradientUnits="userSpaceOnUse" x1={-17} y1={-10} x2={17} y2={2}>
          <stop offset="0%" stopColor="#ffe28f" />
          <stop offset="55%" stopColor="#ffc94d" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
      </defs>
      {/* sospensioni */}
      <g stroke="rgba(255,255,255,0.52)" strokeWidth={0.55}>
        <line x1={-15} y1={0.6} x2={-1.1} y2={12.6} />
        <line x1={-6} y1={-3.2} x2={-0.5} y2={12.6} />
        <line x1={6} y1={-3.2} x2={0.5} y2={12.6} />
        <line x1={15} y1={0.6} x2={1.1} y2={12.6} />
      </g>
      {/* pilota: testa + busto in seduta */}
      <circle cx={0} cy={10.6} r={2.1} fill="#ffd76a" stroke="rgba(0,0,0,0.4)" strokeWidth={0.4} />
      <path
        d="M -1.7 12.6 Q 0 11.6 1.7 12.6 L 1.25 15.7 Q 0 16.6 -1.25 15.7 Z"
        fill="#e8eef4"
        stroke="rgba(0,0,0,0.35)"
        strokeWidth={0.35}
      />
      {/* vela: arco con spessore + riflesso sul bordo d'attacco */}
      <path d="M -17 1 Q 0 -11 17 1" fill="none" stroke="rgba(0,0,0,0.35)" strokeWidth={5.4} strokeLinecap="round" />
      <path d="M -17 1 Q 0 -11 17 1" fill="none" stroke="url(#cs-wing)" strokeWidth={4.4} strokeLinecap="round" />
      <path
        d="M -16.2 -0.4 Q 0 -11.6 16.2 -0.4"
        fill="none"
        stroke="rgba(255,255,255,0.8)"
        strokeWidth={1}
        strokeLinecap="round"
        opacity={0.65}
      />
      {/* celle della vela */}
      <g stroke="rgba(122,68,0,0.4)" strokeWidth={0.5}>
        <line x1={-8.5} y1={-5.6} x2={-8.5} y2={-1.3} />
        <line x1={0} y1={-7.2} x2={0} y2={-2.8} />
        <line x1={8.5} y1={-5.6} x2={8.5} y2={-1.3} />
      </g>
    </g>
  );
}

export default function CartinaSky({ quota, rateo, baseNubi, freezing, cloud, wind, dir, point, hour }: SkyProps) {
  /* --- scala verticale: dal decollo (basso) a 4000 m (alto) --- */
  const span = Math.max(TOP - quota, 500);
  const y = (alt: number) => PLOT_T + ((TOP - Math.min(alt, TOP)) / span) * (PLOT_B - PLOT_T);

  /* --- fino a dove sale la termica --- */
  const cumuli = baseNubi != null && baseNubi > quota + 150 && baseNubi <= TOP && (cloud ?? 0) >= 20;
  const topAlt = useMemo(() => {
    let t: number;
    if (cumuli) t = baseNubi as number;
    else if (freezing != null && freezing > quota + 400) t = quota + (freezing - quota) * 0.8;
    else t = Math.min(quota + 600, TOP);
    return Math.max(quota + 120, Math.min(t, TOP - 160));
  }, [cumuli, baseNubi, freezing, quota]);

  /* --- quote dei venti: decollo + gradini da 500 m fino a 4000 ---
     Un gradino che cade a meno di 400 m dal precedente viene saltato:
     due righe troppo vicine si sovrappongono (es. decollo a 1449 m → 1500 m inutile). */
  const windAlts = useMemo(() => {
    const list: number[] = [quota];
    for (let a = Math.ceil((quota + 1) / 500) * 500; a <= TOP; a += 500) {
      if (list.length < 8 && a - list[list.length - 1] >= 400) list.push(a);
    }
    return list;
  }, [quota]);

  const winds = windAlts.map((alt) => {
    const w = alt === quota ? { ws: wind, wd: dir } : windAtAltitude(point, alt, wind, dir);
    return { alt, ws: w.ws != null ? Math.round(w.ws) : null, wd: w.wd };
  });

  const yTop = y(topAlt);
  const colH = Math.max(10, PLOT_B - yTop);
  const showFreezing = freezing != null && freezing > quota + 80 && freezing < TOP;
  /* vertice: nuvola sulla cima della colonna, parapendio sopra la nuvola, etichette in cima.
     Con i cumuli tutto il gruppo sale di una spanna; senza nuvole il PG resta attaccato alla colonna. */
  const pgY = cumuli ? Math.max(yTop - 34, PLOT_T + 11) : yTop - 16;
  const labY1 = Math.max(pgY - 22, PLOT_T + 9);
  const labY2 = labY1 + 10;
  /* se lo zero termico cade nella fascia delle etichette del vertice si nasconde
     (linea + testo): il valore resta comunque nella scheda dati sotto */
  const yFr = showFreezing ? y(freezing) : null;
  const zeroCollides =
    yFr != null && (Math.abs(yFr - labY1) < 16 || Math.abs(yFr - labY2) < 16 || (yFr > labY1 - 6 && yFr < labY2 + 6));

  /* gradient della colonna: colore = scala dell'instabilità */
  const strong = rateo >= 2.4;
  const colTop = strong ? "#fca5a5" : rateo >= 1.5 ? "#fdba74" : rateo >= 0.8 ? "#fde047" : rateo >= 0.18 ? "#7dd3fc" : "#8ba0b6";
  const colBot = strong ? "#ef4444" : rateo >= 1.5 ? "#f97316" : rateo >= 0.8 ? "#eab308" : rateo >= 0.18 ? "#2f96d8" : "#47566b";

  /* sole: spento dal coperto */
  const sunOp = cloud == null ? 0.9 : cloud >= 70 ? 0.25 : 1;

  return (
    <div className="cmap-sky" data-testid="cartina-sky">
      <div className="cmap-skyhead">
        <span className="cmap-skyhead-k">Il cielo · ore {String(hour).padStart(2, "0")}:00</span>
        <span className="cmap-skyhead-v">risalita dal decollo a 4000 m</span>
      </div>

      <div className="cmap-sky-stage">
        <svg
          className="cmap-sky-svg"
          viewBox={`0 0 ${W} ${H}`}
          width="100%"
          role="img"
          aria-label={`Profilo della risalita alle ore ${hour}: termica ${rateo.toFixed(1)} metri al secondo, arrivo a ${fmtM(topAlt)} metri`}
        >
          <defs>
            {/* cielo: blu profondo in quota → azzurro all'orizzonte */}
            <linearGradient id="cs-sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0a1e33" />
              <stop offset="55%" stopColor="#123353" />
              <stop offset="100%" stopColor="#1f527d" />
            </linearGradient>
            {/* bagliore attorno al sole */}
            <radialGradient id="cs-sunglow">
              <stop offset="0%" stopColor="#ffd76a" stopOpacity="0.4" />
              <stop offset="60%" stopColor="#fbbf24" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="skycol" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={colTop} stopOpacity="0.95" />
              <stop offset="100%" stopColor={colBot} stopOpacity="0.5" />
            </linearGradient>
            <linearGradient id="cs-shine" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.30" />
              <stop offset="45%" stopColor="#ffffff" stopOpacity="0.05" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </linearGradient>
            <radialGradient id="cs-bub">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </radialGradient>
            <filter id="cs-soft" x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur stdDeviation="3" />
            </filter>
            <clipPath id="skycolclip">
              <rect x={COL_X - 17} y={yTop} width={34} height={colH + 4} />
            </clipPath>
          </defs>

          {/* cielo */}
          <rect x={PLOT_L} y={PLOT_T} width={PLOT_R - PLOT_L} height={PLOT_B - PLOT_T} fill="url(#cs-sky)" rx={8} />
          {/* bagliore solare */}
          <circle cx={206} cy={44} r={48} fill="url(#cs-sunglow)" />

          {/* quote a sinistra + griglia */}
          {winds.map((w) => (
            <g key={"ax" + w.alt}>
              <line
                x1={PLOT_L}
                y1={y(w.alt)}
                x2={PLOT_R}
                y2={y(w.alt)}
                stroke="rgba(255,255,255,0.05)"
                strokeWidth={1}
                strokeDasharray="1 3"
              />
              <text
                x={34}
                y={y(w.alt) + 2.8}
                textAnchor="end"
                className="cmap-sky-ax"
                style={{ fontWeight: w.alt === quota ? 800 : 400, fill: w.alt === quota ? "#ffd76a" : "#7e93a6" }}
              >
                {w.alt === quota ? fmtM(quota) : String(w.alt)}
              </text>
            </g>
          ))}
          {/* chip del decollo sull'asse */}
          <rect x={2} y={y(quota) - 5.5} width={30} height={11} rx={3} fill="rgba(255,215,106,0.12)" stroke="rgba(255,215,106,0.3)" strokeWidth={0.6} />

          {/* montagne: tre creste in prospettiva atmosferica */}
          <path
            d={`M ${PLOT_L} ${PLOT_B} L ${PLOT_L} 246 L 58 231 L 74 243 L 92 225 L 110 241 L 128 235 L 146 247 L 168 229 L 188 243 L 206 235 L 224 245 L ${PLOT_R} 239 L ${PLOT_R} ${PLOT_B} Z`}
            fill="#3b6187"
            opacity={0.5}
          />
          <path
            d={`M ${PLOT_L} ${PLOT_B} L ${PLOT_L} 252 L 66 241 L 84 250 L 104 238 L 126 250 L 150 242 L 172 251 L 196 244 L 218 251 L ${PLOT_R} 247 L ${PLOT_R} ${PLOT_B} Z`}
            fill="#28455f"
            opacity={0.75}
          />
          {/* suolo + decollo */}
          <path
            d={`M ${PLOT_L} ${PLOT_B + 6} L ${PLOT_L} ${PLOT_B + 1} Q 70 ${PLOT_B - 8} 100 ${PLOT_B - 1} Q 120 ${PLOT_B + 3} ${COL_X} ${PLOT_B - 2} Q 162 ${PLOT_B - 6} 186 ${PLOT_B - 1} Q 214 ${PLOT_B + 4} ${PLOT_R} ${PLOT_B - 2} L ${PLOT_R} ${PLOT_B + 6} Z`}
            fill="#16283a"
            stroke="rgba(255,255,255,0.10)"
            strokeWidth={0.8}
          />

          {/* zero termico (nascosto se sovrapposto alle etichette del vertice) */}
          {showFreezing && !zeroCollides && (
            <g aria-hidden="true">
              <line x1={PLOT_L} y1={yFr} x2={PLOT_R} y2={yFr} stroke="#ff8f8f" strokeWidth={1} strokeDasharray="4 3" opacity={0.55} />
              <g transform={`translate(${PLOT_L + 7} ${yFr - 5})`} stroke="#ff9d9d" strokeWidth={0.9} strokeLinecap="round" opacity={0.9}>
                <line x1={0} y1={-2.6} x2={0} y2={2.6} />
                <line x1={-2.25} y1={-1.3} x2={2.25} y2={1.3} />
                <line x1={-2.25} y1={1.3} x2={2.25} y2={-1.3} />
              </g>
              <text x={PLOT_L + 13} y={yFr - 3.5} className="cmap-sky-zero">
                zero termico · {fmtM(freezing)} m
              </text>
            </g>
          )}

          {/* colonna della termica: glow, corpo, riflesso, bolle in salita */}
          <g aria-hidden="true">
            <rect x={COL_X - 21} y={yTop - 2} width={42} height={colH + 6} rx={12} fill={colTop} opacity={0.3} filter="url(#cs-soft)" />
            <rect
              x={COL_X - 17}
              y={yTop}
              width={34}
              height={colH}
              rx={9}
              fill="url(#skycol)"
              stroke="rgba(255,255,255,0.18)"
              strokeWidth={1}
            />
            <rect x={COL_X - 14} y={yTop + 3} width={12} height={colH - 8} rx={6} fill="url(#cs-shine)" />
            <ellipse cx={COL_X} cy={yTop} rx={19} ry={3.6} fill={colTop} opacity={0.4} filter="url(#cs-soft)" />
            <g clipPath="url(#skycolclip)" style={{ "--rise": `${-(colH + 14)}px` } as React.CSSProperties}>
              <circle className="sky-bub" cx={COL_X - 7} cy={PLOT_B - 6} r={4.6} />
              <circle className="sky-bub" cx={COL_X + 6} cy={PLOT_B - 4} r={3.6} style={{ animationDelay: "1.15s" }} />
              <circle className="sky-bub" cx={COL_X} cy={PLOT_B - 8} r={5.2} style={{ animationDelay: "2.3s" }} />
            </g>
          </g>

          {/* quota di arrivo: etichette sopra il parapendio */}
          <text x={COL_X} y={labY1} textAnchor="middle" className="cmap-sky-topv">
            ≈ {fmtM(topAlt)} m
          </text>
          <text x={COL_X} y={labY2} textAnchor="middle" className="cmap-sky-topk">
            {cumuli ? "arrivo termica · base cumuli" : (cloud ?? 0) < 20 ? "fine risalita · aria secca" : "fine della risalita"}
          </text>

          {/* parapendio alla sommità */}
          <g transform={`translate(${COL_X} ${pgY})`} aria-hidden="true">
            <Paraglider />
          </g>

          {/* marker del decollo: palo + bandierina + punto pulsante */}
          <line x1={COL_X} y1={PLOT_B - 2} x2={COL_X} y2={PLOT_B - 12} stroke="#ffd76a" strokeWidth={1.2} />
          <path d={`M ${COL_X} ${PLOT_B - 12} l 8 2.6 l -8 2.6 Z`} fill="#ffd76a" />
          <circle className="sky-pin" cx={COL_X} cy={PLOT_B - 1.5} r={1.8} fill="#ffd76a" />
          <text x={COL_X} y={PLOT_B + 16} textAnchor="middle" className="cmap-sky-launch">
            decollo · {fmtM(quota)} m
          </text>

          {/* colonna dei venti a destra */}
          <g aria-hidden="true">
            {winds.map((w) => {
              const yy = y(w.alt);
              const rot = w.wd != null ? (w.wd + 180) % 360 : null;
              const c = windColor(w.ws);
              return (
                <g key={"w" + w.alt} className="cmap-sky-wrow">
                  <line x1={PLOT_R} y1={yy} x2={246} y2={yy} stroke="rgba(255,255,255,0.14)" strokeWidth={1} />
                  <circle cx={246} cy={yy} r={1.6} fill={w.alt === quota ? "#ffd76a" : "rgba(255,255,255,0.35)"} />
                  {rot != null ? (
                    <g transform={`translate(259 ${yy}) rotate(${rot.toFixed(1)})`}>
                      <line y1={7.5} y2={-5.5} stroke={c} strokeWidth={4.4} strokeLinecap="round" opacity={0.22} />
                      <line y1={7.5} y2={-5.5} stroke={c} strokeWidth={1.9} strokeLinecap="round" />
                      <path
                        d="M 0 -8 L -3.6 -3.9 M 0 -8 L 3.6 -3.9"
                        stroke={c}
                        strokeWidth={1.9}
                        strokeLinecap="round"
                        fill="none"
                      />
                    </g>
                  ) : (
                    <circle cx={259} cy={yy} r={2.4} fill="none" stroke="#5a6f88" strokeWidth={1} />
                  )}
                  <text x={271} y={yy - 0.5} className="cmap-sky-wspd" style={{ fill: c }}>
                    {w.ws == null ? "–" : w.ws + " km/h"}
                  </text>
                  <text x={271} y={yy + 8.5} className="cmap-sky-wdir">
                    {w.wd == null ? "quota" : "da " + dir8(w.wd)}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>

        {/* icone Meteocons (overlay allineato all'SVG): sole + cumuli sulla cima della colonna */}
        <Sun x={206} y={44} w={34} opacity={sunOp} />
        {cumuli && (
          <>
            <Cumulus x={COL_X} y={yTop - 4} w={46} />
            <Cumulus x={COL_X - 52} y={yTop + 2} w={32} />
            <Cumulus x={COL_X + 52} y={yTop + 6} w={28} />
          </>
        )}
      </div>
    </div>
  );
}
