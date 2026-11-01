"use client";

/**
 * TermicheDayFlight — "Il volo della giornata"
 * Scena aerologica animata in stile cockpito: il parapendio con il pilota
 * ripercorre le fasi termiche reali della giornata. Quote sulla sinistra,
 * vento per fasce orarie sulla destra, nuvolette cumuli alla base (LCL),
 * rateo m/s sulle colonne, zero termico e turbolenza meccanica.
 *
 * Niente librerie esterne: SVG puro + rAF per il volo, CSS per le bolle
 * e le nuvole. prefers-reduced-motion: volo statico, solo salto d'ora.
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";

export interface TDayHour {
  hour: number;
  rateo: number;
  base: number;
  top: number;
  temp: number | null;
  wind: number | null;
  gusts: number | null;
  dir: number | null;
  cloud: number | null;
  humidity: number | null;
  freeze: number | null;
}

interface Props {
  hours: TDayHour[];
  siteAlt: number;
  siteName: string;
  selectedDay?: number;
}

const W = 980;
const H = 620;
const M = { l: 68, r: 124, t: 32, b: 46 };
const PLOT_W = W - M.l - M.r;
const PLOT_B = H - M.b;
const PLOT_T = M.t;

const CARDINALI = ["Nord", "Nord Est", "Est", "Sud Est", "Sud", "Sud Ovest", "Ovest", "Nord Ovest"];
const cardinal = (deg: number | null): string =>
  deg === null || deg === undefined || !Number.isFinite(deg)
    ? "N/D"
    : CARDINALI[Math.round((((deg % 360) + 360) % 360) / 45) % 8];

const fmtM = (v: number): string => Math.round(v).toLocaleString("it-IT");
const fmt1 = (v: number): string => v.toFixed(1).replace(".", ",");

type Turb = 0 | 1 | 2;
function turbLevel(h: TDayHour): Turb {
  const g = h.gusts;
  const w = h.wind ?? 0;
  if (g === null || g === undefined) return w >= 28 ? 2 : 0;
  const diff = g - w;
  if (diff >= 18 || w >= 28 || g >= 42) return 2;
  if (diff >= 10 || g >= 30) return 1;
  return 0;
}
const TURB_LABEL = ["Lieve", "Moderata", "Forte"];

interface Pt { x: number; y: number; bank: number; hour: number }

function hash(n: number): number {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

export default function TermicheDayFlight({ hours, siteAlt, siteName, selectedDay = 0 }: Props) {
  const n = Math.max(hours.length, 1);
  const bandW = PLOT_W / n;
  const bandH = (PLOT_B - PLOT_T) / n;

  const actives = useMemo(
    () => hours.filter((h) => h.rateo >= 0.5 && h.top > siteAlt + 250),
    [hours, siteAlt],
  );

  /* ---------- Scala delle quote ---------- */
  const altMax = useMemo(() => {
    let hi = siteAlt + 1400;
    for (const h of hours) hi = Math.max(hi, h.top + 180, h.base + 120, (h.freeze ?? 0) + 120);
    return Math.ceil(hi / 500) * 500;
  }, [hours, siteAlt]);
  const altMin = Math.max(0, siteAlt - 150);
  const yOf = (alt: number): number =>
    PLOT_B - ((alt - altMin) / (altMax - altMin)) * (PLOT_B - PLOT_T);
  const xOf = (i: number): number => M.l + bandW * (i + 0.5);
  const xOfHour = (hour: number): number => {
    const i = hours.findIndex((h) => h.hour === hour);
    return i >= 0 ? xOf(i) : M.l + PLOT_W * 0.5;
  };

  /* ---------- Traiettoria di volo: decollo → termiche → transiti ---------- */
  const { pts, hourTopIdx, duration } = useMemo(() => {
    const P: Pt[] = [];
    const hourTopIdx: Record<number, number> = {};
    const start: Pt = { x: M.l + 34, y: yOf(siteAlt) - 6, bank: 0, hour: hours[0]?.hour ?? 12 };
    P.push(start);
    let dur = 1.1;
    let curAlt = siteAlt;
    let curX = start.x;
    for (const h of actives) {
      const tx = xOfHour(h.hour);
      const entryAlt = Math.max(curAlt - 240, siteAlt + 80);
      const glideN = 26;
      for (let k = 1; k <= glideN; k++) {
        const t = k / glideN;
        const x = curX + (tx - curX) * t;
        const alt = curAlt + (entryAlt - curAlt) * t - Math.sin(t * Math.PI) * 26;
        P.push({ x, y: yOf(alt), bank: (tx > curX ? 1 : -1) * 7 * Math.sin(t * Math.PI), hour: h.hour });
      }
      curX = tx; curAlt = entryAlt;
      dur += 1.0;
      const climbN = 46;
      const turns = 2.1;
      for (let k = 1; k <= climbN; k++) {
        const t = k / climbN;
        const alt = entryAlt + (h.top - entryAlt) * t;
        const wob = Math.sin(t * turns * 2 * Math.PI);
        P.push({ x: tx + wob * 13, y: yOf(alt), bank: -22 * Math.cos(t * turns * 2 * Math.PI), hour: h.hour });
      }
      curAlt = h.top;
      hourTopIdx[h.hour] = P.length - 1;
      dur += 1.5 + h.rateo * 0.55;
    }
    return { pts: P, hourTopIdx, duration: Math.min(30, Math.max(12, dur)) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actives, hours, siteAlt, altMax, altMin, bandW]);

  const initialHour = useMemo(() => {
    const now = new Date().getHours();
    let best = hours[0]?.hour ?? 12;
    if (actives.length) {
      best = actives.reduce((a, b) =>
        Math.abs(a.hour - now) <= Math.abs(b.hour - now) ? a : b).hour;
    } else if (hours.length) {
      best = hours.reduce((a, b) => (a.rateo >= b.rateo ? a : b)).hour;
    }
    return best;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hours]);

  const [activeHour, setActiveHour] = useState<number>(initialHour);
  const [playing, setPlaying] = useState<boolean>(false);
  const [gotoTick, setGotoTick] = useState<number>(0);
  const gliderRef = useRef<SVGGElement | null>(null);
  const animRef = useRef({ mode: "idle" as "idle" | "play" | "goto", t: 0, from: 0, to: 0, t0: 0 });
  const reducedRef = useRef<boolean>(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    reducedRef.current = mq.matches;
    const on = () => { reducedRef.current = mq.matches; };
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  useEffect(() => {
    animRef.current = { mode: "idle", t: 0, from: 0, to: 0, t0: 0 };
    setActiveHour(initialHour);
    setPlaying(false);
  }, [selectedDay, initialHour]);

  /* Place the glider without React re-render */
  const placeGlider = (idxF: number) => {
    const g = gliderRef.current;
    if (!g || !pts.length) return;
    const i = Math.max(0, Math.min(pts.length - 1, Math.round(idxF)));
    const p = pts[i];
    g.setAttribute("transform", `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) rotate(${p.bank.toFixed(1)})`);
    g.style.opacity = "1";
    const hour = p.hour;
    setActiveHour((prev) => (prev === hour ? prev : hour));
  };

  /* rAF engine: gira durante il play e durante il salto animato a un'ora;
     quando è fermo (idle e in pausa) si spegne per non consumare CPU. */
  useEffect(() => {
    if (reducedRef.current || pts.length < 2) return;
    if (!playing && gotoTick === 0) return;
    let raf = 0;
    let last = performance.now();
    const speed = pts.length / duration;
    const step = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const a = animRef.current;
      if (a.mode === "goto") {
        const k = Math.min(1, (now - a.t0) / 700);
        const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
        a.t = a.from + (a.to - a.from) * e;
        placeGlider(a.t);
        if (k >= 1) {
          a.mode = playing ? "play" : "idle";
          if (!playing) return; // spegne il motore a tween concluso
        }
      } else if (playing) {
        a.t += dt * speed;
        if (a.t >= pts.length - 1) a.t = 0;
        placeGlider(a.t);
      } else {
        return; // idle e in pausa: spegne il motore
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, gotoTick, pts, duration]);

  useEffect(() => {
    if (pts.length) placeGlider(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pts]);

  const flyTo = (hour: number) => {
    const target = hourTopIdx[hour] ?? 0;
    if (reducedRef.current || pts.length < 2) {
      animRef.current.t = target;
      placeGlider(target);
    } else {
      const a = animRef.current;
      a.from = a.t; a.to = target; a.t0 = performance.now(); a.mode = "goto";
      setGotoTick((c) => c + 1); // accende il motore anche da fermo
    }
    setActiveHour(hour);
  };

  const togglePlay = () => {
    if (reducedRef.current) return;
    const a = animRef.current;
    if (!playing && a.mode !== "play") {
      if (a.mode === "idle") a.t = Math.max(0, hourTopIdx[activeHour] ?? a.t);
      a.mode = "play";
      setPlaying(true);
    } else {
      a.mode = "idle";
      setPlaying(false);
    }
  };

  /* ---------- Dati ora attiva per il pannello valori ---------- */
  const active = useMemo(() => {
    return hours.find((h) => h.hour === activeHour)
      ?? hours.reduce<TDayHour | null>((acc, h) => (!acc || Math.abs(h.hour - activeHour) < Math.abs(acc.hour - activeHour) ? h : acc), null);
  }, [hours, activeHour]);

  /* ---------- Foglia/terreno: creste deterministiche ---------- */
  const frontRidge = useMemo(() => {
    const steps = 46;
    let d = `M ${M.l - 4} ${PLOT_B + 2}`;
    for (let i = 0; i <= steps; i++) {
      const x = M.l - 4 + ((PLOT_W + 8) * i) / steps;
      const base = siteAlt - 26;
      const jitter = (hash(i * 3.7) - 0.5) * 74 - Math.cos((i / steps) * Math.PI) * 18;
      d += ` L ${x.toFixed(1)} ${yOf(Math.max(altMin + 8, base + jitter)).toFixed(1)}`;
    }
    d += ` L ${M.l + PLOT_W + 4} ${PLOT_B + 2} Z`;
    return d;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteAlt, altMin, altMax, bandW]);

  const backRidge = useMemo(() => {
    const steps = 34;
    let d = `M ${M.l - 4} ${PLOT_B + 2}`;
    for (let i = 0; i <= steps; i++) {
      const x = M.l - 4 + ((PLOT_W + 8) * i) / steps;
      const base = siteAlt + 130;
      const jitter = (hash(i * 8.3 + 4) - 0.42) * 190;
      d += ` L ${x.toFixed(1)} ${yOf(Math.max(altMin + 40, base + jitter)).toFixed(1)}`;
    }
    d += ` L ${M.l + PLOT_W + 4} ${PLOT_B + 2} Z`;
    return d;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteAlt, altMin, altMax, bandW]);

  /* ---------- Linee quota base nubi / zero termico ---------- */
  const baseCurve = useMemo(() => {
    const seg = hours
      .filter((h) => h.base > altMin && h.base < altMax)
      .map((h) => `${xOfHour(h.hour).toFixed(1)},${yOf(h.base).toFixed(1)}`)
      .join(" ");
    return seg;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hours, altMin, altMax, bandW]);

  const freezeCurve = useMemo(() => {
    const fs = hours.filter((h) => h.freeze !== null && h.freeze > altMin && h.freeze < altMax);
    if (fs.length < 2) return null;
    return fs.map((h) => `${xOfHour(h.hour).toFixed(1)},${yOf(h.freeze as number).toFixed(1)}`).join(" ");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hours, altMin, altMax, bandW]);

  const hasAnyThermal = actives.length > 0;
  const gridAlts: number[] = [];
  for (let a = Math.ceil(altMin / 500) * 500; a <= altMax; a += 500) gridAlts.push(a);

  const turbFor = (h: TDayHour): Turb => turbLevel(h);

  return (
    <section className="tday-panel" aria-labelledby="tday-title">
      <header className="tday-head">
        <div>
          <p className="tday-kicker">SIMULAZIONE AEROLOGICA ANIMATA</p>
          <h3 className="tday-title" id="tday-title">Il volo della giornata</h3>
          <p className="tday-sub">
            Il parapendio ripercorre le termiche reali del modello: quote a sinistra, vento a destra,
            nuvolette alla base delle nubi e m/s di salita su ogni colonna. Tocca una fascia oraria
            per portare il pilota in quell’ora.
          </p>
        </div>
        <button type="button" className={"tday-play" + (playing ? " is-on" : "")} onClick={togglePlay} disabled={!hasAnyThermal}>
          {playing ? <Pause size={15} aria-hidden="true" /> : <Play size={15} aria-hidden="true" />}
          {playing ? "Pausa" : "Simula il volo"}
        </button>
      </header>

      <div className="tday-readout" role="status" aria-live="polite">
        <span className="tday-chip tday-chip-hour">
          Ore <b>{active ? String(active.hour).padStart(2, "0") : "--"}:00</b>
        </span>
        {active && active.rateo > 0.2 ? (
          <span className="tday-chip tday-chip-therm">Termica <b>+{fmt1(active.rateo)} m/s</b></span>
        ) : (
          <span className="tday-chip tday-chip-off">Aria stabile</span>
        )}
        {active && (
          <>
            <span className="tday-chip">Top termica <b>{fmtM(active.top)} m</b></span>
            <span className="tday-chip">Base nubi <b>{fmtM(active.base)} m</b></span>
            <span className="tday-chip tday-chip-wind">
              Vento <b>{active.wind === null ? "N/D" : Math.round(active.wind) + " km/h " + cardinal(active.dir)}</b>
            </span>
            {active.gusts !== null && (
              <span className="tday-chip">Raffiche <b>{Math.round(active.gusts)} km/h</b></span>
            )}
            <span className={"tday-chip tday-chip-turb is-t" + turbFor(active)}>
              Turbolenza <b>{TURB_LABEL[turbFor(active)]}</b>
            </span>
            {active.cloud !== null && (
              <span className="tday-chip">Nuvolosità <b>{Math.round(active.cloud)}%</b></span>
            )}
          </>
        )}
        {!hasAnyThermal && (
          <span className="tday-chip tday-chip-off">Nessuna termica utilizzabile nelle fasce mostrate</span>
        )}
      </div>

      <div className="tday-scene-wrap">
        <svg
          className="tday-svg"
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label={`Simulazione animata del volo della giornata per ${siteName}: quote a sinistra, vento a destra, termiche colonne per ora`}
        >
          <defs>
            <linearGradient id="tday-sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#071022" />
              <stop offset="46%" stopColor="#0d2544" />
              <stop offset="78%" stopColor="#12405f" />
              <stop offset="100%" stopColor="#1a5273" />
            </linearGradient>
            <linearGradient id="tday-therm" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.62" />
              <stop offset="45%" stopColor="#f97316" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#fdba74" stopOpacity="0.1" />
            </linearGradient>
            <linearGradient id="tday-ridge" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#152a45" />
              <stop offset="100%" stopColor="#070e1c" />
            </linearGradient>
            <radialGradient id="tday-sung" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fde68a" stopOpacity="0.95" />
              <stop offset="45%" stopColor="#fbbf24" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="tday-wing" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#22d3ee" />
              <stop offset="55%" stopColor="#7dd3fc" />
              <stop offset="100%" stopColor="#f8fafc" />
            </linearGradient>
            <filter id="tday-soft" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="1.1" />
            </filter>
          </defs>

          {/* Cielo */}
          <rect x="0" y="0" width={W} height={H} rx="18" fill="url(#tday-sky)" />

          {/* Sole segue l'ora attiva */}
          {active && active.hour >= 6 && active.hour <= 20 && (
            <g className="tday-sun" style={{
              transform: `translate(${(M.l + 90 + ((active.hour - 6) / 14) * (PLOT_W - 160)).toFixed(0)}px, ${(128 - Math.sin(((active.hour - 6) / 14) * Math.PI) * 64).toFixed(0)}px)`,
              transition: "transform .9s cubic-bezier(.22,.8,.36,1)",
            }}>
              <circle r="34" fill="url(#tday-sung)" />
              <circle r="9" fill="#fde68a" opacity="0.9" />
            </g>
          )}

          {/* Griglia quote (sinistra = altezze) */}
          {gridAlts.map((a) => (
            <g key={"g" + a}>
              <line x1={M.l} x2={M.l + PLOT_W} y1={yOf(a)} y2={yOf(a)} className="tday-grid" />
              <text x={M.l - 10} y={yOf(a) + 4} className="tday-alt" textAnchor="end">{fmtM(a)}</text>
            </g>
          ))}
          <text x={M.l - 10} y={PLOT_T - 12} className="tday-axis" textAnchor="end">QUOTA m</text>

          {/* Zero termico */}
          {freezeCurve && (
            <>
              <polyline points={freezeCurve} className="tday-freeze" fill="none" />
              <text x={M.l + PLOT_W - 6} y={yOf(hours.find((h) => h.freeze !== null)!.freeze as number) - 8} className="tday-freeze-txt" textAnchor="end">
                0°C · {fmtM(hours.find((h) => h.freeze !== null)!.freeze as number)} m
              </text>
            </>
          )}

          {/* Base nubi */}
          {baseCurve && (
            <>
              <polyline points={baseCurve} className="tday-base" fill="none" />
              <text x={M.l + 8} y={yOf(hours[0].base) - 9} className="tday-base-txt">
                Base nubi (LCL)
              </text>
            </>
          )}

          {/* Creste montuose */}
          <path d={backRidge} fill="#1b3a5c" opacity="0.32" />
          <path d={frontRidge} fill="url(#tday-ridge)" />

          {/* Decollo */}
          <g transform={`translate(${M.l + 34} ${yOf(siteAlt)})`}>
            <line x1="0" y1="4" x2="0" y2="-30" className="tday-flag-pole" />
            <path d="M0 -30 L15 -25.5 L0 -21 Z" className="tday-flag" />
            <circle cx="0" cy="4" r="3" className="tday-launch-dot" />
            <text x="-6" y="-36" className="tday-launch-txt">DECOLLO</text>
            <text x="-6" y="24" className="tday-launch-alt">{fmtM(siteAlt)} m · {siteName}</text>
          </g>

          {/* Colonne termiche + bolle + nuvole + etichette m/s */}
          {hours.map((h, i) => {
            const cx = xOf(i);
            const colW = Math.min(bandW * 0.36, 21);
            const topY = yOf(h.top);
            const botY = yOf(Math.max(siteAlt, altMin + 6));
            const colH = Math.max(0, botY - topY);
            const strength = Math.max(0, Math.min(1, h.rateo / 4.5));
            const visible = h.rateo >= 0.3 && colH > 8;
            const bubN = visible ? Math.min(8, 3 + Math.round(h.rateo * 1.4)) : 0;
            const rise = -(colH - 8);
            const cloudOk = h.rateo >= 0.5 && h.base < h.top - 60 && (h.cloud === null || h.cloud < 80);
            const turb = turbFor(h);
            return (
              <g key={"col" + h.hour}>
                {visible && (
                  <>
                    <rect x={cx - colW / 2} y={topY} width={colW} height={colH} rx={colW / 2}
                      fill="url(#tday-therm)" opacity={(0.34 + strength * 0.5).toFixed(2)} className="tday-col" />
                    <clipPath id={"tday-clip" + i}>
                      <rect x={cx - colW / 2 - 6} y={topY} width={colW + 12} height={colH} rx={colW / 2} />
                    </clipPath>
                    <g clipPath={`url(#tday-clip${i})`}>
                      {Array.from({ length: bubN }, (_, k) => {
                        const bx = cx + ((hash(h.hour * 9 + k * 17) - 0.5) * colW * 0.9);
                        const r = 1.7 + hash(h.hour * 5 + k * 3.1) * 1.9;
                        const dur = Math.max(1.15, 2.7 - h.rateo * 0.34) * (0.82 + hash(h.hour * 3 + k) * 0.4);
                        return (
                          <circle key={k} className="tday-bub" cx={bx.toFixed(1)} cy={botY - 4} r={r.toFixed(1)}
                            style={{ "--tday-rise": rise.toFixed(0) + "px", "--tday-dur": dur.toFixed(2) + "s", "--tday-del": (k * dur / bubN).toFixed(2) + "s" } as React.CSSProperties} />
                        );
                      })}
                    </g>
                    <text x={cx} y={topY - 9} className={"tday-ms" + (h.hour === activeHour ? " is-active" : "")} textAnchor="middle">
                      +{fmt1(h.rateo)}
                    </text>
                    <text x={cx} y={topY - 22} className="tday-ms-unit" textAnchor="middle">m/s</text>
                  </>
                )}
                {cloudOk && (
                  <g className="tday-cloud" transform={`translate(${cx} ${yOf(h.base) - 12})`} opacity={(0.78 + strength * 0.2).toFixed(2)} filter="url(#tday-soft)">
                    <ellipse cx="-9" cy="2" rx="10" ry="5.2" fill="#f1f5f9" />
                    <ellipse cx="1" cy="-3" rx="12" ry="6.4" fill="#ffffff" />
                    <ellipse cx="11" cy="2.4" rx="9" ry="4.6" fill="#e2e8f0" />
                  </g>
                )}
                {turb > 0 && h.wind !== null && (h.wind ?? 0) >= 12 && (
                  <path d={`M ${cx - 8} ${yOf(siteAlt) + 16} l 4 -5 l 3 5 l 4 -5 l 3 5`} fill="none"
                    className={"tday-zig" + (turb === 2 ? " is-strong" : "")} />
                )}
              </g>
            );
          })}

          {/* Fascia oraria attiva */}
          {(() => {
            const ai = hours.findIndex((h) => h.hour === activeHour);
            if (ai < 0) return null;
            return (
              <rect x={M.l + bandW * ai} y={PLOT_T} width={bandW} height={PLOT_B - PLOT_T}
                className="tday-band-active" pointerEvents="none" rx="10" />
            );
          })()}

          {/* Assi temporali + fasce cliccabili */}
          {hours.map((h, i) => (
            <g key={"ax" + h.hour}>
              {i > 0 && <line x1={M.l + bandW * i} x2={M.l + bandW * i} y1={PLOT_T} y2={PLOT_B} className="tday-sep" />}
              <text x={xOf(i)} y={PLOT_B + 21} className={"tday-hour" + (h.hour === activeHour ? " is-active" : "")} textAnchor="middle">
                {String(h.hour).padStart(2, "0")}
              </text>
              <rect
                x={M.l + bandW * i} y={PLOT_T} width={bandW} height={PLOT_B - PLOT_T}
                className="tday-hit" data-hour={h.hour}
                onClick={() => flyTo(h.hour)}
              />
            </g>
          ))}
          <text x={M.l} y={PLOT_B + 38} className="tday-axis">FASCE ORARIE →</text>

          {/* Binario del vento (destra) */}
          <g>
            <text x={M.l + PLOT_W + 14} y={PLOT_T - 22} className="tday-axis">VENTO</text>
            <text x={M.l + PLOT_W + 14} y={PLOT_T - 9} className="tday-axis tday-axis-sub">R = raffica</text>
            {hours.map((h, i) => {
              const cy = PLOT_T + bandH * (i + 0.5);
              const rot = h.dir === null ? 0 : (((h.dir + 180) % 360) + 360) % 360;
              const turb = turbFor(h);
              return (
                <g key={"w" + h.hour} className={"tday-wrow" + (h.hour === activeHour ? " is-active" : "")} data-hour={h.hour} onClick={() => flyTo(h.hour)}>
                  <rect x={M.l + PLOT_W + 6} y={cy - bandH / 2 + 1} width={W - (M.l + PLOT_W + 10)} height={bandH - 2} rx="7" className="tday-wrow-bg" />
                  <g transform={`translate(${M.l + PLOT_W + 20} ${cy}) rotate(${rot})`} className="tday-warrow">
                    <path d="M0 -4.6 L4.6 3.6 L0 1.4 L-4.6 3.6 Z" />
                  </g>
                  <text x={M.l + PLOT_W + 32} y={cy - 2} className="tday-wspeed">{h.wind === null ? "N/D" : Math.round(h.wind)}</text>
                  <text x={M.l + PLOT_W + 32} y={cy + 10} className="tday-wunit">km/h</text>
                  {h.gusts !== null && (
                    <text x={M.l + PLOT_W + 66} y={cy - 2} className="tday-wgust">R{Math.round(h.gusts)}</text>
                  )}
                  {turb > 0 && (
                    <path d={`M ${M.l + PLOT_W + 66} ${cy + 9} l 3.4 -4.4 l 2.6 4.4 l 3.4 -4.4 l 2.6 4.4`} fill="none"
                      className={"tday-zig" + (turb === 2 ? " is-strong" : "")} />
                  )}
                </g>
              );
            })}
          </g>

          {/* Scia del volo + parapendio con pilota */}
          {pts.length > 3 && (
            <polyline
              points={pts.filter((_, i) => i % 3 === 0).map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")}
              className="tday-trail" fill="none"
            />
          )}
          <g ref={gliderRef} className="tday-glider" style={{ opacity: 0 }}>
            <g transform="scale(1.45)">
              <path d="M -16 -8 Q 0 -19 16 -8 Q 8 -11.4 0 -11.6 Q -8 -11.4 -16 -8 Z" fill="url(#tday-wing)" stroke="rgba(240, 250, 255, .85)" strokeWidth="0.7" />
              <path d="M -16 -8 Q -7 -13.2 0 -13.4 M 16 -8 Q 7 -13.2 0 -13.4" fill="none" stroke="rgba(2,32,54,.4)" strokeWidth="0.6" />
              <path d="M -14.6 -8.4 L -1.6 0.4 M 14.6 -8.4 L 1.6 0.4" stroke="rgba(226,240,255,.75)" strokeWidth="0.8" fill="none" />
              <circle cx="0" cy="2.6" r="2.5" fill="#22d3ee" stroke="rgba(240,250,255,.9)" strokeWidth="0.6" />
              <path d="M -1.4 4.6 L -2.4 8 M 1.4 4.6 L 2.4 8" stroke="#22d3ee" strokeWidth="1.6" strokeLinecap="round" />
            </g>
          </g>
        </svg>
      </div>

      <footer className="tday-legend">
        <span><i className="lg-col" /> Colonna termica (m/s di salita)</span>
        <span><i className="lg-bub" /> Bolle in risalita</span>
        <span><i className="lg-cloud" /> Cumuli alla base nubi</span>
        <span><i className="lg-base" /> Base nubi (LCL)</span>
        <span><i className="lg-freeze" /> Zero termico</span>
        <span><i className="lg-zig" /> Turbolenza (raffiche − vento)</span>
        <span><i className="lg-glider" /> Pilota in volo</span>
      </footer>
      <p className="tday-note">
        Simulazione didattica sui dati orari Open-Meteo: la traiettoria è illustrativa e non sostituisce la
        valutazione del pilota in campo. Verifica sempre le condizioni locali prima del decollo.
      </p>
    </section>
  );
}
