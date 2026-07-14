"use client";

import React, { useMemo } from "react";
import { useWeatherData } from "@/hooks/useWeatherData";
import { DECOLLI } from "@/data/decolli";
import { calcolaTermiche } from "@/utils/termiche";
import { getWeatherIcon } from "@/utils/weatherHelpers";

// ============================================================
// Componenti
// ============================================================

function HeaderDecollo({ decollo }: { decollo: any }) {
  const qualità =
    decollo.vento <= 10 && decollo.raffiche <= 18
      ? "🟢 Ottimo"
      : decollo.vento <= 15 && decollo.raffiche <= 22
      ? "🟡 Buono"
      : decollo.vento <= 22 && decollo.raffiche <= 30
      ? "🟠 Difficile"
      : "🔴 Sconsigliato";

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-4">
      <h1 className="text-xl font-bold text-gray-900">{decollo.nome}</h1>
      <p className="text-sm text-gray-500 mt-0.5">{decollo.valle} · {decollo.quota} m</p>
      <div className="flex flex-wrap gap-4 mt-3 text-sm">
        <span className="bg-orange-50 px-3 py-1.5 rounded-lg font-semibold text-orange-700">🌤️ {decollo.temp}°</span>
        <span className="bg-blue-50 px-3 py-1.5 rounded-lg font-semibold text-blue-700">💨 {decollo.vento} km/h</span>
        <span className="bg-red-50 px-3 py-1.5 rounded-lg font-semibold text-red-700">🌪️ {decollo.raffiche} km/h</span>
        <span className="bg-green-50 px-3 py-1.5 rounded-lg font-semibold text-green-700">🪂 {qualità}</span>
      </div>
    </div>
  );
}

