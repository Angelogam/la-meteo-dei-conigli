import React, { useMemo } from "react";
import type { HourlyPoint } from "@/services/threeSourceWeather";

/* ============================================================================
   CardWindgram — airgram compatto stile Meteo-Parapente / Alpium.
   X = ore del giorno, Y = quota, colore = velocità del vento reale del modello
   (sounding a livelli di pressione 925→550 hPa). Curve: top termica (da
   adiabatica secca vs profilo ambiente), base cumuli (LCL), zero termico,
   quota di decollo. Cursore animato sull'ora attiva, clic per cambiare ora.
   ========================================================================== */

export interface WgHour {
  hour: number;
  classe: "is-good" | "is-fair" | "is-bad";
  wind: number | null;
  gusts: number | null;
  dir: number | null;
  temp: number | null;
  cloud: number | null;
  baseNubiM: number | null;
  rateo: number | null;
  freezing: number | null;
}

interface CardWindgramProps {
  hours: WgHour[];
  points: HourlyPoint[];
  quota: number;
  activeHour: number;
  nowHour: number | null;
  dayKey: string;
}

/* ---------- Scala vento continua stile Windy (lerp tra stop) ---------- */

const SPEED_STOPS: Array<[number, [number, number, number]]> = [
  [0, [61, 90, 158]],
  [5, [14, 127, 192]],
  [10, [18, 163, 168]],
  [15, [47, 178, 76]],
  [20, [134, 189, 43]],
  [26, [232, 196, 34]],
  [32, [242, 137, 29]],
  [40, [225, 61, 30]],
  [50, [163, 18, 58]],
  [62, [122, 21, 132]],
];

function speedRGB(kmh: number): [number, number, number] {
  const v = Math.max(0, Math.min(62, kmh));
  for (let i = 0; i < SPEED_STOPS.length - 1; i++) {
    const [a, ca] = SPEED_STOPS[i];
    const [b, cb] = SPEED_STOPS[i + 1];
    if (v <= b) {
      const t = (v - a) / (b - a);
      return [
        Math.round(ca[0] + (cb[0] - ca[0]) * t),
        Math.round(ca[1] + (cb[1] - ca[1]) * t),
        Math.round(ca[2] + (cb[2] - ca[2]) * t),
      ];
    }
  }
  return SPEED_STOPS[SPEED_STOPS.length - 1][1];
}

function speedColor(kmh: number | null, alpha = 1): string {
  if (kmh === null || !Number.isFinite(kmh)) return "rgba(100,116,139," + 0.35 * alpha + ")";
  const [r, g, b] = speedRGB(kmh);
  return `rgba(${r},${g},${b},${alpha})`;
}

/* ---------- Interpolazioni dal sounding ---------- */

type Anchor = { alt: number; ws: number };

function windAnchors(point: HourlyPoint, quota: number): Anchor[] {
  const out: Anchor[] = [];
  if (point.wind !== null && Number.isFinite(point.wind)) out.push({ alt: quota, ws: point.wind });
  for (const lv of point.levels ?? []) {
    if (out.length && lv.gh - out[out.length - 1].alt < 40) continue;
    out.push({ alt: lv.gh, ws: lv.ws });
  }
  out.sort((a, b) => a.alt - b.alt);
  return out;
}

function windAt(alt: number, anchors: Anchor[]): number | null {
  if (!anchors.length) return null;
  if (alt <= anchors[0].alt) return anchors[0].ws;
  const last = anchors[anchors.length - 1];
  if (alt >= last.alt) return last.ws;
  for (let i = 0; i < anchors.length - 1; i++) {
    const a = anchors[i];
    const b = anchors[i + 1];
    if (alt >= a.alt && alt <= b.alt) {
      const t = (alt - a.alt) / Math.max(1, b.alt - a.alt);
      return a.ws + (b.ws - a.ws) * t;
    }
  }
  return last.ws;
}

type TAnchor = { alt: number; t: number };

function tempAnchors(point: HourlyPoint, quota: number): TAnchor[] {
  const out: TAnchor[] = [];
  const lv = [...(point.levels ?? [])].sort((a, b) => a.gh - b.gh);
  const firstT = lv.length && lv[0].t !== null && lv[0].t !== undefined ? lv[0].t : 10;
  const surfT = point.temp ?? firstT;
  if (surfT !== null) out.push({ alt: quota, t: surfT });
  for (const l of lv) {
    if (l.t === null || l.t === undefined) continue;
    if (out.length && l.gh - out[out.length - 1].alt < 40) continue;
    out.push({ alt: l.gh, t: l.t });
  }
  return out;
}

