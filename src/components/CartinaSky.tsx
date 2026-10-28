"use client";

/**
 * CIELO DELLE ORE — il profilo della risalita nella finestra della cartina.
 * Sostituisce le vecchie barre orizzontali con una scena leggibile a colpo d'occhio:
 * - a sinistra le quote (dal decollo fino a 4000 m)
 * - al centro la COLONNA DELLA TERMICA: sale dal decollo fino alla quota di arrivo,
 *   colorata con la scala dell'instabilità (blu = debole → giallo/arancio → rosso = cross)
 * - i CUMULI sono disegnati esattamente alla base nubi = quota di arrivo della termica
 * - il PARAPENDIO sta alla sommità, sulla base dei cumuli
 * - la linea tratteggiata rossa segna lo ZERO TERMICO
 * - a destra la COLONNA DEI VENTI: a ogni quota (decolo → 4000 m) freccia = direzione
 *   dove spinge il vento, valore in km/h e direzione in parole ("da NO")
 * Dati: sounding del modello (geopotenziale + vento ai livelli di pressione) già scaricato.
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

/* Cumulo stilizzato: cerchi + base piatta (gruppo esterno = posizione, interno = animazione) */
function Cumulus({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} aria-hidden="true">
      <g className="sky-cloud">
        <circle cx={-7} cy={1.5} r={5.4} />
        <circle cx={0} cy={-2.5} r={7.2} />
        <circle cx={7.5} cy={1.5} r={5.8} />
        <rect x={-11} y={2.5} width={22} height={4.5} rx={2.2} />
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
    const w =
      alt === quota
        ? { ws: wind, wd: dir }
        : windAtAltitude(point, alt, wind, dir);
    return { alt, ws: w.ws != null ? Math.round(w.ws) : null, wd: w.wd };
  });

  const yTop = y(topAlt);
  const colH = Math.max(10, PLOT_B - yTop);
  const showFreezing = freezing != null && freezing > quota + 80 && freezing < TOP;
  /* etichette del vertice: sopra il parapendio, mai fuori dal riquadro */
  const labY1 = Math.max(yTop - 41, PLOT_T + 9);
  const labY2 = Math.max(yTop - 31, PLOT_T + 19);
  /* se lo zero termico cade nella fascia delle etichette del vertice si nasconde
     (linea + testo): il valore resta comunque nella scheda dati sotto */
  const yFr = showFreezing ? y(freezing) : null;
  const zeroCollides =
    yFr != null && (Math.abs(yFr - labY1) < 16 || Math.abs(yFr - labY2) < 16 || (yFr > labY1 - 6 && yFr < labY2 + 6));

  /* gradient della colonna: colore = scala dell'instabilità */
  const strong = rateo >= 2.4;
  const colTop = strong ? "#fca5a5" : rateo >= 1.5 ? "#fdba74" : rateo >= 0.8 ? "#fde047" : rateo >= 0.18 ? "#7dd3fc" : "#8ba0b6";
  const colBot = strong ? "#ef4444" : rateo >= 1.5 ? "#f97316" : rateo >= 0.8 ? "#eab308" : rateo >= 0.18 ? "#2f96d8" : "#47566b";

  return (
    <div className="cmap-sky" data-testid="cartina-sky">
      <div className="cmap-skyhead">
        <span className="cmap-skyhead-k">Il cielo · ore {String(hour).padStart(2, "0")}:00</span>
        <span className="cmap-skyhead-v">risalita dal decollo a 4000 m</span>
      </div>

      <svg
        className="cmap-sky-svg"
        viewBox="0 0 328 286"
        width="100%"
        role="img"
        aria-label={`Profilo della risalita alle ore ${hour}: termica ${rateo.toFixed(1)} metri al secondo, arrivo a ${fmtM(topAlt)} metri`}
      >
        <defs>
          <linearGradient id="skycol" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colTop} stopOpacity="0.95" />
            <stop offset="100%" stopColor={colBot} stopOpacity="0.55" />
          </linearGradient>
          <linearGradient id="skysky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7dd3fc" stopOpacity="0.10" />
            <stop offset="100%" stopColor="#7dd3fc" stopOpacity="0" />
          </linearGradient>
          <clipPath id="skycolclip">
            <rect x={COL_X - 17} y={yTop} width={34} height={colH + 4} />
          </clipPath>
        </defs>

        {/* cielo */}
        <rect x={PLOT_L} y={PLOT_T} width={PLOT_R - PLOT_L} height={PLOT_B - PLOT_T} fill="url(#skysky)" rx={6} />

        {/* quote a sinistra + griglia */}
        {winds.map((w) => (
          <g key={"ax" + w.alt}>
            <line x1={PLOT_L} y1={y(w.alt)} x2={PLOT_R} y2={y(w.alt)} stroke="rgba(255,255,255,0.055)" strokeWidth={1} />
            <text
              x={34}
              y={y(w.alt) + 2.8}
              textAnchor="end"
              className="cmap-sky-ax"
              style={{ fontWeight: w.alt === quota ? 700 : 400, fill: w.alt === quota ? "#9fd7ea" : "#6d8496" }}
            >
              {w.alt === quota ? fmtM(quota) : String(w.alt)}
            </text>
          </g>
        ))}

        {/* zero termico (nascosto se sovrapposto alle etichette del vertice) */}
        {showFreezing && !zeroCollides && (
          <g aria-hidden="true">
            <line x1={PLOT_L} y1={yFr} x2={PLOT_R} y2={yFr} stroke="#ff8f8f" strokeWidth={1} strokeDasharray="4 3" opacity={0.55} />
            <text x={PLOT_L + 3} y={yFr - 3.5} className="cmap-sky-zero">
              zero termico · {fmtM(freezing)} m
            </text>
          </g>
        )}

        {/* colonna della termica */}
        <g aria-hidden="true">
          <rect
            x={COL_X - 17}
            y={yTop}
            width={34}
            height={colH}
            rx={9}
            fill="url(#skycol)"
            stroke="rgba(255,255,255,0.16)"
            strokeWidth={1}
          />
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

        {/* cumuli alla quota di arrivo della termica */}
        {cumuli && (
          <>
            <Cumulus x={COL_X} y={yTop - 3} s={1.15} />
            <Cumulus x={COL_X - 48} y={yTop + 3} s={0.72} />
            <Cumulus x={COL_X + 50} y={yTop + 5} s={0.6} />
          </>
        )}

        {/* parapendio alla sommità */}
        <g transform={`translate(${COL_X} ${yTop - 17})`} aria-hidden="true">
          <g className="sky-pg">
            <path d="M -15 0 Q 0 -9.5 15 0 Q 7.5 -3.6 0 -3.3 Q -7.5 -3.6 -15 0 Z" fill="#ffd76a" stroke="rgba(0,0,0,0.28)" strokeWidth={0.6} />
            <line x1={-12.5} y1={0.4} x2={-1.4} y2={11} stroke="rgba(255,255,255,0.55)" strokeWidth={0.7} />
            <line x1={12.5} y1={0.4} x2={1.4} y2={11} stroke="rgba(255,255,255,0.55)" strokeWidth={0.7} />
            <line x1={0} y1={-2.8} x2={0} y2={10.6} stroke="rgba(255,255,255,0.4)" strokeWidth={0.7} />
            <circle cx={0} cy={12.6} r={2.5} fill="#ffd76a" stroke="rgba(0,0,0,0.28)" strokeWidth={0.5} />
          </g>
        </g>

        {/* suolo + decollo */}
        <path
          d={`M ${PLOT_L} ${PLOT_B + 6} L ${PLOT_L} ${PLOT_B + 1} Q 70 ${PLOT_B - 8} 100 ${PLOT_B - 1} Q 120 ${PLOT_B + 3} ${COL_X} ${PLOT_B - 2} Q 162 ${PLOT_B - 6} 186 ${PLOT_B - 1} Q 214 ${PLOT_B + 4} ${PLOT_R} ${PLOT_B - 2} L ${PLOT_R} ${PLOT_B + 6} Z`}
          fill="#28393f"
          stroke="rgba(255,255,255,0.10)"
          strokeWidth={0.8}
        />
        <line x1={COL_X} y1={PLOT_B - 2} x2={COL_X} y2={PLOT_B - 11} stroke="#ffd76a" strokeWidth={1.2} />
        <path d={`M ${COL_X} ${PLOT_B - 11} l 7.5 2.4 l -7.5 2.4 Z`} fill="#ffd76a" />
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
                    <line x1={0} y1={6.5} x2={0} y2={-6.5} stroke={c} strokeWidth={1.7} strokeLinecap="round" />
                    <path d="M 0 -6.5 l -3 2.9 M 0 -6.5 l 3 2.9" stroke={c} strokeWidth={1.7} strokeLinecap="round" fill="none" />
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
    </div>
  );
}