function MeteoGiorni({ giorni }: { giorni: any[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
      {giorni.map((g, i) => (
        <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <h4 className="text-sm font-bold text-gray-700 mb-2">{g.data}</h4>
          <div className="text-2xl mb-1">{g.icona}</div>
          <div className="text-lg font-bold text-gray-900">{g.max}° / {g.min}°</div>
          <div className="text-sm text-gray-500 mt-1">💨 {g.vento} km/h</div>
          <div className="text-sm text-gray-500">💧 {g.umidità}%</div>
          <div className="text-sm text-gray-500">❄️ {g.zero} m</div>
        </div>
      ))}
    </div>
  );
}

function VentoQuote250({ ventoOrario }: { ventoOrario: any[] }) {
  if (!ventoOrario || ventoOrario.length === 0) return null;

  const v = ventoOrario[0];
  const quote = Object.keys(v.quote || {}).map(Number);
  const maxSpeed = Math.max(...quote.map(q => v.quote[q]?.speed || 0), 1);

  const barColor = (s: number) =>
    s <= 8 ? "bg-green-400" : s <= 15 ? "bg-amber-400" : s <= 22 ? "bg-orange-400" : "bg-red-400";

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-4">
      <h3 className="text-base font-bold text-gray-800 mb-4">Vento in quota (step 250m)</h3>
      <div className="space-y-1">
        {quote.slice().reverse().map((q) => {
          const speed = v.quote[q]?.speed || 0;
          const dir = v.quote[q]?.dir || 0;
          const width = maxSpeed > 0 ? (speed / maxSpeed) * 100 : 0;
          return (
            <div key={q} className="grid grid-cols-[70px_1fr_60px] gap-2 items-center py-0.5">
              <span className="text-xs font-mono text-gray-500">{q}m</span>
              <div className="h-5 bg-gray-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${barColor(speed)}`} style={{ width: `${Math.max(width, 6)}%` }} />
              </div>
              <span className="text-xs font-bold text-right text-gray-600">{speed} km/h</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FinestraOraria({ ventoOrario, quotaDecollo }: { ventoOrario: any[]; quotaDecollo: number }) {
  const direzioneFreccia = (dir: number) => {
    if (dir >= 337 || dir < 22) return "↑ N";
    if (dir >= 22 && dir < 67) return "↗ NE";
    if (dir >= 67 && dir < 112) return "→ E";
    if (dir >= 112 && dir < 157) return "↘ SE";
    if (dir >= 157 && dir < 202) return "↓ S";
    if (dir >= 202 && dir < 247) return "↙ SW";
    if (dir >= 247 && dir < 292) return "← W";
    return "↖ NW";
  };

  const coloreVento = (speed: number) => {
    if (speed <= 10) return "#4CAF50";
    if (speed <= 18) return "#FFC107";
    if (speed <= 25) return "#FF9800";
    return "#F44336";
  };

  const qualitàVolo = (speed: number, gust: number) => {
    if (speed <= 10 && gust <= 18) return "🟢 Ottimo";
    if (speed <= 15 && gust <= 22) return "🟡 Buono";
    if (speed <= 22 && gust <= 30) return "🟠 Difficile";
    return "🔴 Sconsigliato";
  };

  if (!ventoOrario || ventoOrario.length === 0) return null;

  const oraCorrente = new Date().getHours();

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-4">
      <div className="px-5 py-3.5 border-b border-gray-100">
        <h3 className="text-base font-bold text-gray-800">Previsione oraria (09–19)</h3>
      </div>
      <div className="hidden lg:grid grid-cols-[60px_1fr_80px_80px_80px_100px] gap-2 px-5 py-2 bg-gray-50 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
        <span>Ora</span>
        <span>Vento</span>
        <span>Raffiche</span>
        <span>Dir</span>
        <span>Base</span>
        <span>Volo</span>
      </div>
      <div className="divide-y divide-gray-100">
        {ventoOrario.map((v: any) => {
          const vento = v.quote?.[quotaDecollo] || { speed: 0, dir: 0 };
          const speed = vento.speed || 0;
          const gust = v.gust || 0;
          const isCurrent = v.ora === oraCorrente;
          return (
            <div
              key={v.ora}
              className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-[60px_1fr_80px_80px_80px_100px] gap-2 px-5 py-3 items-center ${
                isCurrent ? "bg-emerald-50 border-l-4 border-l-emerald-400" : "hover:bg-gray-50"
              }`}
            >
              <span className={`text-sm font-bold ${isCurrent ? "text-emerald-600" : "text-gray-900"}`}>
                {String(v.ora).padStart(2, "0")}:00
              </span>
              <span className="text-sm font-semibold" style={{ color: coloreVento(speed) }}>
                {speed} km/h
              </span>
              <span className="text-sm text-gray-600">{gust} km/h</span>
              <span className="text-sm font-bold text-sky-600">{direzioneFreccia(vento.dir)}</span>
              <span className="text-sm text-gray-600">{v.base ? `${v.base}m` : "—"}</span>
              <span className="text-sm font-semibold">{qualitàVolo(speed, gust)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AnalisiTermiche({ analisi }: { analisi: any }) {
  if (!analisi) return null;
  const items = [
    { label: "Salita", value: `${analisi.salita} m/s`, colore: "text-orange-600" },
    { label: "Base termica", value: `${analisi.base} m`, colore: "text-green-600" },
    { label: "Top termico", value: `${analisi.top} m`, colore: "text-red-600" },
    { label: "Spessore", value: `${analisi.spessore} m`, colore: "text-amber-600" },
    { label: "CAPE", value: `${analisi.cape} J/kg`, colore: "text-purple-600" },
    { label: "LCL", value: `${analisi.lcl} m`, colore: "text-blue-600" },
    { label: "Spread", value: `${analisi.spread}°C`, colore: "text-cyan-600" },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      <h3 className="text-base font-bold text-gray-800 mb-4">Analisi termiche</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {items.map((item) => (
          <div key={item.label} className="bg-gray-50 rounded-lg px-3 py-2.5 text-center">
            <div className="text-xs text-gray-500 font-medium">{item.label}</div>
            <div className={`text-base font-bold mt-0.5 ${item.colore}`}>{item.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// Pagina Index
// ============================================================

export default function Index() {
  const {
    selectedId, setSelectedId,
    loading,
    selectedDay, setSelectedDay,
    selectedHour, setSelectedHour,
    site,
    dayData,
    currentData,
    hourlyData,
    thermalDelta,
    enrichedDaily,
    loadWeather,
    allDailyData,
    allHourlyData,
    currentCape,
  } = useWeatherData();

  // Ricava vento orario per il giorno selezionato
  const ventoOrario = useMemo(() => {
    if (!hourlyData || hourlyData.length === 0) return [];
    const oggi = new Date();
    const target = new Date(oggi);
    target.setDate(oggi.getDate() + selectedDay);
    const targetStr = target.toISOString().split("T")[0];
    const hours = hourlyData.filter(h => {
      const d = h.time instanceof Date ? h.time : new Date(h.time);
      return d.toISOString().split("T")[0] === targetStr;
    });
    return hours.map(h => {
      const t = h.time instanceof Date ? h.time : new Date(h.time);
      return {
        ora: t.getHours(),
        quote: { [site.altitude]: { speed: h.windSpeed, dir: h.windDir } },
        gust: h.windGusts,
        base: h.cloudCover > 0 && h.temperature > 0 ? Math.round((h.temperature - h.dewPoint) * 125) : 0,
        top: 0,
        temp: h.temperature,
      };
    }).filter(v => v.ora >= 9 && v.ora <= 19);
  }, [hourlyData, selectedDay, site.altitude]);

  // Dati header
  const headerData = currentData
    ? {
        nome: site.name,
        valle: site.valley,
        quota: site.altitude,
        temp: Math.round(currentData.temperature),
        vento: Math.round(currentData.windSpeed),
        raffiche: Math.round(currentData.windGusts || currentData.windSpeed * 1.4),
      }
    : null;

  // Dati giorni
  const giorniData = useMemo(() => {
    if (!enrichedDaily || enrichedDaily.length === 0) return [];
    return enrichedDaily.slice(0, 3).map((d: any, i: number) => {
      const oggi = new Date();
      const target = new Date(oggi);
      target.setDate(oggi.getDate() + i);
      const targetStr = target.toISOString().split("T")[0];
      const hDay = hourlyData?.filter(h => {
        const t = h.time instanceof Date ? h.time : new Date(h.time);
        return t.toISOString().split("T")[0] === targetStr;
      }) || [];
      const humMed = hDay.length ? Math.round(hDay.reduce((s: number, h: any) => s + h.humidity, 0) / hDay.length) : 50;
      const tempMed = hDay.length ? hDay.reduce((s: number, h: any) => s + h.temperature, 0) / hDay.length : 15;
      const dewMed = hDay.length ? hDay.reduce((s: number, h: any) => s + h.dewPoint, 0) / hDay.length : 8;
      const zero = Math.max(0, Math.round(site.altitude + (tempMed / 0.0098) + 200));
      return {
        data: i === 0 ? "Oggi" : i === 1 ? "Domani" : "Dopodomani",
        icona: getWeatherIcon(d.weatherCode || 0, 1),
        max: Math.round(d.tempMax),
        min: Math.round(d.tempMin),
        vento: Math.round(d.avgWind || 0),
        umidità: humMed,
        zero,
      };
    });
  }, [enrichedDaily, hourlyData, site.altitude]);

  // Analisi termiche
  const analisi = useMemo(() => {
    if (!currentData) return null;
    const termiche = calcolaTermiche(currentData, site.altitude);
    const spread = currentData.temperature - currentData.dewPoint;
    const cape = currentCape?.cape ?? Math.round(Math.max(0, (termiche.forza * 100) + (thermalDelta * 20)));
    return {
      salita: termiche.rateo.toFixed(1),
      base: termiche.base,
      top: termiche.top,
      spessore: termiche.top - termiche.base,
      cape,
      lcl: Math.max(200, Math.min(3000, Math.round(spread * 125))),
      spread: spread.toFixed(1),
    };
  }, [currentData, site.altitude, currentCape, thermalDelta]);

  if (loading && (!hourlyData || hourlyData.length === 0)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-4 border-gray-200 border-t-emerald-500 animate-spin" />
          <p className="text-gray-500 text-sm">Caricamento previsioni...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Meteo dei Conigli</h2>
          <span className="text-xs text-gray-400 bg-gray-200 px-2 py-0.5 rounded-full">Open-Meteo</span>
          <button
            onClick={loadWeather}
            className="ml-auto text-xs text-gray-500 hover:text-gray-700 bg-white border border-gray-200 px-3 py-1.5 rounded-lg shadow-sm"
          >
            🔄 Aggiorna
          </button>
        </div>

        <div className="flex gap-6">
          {/* Sidebar */}
          <aside className="w-64 shrink-0 space-y-2">
            {DECOLLI.map((d) => (
              <button
                key={d.id}
                onClick={() => { setSelectedId(d.id); setSelectedHour(new Date().getHours()); }}
                className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${
                  d.id === selectedId
                    ? "bg-emerald-50 border-emerald-300 shadow-sm"
                    : "bg-white border-gray-200 hover:bg-gray-50"
                }`}
              >
                <div className="text-sm font-bold text-gray-900">{d.name}</div>
                <div className="text-xs text-gray-500">{d.altitude}m · {d.valley}</div>
              </button>
            ))}
          </aside>

          {/* Contenuto */}
          <div className="flex-1 min-w-0">
            {headerData && <HeaderDecollo decollo={headerData} />}

            <div className="flex items-center gap-2 mb-4">
              {["Oggi", "Domani", "Dopodomani"].map((label, i) => (
                <button
                  key={label}
                  onClick={() => setSelectedDay(i)}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-all ${
                    selectedDay === i
                      ? "bg-emerald-500 text-white border-emerald-500 shadow-sm"
                      : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <MeteoGiorni giorni={giorniData} />
            <VentoQuote250 ventoOrario={ventoOrario} />
            <FinestraOraria ventoOrario={ventoOrario} quotaDecollo={site.altitude} />
            <AnalisiTermiche analisi={analisi} />
          </div>
        </div>
      </div>
    </div>
  );
}