function envTempAt(alt: number, anchors: TAnchor[]): number | null {
  if (!anchors.length) return null;
  if (alt <= anchors[0].alt) return anchors[0].t;
  const last = anchors[anchors.length - 1];
  if (alt >= last.alt) return last.t - (0.65 * (alt - last.alt)) / 100;
  for (let i = 0; i < anchors.length - 1; i++) {
    const a = anchors[i];
    const b = anchors[i + 1];
    if (alt >= a.alt && alt <= b.alt) {
      const t = (alt - a.alt) / Math.max(1, b.alt - a.alt);
      return a.t + (b.t - a.t) * t;
    }
  }
  return last.t;
}

/**
 * Top termica reale: quota in cui la parcela sollevata dall adiabatica secca
 * (0.98 °C/100 m) incrocia la temperatura ambiente del modello. Cap al LCL.
 */
function thermalTopAt(point: HourlyPoint, quota: number, lcl: number | null): number | null {
  const anchors = tempAnchors(point, quota);
  if (anchors.length < 2) return null;
  const t0 = anchors[0].t;
  const highest = anchors[anchors.length - 1].alt;
  const ceil = Math.min(highest + 400, 6500);
  let top: number | null = null;
  const step = 25;
  for (let alt = quota + step; alt <= ceil; alt += step) {
    const parcel = t0 - (0.98 * (alt - quota)) / 100;
    const env = envTempAt(alt, anchors);
    if (env === null) break;
    if (parcel >= env) top = alt;
    else if (top !== null) break;
  }
  if (top === null) return null;
  if (lcl !== null && lcl > quota + 40 && lcl < top) return lcl;
  return top;
}

/* ---------- Layout ---------- */

const W = 368;
const ML = 31;
const MR = 5;
const PLOT_W = W - ML - MR;
const STRIP_Y = 2;
const STRIP_H = 10;
const PLOT_Y = 18;
const PLOT_H = 152;
const PLOT_B = PLOT_Y + PLOT_H;
const ARROW_Y = PLOT_B + 4;
const ARROW_H = 14;
const LABEL_Y = ARROW_Y + ARROW_H + 10;
const H = LABEL_Y + 2;

function roundUp500(v: number): number {
  return Math.ceil(v / 500) * 500;
}

