import React, { useMemo, useState } from "react";
import type { HourData } from "@/types/meteo";
import { Mountain, Wind } from "lucide-react";
import { useMultiHourWindProfile } from "@/hooks/useMultiHourWindProfile";

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

  const getThermalBgColor = (alt: number, hr: number): string => {
    const thermal = hourThermalData[hr];
    if (!thermal) return "transparent";
    if (alt >= altitude && alt < thermal.cloudBase) {
      const totalSpan = Math.max(200, thermal.cloudBase - altitude);
      const relHeight = (alt - altitude) / totalSpan;
      const hrBell = Math.max(0, 1 - Math.pow((hr - 13) / 4.5, 2));
      const strength = (1 - relHeight * 0.75) * (0.3 + hrBell * 0.7);
      if (strength > 0.72) return "#f97316";
      if (strength > 0.55) return "#fb923c";
      if (strength > 0.40) return "#fbbf24";
      if (strength > 0.22) return "#fde047";
      return "#fef08a";
    }
    return "transparent";
  };

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

  const cloudBaseRow = useMemo(() => {
    const map: Record<number, number> = {};
    DISPLAY_HOURS.forEach((hr) => {
      const thermal = hourThermalData[hr];
      if (!thermal) return;
      let bestIdx = 0;
      let bestDiff = Infinity;
      activeAltitudes.forEach((a, idx) => {
        const diff = Math.abs(a - thermal.cloudBase);
        if (diff < bestDiff) {
          bestDiff = diff;
          bestIdx = idx;
        }
      });
      map[hr] = bestIdx;
    });
    return map;
  }, [hourThermalData, activeAltitudes]);

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
    <div className="w-full max-w-2xl mx-auto bg-slate-900/60 p-2 sm:p-4 rounded-3xl">
      <div className="w-full bg-white text-slate-900 border border-slate-200/80 rounded-[26px] shadow-2xl overflow-hidden font-sans select-none">
        <div className="p-4 sm:p-5 pb-3">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-sky-100 text-sky-600">
                <Wind className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">
                  Windgram &mdash; <span className="text-sky-600">{siteName}</span>
                </h3>
                <p className="text-sm text-sky-700 font-semibold mt-0.5">{headerDate}</p>
              </div>
            </div>
            <div className="flex items-center justify-between gap-2 mb-2">
              {dataSourceBadge}
            </div>
          </div>

          <div className="overflow-x-auto border-t border-b border-slate-200 bg-white">
            <table className="w-full text-center border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-700 bg-slate-100/90 font-bold">
                  <th className="py-2.5 px-1 text-center w-12 sticky left-0 z-20 bg-slate-100 border-r border-slate-200 text-slate-800 text-[11px]">
                    Quota
                  </th>
                  {DISPLAY_HOURS.map((hr) => (
                    <th
                      key={`th-${hr}`}
                      onClick={() => onHourSelect?.(hr)}
                      className={`py-2.5 px-2 font-bold cursor-pointer transition-colors border-r border-slate-200/60 ${
                        hr === selectedHour
                          ? "bg-sky-100 text-sky-900 ring-1 ring-sky-400"
                          : "hover:bg-slate-200/60 text-slate-800"
                      }`}
                    >
                      <div className="flex flex-col items-center gap-0.5">
                        <span>{hr}h</span>
                        <span className="text-[10px] font-normal text-slate-500">
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
                        className={`py-1.5 px-1 text-center font-bold sticky left-0 z-10 border-r border-slate-200 text-[11px] tabular-nums whitespace-nowrap ${
                          isMajorLevel
                            ? "bg-slate-100 text-slate-900"
                            : isDecolloLevel
                            ? "bg-emerald-50 text-emerald-900"
                            : "bg-slate-50 text-slate-700"
                        }`}
                      >
                        {alt}
                      </td>
                      {DISPLAY_HOURS.map((hr) => {
                        const w = windDataByHourAlt[hr]?.[alt];
                        const wColor = w
                          ? getWindArrowColor(w.speed)
                          : { fill: "#94a3b8", stroke: "#64748b", text: "#94a3b8" };
                        const isSelectedCol = hr === selectedHour;
                        const bgColor = getThermalBgColor(alt, hr);
                        const showCloud = cloudBaseRow[hr] === rowIdx;
                        return (
                          <td
                            key={`cell-${alt}-${hr}`}
                            onClick={() => onHourSelect?.(hr)}
                            style={{ backgroundColor: bgColor }}
                            className={`py-1.5 px-1 border-r border-slate-200/60 cursor-pointer transition-colors relative ${
                              isSelectedCol ? "ring-1 ring-sky-400/90" : "hover:brightness-95"
                            }`}
                          >
                            <div className="flex items-center justify-center gap-0.5 h-full relative">
                              {w && <WindArrowIcon deg={w.dir} color={wColor} />}
                              <span
                                className="font-bold text-[12px] tabular-nums tracking-tighter relative z-10"
                                style={{ color: wColor.text }}
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
          </div>

          <div className="p-4 bg-slate-50 border-t border-slate-100">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-2.5 rounded bg-gradient-to-r from-yellow-300 via-amber-400 to-orange-500 border border-orange-400/60" />
                  <span className="text-slate-700 font-medium text-xs">Termica attiva (fino a base cumuli)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-2.5 rounded bg-[#fde68a] border border-amber-400" />
                  <span className="text-slate-700 font-medium text-xs">Quota decollo</span>
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
                  <span className="text-slate-700 font-medium text-xs">Base cumuli (sopra il giallo)</span>
                </div>
              </div>
              <div className="flex items-center gap-2 text-slate-500">
                <span className="text-[10px] font-mono">Freccia = dir. vento · Numero = km/h</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-slate-200">
              <span className="text-xs text-slate-600 font-medium">Scala venti (km/h):</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: "#0284c7" }} />
                  <span className="text-[10px] text-slate-600">≤4</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: "#0d9488" }} />
                  <span className="text-[10px] text-slate-600">5-8</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: "#16a34a" }} />
                  <span className="text-[10px] text-slate-600">9-13</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: "#65a30d" }} />
                  <span className="text-[10px] text-slate-600">14-18</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: "#eab308" }} />
                  <span className="text-[10px] text-slate-600">19-24</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: "#dc2626" }} />
                  <span className="text-[10px] text-slate-600">25-30</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: "#991b1b" }} />
                  <span className="text-[10px] text-slate-600">43-58</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: "#86198f" }} />
                  <span className="text-[10px] text-slate-600">≥59</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
