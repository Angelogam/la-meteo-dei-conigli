import React, { useEffect, useMemo } from "react";
import type { HourData } from "@/types/meteo";
import { Wind } from "lucide-react";
import { useMultiHourWindProfile } from "@/hooks/useMultiHourWindProfile";
import { useStabilitaMasseAria } from "@/hooks/useStabilitaMasseAria";

const DISPLAY_HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19] as const;

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
  // Open-Meteo returns wind direction as PROVENANCE (meteorological convention):
  //   deg=0: wind from North → arrow should point SOUTH (down) to show motion direction
  //   deg=90: wind from East  → arrow should point WEST (left)
  //   deg=180: wind from South → arrow should point NORTH (up)
  //   deg=270: wind from West  → arrow should point EAST (right)
  // We add 180° to convert provenance → motion direction.
  const targetDeg = (deg + 180) % 360;
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" className="shrink-0" style={{ transform: `rotate(${targetDeg}deg)` }} aria-label={`Vento da ${deg}°`}>
      <path d="M12 2L17 10H13.5V22H10.5V10H7L12 2Z" fill={color.fill} stroke={color.stroke} strokeWidth="1.2" />
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
  fallbackData?: HourData[];
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
  fallbackData,
}: WindgramMatrixProps) {
  const { data: windProfileMap, loading: profileLoading, error: profileError, interpolateAtAltitude } = useMultiHourWindProfile({
      lat,
      lon,
      siteAlt: altitude,
      selectedDay,
      fallbackData,
    });
  
    // Hook per la stabilità delle masse d'aria con dati reali Open-Meteo
    const { hourly: stabilitaData, loading: stabilitaLoading, error: stabilitaError } = useStabilitaMasseAria(
      lat, lon, selectedDay
    );


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
    let count = 0;
    for (const hourData of windProfileMap.values()) {
      const hasMid = hourData.levels.some((l) => l.alt >= 1000 && l.alt <= 3000);
      if (hasMid) count++;
    }
    return count > 0;
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

  const hourThermalData = useMemo(() => {
      const data: Record<number, { top: number; base: number; rateo: number; cloudBase: number; cloudCover: number; deltaT: number } | null> = {};
  
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
  
          // Calcolo deltaT reale dai dati di stabilità Open-Meteo
          let deltaT = 0.72;
          if (stabilitaData?.time) {
            const times = stabilitaData.time;
            const idx = times.findIndex((t: string) => parseInt(t.split("T")[1].split(":")[0], 10) === hr);
            if (idx !== -1) {
              const t2mRaw = stabilitaData.temperature_2m?.[idx];
              const t2m = (t2mRaw != null && !isNaN(Number(t2mRaw))) ? Number(t2mRaw) : h.temperature;
              // Open-Meteo non ha temperature_80m/120m, usa temperature_180m
              const t180Raw = stabilitaData.temperature_180m?.[idx];
              const t180 = (t180Raw != null && !isNaN(Number(t180Raw))) ? Number(t180Raw) : null;
              const t80 = t180 != null ? t2m + (t180 - t2m) * (80 / 180) : null;
              const t120 = t180 != null ? t2m + (t180 - t2m) * (120 / 180) : null;
              if (t80 != null) {
                              deltaT = Math.round(((t2m - t80) / 78) * 100 * 100) / 100;
                            } else if (t120 != null) {
                              deltaT = Math.round(((t2m - t120) / 118) * 100 * 100) / 100;
                            } else {
                deltaT = spread >= 10 ? 0.98 : spread >= 6 ? 0.82 : 0.65;
              }
            }
          }
          deltaT = Math.max(-0.2, Math.min(1.3, deltaT));
  
          data[hr] = {
            top,
            base,
            rateo,
            cloudBase: Math.min(lcl, 3500),
            cloudCover: h.cloudCover ?? 30,
            deltaT,
          };
        } else {
          data[hr] = null;
        }
      });
  
      return data;
    }, [hourlyMap, altitude, stabilitaData]);

  type CellBg =
      | { kind: "none" }
      | { kind: "thermal"; color: string }
      | { kind: "stable"; color: string };
  
    // Colori stabilità (stesso algoritmo di ProfessionalWindgram)
    const STABILITY_COLORS = [
      { val: -0.20, color: "#8b5cf6" },
      { val: 0.00, color: "#3b82f6" },
      { val: 0.16, color: "#06b6d4" },
      { val: 0.32, color: "#10b981" },
      { val: 0.48, color: "#84cc16" },
      { val: 0.65, color: "#eab308" },
      { val: 0.82, color: "#f97316" },
      { val: 0.98, color: "#ef4444" },
      { val: 1.20, color: "#dc2626" },
    ];
  
    function getStabilityColor(deltaT: number): string {
      if (deltaT <= -0.1) return STABILITY_COLORS[0].color;
      if (deltaT <= 0.08) return STABILITY_COLORS[1].color;
      if (deltaT <= 0.24) return STABILITY_COLORS[2].color;
      if (deltaT <= 0.40) return STABILITY_COLORS[3].color;
      if (deltaT <= 0.56) return STABILITY_COLORS[4].color;
      if (deltaT <= 0.73) return STABILITY_COLORS[5].color;
      if (deltaT <= 0.90) return STABILITY_COLORS[6].color;
      if (deltaT <= 1.10) return STABILITY_COLORS[7].color;
      return STABILITY_COLORS[8].color;
    }
  
    const getThermalBgColor = (alt: number, hr: number): CellBg => {
      const thermal = hourThermalData[hr];
      if (!thermal) return { kind: "none" };
  
      // Usa il deltaT reale calcolato dal hook di stabilità
      const deltaT = thermal.deltaT ?? 0.72;
      const stabilityColor = getStabilityColor(deltaT);
  
      // Curva sinusoidale dell'ora del giorno (modello Alpium/Rasoft):
      //   hr=8h: 0 (termica appena nata)
      //   hr=13h: 1 (picco termico)
      //   hr=18h: 0 (termica morente)
      const dayPhase = (hr - 13) / 5; // -1 alle 8h, 0 alle 13h, +1 alle 18h
      if (dayPhase < -1 || dayPhase > 1) return { kind: "none" };
      const diurnal = Math.cos((dayPhase * Math.PI) / 2); // 0 ai bordi, 1 al picco
      if (diurnal < 0.05) return { kind: "none" };
  
      // Top della termica (in cima finisce il giallo, inizia il blu stabile)
      const cloudCeil = Math.max(altitude + 250, thermal.cloudBase);
      const thermalTop = altitude + (cloudCeil - altitude) * diurnal;
      if (alt < altitude) return { kind: "none" };
  
      // --- ZONA BLU "aria stabile (sopra cumuli)" ---
      // Si estende dal top della termica verso l'alto.
      // Spessore: ~500m ai bordi, ~1000m al picco (come nel modello Alpium)
      const stableBandThickness = 500 + diurnal * 500;
      const stableTop = Math.min(thermalTop + stableBandThickness, 4000);
  
      if (alt > thermalTop && alt <= stableTop) {
        const stableRel = (alt - thermalTop) / stableBandThickness;
        // Colori steel-blue come il modello Alpium/Rucas:
        //   Basso (vicino cumuli) → più scuro
        //   Alto → più chiaro/sfumato
        if (stableRel < 0.25) return { kind: "stable", color: "#6a9cba" }; // steel blue scuro
        if (stableRel < 0.5) return { kind: "stable", color: "#82b1cc" };  // steel blue medio
        if (stableRel < 0.75) return { kind: "stable", color: "#9dc4d9" }; // steel blue chiaro
        return { kind: "stable", color: "#b5d5e4" };                       // steel blue leggero
      }
      if (alt > stableTop) return { kind: "none" };
  
      // --- ZONA GIALLA/ARANCIO "termica attiva (fino a base cumuli)" ---
      if (alt >= altitude && alt <= thermalTop) {
        const span = Math.max(200, thermalTop - altitude);
        const relHeight = (alt - altitude) / span;
        // Forza colore: più intenso vicino al suolo, sfuma verso l'alto
        const strength = (1 - relHeight * 0.7) * diurnal;
        if (strength > 0.78) return { kind: "thermal", color: "#f97316" }; // arancio intenso
        if (strength > 0.62) return { kind: "thermal", color: "#fb923c" }; // arancio
        if (strength > 0.46) return { kind: "thermal", color: "#fbbf24" }; // ambra
        if (strength > 0.30) return { kind: "thermal", color: "#fde047" }; // giallo vivo
        if (strength > 0.15) return { kind: "thermal", color: "#fef08a" }; // giallo chiaro
        return { kind: "none" };
      }
      return { kind: "none" };
    };

  const windDataByHourAlt = useMemo(() => {
    const result: Record<number, Record<number, { speed: number; dir: number }>> = {};
    let filled = 0;
    DISPLAY_HOURS.forEach((hr) => {
      result[hr] = {};
      activeAltitudes.forEach((alt) => {
        if (alt > 4000) return;
        const interp = interpolateAtAltitude(hr, alt);
        if (interp) {
          result[hr][alt] = { speed: Math.round(interp.speed), dir: Math.round(interp.dir) };
          filled++;
        }
      });
    });
    return result;
  }, [activeAltitudes, interpolateAtAltitude, windProfileMap, profileLoading]);

  const cloudBaseRow = useMemo(() => {
    const map: Record<number, number> = {};
    DISPLAY_HOURS.forEach((hr) => {
      const thermal = hourThermalData[hr];
      if (!thermal) return;
      // Top termico sinusoidale: la nuvola appare dove termina il giallo.
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
    const mesi = ["GENNAIO", "FEBBRAIO", "MARZO", "APRILE", "MAGGIO", "GIUGNO", "LUGLIO", "AGOSTO", "SETTEMBRE", "OTTOBRE", "NOVEMBRE", "DICEMBRE"];
    return `${giorni[d.getDay()]} ${d.getDate()} ${mesi[d.getMonth()]}`;
  })();

  if (profileLoading) {
    return (
      <div className="w-full max-w-2xl mx-auto bg-slate-900/60 p-2 sm:p-4 rounded-3xl">
        <div className="w-full bg-white text-slate-900 border border-slate-200/80 rounded-[26px] shadow-2xl overflow-hidden font-sans select-none">
          <div className="p-4 sm:p-5 pb-3 flex items-center justify-center gap-3">
            <div className="w-6 h-6 border-4 border-emerald-500/30 border-t-emerald-400 rounded-full animate-spin" />
            <span className="text-sm font-bold text-slate-700">Caricamento windgram...</span>
          </div>
        </div>
      </div>
    );
  }

  if (profileError) {
    return (
      <div className="w-full max-w-2xl mx-auto bg-slate-900/60 p-2 sm:p-4 rounded-3xl">
        <div className="w-full bg-white text-slate-900 border border-red-500/40 rounded-[26px] shadow-2xl overflow-hidden font-sans select-none">
          <div className="p-4 sm:p-5 pb-3 text-center text-red-500">
            <p className="font-bold">Errore caricamento windgram</p>
            <p className="text-sm">{profileError}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto bg-slate-900/60 p-1.5 sm:p-2 rounded-2xl">
      <div className="w-full bg-white text-slate-900 border border-slate-200/80 rounded-2xl shadow-2xl overflow-hidden font-sans select-none">
        <div className="p-2 sm:p-3 pb-2">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-sky-100 text-sky-600">
                  <Wind className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold tracking-tight text-slate-900">
                    Windgram <span className="text-sky-600">{siteName}</span>
                  </h3>
                  <p className="text-[10px] text-sky-700 font-semibold">{headerDate}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-[9px] flex-wrap">
                <span className={`px-1.5 py-0.5 rounded font-bold ${windProfileMap.size > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                  {windProfileMap.size > 0 ? `✓ ${windProfileMap.size}h vento` : '⏳ carico vento…'}
                </span>
                <span className={`px-1.5 py-0.5 rounded font-bold ${profileError ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-500'}`}>
                  {profileError ? `✗ ${profileError.slice(0, 20)}` : '✓ OK'}
                </span>
                {dataSourceBadge}
              </div>
            </div>

          <div className="overflow-x-auto border-t border-b border-slate-200 bg-white">
            {/* Debug row */}
            <div className="px-2 py-1 text-[9px] text-slate-400 bg-slate-50 flex items-center gap-3">
              <span>Map: {windProfileMap.size}h</span>
              <span>Rows: {activeAltitudes.length}</span>
              <span>Hours: {DISPLAY_HOURS.length}</span>
              <span className={windProfileMap.size > 0 ? "text-emerald-500" : "text-amber-500"}>
                {windProfileMap.size > 0 ? "✓ vento pronto" : "⏳ attesa dati..."}
              </span>
            </div>
            <table className="w-full text-center border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-700 bg-slate-200 font-bold">
                  <th className="py-1 px-1 text-center w-10 sticky left-0 z-50 bg-slate-300 border-r-2 border-slate-500 text-slate-900 text-[10px] shadow-[2px_0_5px_rgba(0,0,0,0.2)]">
                    Quota
                  </th>
                  {DISPLAY_HOURS.map((hr) => (
                    <th
                      key={`th-${hr}`}
                      onClick={() => onHourSelect?.(hr)}
                      className={`py-1 px-1 font-bold cursor-pointer transition-colors border-r border-slate-200/60 ${
                        hr === selectedHour
                          ? "bg-sky-100 text-sky-900 ring-1 ring-sky-400"
                          : "hover:bg-slate-200/60 text-slate-800"
                      }`}
                    >
                      <div className="flex flex-col items-center gap-0">
                        <span className="text-[10px]">{hr}h</span>
                        <span className="text-[8px] font-normal text-slate-500 leading-none">
                          {getHourTemperature(hourlyMap, hr)}
                        </span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {activeAltitudes.map((alt, rowIdx) => {
                  const isMajorLevel = alt % 500 === 0;
                  const isDecolloLevel = alt === baseDecolloFloor;
                  return (
                    <tr
                      key={`tr-${alt}`}
                      className={`border-b border-slate-100 transition-colors ${
                        isMajorLevel ? "font-bold" : ""
                      } ${isDecolloLevel ? "bg-emerald-50" : ""}`}
                    >
                      <td
                        className={`py-0.5 px-1 text-center font-bold sticky left-0 z-40 border-r-2 border-slate-500 text-[9px] tabular-nums whitespace-nowrap shadow-[2px_0_3px_rgba(0,0,0,0.12)] ${
                          isMajorLevel
                            ? "bg-slate-200 text-slate-900"
                            : isDecolloLevel
                            ? "bg-emerald-100 text-emerald-900"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {alt}
                      </td>
                      {DISPLAY_HOURS.map((hr) => {
                        const w = windDataByHourAlt[hr]?.[alt];
                        const wColor = w
                          ? getWindArrowColor(w.speed)
                          : { fill: "#e74c3c", stroke: "#c0392b", text: "#e74c3c" };
                        const isSelectedCol = hr === selectedHour;
                        const bg = getThermalBgColor(alt, hr);
                        const showCloud = cloudBaseRow[hr] === rowIdx;
                        return (
                          <td
                            key={`cell-${alt}-${hr}`}
                            onClick={() => onHourSelect?.(hr)}
                            style={{
                              backgroundColor: bg.kind === "none" ? "transparent" : bg.color,
                            }}
                            className={`py-0.5 px-0.5 border-r border-slate-200/60 cursor-pointer transition-colors relative ${
                              isSelectedCol ? "ring-1 ring-sky-400/90" : "hover:brightness-95"
                            }`}
                          >
                            <div className="flex items-center justify-center gap-0.5 h-full relative min-h-[18px]">
                              {w ? (
                                <>
                                  <WindArrowIcon deg={w.dir} color={wColor} />
                                  <span
                                    className="font-bold text-[10px] tabular-nums tracking-tighter relative z-10 leading-none"
                                    style={{ color: wColor.text }}
                                    title={w ? `Open-Meteo: ${w.speed} km/h da ${w.dir}°` : "N/D"}
                                  >
                                    {w.speed}
                                  </span>
                                </>
                              ) : (
                                <span
                                  className="font-bold text-[9px] tabular-nums tracking-tighter relative z-10 leading-none text-slate-300"
                                  title="Nessun dato vento"
                                >
                                  —
                                </span>
                              )}
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
          </div>

          <div className="p-1.5 bg-slate-50 border-t border-slate-100">
            <div className="flex flex-wrap items-center justify-between gap-1.5 mb-1">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1">
                  <div className="w-2.5 h-1.5 rounded bg-gradient-to-r from-yellow-300 via-amber-400 to-orange-500 border border-orange-400/60" />
                  <span className="text-slate-700 font-medium text-[9px]">Termica</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2.5 h-1.5 rounded bg-gradient-to-b from-[#b5d5e4] via-[#82b1cc] to-[#6a9cba] border border-[#6a9cba]/60" />
                  <span className="text-slate-700 font-medium text-[9px]">Stabile</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[8px] font-mono text-slate-500">Freccia=dir · Numero=km/h</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1 pt-1 border-t border-slate-200">
              <span className="text-[8px] text-slate-600 font-medium">km/h:</span>
              <div className="flex items-center gap-1 flex-wrap">
                <div className="flex items-center gap-0.5">
                  <div className="w-1.5 h-1.5 rounded-sm" style={{ backgroundColor: "#0284c7" }} />
                  <span className="text-[7px] text-slate-600">≤4</span>
                </div>
                <div className="flex items-center gap-0.5">
                  <div className="w-1.5 h-1.5 rounded-sm" style={{ backgroundColor: "#0d9488" }} />
                  <span className="text-[7px] text-slate-600">5-8</span>
                </div>
                <div className="flex items-center gap-0.5">
                  <div className="w-1.5 h-1.5 rounded-sm" style={{ backgroundColor: "#16a34a" }} />
                  <span className="text-[7px] text-slate-600">9-13</span>
                </div>
                <div className="flex items-center gap-0.5">
                  <div className="w-1.5 h-1.5 rounded-sm" style={{ backgroundColor: "#65a30d" }} />
                  <span className="text-[7px] text-slate-600">14-18</span>
                </div>
                <div className="flex items-center gap-0.5">
                  <div className="w-1.5 h-1.5 rounded-sm" style={{ backgroundColor: "#eab308" }} />
                  <span className="text-[7px] text-slate-600">19-24</span>
                </div>
                <div className="flex items-center gap-0.5">
                  <div className="w-1.5 h-1.5 rounded-sm" style={{ backgroundColor: "#dc2626" }} />
                  <span className="text-[7px] text-slate-600">25-30</span>
                </div>
                <div className="flex items-center gap-0.5">
                  <div className="w-1.5 h-1.5 rounded-sm" style={{ backgroundColor: "#991b1b" }} />
                  <span className="text-[7px] text-slate-600">43-58</span>
                </div>
                <div className="flex items-center gap-0.5">
                  <div className="w-1.5 h-1.5 rounded-sm" style={{ backgroundColor: "#86198f" }} />
                  <span className="text-[7px] text-slate-600">≥59</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
