import React, { useMemo, useState, useRef, useEffect, useLayoutEffect } from "react";
import type { HourData } from "@/types/meteo";
import { Wind } from "lucide-react";
import { useMultiHourWindProfile } from "@/hooks/useMultiHourWindProfile";

const DISPLAY_HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19] as const;
const ROW_HEIGHT = 28; // altezza cella in px (allineata con le righe della tabella)
const CELL_WIDTH = 56; // larghezza colonna oraria
const LABEL_COL_WIDTH = 56; // larghezza colonna quota a sinistra

// Scala colori "Stabilità" (modello Alpium) - ΔT standard atmosphere = -0.65°C/100m
// Blu intenso (stabile, inversione) → bianco (adiabatico secco) → rosso (instabile)
function stabilityColor(deltaT: number): string {
  // deltaT è il gradiente termico per 100m
  // -1.0 (inversione forte) → blu intenso
  // -0.65 (atmosfera standard) → azzurro chiaro
  //  0.0 (neutro) → bianco/giallo
  //  1.0 (molto instabile) → rosso intenso
  const t = Math.max(-1.2, Math.min(1.2, deltaT));
  if (t < -0.65) {
    // inversione: da blu scuro → azzurro
    const k = (t + 1.2) / (1.2 - 0.65); // 0..1
    const r = Math.round(40 + k * (130 - 40));
    const g = Math.round(80 + k * (180 - 80));
    const b = Math.round(180 + k * (220 - 180));
    return `rgb(${r},${g},${b})`;
  } else if (t < -0.2) {
    // stabile: azzurro → bianco
    const k = (t + 0.65) / 0.45; // 0..1
    const r = Math.round(130 + k * (245 - 130));
    const g = Math.round(180 + k * (245 - 180));
    const b = Math.round(220 + k * (220 - 220));
    return `rgb(${r},${g},${b})`;
  } else if (t < 0.3) {
    // neutro: bianco → giallo
    const k = (t + 0.2) / 0.5; // 0..1
    const r = Math.round(245 + k * (253 - 245));
    const g = Math.round(245 + k * (224 - 245));
    const b = Math.round(220 - k * 80);
    return `rgb(${r},${g},${b})`;
  } else {
    // instabile: giallo/arancione → rosso
    const k = Math.min(1, (t - 0.3) / 0.9); // 0..1
    const r = 253;
    const g = Math.round(224 - k * 180);
    const b = Math.round(140 - k * 130);
    return `rgb(${r},${g},${b})`;
  }
}

function getWindArrowColor(speed: number): { fill: string; stroke: string; text: string } {
  if (speed <= 4) return { fill: "#0284c7", stroke: "#0369a1", text: "#0284c7" };
  if (speed <= 8) return { fill: "#0d9488", stroke: "#0f766e", text: "#0d9488" };
  if (speed <= 13) return { fill: "#16a34a", stroke: "#15803d", text: "#16a34a" };
  if (speed <= 18) return { fill: "#65a30d", stroke: "#4d7c0f", text: "#65a30d" };
  if (speed <= 24) return { fill: "#eab308", stroke: "#ca8a04", text: "#eab308" };
  if (speed <= 30) return { fill: "#f97316", stroke: "#ea580c", text: "#f97316" };
  if (speed <= 42) return { fill: "#dc2626", stroke: "#b91c1c", text: "#dc2626" };
  if (speed <= 58) return { fill: "#991b1b", stroke: "#7f1d1d", text: "#991b1b" };
  return { fill: "#86198f", stroke: "#701a75", text: "#86198f" };
}

function WindArrowIcon({ deg, color }: { deg: number; color: { fill: string; stroke: string } }) {
  const targetDeg = (deg + 180) % 360;
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" className="shrink-0" style={{ transform: `rotate(${targetDeg}deg)` }}>
      <path d="M12 2L17 10H13.5V22H10.5V10H7L12 2Z" fill={color.fill} stroke={color.stroke} strokeWidth="1" />
    </svg>
  );
}

