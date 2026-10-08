import React, { useMemo } from "react";
import type { HourData } from "@/types/meteo";
import { Wind } from "lucide-react";
import { useMultiHourWindProfile } from "@/hooks/useMultiHourWindProfile";
import { computeHourlyDerived } from "@/services/derivedMeteorology";

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
  rawData?: any; // JSON grezzo Open-Meteo — condiviso per evitare chiamate duplicate
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
  rawData,
}: WindgramMatrixProps) {
  const { data: windProfileMap, loading: profileLoading, error: profileError, interpolateAtAltitude } = useMultiHourWindProfile({
      lat,
      lon,
      siteAlt: altitude,
      selectedDay,
      fallbackData,
      rawData, // usa i dati già caricati da useWeatherData
    });

    // Stabilità: usa i dati grezzi condivisi per calcolare i derivati centralizzati
    const stabilitaData = rawData?.hourly ?? null;

    // Calcola i derivati meteorologici centralizzati per ogni ora (se rawData disponibile)
    const hourDerivedMap = useMemo(() => {
      if (!stabilitaData || !stabilitaData.time) return new Map<number, ReturnType<typeof computeHourlyDerived>>();
      const map = new Map<number, ReturnType<typeof computeHourlyDerived>>();
      stabilitaData.time.forEach((t: string, idx: number) => {
        const hr = parseInt(t.split("T")[1].split(":")[0], 10);
        if (isNaN(hr)) return;
        const hourlyRaw = {
          temperature: stabilitaData.temperature_2m?.[idx] != null ? Number(stabilitaData.temperature_2m[idx]) : null,
          dewPoint: stabilitaData.dew_point_2m?.[idx] != null ? Number(stabilitaData.dew_point_2m[idx]) : null,
          temp80m: stabilitaData.temperature_80m?.[idx] != null ? Number(stabilitaData.temperature_80m[idx]) : null,
          temp120m: stabilitaData.temperature_120m?.[idx] != null ? Number(stabilitaData.temperature_120m[idx]) : null,
          temperature180m: stabilitaData.temperature_180m?.[idx] != null ? Number(stabilitaData.temperature_180m[idx]) : null,
          windSpeed: stabilitaData.wind_speed_10m?.[idx] != null ? Number(stabilitaData.wind_speed_10m[idx]) : null,
          windDir: stabilitaData.wind_direction_10m?.[idx] != null ? Number(stabilitaData.wind_direction_10m[idx]) : null,
          windSpeed80m: stabilitaData.wind_speed_80m?.[idx] != null ? Number(stabilitaData.wind_speed_80m[idx]) : null,
          windDir80m: stabilitaData.wind_direction_80m?.[idx] != null ? Number(stabilitaData.wind_direction_80m[idx]) : null,
          windSpeed120m: stabilitaData.wind_speed_120m?.[idx] != null ? Number(stabilitaData.wind_speed_120m[idx]) : null,
          windDir120m: stabilitaData.wind_direction_120m?.[idx] != null ? Number(stabilitaData.wind_direction_120m[idx]) : null,
          windSpeed180m: stabilitaData.wind_speed_180m?.[idx] != null ? Number(stabilitaData.wind_speed_180m[idx]) : null,
          windDir180m: stabilitaData.wind_direction_180m?.[idx] != null ? Number(stabilitaData.wind_direction_180m[idx]) : null,
          cape: stabilitaData.cape?.[idx] != null ? Number(stabilitaData.cape[idx]) : null,
          cin: stabilitaData.convective_inhibition?.[idx] != null ? Number(stabilitaData.convective_inhibition[idx]) : null,
          liftedIndex: stabilitaData.lifted_index?.[idx] != null ? Number(stabilitaData.lifted_index[idx]) : null,
          freezingLevel: stabilitaData.freezing_level_height?.[idx] != null ? Number(stabilitaData.freezing_level_height[idx]) : null,
          cloudCover: stabilitaData.cloud_cover?.[idx] != null ? Number(stabilitaData.cloud_cover[idx]) : null,
          shortwaveRadiation: stabilitaData.shortwave_radiation?.[idx] != null ? Number(stabilitaData.shortwave_radiation[idx]) : null,
          boundaryLayerHeight: stabilitaData.boundary_layer_height?.[idx] != null ? Number(stabilitaData.boundary_layer_height[idx]) : null,
          pressure: stabilitaData.pressure_msl?.[idx] != null ? Number(stabilitaData.pressure_msl[idx]) : null,
          surfacePressure: stabilitaData.surface_pressure?.[idx] != null ? Number(stabilitaData.surface_pressure[idx]) : null,
          windSpeed925: stabilitaData.wind_speed_925hPa?.[idx] != null ? Number(stabilitaData.wind_speed_925hPa[idx]) : null,
          windDir925: stabilitaData.wind_direction_925hPa?.[idx] != null ? Number(stabilitaData.wind_direction_925hPa[idx]) : null,
          windSpeed850: stabilitaData.wind_speed_850hPa?.[idx] != null ? Number(stabilitaData.wind_speed_850hPa[idx]) : null,
          windDir850: stabilitaData.wind_direction_850hPa?.[idx] != null ? Number(stabilitaData.wind_direction_850hPa[idx]) : null,
          windSpeed700: stabilitaData.wind_speed_700hPa?.[idx] != null ? Number(stabilitaData.wind_speed_700hPa[idx]) : null,
          windDir700: stabilitaData.wind_direction_700hPa?.[idx] != null ? Number(stabilitaData.wind_direction_700hPa[idx]) : null,
          windSpeed600: stabilitaData.wind_speed_600hPa?.[idx] != null ? Number(stabilitaData.wind_speed_600hPa[idx]) : null,
          windDir600: stabilitaData.wind_direction_600hPa?.[idx] != null ? Number(stabilitaData.wind_direction_600hPa[idx]) : null,
          windSpeed500: stabilitaData.wind_speed_500hPa?.[idx] != null ? Number(stabilitaData.wind_speed_500hPa[idx]) : null,
          windDir500: stabilitaData.wind_direction_500hPa?.[idx] != null ? Number(stabilitaData.wind_direction_500hPa[idx]) : null,
        };
        const derived = computeHourlyDerived(hourlyRaw as any, altitude);
        map.set(hr, derived);
      });
      return map;
    }, [stabilitaData, altitude]);


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

  // hourThermalData sostituito da hourDerivedMap (motore centralizzato)
  // Mantenuto per compatibilità con cloud icon e render
  const hourDerivedInfo = useMemo(() => {
    const info: Record<number, { cloudBase: number | null; cloudCover: number | null; lowLevelLapseRate: number | null; estimatedThermalTop: number | null; estimatedThermalActivity: number | null }> = {};
    DISPLAY_HOURS.forEach((hr) => {
      const derived = hourDerivedMap.get(hr);
      if (derived) {
        info[hr] = {
          cloudBase: derived.cloudBase,
          cloudCover: derived.real.cloudCover,
          lowLevelLapseRate: derived.lowLevelLapseRate,
          estimatedThermalTop: derived.estimatedThermalTop,
          estimatedThermalActivity: derived.estimatedThermalActivity,
        };
      } else {
        info[hr] = { cloudBase: null, cloudCover: null, lowLevelLapseRate: null, estimatedThermalTop: null, estimatedThermalActivity: null };
      }
    });
    return info;
  }, [hourDerivedMap]);

  type CellBg =
      | { kind: "none" }
      | { kind: "stable"; color: string };

    // Colori stabilità basati sul LOW-LEVEL LAPSE RATE (dato DERIVATO dal motore centrale)
    const STABILITY_COLORS = [
      { val: -0.1, color: "#8b5cf6" },     // inversione
      { val: 0.08, color: "#3b82f6" },     // stabile
      { val: 0.24, color: "#06b6d4" },     // neutro-stabile
      { val: 0.40, color: "#10b981" },     // neutro
      { val: 0.56, color: "#84cc16" },     // neutro-instabile
      { val: 0.73, color: "#eab308" },     // instabile
      { val: 0.90, color: "#f97316" },     // molto_instabile
      { val: 1.10, color: "#ef4444" },     // estremo
      { val: 99, color: "#dc2626" },       // oltre soglia
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

    const getCellBgColor = (alt: number, hr: number): CellBg => {
      const info = hourDerivedInfo[hr];
      if (!info || info.lowLevelLapseRate == null) return { kind: "none" };

      // Il colore di stabilità è lo stesso per tutta la colonna (dato ORIZZONTALE)
      // Non si usa alcuna curva sinusoidale: il lapse rate è un dato misurato/derivato
      const deltaT = info.lowLevelLapseRate;
      const stabilityColor = getStabilityColor(deltaT);

      return { kind: "stable", color: stabilityColor };
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
      const info = hourDerivedInfo[hr];
      if (!info || info.cloudBase == null) return;
      // La base nube è un dato DERIVATO/ESTIMATED centralizzato, non sinusoidale
      let bestIdx = 0;
      let bestDiff = Infinity;
      activeAltitudes.forEach((a, idx) => {
        const diff = Math.abs(a - info.cloudBase);
        if (diff < bestDiff) {
          bestDiff = diff;
          bestIdx = idx;
        }
      });
      map[hr] = bestIdx;
    });
    return map;
  }, [hourDerivedInfo, activeAltitudes, altitude]);

  const dataSourceBadge = hasRealAltitudeData ? (
    <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[10px] font-bold flex items-center gap-1">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
      Vento previsto · profilo verticale
    </span>
  ) : hasRealPressureData ? (
    <span className="px-2 py-0.5 rounded bg-sky-100 text-sky-700 text-[10px] font-bold flex items-center gap-1">
      <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />
      Vento previsto · livelli di pressione
    </span>
  ) : (
    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px] font-bold flex items-center gap-1">
      <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
      Dati vento N/D
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
      <div className="w-full max-w-full mx-auto bg-slate-900/60 p-2 sm:p-4 rounded-3xl">
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
      <div className="w-full max-w-full mx-auto bg-slate-900/60 p-2 sm:p-4 rounded-3xl">
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
    <div className="w-full max-w-full mx-auto bg-slate-900/60 p-1.5 sm:p-2 rounded-2xl">
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
              <div className="flex items-center gap-2 text-[10px] flex-wrap justify-end">
                {dataSourceBadge}
              </div>
            </div>

          <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600">
            <span><strong>Ora</strong> in alto · <strong>Quota</strong> a sinistra</span>
            <span>Freccia = direzione del vento · Numero = km/h</span>
          </div>
          <div className="overflow-x-auto border border-slate-200 rounded-lg bg-white">
            <table className="w-full min-w-[900px] text-center border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-700 bg-slate-200 font-bold">
                  <th className="py-2 px-2 text-center w-14 sticky left-0 z-50 bg-slate-800 border-r border-slate-600 text-white text-xs shadow-[2px_0_5px_rgba(0,0,0,0.12)]">
                    Quota
                  </th>
                  {DISPLAY_HOURS.map((hr) => (
                    <th
                      key={`th-${hr}`}
                      onClick={() => onHourSelect?.(hr)}
                      className={`py-2 px-2 font-bold cursor-pointer transition-colors border-r border-slate-200 ${
                        hr === selectedHour
                          ? "bg-sky-100 text-sky-900 ring-1 ring-sky-400"
                          : "hover:bg-slate-200/60 text-slate-800"
                      }`}
                    >
                      <div className="flex flex-col items-center gap-0">
                        <span className="text-xs">{String(hr).padStart(2, "0")}:00</span>
                        <span className="text-[10px] font-normal text-slate-500 leading-none">
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
                        className={`py-1.5 px-2 text-center font-bold sticky left-0 z-40 border-r border-slate-300 text-xs tabular-nums whitespace-nowrap shadow-[2px_0_3px_rgba(0,0,0,0.08)] ${
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
                        const bg = getCellBgColor(alt, hr);
                        const showCloud = cloudBaseRow[hr] === rowIdx;
                        return (
                          <td
                            key={`cell-${alt}-${hr}`}
                            onClick={() => onHourSelect?.(hr)}
                            style={{
                              backgroundColor: isSelectedCol ? "#eff6ff" : "transparent",
                            }}
                            className={`py-1.5 px-1 border-r border-slate-100 cursor-pointer transition-colors relative ${
                              isSelectedCol ? "ring-1 ring-sky-400/90" : "hover:brightness-95"
                            }`}
                          >
                            <div className="flex items-center justify-center gap-1 h-full relative min-h-[24px]">
                              {w ? (
                                <>
                                  <WindArrowIcon deg={w.dir} color={wColor} />
                                  <span
                                    className="font-semibold text-xs sm:text-sm tabular-nums relative z-10 leading-none"
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
                                                  <CloudIcon cloudCover={hourDerivedInfo[hr]?.cloudCover ?? 50} />
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

          <div className="p-3 bg-slate-50 border-t border-slate-100">
            <div className="flex flex-wrap items-center justify-between gap-1.5 mb-1">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1">
                  <div className="w-2.5 h-1.5 rounded bg-gradient-to-r from-yellow-300 via-amber-400 to-orange-500 border border-orange-400/60" />
                  <span className="text-slate-700 font-medium text-[9px]">Instabile</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2.5 h-1.5 rounded bg-gradient-to-b from-[#b5d5e4] via-[#82b1cc] to-[#6a9cba] border border-[#6a9cba]/60" />
                  <span className="text-slate-700 font-medium text-[9px]">Stabile/Neutro</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-slate-500">Freccia = direzione · numero = km/h</span>
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
