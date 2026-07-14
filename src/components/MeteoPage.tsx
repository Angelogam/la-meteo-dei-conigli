"use client";

import React from "react";
import { Wind, Gauge, ArrowUp, Cloud, Thermometer, Droplets, Mountain, Timer } from "lucide-react";

const direzioneFreccia = (dir: number): string => {
  if (dir >= 337 || dir < 22) return "↑ N";
  if (dir >= 22 && dir < 67) return "↗ NE";
  if (dir >= 67 && dir < 112) return "→ E";
  if (dir >= 112 && dir < 157) return "↘ SE";
  if (dir >= 157 && dir < 202) return "↓ S";
  if (dir >= 202 && dir < 247) return "↙ SW";
  if (dir >= 247 && dir < 292) return "← W";
  return "↖ NW";
};

const coloreVento = (speed: number): string => {
  if (speed <= 10) return "#4CAF50";
  if (speed <= 18) return "#FFC107";
  if (speed <= 25) return "#FF9800";
  return "#F44336";
};

const qualitàVolo = (speed: number, gust: number): string => {
  if (speed <= 10 && gust <= 18) return "🟢 Ottimo";
  if (speed <= 15 && gust <= 22) return "🟡 Buono";
  if (speed <= 22 && gust <= 30) return "🟠 Difficile";
  return "🔴 Sconsigliato";
};

interface DatoOrario {
  ora: number;
  quote: Record<number, { speed: number; dir: number }>;
  gust: number;
  base?: number;
  top?: number;
  temp?: number;
}

interface GiornoData {
  data: string;
  icona: string;
  max: number;
  min: number;
  vento: number;
  umidità: number;
  zero: number;
}

interface DecolloData {
  nome: string;
  valle: string;
  quota: number;
  temp: number;
  vento: number;
  raffiche: number;
}

interface MeteoPageDati {
  decollo: DecolloData;
  giorni: GiornoData[];
  ventoOrario: DatoOrario[];
  quotaDecollo: number;
  analisi: {
    salita: string;
    base: number;
    top: number;
    spessore: number;
    cape: number;
    lcl: number;
    spread: string;
  };
}

interface MeteoPageProps {
  dati: MeteoPageDati;
}