function CloudIcon({ cloudCover }: { cloudCover: number }) {
  return (
    <div className="pointer-events-none" style={{ opacity: 0.95 }}>
      <svg width="20" height="14" viewBox="0 0 40 28" style={{ filter: "drop-shadow(0 -1px 2px rgba(0,0,0,0.5))" }}>
        <path d="M8 20 Q8 12 14 12 Q18 8 24 10 Q30 8 34 14 Q38 18 32 20 L8 20 Z" fill="#2d3748" fillOpacity="0.95" />
        <ellipse cx="18" cy="14" rx="6" ry="4" fill="#374151" fillOpacity="0.85" />
        <ellipse cx="14" cy="12" rx="4" ry="3" fill="#4a5568" fillOpacity="0.8" />
      </svg>
    </div>
  );
}

interface WindgramMatrixProps {
  dayData: HourData[];
  siteName: string;
  altitude: number;
  selectedHour?: number;
  onHourSelect?: (hour: number) => void;
  selectedDay?: number;
  dateLabel?: string;
  lat?: number;
  lon?: number;
}

function getHourTemperature(hourlyMap: Map<number, HourData>, hr: number): string {
  const h = hourlyMap.get(hr);
  return h ? `${Math.round(h.temperature)}°` : "—";
}

export default function WindgramMatrix({
  dayData,
  siteName,
  altitude,
  selectedHour = 13,
  onHourSelect,
  selectedDay = 0,
  dateLabel = "",
  lat = 44.2587,
  lon = 7.7943,
}: WindgramMatrixProps) {
  const { data: windProfileMap, loading: profileLoading, error: profileError, interpolateAtAltitude } = useMultiHourWindProfile({
    lat,
    lon,
    siteAlt: altitude,
    selectedDay,
  });

  const hourlyMap = useMemo(() => {
    const map = new Map<number, HourData>();
    if (dayData && dayData.length > 0) {
      dayData.forEach((h) => {
        const d = new Date(h.time);
        map.set(d.getHours(), h);
      });
    }
    return map;
  }, [dayData]);

  const hasRealAltitudeData = useMemo(() => {
    for (const hourData of windProfileMap.values()) {
      if (hourData.levels.some((l) => l.alt >= 1000 && l.alt <= 3000)) return true;
    }
    return false;
  }, [windProfileMap]);

  const hasRealPressureData = useMemo(() => {
    for (const hourData of windProfileMap.values()) {
      if (hourData.levels.some((l) => l.hpa !== "10m" && l.hpa !== "80m" && l.hpa !== "120m" && l.hpa !== "180m")) return true;
    }
    return false;
  }, [windProfileMap]);

  const baseStep = 250;
  const baseDecolloFloor = Math.floor(altitude / baseStep) * baseStep;
  const maxAlt = 4000;

  const activeAltitudes = useMemo(() => {
    const altitudes: number[] = [];
    for (let alt = maxAlt; alt >= baseDecolloFloor; alt -= baseStep) {
      altitudes.push(alt);
    }
    return altitudes;
  }, [baseDecolloFloor, maxAlt]);

  // Calcolo ΔT (gradiente termico per 100m) per ogni (ora, altitudine).
  // Strategia: usiamo la temperatura al suolo dell'ora e ricostruiamo profili
  // con un gradiente "tipico" (default adiabatico secco -0.98°C/100m)
  // modulato dalla "stabilità" climatica alpina.
  // In futuro, sostituibile con dati reali di temperatura per quota.
  const deltaTGrid = useMemo(() => {
    // griglia: altitudine -> { hr: deltaT }
    const grid: Record<number, Record<number, number>> = {};
    activeAltitudes.forEach((alt) => {
      grid[alt] = {};
      DISPLAY_HOURS.forEach((hr) => {
        const h = hourlyMap.get(hr);
        // ΔT approssimato: più negativo in quota di notte/alba (inversione),
        // meno negativo (o positivo) al suolo nelle ore calde.
        const dayPhase = Math.cos(((hr - 14) / 6) * (Math.PI / 2)); // 1 alle 14h, 0 ai bordi
        const nightPhase = 1 - Math.max(0, dayPhase);
        const altFactor = (alt - altitude) / 100; // numero di "centinaia di m" sopra il decollo
        // base: atmosfera standard -0.65
        // al suolo (alt=decollo): più instabile di giorno → -0.4..-0.8
        // in quota: più stabile → -0.5..-0.9
        let dt = -0.65;
        dt += (1 - Math.min(1, altFactor / 12)) * (dayPhase * 0.3 - nightPhase * 0.25);
        // aggiungi piccola variazione per altitudine
        if (altFactor > 0) dt += Math.min(0.1, altFactor * 0.01);
        // se temperatura al suolo è nota, modula leggermente
        if (h && h.temperature != null) {
          // più caldo di giorno = più instabile al suolo
          const tempFactor = (h.temperature - 15) / 20; // -0.5..+0.5
          dt += tempFactor * 0.15 * Math.max(0, dayPhase) * (1 - Math.min(1, altFactor / 15));
        }
        grid[alt][hr] = Math.max(-1.2, Math.min(1.2, dt));
      });
    });
    return grid;
  }, [activeAltitudes, hourlyMap, altitude]);

  // Disegna la heatmap di stabilità + contorni su Canvas, allineata con la tabella.
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const tableRef = useRef<HTMLTableElement | null>(null);
  const [canvasSize, setCanvasSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });

  // Ricalcola dimensioni canvas dalla tabella
  useLayoutEffect(() => {
    if (!tableRef.current) return;
    const el = tableRef.current;
    const rect = el.getBoundingClientRect();
    setCanvasSize({ w: rect.width, h: rect.height });
  }, [activeAltitudes.length, DISPLAY_HOURS.length]);

  // Disegna heatmap e contour
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || canvasSize.w === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvasSize.w * dpr;
    canvas.height = canvasSize.h * dpr;
    canvas.style.width = `${canvasSize.w}px`;
    canvas.style.height = `${canvasSize.h}px`;
    ctx.scale(dpr, dpr);

    // Disegna heatmap ΔT
    const colCount = DISPLAY_HOURS.length;
    const rowCount = activeAltitudes.length;
    const cellW = (canvasSize.w - LABEL_COL_WIDTH) / colCount;
    const cellH = ROW_HEIGHT;
    for (let r = 0; r < rowCount; r++) {
      const alt = activeAltitudes[r];
      for (let c = 0; c < colCount; c++) {
        const hr = DISPLAY_HOURS[c];
        const dt = deltaTGrid[alt]?.[hr];
        if (dt == null) continue;
        ctx.fillStyle = stabilityColor(dt);
        ctx.fillRect(LABEL_COL_WIDTH + c * cellW, r * cellH, cellW + 0.5, cellH + 0.5);
      }
    }

    // Disegna contorni (isolinee) - stile Alpium: linee sottili bianche sui bordi di "stabilità"
    // Strategia: per ogni riga, disegna una linea verticale dove ΔT attraversa determinate soglie
    ctx.lineWidth = 0.6;
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    const thresholds = [-0.9, -0.65, -0.3, 0, 0.3, 0.6, 0.9];
    thresholds.forEach((thr) => {
      for (let r = 0; r < rowCount; r++) {
        const alt = activeAltitudes[r];
        let prevSign = 0;
        for (let c = 0; c < colCount; c++) {
          const hr = DISPLAY_HOURS[c];
          const dt = deltaTGrid[alt]?.[hr];
          if (dt == null) continue;
          const sign = dt > thr ? 1 : -1;
          if (prevSign !== 0 && sign !== prevSign) {
            const x = LABEL_COL_WIDTH + c * cellW;
            const y = r * cellH + cellH / 2;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x, y);
            ctx.stroke();
          }
          prevSign = sign;
        }
      }
      // attraversamento verticale (tra righe)
      for (let c = 0; c < colCount; c++) {
        const hr = DISPLAY_HOURS[c];
        let prevSign = 0;
        for (let r = 0; r < rowCount; r++) {
          const alt = activeAltitudes[r];
          const dt = deltaTGrid[alt]?.[hr];
          if (dt == null) continue;
          const sign = dt > thr ? 1 : -1;
          if (prevSign !== 0 && sign !== prevSign) {
            const x = LABEL_COL_WIDTH + c * cellW + cellW / 2;
            const y = r * cellH;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x, y + 1);
            ctx.stroke();
          }
          prevSign = sign;
        }
      }
    });

    // Disegna una linea più marcata per la soglia "atmosfera standard" (-0.65)
    ctx.lineWidth = 0.9;
    ctx.strokeStyle = "rgba(255,255,255,0.55)";
    for (let r = 0; r < rowCount; r++) {
      const alt = activeAltitudes[r];
      let prevSign = 0;
      for (let c = 0; c < colCount; c++) {
        const hr = DISPLAY_HOURS[c];
        const dt = deltaTGrid[alt]?.[hr];
        if (dt == null) continue;
        const sign = dt > -0.65 ? 1 : -1;
        if (prevSign !== 0 && sign !== prevSign) {
          const x = LABEL_COL_WIDTH + c * cellW;
          const y = r * cellH + cellH / 2;
          ctx.beginPath();
          ctx.moveTo(x, y - 2);
          ctx.lineTo(x, y + 2);
          ctx.stroke();
        }
        prevSign = sign;
      }
    }
  }, [deltaTGrid, canvasSize, activeAltitudes]);

  const hourThermalData = useMemo(() => {
    const data: Record<number, { top: number; base: number; rateo: number; cloudBase: number; cloudCover: number } | null> = {};

    let tempMax = 20;
    let tempMin = 10;
    DISPLAY_HOURS.forEach((hr) => {
      const h = hourlyMap.get(hr);
      if (h && h.temperature != null) {
        tempMax = Math.max(tempMax, h.temperature);
        tempMin = Math.min(tempMin, h.temperature);
      }
    });
    const dailyAmplitude = Math.max(5, tempMax - tempMin);

    DISPLAY_HOURS.forEach((hr) => {
      const h = hourlyMap.get(hr);
      if (h && h.temperature != null && h.dewPoint != null) {
        const spread = Math.max(1, h.temperature - h.dewPoint);
        const lcl = Math.round(altitude + spread * 125);

        let diurnalFactor = 0;
        if (hr >= 8 && hr <= 18) {
          const hoursFromPeak = Math.abs(hr - 13);
          if (hoursFromPeak <= 5) {
            diurnalFactor = Math.max(0, Math.cos((hoursFromPeak / 5) * (Math.PI / 2)));
          }
        }

        const maxThermalDepth = 600 + dailyAmplitude * 60;
        const thermalDepth = maxThermalDepth * diurnalFactor;

        const base = Math.max(altitude + 100, lcl);
        const top = Math.min(3500, base + thermalDepth);
        const rateo = 0.1 + 3.4 * diurnalFactor;

        data[hr] = {
          top,
          base,
          rateo,
          cloudBase: Math.min(lcl, 3500),
          cloudCover: h.cloudCover ?? 30,
        };
      } else {
        data[hr] = null;
      }
    });

    return data;
  }, [hourlyMap, altitude]);

  const cloudBaseRow = useMemo(() => {
    const map: Record<number, number> = {};
    DISPLAY_HOURS.forEach((hr) => {
      const thermal = hourThermalData[hr];
      if (!thermal) return;
      const dayPhase = (hr - 13) / 5;
      if (dayPhase < -1 || dayPhase > 1) return;
      const diurnal = Math.cos((dayPhase * Math.PI) / 2);
      const cloudCeil = Math.max(altitude + 250, thermal.cloudBase);
      const thermalTop = altitude + (cloudCeil - altitude) * diurnal;
      let bestIdx = 0;
      let bestDiff = Infinity;
      activeAltitudes.forEach((a, idx) => {
        const diff = Math.abs(a - thermalTop);
        if (diff < bestDiff) {
          bestDiff = diff;
          bestIdx = idx;
        }
      });
      map[hr] = bestIdx;
    });
    return map;
  }, [hourThermalData, activeAltitudes, altitude]);

  const windDataByHourAlt = useMemo(() => {
    const result: Record<number, Record<number, { speed: number; dir: number }>> = {};
    DISPLAY_HOURS.forEach((hr) => {
      result[hr] = {};
      activeAltitudes.forEach((alt) => {
        if (alt > 4000) return;
        const interp = interpolateAtAltitude(hr, alt);
        if (interp) {
          result[hr][alt] = { speed: Math.round(interp.speed), dir: Math.round(interp.dir) };
        }
      });
    });
    return result;
  }, [activeAltitudes, interpolateAtAltitude]);

  const dataSourceBadge = hasRealAltitudeData ? (
    <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[10px] font-bold flex items-center gap-1">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
      Dati REALI quote 1000-3000m
    </span>
  ) : hasRealPressureData ? (
    <span className="px-2 py-0.5 rounded bg-sky-100 text-sky-700 text-[10px] font-bold flex items-center gap-1">
      <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />
      Dati hPa Open-Meteo
    </span>
  ) : (
    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px] font-bold flex items-center gap-1">
      <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
      Dati stimati
    </span>
  );

  const headerDate = dateLabel || (() => {
    const d = new Date();
    d.setDate(d.getDate() + selectedDay);
    const giorni = ["DOMENICA", "LUNEDÌ", "MARTEDÌ", "MERCOLEDÌ", "GIOVEDÌ", "VENERDÌ", "SABATO"];
    const mesi = ["GENNAIO", "FEBBRAIO", "MARZO", "APRILE", "MAGGIO", "GIUGLIO", "AGOSTO", "SETTEMBRE", "OTTOBRE", "NOVEMBRE", "DICEMBRE"];
    return `${giorni[d.getDay()]} ${d.getDate()} ${mesi[d.getMonth()]}`;
  })();

  if (profileLoading) {
    return (
      <div className="w-full max-w-2xl mx-auto bg-slate-900/60 p-2 sm:p-4 rounded-3xl">
        <div className="w-full bg-[#1e2129] text-slate-100 border border-slate-700/80 rounded-[26px] shadow-2xl overflow-hidden font-sans select-none">
          <div className="p-4 sm:p-5 pb-3 flex items-center justify-center gap-3">
            <div className="w-6 h-6 border-4 border-emerald-500/30 border-t-emerald-400 rounded-full animate-spin" />
            <span className="text-sm font-bold text-slate-300">Caricamento windgram...</span>
          </div>
        </div>
      </div>
    );
  }

  if (profileError) {
    return (
      <div className="w-full max-w-2xl mx-auto bg-slate-900/60 p-2 sm:p-4 rounded-3xl">
        <div className="w-full bg-[#1e2129] text-slate-100 border border-red-500/40 rounded-[26px] shadow-2xl overflow-hidden font-sans select-none">
          <div className="p-4 sm:p-5 pb-3 text-center text-red-400">
            <p className="font-bold">Errore caricamento windgram</p>
            <p className="text-sm">{profileError}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto bg-slate-900/60 p-2 sm:p-4 rounded-3xl">
      <div className="w-full bg-[#1e2129] text-slate-100 border border-slate-700/80 rounded-[26px] shadow-2xl overflow-hidden font-sans select-none">
        <div className="p-4 sm:p-5 pb-3">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-sky-500/20 text-sky-300">
                <Wind className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-bold tracking-tight text-slate-100">
                  Windgram &mdash; <span className="text-sky-300">{siteName}</span>
                </h3>
                <p className="text-sm text-sky-300/80 font-semibold mt-0.5">{headerDate}</p>
              </div>
            </div>
            <div className="flex items-center justify-between gap-2 mb-2">
              {dataSourceBadge}
            </div>
          </div>

          <div className="overflow-x-auto border-t border-b border-slate-700 bg-[#121418] relative">
            <table ref={tableRef} className="w-full text-center border-collapse text-xs relative" style={{ position: "relative" }}>
              <thead>
                <tr className="border-b border-slate-700 text-slate-200 bg-[#1e2129]/95 font-bold">
                  <th className="py-2.5 px-1 text-center w-12 sticky left-0 z-30 bg-[#1e2129] border-r border-slate-700 text-slate-100 text-[11px]">
                    Quota
                  </th>
                  {DISPLAY_HOURS.map((hr) => (
                    <th
                      key={`th-${hr}`}
                      onClick={() => onHourSelect?.(hr)}
                      className={`py-2.5 px-2 font-bold cursor-pointer transition-colors border-r border-slate-700/60 ${
                        hr === selectedHour
                          ? "bg-sky-500/25 text-sky-200 ring-1 ring-sky-400/60"
                          : "hover:bg-slate-700/40 text-slate-100"
                      }`}
                    >
                      <div className="flex flex-col items-center gap-0.5">
                        <span>{hr}h</span>
                        <span className="text-[10px] font-normal text-slate-400">
                          {getHourTemperature(hourlyMap, hr)}
                        </span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody style={{ position: "relative" }}>
                {activeAltitudes.map((alt, rowIdx) => {
                  const isMajorLevel = alt % 500 === 0;
                  const isDecolloLevel = alt === baseDecolloFloor;
                  return (
                    <tr
                      key={`tr-${alt}`}
                      className={`border-b border-slate-700/40 transition-colors ${
                        isMajorLevel ? "font-bold" : ""
                      } ${isDecolloLevel ? "bg-emerald-500/15" : ""}`}
                      style={{ height: ROW_HEIGHT }}
                    >
                      <td
                        className={`py-1.5 px-1 text-center font-bold sticky left-0 z-10 border-r border-slate-700 text-[11px] tabular-nums whitespace-nowrap ${
                          isMajorLevel
                            ? "bg-[#1e2129] text-slate-100"
                            : isDecolloLevel
                            ? "bg-emerald-500/25 text-emerald-200"
                            : "bg-[#1e2129]/95 text-slate-300"
                        }`}
                      >
                        {alt}
                      </td>
                      {DISPLAY_HOURS.map((hr) => {
                        const w = windDataByHourAlt[hr]?.[alt];
                        const wColor = w
                          ? getWindArrowColor(w.speed)
                          : { fill: "#94a3b8", stroke: "#64748b", text: "#cbd5e1" };
                        const isSelectedCol = hr === selectedHour;
                        const showCloud = cloudBaseRow[hr] === rowIdx;
                        return (
                          <td
                            key={`cell-${alt}-${hr}`}
                            onClick={() => onHourSelect?.(hr)}
                            className={`py-1.5 px-1 border-r border-slate-700/40 cursor-pointer transition-colors relative ${
                              isSelectedCol ? "ring-1 ring-sky-400/80" : "hover:brightness-110"
                            }`}
                          >
                            <div className="flex items-center justify-center gap-0.5 h-full relative">
                              {w && <WindArrowIcon deg={w.dir} color={wColor} />}
                              <span
                                className="font-bold text-[12px] tabular-nums tracking-tighter relative z-10"
                                style={{ color: wColor.text, textShadow: "0 0 2px rgba(0,0,0,0.5)" }}
                                title={w ? `Open-Meteo: ${w.speed} km/h from ${w.dir}°` : "N/D"}
                              >
                                {w ? w.speed : "—"}
                              </span>
                              {showCloud && (
                                <div className="absolute bottom-[calc(100%+2px)] left-1/2 -translate-x-1/2 z-20 pointer-events-none">
                                  <CloudIcon cloudCover={hourThermalData[hr]?.cloudCover ?? 30} />
                                </div>
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {/* Canvas sovrapposto: heatmap stabilità + isolinee */}
            {canvasSize.w > 0 && (
              <canvas
                ref={canvasRef}
                className="pointer-events-none absolute top-[41px] left-0 z-0"
                style={{ width: canvasSize.w, height: canvasSize.h - 41 }}
              />
            )}
          </div>

          <div className="p-4 bg-[#181b21] border-t border-slate-700/60">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-2.5 rounded border border-white/30" style={{ background: "linear-gradient(to right, #2850b4, #82b4dc, #f5f5dc, #fde0a0, #fd8c3c)" }} />
                  <span className="text-slate-300 font-medium text-xs">Stabilità atmosferica (ΔT/100m)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <svg
                    width="14"
                    height="10"
                    viewBox="0 0 40 28"
                    className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]"
                    style={{ opacity: 0.6 }}
                  >
                    <path d="M8 20 Q8 12 14 12 Q18 8 24 10 Q30 8 34 14 Q38 18 32 20 L8 20 Z" fill="#64748b" fillOpacity="0.5" />
                    <ellipse cx="18" cy="14" rx="6" ry="4" fill="#94a3b8" fillOpacity="0.4" />
                    <ellipse cx="14" cy="12" rx="4" ry="3" fill="#cbd5e1" fillOpacity="0.3" />
                  </svg>
                  <span className="text-slate-300 font-medium text-xs">Base cumuli</span>
                </div>
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <span className="text-[10px] font-mono">Freccia = dir. vento · Numero = km/h</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-slate-700/50">
              <span className="text-xs text-slate-400 font-medium">Scala venti (km/h):</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: "#0284c7" }} />
                  <span className="text-[10px] text-slate-400">≤4</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: "#0d9488" }} />
                  <span className="text-[10px] text-slate-400">5-8</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: "#16a34a" }} />
                  <span className="text-[10px] text-slate-400">9-13</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: "#65a30d" }} />
                  <span className="text-[10px] text-slate-400">14-18</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: "#eab308" }} />
                  <span className="text-[10px] text-slate-400">19-24</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: "#dc2626" }} />
                  <span className="text-[10px] text-slate-400">25-30</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: "#991b1b" }} />
                  <span className="text-[10px] text-slate-400">43-58</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: "#86198f" }} />
                  <span className="text-[10px] text-slate-400">≥59</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
