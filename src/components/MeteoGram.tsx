"use client";

import React, { useEffect, useRef, useMemo } from "react";

interface MeteoGramData {
  hours: string[];
  temperatures: number[];
  capeValues: number[];
  cloudCover: number[];
  precipitation: number[];
  windSpeed: number[];
  windDir: number[];
  humidity: number[];
  dewPoint: number[];
}

interface MeteoGramProps {
  data: MeteoGramData;
  siteName: string;
  siteAltitude: number;
  date: string;
}

const CANVAS_PADDING = { top: 40, right: 80, bottom: 50, left: 55 };
const CHART_COLORS = {
  cape: "rgba(239, 68, 68, 0.2)",
  capeLine: "rgb(239, 68, 68)",
  temperature: "rgb(250, 204, 21)",
  dewPoint: "rgb(56, 189, 248)",
  cloudCover: "rgba(148, 163, 184, 0.25)",
  precipitation: "rgb(14, 165, 233)",
  wind: "rgb(34, 197, 94)",
  grid: "rgba(148, 163, 184, 0.12)",
  text: "rgb(203, 213, 225)",
  axisLabel: "rgb(148, 163, 184)",
  zero: "rgba(148, 163, 184, 0.2)",
};

export function MeteoGram({ data, siteName, siteAltitude, date }: MeteoGramProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const stats = useMemo(() => {
    if (!data.hours.length) return null;
    const maxCape = Math.max(...data.capeValues, 0);
    const avgCape = data.capeValues.reduce((a, b) => a + b, 0) / data.capeValues.length;
    const maxTemp = Math.max(...data.temperatures);
    const maxWind = Math.max(...data.windSpeed, 1);
    const maxPrecip = Math.max(...data.precipitation, 0.1);
    const avgTemp = data.temperatures.reduce((a, b) => a + b, 0) / data.temperatures.length;
    const avgDew = data.dewPoint.reduce((a, b) => a + b, 0) / data.dewPoint.length;
    const cloudBase = Math.round((avgTemp - avgDew) * 125);
    const thermalTop = cloudBase + Math.round((maxCape / 500) * 1500);
    const buoyancy = ((avgTemp - avgDew) / (avgTemp || 1)) * 100;

    return {
      maxCape,
      avgCape,
      maxTemp,
      maxWind,
      maxPrecip,
      cloudBase: Math.max(0, cloudBase),
      thermalTop: Math.max(cloudBase, thermalTop),
      buoyancy,
      capeCategory: maxCape > 1000 ? "Molto instabile" : maxCape > 500 ? "Instabile" : maxCape > 200 ? "Moderato" : "Stabile",
      thermalStrength: avgCape > 600 ? "Forte" : avgCape > 300 ? "Buona" : avgCape > 100 ? "Debole" : "Nulla",
    };
  }, [data]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data.hours.length || !stats) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    drawChart(ctx, w, h, data, stats);
  }, [data, stats]);

  if (!data.hours.length || !stats) {
    return (
      <div className="bg-slate-800/80 border border-slate-600 rounded-2xl p-6 text-center">
        <p className="text-sm text-slate-400">Dati insufficienti per generare il windgram.</p>
      </div>
    );
  }

  const thunderAlert = stats.maxCape > 800;
  const xcRating = stats.maxCape > 500 && stats.avgCape > 200 ? "Buona" : stats.maxCape > 300 ? "Discreta" : "Scarsa";

  return (
    <div className="bg-slate-800/90 border border-slate-600 rounded-2xl p-3 md:p-4 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <span>🌤️</span> Windgram
          </h3>
          <p className="text-[10px] text-slate-400">{siteName} · {siteAltitude}m · {date}</p>
        </div>
        <div className="flex gap-2 text-[10px]">
          <span className="px-1.5 py-0.5 rounded-md bg-slate-700 border border-slate-500 text-slate-200">
            CAPE max: {stats.maxCape} J/kg
          </span>
          <span className={`px-1.5 py-0.5 rounded-md border ${
            thunderAlert ? "bg-red-900/60 border-red-500 text-red-200" : "bg-green-900/60 border-green-500 text-green-200"
          }`}>
            ⚡ {thunderAlert ? "Allerta" : "Sicuro"}
          </span>
        </div>
      </div>

      {/* Canvas */}
      <div className="w-full" style={{ height: 320 }}>
        <canvas
          ref={canvasRef}
          className="w-full h-full rounded-xl"
          style={{ width: "100%", height: "100%" }}
        />
      </div>

      {/* Legenda */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-2.5 pt-2.5 border-t border-slate-600/40">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 rounded bg-yellow-400" />
          <span className="text-[9px] text-slate-400">Temp.</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 rounded border-t border-dashed border-sky-400" />
          <span className="text-[9px] text-slate-400">Rugiada</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-1.5 rounded bg-red-500/30" />
          <span className="text-[9px] text-slate-400">CAPE</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-1.5 rounded bg-slate-400/30" />
          <span className="text-[9px] text-slate-400">Nuvole</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded bg-blue-500" />
          <span className="text-[9px] text-slate-400">Pioggia</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 rounded border-t border-dashed border-green-400" />
          <span className="text-[9px] text-slate-400">Vento</span>
        </div>
      </div>

      {/* Statistiche rapide */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3 pt-3 border-t border-slate-600/40">
        <div className="bg-slate-700/60 rounded-xl p-2 border border-slate-600/40">
          <div className="text-[8px] text-slate-400 uppercase tracking-wider">Stabilità</div>
          <div className="text-xs font-bold text-white mt-0.5">{stats.capeCategory}</div>
          <div className="text-[8px] text-slate-500">CAPE max {stats.maxCape} J/kg</div>
        </div>
        <div className="bg-slate-700/60 rounded-xl p-2 border border-slate-600/40">
          <div className="text-[8px] text-slate-400 uppercase tracking-wider">Termiche</div>
          <div className="text-xs font-bold text-white mt-0.5">{stats.thermalStrength}</div>
          <div className="text-[8px] text-slate-500">Media {Math.round(stats.avgCape)} J/kg</div>
        </div>
        <div className="bg-slate-700/60 rounded-xl p-2 border border-slate-600/40">
          <div className="text-[8px] text-slate-400 uppercase tracking-wider">Base termica</div>
          <div className="text-xs font-bold text-white mt-0.5">{stats.cloudBase} m</div>
          <div className="text-[8px] text-slate-500">Cima ~{stats.thermalTop} m</div>
        </div>
        <div className="bg-slate-700/60 rounded-xl p-2 border border-slate-600/40">
          <div className="text-[8px] text-slate-400 uppercase tracking-wider">XC Rating</div>
          <div className={`text-xs font-bold mt-0.5 ${
            xcRating === "Buona" ? "text-green-400" : xcRating === "Discreta" ? "text-amber-400" : "text-red-400"
          }`}>
            {xcRating}
          </div>
          <div className="text-[8px] text-slate-500">Gallegg. {stats.buoyancy.toFixed(1)}%</div>
        </div>
      </div>
    </div>
  );
}

function drawChart(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  data: MeteoGramData,
  stats: ReturnType<typeof useMemo>
) {
  if (!stats) return;
  const { top, right, bottom, left } = CANVAS_PADDING;
  const chartW = w - left - right;
  const chartH = h - top - bottom;

  ctx.clearRect(0, 0, w, h);

  const n = data.hours.length;
  const stepX = chartW / (n - 1 || 1);

  // Scale
  const tempMin = -5;
  const tempMax = 45;
  const tempRange = tempMax - tempMin;

  const capeMax = Math.max(stats.maxCape * 1.2, 100);
  const precipMax = Math.max(stats.maxPrecip * 2, 1);
  const windMax = Math.max(stats.maxWind * 1.3, 10);

  const tempY = (v: number) => top + chartH - ((v - tempMin) / tempRange) * chartH;
  const capeY = (v: number) => top + chartH - (v / capeMax) * chartH;
  const cloudY = (v: number) => top + chartH - (v / 100) * chartH;
  const precipY = (v: number) => top + chartH - (v / precipMax) * chartH;
  const windY = (v: number) => top + chartH - (v / windMax) * chartH;
  const xPos = (i: number) => left + i * stepX;

  // Griglia
  ctx.strokeStyle = CHART_COLORS.grid;
  ctx.lineWidth = 0.5;
  for (let i = 0; i <= 5; i++) {
    const y = top + (chartH / 5) * i;
    ctx.beginPath();
    ctx.moveTo(left, y);
    ctx.lineTo(left + chartW, y);
    ctx.stroke();
```typescript
  const y = top + (chartH / 5) * i;
    ctx.beginPath();
    ctx.moveTo(left, y);
    ctx.lineTo(left + chartW, y);
    ctx.stroke();
  }

  // Label asse sinistro (temperature)
  ctx.fillStyle = CHART_COLORS.axisLabel;
  ctx.font = "9px Inter, sans-serif";
  ctx.textAlign = "right";
  for (let t = 0; t <= 40; t += 10) {
    const y = tempY(t);
    ctx.fillText(`${t}°`, left - 5, y + 3);
  }

  // Label asse destro (CAPE)
  ctx.textAlign = "left";
  const capeTicks = [0, Math.round(capeMax * 0.25), Math.round(capeMax * 0.5), Math.round(capeMax * 0.75), Math.round(capeMax)];
  for (const v of capeTicks) {
    const y = capeY(v);
    ctx.fillText(`${v}`, left + chartW + 5, y + 3);
  }

  // Label ora
  ctx.textAlign = "center";
  ctx.fillStyle = CHART_COLORS.axisLabel;
  ctx.font = "8px Inter, sans-serif";
  const labelInterval = Math.max(1, Math.floor(n / 8));
  for (let i = 0; i < n; i += labelInterval) {
    ctx.fillText(data.hours[i], xPos(i), top + chartH + 14);
  }

  // Area CAPE (con gradiente)
  if (Math.max(...data.capeValues) > 0) {
    const gradient = ctx.createLinearGradient(0, top, 0, top + chartH);
    gradient.addColorStop(0, "rgba(239, 68, 68, 0.35)");
    gradient.addColorStop(1, "rgba(239, 68, 68, 0.05)");
    ctx.fillStyle = gradient;

    ctx.beginPath();
    ctx.moveTo(xPos(0), capeY(0));
    for (let i = 1; i < n; i++) {
      ctx.lineTo(xPos(i), capeY(data.capeValues[i]));
    }
    ctx.lineTo(xPos(n - 1), capeY(0));
    ctx.lineTo(xPos(0), capeY(0));
    ctx.closePath();
    ctx.fill();
  }

  // Linea CAPE
  ctx.strokeStyle = CHART_COLORS.capeLine;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const x = xPos(i);
    const y = capeY(data.capeValues[i]);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  // Area Nuvolosità
  ctx.fillStyle = CHART_COLORS.cloudCover;
  ctx.beginPath();
  ctx.moveTo(xPos(0), cloudY(data.cloudCover[0]));
  for (let i = 1; i < n; i++) {
    ctx.lineTo(xPos(i), cloudY(data.cloudCover[i]));
  }
  ctx.lineTo(xPos(n - 1), cloudY(0));
  ctx.lineTo(xPos(0), cloudY(0));
  ctx.closePath();
  ctx.fill();

  // Barre Precipitazioni
  for (let i = 0; i < n; i++) {
    const val = data.precipitation[i];
    if (val > 0) {
      const x = xPos(i);
      const barW = Math.max(3, stepX * 0.5);
      const barH = chartH * (val / precipMax);
      ctx.fillStyle = CHART_COLORS.precipitation;
      ctx.fillRect(x - barW / 2, top + chartH - barH, barW, barH);
    }
  }

  // Linea Temperatura
  ctx.strokeStyle = CHART_COLORS.temperature;
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const x = xPos(i);
    const y = tempY(data.temperatures[i]);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  // Punti temperatura
  ctx.fillStyle = CHART_COLORS.temperature;
  for (let i = 0; i < n; i++) {
    ctx.beginPath();
    ctx.arc(xPos(i), tempY(data.temperatures[i]), 2.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Linea Rugiada (tratteggiata)
  ctx.strokeStyle = CHART_COLORS.dewPoint;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 3]);
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const x = xPos(i);
    const y = tempY(data.dewPoint[i]);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.setLineDash([]);

  // Punti rugiada
  ctx.fillStyle = CHART_COLORS.dewPoint;
  for (let i = 0; i < n; i++) {
    ctx.beginPath();
    ctx.arc(xPos(i), tempY(data.dewPoint[i]), 2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Linea Vento (tratteggiata)
  ctx.strokeStyle = CHART_COLORS.wind;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const x = xPos(i);
    const y = windY(data.windSpeed[i]);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.setLineDash([]);

  // Punti vento
  ctx.fillStyle = CHART_COLORS.wind;
  for (let i = 0; i < n; i++) {
    ctx.beginPath();
    ctx.arc(xPos(i), windY(data.windSpeed[i]), 2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Bordi del grafico
  ctx.strokeStyle = CHART_COLORS.grid;
  ctx.lineWidth = 1;
  ctx.strokeRect(left, top, chartW, chartH);
}
```

Now let me integrare il componente nel tab "termiche" di Index.tsx:

<dyad-write path="src/pages/Index.tsx" description="Integro il MeteoGram nel tab termiche di Index.tsx">
"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { LoadingScreen } from "@/components/LoadingScreen";
import { ErrorScreen } from "@/components/ErrorScreen";
import { TabNav, type Tab } from "@/components/TabNav";
import { MeteoTab } from "@/components/MeteoTab";
import { VentiTab } from "@/components/VentiTab";
import VentiQuotaTab from "@/components/VentiQuotaTab";
import { TermicheTab } from "@/components/TermicheTab";
import { AnalisiTab } from "@/components/AnalisiTab";
import SiteHeader from "@/components/SiteHeader";
import DayForecastPopup from "@/components/DayForecastPopup";
import { DayDetailPopup } from "@/components/DayDetailPopup";
import SidebarDecolli from "@/components/SidebarDecolli";
import { MeteoGram } from "@/components/MeteoGram";
import { fetchMeteo, fetchWindProfiles, filterFlightHours, enrDaily, calcThermal } from "@/utils/meteo";
import { generaAnalisiReale } from "@/utils/analisi";
import { generateAiAnalysis } from "@/utils/meteoAI";
import { DECOLLI, type Decollo } from "@/data/decolli";
import type { MeteoData, HourData, AiAnalysis, WindProfile } from "@/types/meteo";
import { Button } from "@/components/ui/button";
import { MapPin, CloudSun, ArrowRight } from "lucide-react";

interface DecolloMeteo {
  site: Decollo;
  data: MeteoData | null;
  loading: boolean;
  error: string | null;
  windProfiles: WindProfile[];
  windProfilesLoading: boolean;
}

function useRealTimeHour(): number {
  const [h, setH] = useState(() => new Date().getHours());
  useEffect(() => {
    const tick = () => setH(new Date().getHours());
    const id = setInterval(tick, 10000);
    return () => clearInterval(id);
  }, []);
  return h;
}

function Index() {
  const [decolliMeteo, setDecolliMeteo] = useState<Record<string, DecolloMeteo>>(() => {
    const map: Record<string, DecolloMeteo> = {};
    for (const site of DECOLLI) {
      map[site.id] = { site, data: null, loading: true, error: null, windProfiles: [], windProfilesLoading: false };
    }
    return map;
  });
  const [globalLoading, setGlobalLoading] = useState(true);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [siteId, setSiteId] = useState(DECOLLI[0]?.id || "");
  const [tab, setTab] = useState<Tab>("meteo");
  const [dayIdx, setDayIdx] = useState(0);
  const [hour, setHour] = useState(useRealTimeHour());
  const [showPopup, setShowPopup] = useState(false);
  const [showDayDetail, setShowDayDetail] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const fetchAllDecolli = useCallback(async () => {
    const results = await Promise.allSettled(
      DECOLLI.map(async (site) => {
        const data = await fetchMeteo(site.lat, site.lon);
        return { id: site.id, data };
      })
    );

    setDecolliMeteo((prev) => {
      const next = { ...prev };
      for (const result of results) {
        if (result.status === "fulfilled") {
          next[result.value.id] = {
            ...next[result.value.id],
            data: result.value.data,
            loading: false,
            error: null,
          };
        } else {
          const failedId = DECOLLI.find((s) =>
            result.reason?.message?.includes(s.id)
          )?.id;
          if (failedId) {
            next[failedId] = {
              ...next[failedId],
              loading: false,
              error: result.reason?.message || "Errore sconosciuto",
            };
          }
        }
      }
      return next;
    });
    setGlobalLoading(false);
    setGlobalError(null);
  }, []);

  const fetchWind = useCallback(async (lat: number, lon: number) => {
    setDecolliMeteo((prev) => ({
      ...prev,
      [siteId]: { ...prev[siteId], windProfilesLoading: true },
    }));
    const profiles = await fetchWindProfiles(lat, lon);
    setDecolliMeteo((prev) => ({
      ...prev,
      [siteId]: { ...prev[siteId], windProfiles: profiles, windProfilesLoading: false },
    }));
  }, [siteId]);

  useEffect(() => {
    fetchAllDecolli();
    const interval = setInterval(fetchAllDecolli, 60000);
    return () => clearInterval(interval);
  }, [fetchAllDecolli]);

  const selectedSite = DECOLLI.find((s) => s.id === siteId) || DECOLLI[0];
  useEffect(() => {
    if (selectedSite) {
      fetchWind(selectedSite.lat, selectedSite.lon);
    }
  }, [siteId, selectedSite, fetchWind]);

  const selectedDecollo = decolliMeteo[siteId];
  const meteoData = selectedDecollo?.data;
  const windProfiles = selectedDecollo?.windProfiles || [];

  const hourlyRaw = meteoData?.hourly || [];
  const daily = meteoData?.daily || [];

  const hourly = useMemo(() => filterFlightHours(hourlyRaw), [hourlyRaw]);

  const weatherMap = useMemo(() => {
    const map: Record<string, HourData> = {};
    for (const [id, dm] of Object.entries(decolliMeteo)) {
      if (dm?.data?.hourly) {
        const hh = dm.data.hourly.find((h) => {
          const hhh = h.time.getHours();
          return hhh >= 9 && hhh <= 19 && hhh === hour;
        });
        if (hh) map[id] = hh;
      }
    }
    return map;
  }, [decolliMeteo, hour]);

  const enrichedDaily = useMemo(() => enrDaily(daily, hourly), [daily, hourly]);

  const dateLabels = useMemo(() => {
    return daily.map((d) =>
      d.date.toLocaleDateString("it-IT", {
        weekday: "short",
        day: "numeric",
        month: "short",
      })
    );
  }, [daily]);

  const getDayData = useCallback(
    (idx: number): HourData[] => {
      if (!hourly.length) return [];
      const targetDate = daily[idx]?.date;
      if (!targetDate) return [];
      return hourly.filter((h) => {
        const hd = h.time;
        return (
          hd.getDate() === targetDate.getDate() &&
          hd.getMonth() === targetDate.getMonth() &&
          hd.getFullYear() === targetDate.getFullYear()
        );
      });
    },
    [hourly, daily]
  );

  const dayData = useMemo(() => getDayData(dayIdx), [getDayData, dayIdx]);

  const currentHourData = useMemo(() => {
    const found = hourly.find((h) => h.time.getHours() === hour);
    return found || hourly[0];
  }, [hourly, hour]);

  const currentSite = useMemo(
    () => DECOLLI.find((s) => s.id === siteId) || DECOLLI[0],
    [siteId]
  );

  const thermalAI = useMemo(() => {
    if (!dayData.length) return null;
    return calcThermal(dayData, currentSite.altitude);
  }, [dayData, currentSite.altitude]);

  const aiData = useMemo(() => {
    if (!dayData.length) return null;
    return generaAnalisiReale(dayData, currentSite.altitude);
  }, [dayData, currentSite.altitude]);

  const aiMeteoAnalysis = useMemo(() => {
    return generateAiAnalysis(dayData, dayIdx);
  }, [dayData, dayIdx]);

  // Dati per il MeteoGram
  const meteoGramData = useMemo(() => {
    if (!dayData.length) return null;
    return {
      hours: dayData.map(h => `${String(h.time.getHours()).padStart(2, "0")}:00`),
      temperatures: dayData.map(h => h.temperature),
      capeValues: dayData.map(h => Math.max(0, (h.temperature - h.dewPoint) * 60 + (h.cloudCover < 50 ? 200 : 0) - Math.max(0, h.windSpeed - 15) * 15)),
      cloudCover: dayData.map(h => h.cloudCover),
      precipitation: dayData.map(h => h.precipitation || 0),
      windSpeed: dayData.map(h => h.windSpeed),
      windDir: dayData.map(h => h.windDir),
      humidity: dayData.map(h => h.humidity),
      dewPoint: dayData.map(h => h.dewPoint),
    };
  }, [dayData]);

  const handleSiteSelect = useCallback((id: string) => {
    setSiteId(id);
    setDayIdx(0);
    setHour(new Date().getHours());
  }, []);

  const handleDayDetailClick = useCallback((idx: number) => {
    setDayIdx(idx);
    setShowDayDetail(true);
  }, []);

  const handleApriDomani = useCallback(() => {
    setDayIdx(1);
    setShowDayDetail(true);
  }, []);

  const toggleSidebar = useCallback(() => setSidebarOpen((p) => !p), []);

  const handleRetry = useCallback(() => {
    setGlobalLoading(true);
    setGlobalError(null);
    fetchAllDecolli();
  }, [fetchAllDecolli]);

  if (globalLoading) return <LoadingScreen />;
  if (globalError) return <ErrorScreen message={globalError} onRetry={handleRetry} />;

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-slate-800 via-slate-700 to-slate-900 text-slate-100">
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.03] bg-repeat"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      <div className="pointer-events-none fixed -top-32 -left-32 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
      <div className="pointer-events-none fixed -bottom-32 -right-32 w-96 h-96 bg-green-500/8 rounded-full blur-3xl" />

      <header className="relative z-10 px-4 py-5 border-b-2 border-green-500/40 bg-gradient-to-r from-slate-800/95 via-green-900/20 to-slate-800/95 backdrop-blur-md shadow-lg">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-center gap-3">
            <span className="text-4xl md:text-5xl drop-shadow-lg animate-bounce">🐰</span>
            <div className="border-2 border-green-500/40 rounded-xl px-5 py-3 bg-slate-800/60 backdrop-blur-sm shadow-inner">
              <h1 className="text-2xl md:text-3xl font-extrabold text-green-400 tracking-tight text-center drop-shadow-sm">
                Meteo dei <span className="text-green-300">Conigli</span>
              </h1>
              <p className="text-xs md:text-sm text-green-200/90 font-medium text-center tracking-wide">
                🪂 Previsioni per volo libero · 9:00–19:00 · aggiornato ogni minuto
              </p>
            </div>
            <span
              className="text-4xl md:text-5xl drop-shadow-lg md:block hidden animate-bounce"
              style={{ animationDelay: "150ms" }}
            >
              🐰
            </span>
          </div>
        </div>
      </header>

      <div className="relative z-10 max-w-5xl mx-auto px-3 pb-28 mt-4 md:flex md:gap-3 md:items-start md:justify-center">
        <SidebarDecolli
          selected={siteId}
          current={currentHourData}
          onSelect={handleSiteSelect}
          weatherMap={weatherMap}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        <div className="flex-1 min-w-0 max-w-2xl mx-auto">
          <div className="mb-2.5 flex items-center justify-between">
            <div className="text-[11px] text-slate-300 font-medium">
              {new Date().toLocaleDateString("it-IT", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
              <span className="ml-2 text-blue-300">
                {String(hour).padStart(2, "0")}:{String(new Date().getMinutes()).padStart(2, "0")}
              </span>
            </div>
            <div className="flex gap-1.5">
              <button
                onClick={toggleSidebar}
                className="md:hidden px-2.5 py-1.5 rounded-xl text-[10px] font-bold border border-slate-500 bg-slate-700 text-slate-200 hover:bg-slate-600 transition-colors"
              >
                ☰ Decolli
              </button>
            </div>
          </div>

          {currentSite && currentHourData && (
            <div className="mb-2.5">
              <SiteHeader site={currentSite} current={currentHourData} />
            </div>
          )}

          <div className="mb-3">
            <Button
              onClick={handleApriDomani}
              className="w-full py-4 md:py-3 text-sm md:text-base font-bold rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white border border-blue-400 shadow-lg shadow-blue-500/30 transition-all duration-300 hover:scale-[1.02]"
            >
              <CloudSun className="w-5 h-5 mr-2" />
              {daily[1] ? dateLabels[1] : "Domani"} · Previsioni locali 8:00–20:00
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>

          <TabNav tab={tab} onTabChange={setTab} />

          <div className="bg-slate-700/60 backdrop-blur-sm rounded-2xl p-3 md:p-4 border border-slate-600/50 shadow-xl mt-2.5 text-slate-100">
            {tab === "meteo" && currentHourData && (
              <MeteoTab
                current={currentHourData}
                dayIdx={dayIdx}
                hour={hour}
                enrichedDaily={enrichedDaily}
                dateLabels={dateLabels}
                thermal={thermalAI}
                pressureGrad={{ grad: 0, desc: "Non disponibile" }}
                aiData={aiData as unknown as AiAnalysis | null}
                onDaySelect={setDayIdx}
                onDayDetailClick={handleDayDetailClick}
                onHourChange={setHour}
              />
            )}

            {tab === "venti" && <VentiTab dayData={dayData} />}

            {tab === "quota" && (
              <VentiQuotaTab
                dayData={dayData}
                selectedHour={hour}
                altitude={currentSite.altitude}
                siteName={currentSite.name}
              />
            )}

            {tab === "termiche" && (
              <div className="space-y-4">
                <TermicheTab dayData={dayData} altitude={currentSite.altitude} />
                {meteoGramData && (
                  <MeteoGram
                    data={meteoGramData}
                    siteName={currentSite.name}
                    siteAltitude={currentSite.altitude}
                    date={dateLabels[dayIdx] || ""}
                  />
                )}
              </div>
            )}

            {tab === "analisi" && aiMeteoAnalysis && (
              <AnalisiTab aiData={aiMeteoAnalysis as unknown as AiAnalysis} />
            )}
            {tab === "analisi" && !aiMeteoAnalysis && (
              <div className="text-sm text-slate-300 p-4 text-center">
                Nessuna analisi disponibile per questa giornata.
              </div>
            )}
          </div>

          <div className="mt-3 flex justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPopup(true)}
              className="text-xs border-slate-500/60 text-slate-200 hover:bg-slate-700 bg-slate-800/80"
            >
              <MapPin className="w-3 h-3 mr-1" />
              Dettaglio orario {currentSite?.name} (9:00–19:00)
            </Button>
          </div>

          {showPopup && currentHourData && (
            <DayForecastPopup
              data={dayData}
              dayLabel={dateLabels[dayIdx] || ""}
              onClose={() => setShowPopup(false)}
              selectedHour={hour}
              onHourSelect={(h) => {
                setHour(h);
                setShowPopup(false);
              }}
            />
          )}

          {showDayDetail && daily[dayIdx] && (
            <DayDetailPopup
              dayData={dayData}
              daily={daily[dayIdx]}
              dayLabel={dateLabels[dayIdx] || ""}
              altitude={currentSite.altitude}
              onClose={() => setShowDayDetail(false)}
              onHourSelect={(h) => {
                setHour(h);
                setShowDayDetail(false);
              }}
            />
          )}
        </div>
      </div>

      <footer className="relative z-10 fixed bottom-0 left-0 right-0 text-center py-2 border-t border-green-500/30 bg-slate-800/80 backdrop-blur-md shadow-lg">
        <div className="max-w-5xl mx-auto px-3 flex items-center justify-center gap-8">
          <p className="text-[10px] text-slate-300">
            Basato su dati Open-Meteo · previsioni 9:00–19:00
          </p>
          <p className="text-[10px] text-slate-300">
            &copy; {new Date().getFullYear()} Meteo dei Conigli
          </p>
        </div>
      </footer>
    </div>
  );
}

export default Index;