export default function CardWindgram({ hours, points, quota, activeHour, nowHour, dayKey }: CardWindgramProps) {
  const hourMap = useMemo(() => {
    const m = new Map<number, HourlyPoint>();
    for (const p of points) m.set(Number(/T(\d{2})/.exec(p.time)?.[1] ?? -1), p);
    return m;
  }, [points]);

  /* Quota massima del grafico: la più alta tra base nubi, zero termico, decollo+margine */
  const altMax = useMemo(() => {
    let m = quota + 900;
    for (const h of hours) {
      if (h.baseNubiM) m = Math.max(m, h.baseNubiM);
      if (h.freezing) m = Math.max(m, h.freezing);
    }
    return Math.min(6500, Math.max(2500, roundUp500(m + 250)));
  }, [hours, quota]);

  const altToY = (alt: number) => PLOT_B - (Math.max(0, Math.min(altMax, alt)) / altMax) * PLOT_H;

  const startH = hours.length ? hours[0].hour : 5;
  const endH = hours.length ? hours[hours.length - 1].hour : 21;
  const nCols = Math.max(1, endH - startH + 1);
  const colW = PLOT_W / nCols;
  const colX = (h: number) => ML + (h - startH) * colW;

  /* Anchors del vento e curve, calcolate una volta per giorno */
  const series = useMemo(() => {
    const rows = 20;
    const rowM = altMax / rows;
    const cells: Array<{ x: number; y: number; w: number; h: number; ws: number | null; hour: number }> = [];
    const anchorsPerHour = new Map<number, Anchor[]>();
    const tops: Array<{ hour: number; alt: number } | null> = [];
    const bases: Array<{ hour: number; alt: number } | null> = [];
    const freezes: Array<{ hour: number; alt: number } | null> = [];

    for (const h of hours) {
      const p = hourMap.get(h.hour);
      const anchors = p ? windAnchors(p, quota) : [];
      anchorsPerHour.set(h.hour, anchors);
      for (let r = 0; r < rows; r++) {
        const alt = (r + 0.5) * rowM;
        const ws = anchors.length ? windAt(alt, anchors) : null;
        cells.push({
          x: colX(h.hour),
          y: altToY((r + 1) * rowM),
          w: colW + 0.5,
          h: PLOT_H / rows + 0.5,
          ws,
          hour: h.hour,
        });
      }
      const p2 = hourMap.get(h.hour);
      const top = p2 && (h.rateo ?? 0) > 0.2 ? thermalTopAt(p2, quota, h.baseNubiM) : null;
      tops.push(top !== null ? { hour: h.hour, alt: top } : null);
      bases.push(h.baseNubiM !== null ? { hour: h.hour, alt: h.baseNubiM } : null);
      freezes.push(h.freezing !== null && h.freezing > 200 ? { hour: h.hour, alt: h.freezing } : null);
    }
    return { cells, tops, bases, freezes };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hours, hourMap, quota, altMax, dayKey]);

  const { topsPath, basesPath, freezesPath } = useMemo(() => {
    const pathWithHours = (list: Array<{ hour: number; alt: number } | null>): string => {
      let d = "";
      let prevHour: number | null = null;
      for (const item of list) {
        if (!item) { prevHour = null; continue; }
        const x = colX(item.hour + 0.5);
        const y = altToY(item.alt).toFixed(1);
        d += (prevHour === null || item.hour - prevHour > 1 ? " M" : " L") + ` ${x.toFixed(1)} ${y}`;
        prevHour = item.hour;
      }
      return d.trim();
    };
    return {
      topsPath: pathWithHours(series.tops),
      basesPath: pathWithHours(series.bases),
      freezesPath: pathWithHours(series.freezes),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [series, startH, colW, altMax]);

  /* Etichette altitudine: passo 1000 m (o 500 m sotto i 3000 m) */
  const altStep = altMax <= 3000 ? 500 : 1000;
  const altTicks: number[] = [];
  for (let a = altStep; a <= altMax; a += altStep) altTicks.push(a);

  const activeAnchors = hourMap.get(activeHour) ? windAnchors(hourMap.get(activeHour)!, quota) : [];

  return (
    <div className="dxc-wg2" role="img" aria-label={`Windgram dalle ${startH} alle ${endH}: colore = velocità del vento in quota, curva arancione = top termica, ciano = base nubi, blu = zero termico`}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" className="dxc-wg2-svg" key={dayKey}>
        {/* sfondo del plot */}
        <defs>
          <linearGradient id={"dxc-wg2-fade-" + dayKey.replace(/\W/g, "")} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(9,18,35,0.25)" />
            <stop offset="100%" stopColor="rgba(6,13,26,0.85)" />
          </linearGradient>
        </defs>
        <rect x={ML} y={PLOT_Y} width={PLOT_W} height={PLOT_H} fill="rgba(4,10,22,0.55)" rx="4" />

        {/* griglia orizzontale + etichette quota */}
        {altTicks.map((a) => (
          <g key={"t" + a}>
            <line x1={ML} x2={ML + PLOT_W} y1={altToY(a)} y2={altToY(a)} stroke="rgba(148,197,255,0.09)" strokeWidth="0.6" strokeDasharray={a % 1000 === 0 ? undefined : "1 3"} />
            <text x={ML - 3.5} y={altToY(a) + 2.6} textAnchor="end" className="dxc-wg2-alt">
              {a >= 1000 ? (a / 1000).toFixed(a % 1000 === 0 ? 0 : 1) + "k" : String(a)}
            </text>
          </g>
        ))}

        {/* celle vento (il cuore del windgram) */}
        <g>
          {hours.map((h, ci) => {
            const colCells = series.cells.filter((c) => c.hour === h.hour);
            return (
              <g key={"col" + h.hour} className="dxc-wg2-col-in" style={{ animationDelay: ci * 16 + "ms" }}>
                {colCells.map((c, ri) => (
                  <rect key={ri} x={c.x} y={c.y} width={c.w} height={c.h} fill={speedColor(c.ws, 0.92)} />
                ))}
              </g>
            );
          })}
        </g>

        {/* velo nuvoloso sopra la base (opacità dalla copertura reale) */}
        <g>
          {hours.map((h) => {
            if (h.baseNubiM === null) return null;
            const yBase = altToY(h.baseNubiM);
            const haze = 0.05 + Math.min(0.16, (h.cloud ?? 40) / 450);
            return (
              <rect
                key={"hz" + h.hour}
                x={colX(h.hour)}
                y={PLOT_Y}
                width={colW}
                height={Math.max(0, yBase - PLOT_Y)}
                fill={`rgba(214,226,244,${haze.toFixed(3)})`}
              />
            );
          })}
        </g>

        {/* quota decollo */}
        <line x1={ML} x2={ML + PLOT_W} y1={altToY(quota)} y2={altToY(quota)} className="dxc-wg2-launch" />
        <text x={ML + PLOT_W - 2} y={altToY(quota) - 2.5} textAnchor="end" className="dxc-wg2-launch-txt">DECOLLO {quota} m</text>

        {/* curve: zero termico, base nubi, top termica */}
        {freezesPath && <path d={freezesPath} className="dxc-wg2-curve is-freeze" pathLength={1} />}
        {basesPath && <path d={basesPath} className="dxc-wg2-curve is-base" pathLength={1} />}
        {topsPath && <path d={topsPath} className="dxc-wg2-curve is-thermal" pathLength={1} />}

        {/* cursore ora attiva */}
        <g className="dxc-wg2-cursor" style={{ transform: `translateX(${colX(activeHour + 0.5)}px)` }}>
          <rect x={-colW / 2} y={STRIP_Y} width={colW} height={H - STRIP_Y - 2} fill="rgba(148,197,255,0.10)" stroke="rgba(148,197,255,0.55)" strokeWidth="0.8" rx="3" className="dxc-wg2-cursor-box" />
          <line x1={0} x2={0} y1={PLOT_Y - 2} y2={ARROW_Y + ARROW_H} stroke="rgba(148,197,255,0.85)" strokeWidth="1" />
          <path d={`M 0 ${PLOT_Y - 5.5} l -3.2 -4.5 h 6.4 Z`} fill="#94c5ff" />
        </g>

        {/* marcatore "adesso" sulla striscia volabilità */}
        {nowHour !== null && nowHour >= startH && nowHour <= endH && (
          <circle
            cx={colX(nowHour + 0.5)}
            cy={STRIP_Y + STRIP_H + 3}
            r="2"
            className="dxc-wg2-now"
          />
        )}

        {/* striscia volabilità */}
        <g>
          {hours.map((h) => (
            <rect
              key={"v" + h.hour}
              x={colX(h.hour) + 1}
              y={STRIP_Y}
              width={colW - 2}
              height={STRIP_H}
              rx="2"
              className={"dxc-wg2-vcell " + h.classe + (h.hour === activeHour ? " is-active" : "")}
            />
          ))}
        </g>

        {/* frecce direzione vento al suolo */}
        <g>
          {hours.map((h) => {
            if (h.dir === null) return null;
            const cx = colX(h.hour + 0.5);
            const active = h.hour === activeHour;
            const strong = (h.gusts ?? 0) >= 30;
            return (
              <g key={"a" + h.hour} transform={`translate(${cx} ${ARROW_Y + ARROW_H / 2})`} className={"dxc-wg2-arrow" + (active ? " is-active" : "")}>
                <g transform={`rotate(${h.dir + 180})`}>
                  <path d="M 0 -5.2 L 2.6 2 L 0 0.6 L -2.6 2 Z" fill={speedColor(h.wind)} />
                </g>
                {strong && <circle cx="0" cy="-6.6" r="1.1" fill={(h.gusts ?? 0) >= 40 ? "#f87171" : "#fbbf24"} />}
              </g>
            );
          })}
        </g>

        {/* barbe del vento sull ora attiva (livelli modello) */}
        <g>
          {activeAnchors.map((a, i) => (
            <g key={"b" + i} transform={`translate(${ML + 2.5} ${altToY(a.alt)})`}>
              <circle r="1.7" fill={speedColor(a.ws)} stroke="rgba(2,8,20,0.8)" strokeWidth="0.6" />
            </g>
          ))}
        </g>

        {/* etichette ore */}
        {hours.map((h) =>
          h.hour % 3 === 0 ? (
            <text key={"h" + h.hour} x={colX(h.hour + 0.5)} y={LABEL_Y} textAnchor="middle" className="dxc-wg2-hour">
              {String(h.hour).padStart(2, "0")}
            </text>
          ) : null,
        )}

        {/* aree cliccabili per ora */}
        <g>
          {hours.map((h) => (
            <rect
              key={"hit" + h.hour}
              data-hour={h.hour}
              x={colX(h.hour)}
              y={STRIP_Y}
              width={colW}
              height={H - STRIP_Y - 2}
              fill="transparent"
              className="dxc-wg2-hit"
            >
              <title>{`${String(h.hour).padStart(2, "0")}:00 · vento ${Math.round(h.wind ?? 0)} km/h${h.gusts ? " · raffiche " + Math.round(h.gusts) : ""}`}</title>
            </rect>
          ))}
        </g>
      </svg>

      {/* legenda */}
      <div className="dxc-wg2-legend" aria-hidden="true">
        <span className="dxc-wg2-scale">
          <i style={{ background: "linear-gradient(90deg,#3d5a9e,#0e7fc0,#12a3a8,#2fb24c,#86bd2b,#e8c422,#f2891d,#e13d1e,#a3123a,#7a1584)" }} />
          <em>0</em>
          <em>20</em>
          <em>40+</em>
          <strong>km/h</strong>
        </span>
        <span className="dxc-wg2-keys">
          <em><i className="k-thermal" />top termica</em>
          <em><i className="k-base" />base nubi</em>
          <em><i className="k-freeze" />zero 0°</em>
        </span>
      </div>
    </div>
  );
}