export default function MeteoPage({ dati }: MeteoPageProps) {
  const { decollo, giorni, ventoOrario, quotaDecollo, analisi } = dati;

  const qualità =
    decollo.vento <= 10 && decollo.raffiche <= 18
      ? "🟢 Ottimo"
      : decollo.vento <= 15 && decollo.raffiche <= 22
      ? "🟡 Buono"
      : decollo.vento <= 22 && decollo.raffiche <= 30
      ? "🟠 Difficile"
      : "🔴 Sconsigliato";

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-4">
      {/* HEADER DECOLLO */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h2 className="text-xl font-bold text-gray-900">{decollo.nome}</h2>
        <p className="text-sm text-gray-500 mt-0.5">{decollo.valle} · {decollo.quota} m</p>
        <div className="flex flex-wrap gap-4 mt-3 text-sm">
          <span className="bg-orange-50 px-3 py-1.5 rounded-lg font-semibold text-orange-700">🌤️ {decollo.temp}°</span>
          <span className="bg-blue-50 px-3 py-1.5 rounded-lg font-semibold text-blue-700">💨 {decollo.vento} km/h</span>
          <span className="bg-red-50 px-3 py-1.5 rounded-lg font-semibold text-red-700">🌪️ {decollo.raffiche} km/h</span>
          <span className="bg-green-50 px-3 py-1.5 rounded-lg font-semibold text-green-700">🪂 {qualità}</span>
        </div>
      </div>

      {/* METEO GIORNI */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {giorni.map((g) => (
          <div key={g.data} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <h4 className="text-sm font-bold text-gray-700 mb-2">{g.data}</h4>
            <div className="text-2xl mb-1">{g.icona}</div>
            <div className="text-lg font-bold text-gray-900">{g.max}° / {g.min}°</div>
            <div className="text-sm text-gray-500 mt-1">💨 {g.vento} km/h</div>
            <div className="text-sm text-gray-500">💧 {g.umidità}%</div>
            <div className="text-sm text-gray-500">❄️ {g.zero} m</div>
          </div>
        ))}
      </div>

      {/* VENTO QUOTE 250M */}
      {ventoOrario.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-base font-bold text-gray-800 mb-4">Vento in quota (step 250m)</h3>
          {Object.keys(ventoOrario[0].quote).map((q) => {
            const speed = ventoOrario[0].quote[Number(q)]?.speed || 0;
            const dir = ventoOrario[0].quote[Number(q)]?.dir || 0;
            return (
              <div key={q} className="grid grid-cols-[80px_1fr_60px] gap-3 items-center py-2 border-b border-gray-100 last:border-0">
                <span className="text-sm font-mono font-semibold text-gray-600">{q} m</span>
                <div className="h-5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      speed <= 8 ? "bg-green-400" : speed <= 15 ? "bg-amber-400" : speed <= 22 ? "bg-orange-400" : "bg-red-400"
                    }`}
                    style={{ width: `${Math.min(100, speed * 4)}%` }}
                  />
                </div>
                <span className="text-sm font-bold text-right text-gray-700">{speed} km/h</span>
              </div>
            );
          })}
        </div>
      )}

      {/* FINESTRA ORARIA */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <h3 className="text-base font-bold text-gray-800">Previsione oraria (09–19)</h3>
        </div>
        <div className="hidden lg:grid grid-cols-[60px_80px_80px_80px_100px_100px] gap-2 px-5 py-2 bg-gray-50 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
          <span>Ora</span>
          <span>Vento</span>
          <span>Raffiche</span>
          <span>Dir</span>
          <span>Base</span>
          <span>Volo</span>
        </div>
        <div className="divide-y divide-gray-100">
          {ventoOrario.map((v) => {
            const vento = v.quote[quotaDecollo] || { speed: 0, dir: 0 };
            const speed = vento.speed || 0;
            const gust = v.gust || 0;
            return (
              <div key={v.ora} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-[60px_80px_80px_80px_100px_100px] gap-2 px-5 py-3 items-center hover:bg-gray-50 transition-colors">
                <span className="text-sm font-bold text-gray-900">{String(v.ora).padStart(2, "0")}:00</span>
                <span className="text-sm font-semibold" style={{ color: coloreVento(speed) }}>{speed} km/h</span>
                <span className="text-sm text-gray-600">{gust} km/h</span>
                <span className="text-sm font-bold text-sky-600">{direzioneFreccia(vento.dir)}</span>
                <span className="text-sm text-gray-600">{v.base ? `${v.base}m` : "—"}</span>
                <span className="text-sm font-semibold">{qualitàVolo(speed, gust)}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ANALISI TERMICHE */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h3 className="text-base font-bold text-gray-800 mb-4">Analisi termiche</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          <Item label="Salita" value={`${analisi.salita} m/s`} colore="text-orange-600" />
          <Item label="Base termica" value={`${analisi.base} m`} colore="text-green-600" />
          <Item label="Top termico" value={`${analisi.top} m`} colore="text-red-600" />
          <Item label="Spessore" value={`${analisi.spessore} m`} colore="text-amber-600" />
          <Item label="CAPE" value={`${analisi.cape} J/kg`} colore="text-purple-600" />
          <Item label="LCL" value={`${analisi.lcl} m`} colore="text-blue-600" />
          <Item label="Spread" value={`${analisi.spread}°C`} colore="text-cyan-600" />
        </div>
      </div>
    </div>
  );
}

function Item({ label, value, colore }: { label: string; value: string; colore: string }) {
  return (
    <div className="bg-gray-50 rounded-lg px-3 py-2.5 text-center">
      <div className="text-xs text-gray-500 font-medium">{label}</div>
      <div className={`text-base font-bold mt-0.5 ${colore}`}>{value}</div>
    </div>
  );
}