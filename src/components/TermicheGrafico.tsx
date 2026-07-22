"use client";

import React, { useMemo } from "react";
import {
  ArrowUp, ArrowDown, Thermometer, Wind, Cloud, Gauge,
  Calendar, Clock, MapPin, TrendingUp, Layers
} from "lucide-react";

interface OraTermica {
  ora: number;
  rateo: number;
  base: number;
  top: number;
  spessore: number;
  ventoVel: number;
  ventoDir: string;
  ventoGradi: number;
  nuvole: number;
  temperatura: number;
  dewPoint: number;
  spread: number;
}

interface TermicheGraficoProps {
  dayData: any[];
  alt: number;
  siteName?: string;
  windProfile?: { height: number; speed: number; dir: number }[];
}

function formatDateShort(date: Date): string {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return "";
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function getCurrentTime(): string {
  return new Date().toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
}

const DIR_LABELS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];

function dirToLabel(gradi: number): string {
  return DIR_LABELS[Math.round((gradi || 0) / 45) % 8];
}

function calcolaTermicaAvanzata(h: any, alt: number): OraTermica | null {
  if (!h) return null;

  const temp = h.temperature ?? 20;
  const dewPoint = h.dewPoint ?? (temp - 12);
  const windSpeed = h.windSpeed ?? 0;
  const windDir = h.windDir ?? 0;
  const cloudCover = h.cloudCover ?? 30;
  const precipitation = h.precipitation ?? 0;

  const spread = Math.max(0.1, temp - dewPoint);
  const hum = h.humidity ?? 70;

  // Calcolo base termica (metodo delta-T semplificato)
  let deltaTad = 0.98; // lapse rate secco °C/100m
  let deltaTenv = 0.65; // lapse rate ambiente medio
  let gradiente = (deltaTad - deltaTenv) * 100; // °C per 100m

  // Base della termica (sopra suolo)
  let baseSopraSuolo: number;
  if (spread > 0) {
    // Metodo spread-based migliorato
    baseSopraSuolo = Math.round(Math.min(2500, Math.max(100, spread * 130)));
  } else {
    baseSopraSuolo = 300;
  }

  // Vento influenza lo sviluppo verticale
  let windBonus = 1;
  if (windSpeed >= 5 && windSpeed <= 18) windBonus = 1.2;
  else if (windSpeed > 18 && windSpeed <= 25) windBonus = 0.8;
  else if (windSpeed > 25) windBonus = 0.3;

  // Nuvole influenzano lo sviluppo
  let cloudBonus = 1;
  if (cloudCover >= 10 && cloudCover <= 40) cloudBonus = 1.3;
  else if (cloudCover > 40 && cloudCover <= 60) cloudBonus = 1.1;
  else if (cloudCover > 60 && cloudCover <= 80) cloudBonus = 0.6;
  else if (cloudCover > 80) cloudBonus = 0.2;

  // Precipitazioni bloccano tutto
  let precipPenalty = 1;
  if (precipitation > 2) precipPenalty = 0;
  else if (precipitation > 1) precipPenalty = 0.15;
  else if (precipitation > 0.3) precipPenalty = 0.4;

  // Calcolo rateo di salita
  let rateoBase = Math.min(4, Math.max(0.1, spread * 0.22));
  let rateoVento = 0;
  if (windSpeed >= 4 && windSpeed <= 18) rateoVento = Math.min(0.8, windSpeed / 18 * 0.7);
  else if (windSpeed >= 2 && windSpeed < 4) rateoVento = 0.2;

  let rateoNuvole = 0;
  if (cloudCover >= 10 && cloudCover <= 45) rateoNuvole = Math.min(0.6, cloudCover / 75);
  else if (cloudCover < 10) rateoNuvole = 0.1;

  const rateo = Math.round(Math.min(5, Math.max(0, (rateoBase + rateoVento + rateoNuvole) * precipPenalty * windBonus)) * 10) / 10;

  // Top della termica (quota di arrivo)
  let topSopraSuolo: number;
  if (rateo >= 3) {
    topSopraSuolo = Math.min(3500, baseSopraSuolo + Math.round(rateo * 500));
  } else if (rateo >= 2) {
    topSopraSuolo = Math.min(3000, baseSopraSuolo + Math.round(rateo * 400));
  } else if (rateo >= 1) {
    topSopraSuolo = Math.min(2500, baseSopraSuolo + Math.round(rateo * 300));
  } else if (rateo >= 0.3) {
    topSopraSuolo = Math.min(1800, baseSopraSuolo + Math.round(rateo * 200));
  } else {
    topSopraSuolo = baseSopraSuolo + 100;
  }

  // Se rateo è 0, non c'è termica
  if (rateo < 0.1) {
    return {
      ora: new Date(h.time).getHours(),
      rateo: 0,
      base: alt + 100,
      top: alt + 150,
      spessore: 50,
      ventoVel: windSpeed,
      ventoDir: dirToLabel(windDir),
      ventoGradi: windDir,
      nuvole: cloudCover,
      temperatura: temp,
      dewPoint,
      spread,
    };
  }

  const base = alt + (baseSopraSuolo * windBonus * cloudBonus);
  const top = alt + (baseSopraSuolo + topSopraSuolo) * windBonus * cloudBonus;

  return {
    ora: new Date(h.time).getHours(),
    rateo,
    base: Math.round(Math.min(5000, Math.max(alt + 50, base))),
    top: Math.round(Math.min(6000, Math.max(base + 100, top))),
    spessore: Math.round(top - base),
    ventoVel: windSpeed,
    ventoDir: dirToLabel(windDir),
    ventoGradi: windDir,
    nuvole: cloudCover,
    temperatura: temp,
    dewPoint,
    spread: Math.round(spread * 10) / 10,
  };
}

export default function TermicheGrafico({ dayData, alt, siteName }: TermicheGraficoProps) {
  const oraCorrente = getCurrentTime();
  const dataGiorno = useMemo(() => {
    if (dayData && dayData.length > 0) return formatDateShort(new Date(dayData[0].time));
    return formatDateShort(new Date());
  }, [dayData]);

  const oreTermiche = useMemo(() => {
    if (!dayData || dayData.length === 0) return [];
    return dayData
      .filter(h => {
        if (!h.time) return false;
        const hh = new Date(h.time).getHours();
        return hh >= 7 && hh <= 20;
      })
      .map(h => calcolaTermicaAvanzata(h, alt))
      .filter((t): t is OraTermica => t !== null)
      .sort((a, b) => a.ora - b.ora);
  }, [dayData, alt]);

  // Statistiche
  const stats = useMemo(() => {
    if (oreTermiche.length === 0) return null;
    const validi = oreTermiche.filter(t => t.rateo >= 0.3);
    const ratei = oreTermiche.map(t => t.rateo);
    const tops = validi.map(t => t.top);
    const bases = validi.map(t => t.base);
    const spessori = validi.map(t => t.spessore);

    return {
      mediaRateo: ratei.length > 0 ? ratei.reduce((s, v) => s + v, 0) / ratei.length : 0,
      maxRateo: ratei.length > 0 ? Math.max(...ratei) : 0,
      mediaTop: tops.length > 0 ? tops.reduce((s, v) => s + v, 0) / tops.length : 0,
      maxTop: tops.length > 0 ? Math.max(...tops) : alt,
      mediaBase: bases.length > 0 ? bases.reduce((s, v) => s + v, 0) / bases.length : 0,
      mediaSpessore: spessori.length > 0 ? spessori.reduce((s, v) => s + v, 0) / spessori.length : 0,
      oreAttive: validi.length,
      totaleOre: oreTermiche.length,
    };
  }, [oreTermiche]);

  const maxTopGrafico = useMemo(() => {
    if (oreTermiche.length === 0) return alt + 2000;
    return Math.max(...oreTermiche.map(t => t.top), alt + 1000);
  }, [oreTermiche, alt]);

  const arrTop10 = [...oreTermiche].sort((a, b) => b.top - a.top).slice(0, 3);

  if (oreTermiche.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-500">
        <Cloud className="w-16 h-16 text-slate-700 mb-4" />
        <p className="text-lg font-bold text-slate-400">Nessun dato termico</p>
        <p className="text-xs text-slate-600 mt-1">Aggiornamento: {oraCorrente}</p>
      </div>
    );
  }

  // Funzione per mappare quota a percentuale nel grafico
  const quotaToY = (quota: number): number => {
    const min = alt - 200;
    const max = maxTopGrafico + 500;
    return 100 - ((quota - min) / (max - min)) * 100;
  };

  const maxRateoGrafico = Math.max(4, Math.max(...oreTermiche.map(t => t.rateo)) + 1);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="text-center bg-slate-800/60 border border-orange-500/20 rounded-xl px-4 py-3">
        <div className="text-base font-bold text-white flex items-center justify-center gap-2">
          <Layers className="w-4 h-4 text-orange-400" />
          {siteName || "Decollo"} — Profilo termico avanzato
        </div>
        <div className="text-[10px] text-slate-500 flex items-center justify-center gap-2 mt-1">
          <Calendar className="w-3 h-3" />
          <span>{dataGiorno}</span>
          <span className="text-slate-600">·</span>
          <Clock className="w-3 h-3" />
          <span>{oraCorrente}</span>
          <span className="text-slate-600">·</span>
          <MapPin className="w-3 h-3" />
          <span>{alt} m slm</span>
        </div>
      </div>

      {/* Statistiche rapide */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="card-center bg-slate-800/50 border border-slate-700/50 rounded-xl p-3">
            <ArrowUp className="w-4 h-4 text-orange-400 mx-auto mb-1" />
            <div className="text-[9px] text-slate-400 uppercase tracking-wider">Rateo medio</div>
            <div className="text-lg font-bold text-orange-300">{stats.mediaRateo.toFixed(1)}</div>
            <div className="text-[9px] text-slate-500">m/s</div>
            <div className="card-datetime">{dataGiorno} · {oraCorrente}</div>
          </div>
          <div className="card-center bg-slate-800/50 border border-slate-700/50 rounded-xl p-3">
            <TrendingUp className="w-4 h-4 text-amber-400 mx-auto mb-1" />
            <div className="text-[9px] text-slate-400 uppercase tracking-wider">Top medio</div>
            <div className="text-lg font-bold text-amber-300">{Math.round(stats.mediaTop)}</div>
            <div className="text-[9px] text-slate-500">m slm</div>
            <div className="card-datetime">{dataGiorno} · {oraCorrente}</div>
          </div>
          <div className="card-center bg-slate-800/50 border border-slate-700/50 rounded-xl p-3">
            <Layers className="w-4 h-4 text-sky-400 mx-auto mb-1" />
            <div className="text-[9px] text-slate-400 uppercase tracking-wider">Spessore medio</div>
            <div className="text-lg font-bold text-sky-300">{Math.round(stats.mediaSpessore)}</div>
            <div className="text-[9px] text-slate-500">m</div>
            <div className="card-datetime">{dataGiorno} · {oraCorrente}</div>
          </div>
          <div className="card-center bg-slate-800/50 border border-slate-700/50 rounded-xl p-3">
            <Gauge className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
            <div className="text-[9px] text-slate-400 uppercase tracking-wider">Ore attive</div>
            <div className="text-lg font-bold text-emerald-300">{stats.oreAttive}</div>
            <div className="text-[9px] text-slate-500">/{stats.totaleOre}h</div>
            <div className="card-datetime">{dataGiorno} · {oraCorrente}</div>
          </div>
        </div>
      )}

      {/* Top 3 migliori termiche */}
      {arrTop10.length > 0 && (
        <div className="bg-slate-800/40 border border-amber-500/20 rounded-xl p-3">
          <div className="text-[10px] text-amber-400 text-center mb-2 font-bold uppercase tracking-wider">
            🏆 Migliori finestre termiche (quota massima)
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {arrTop10.map((t, idx) => (
              <div key={idx} className="card-center bg-slate-800/60 rounded-lg p-2 min-w-[90px] border border-amber-500/20">
                <div className="text-[10px] text-amber-400">
                  {idx === 0 ? "🥇 Top" : idx === 1 ? "🥈 Top" : "🥉 Top"}
                </div>
                <div className="text-xs font-bold text-white">{String(t.ora).padStart(2, "0")}:00</div>
                <div className="text-sm font-bold text-amber-300">{t.top} m</div>
                <div className="text-[9px] text-slate-500">{t.rateo} m/s</div>
                <div className="card-datetime">{dataGiorno}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* GRAFICO A BARRE VERTICALI PROFESSIONALE */}
      <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-4">
        <div className="text-xs text-slate-400 text-center mb-3 font-bold uppercase tracking-wider">
          Profilo termico orario — Base / Top / Rateo
        </div>

        <div className="flex justify-center gap-1 sm:gap-2 overflow-x-auto pb-2">
          {oreTermiche.map((t, idx) => {
            const altezzaTotale = maxTopGrafico - alt + 500;
            const baseOffset = ((t.base - alt) / altezzaTotale) * 100;
            const topOffset = ((t.top - alt) / altezzaTotale) * 100;
            const altezzaBarra = topOffset - baseOffset;

            const rateoPercent = Math.min(100, (t.rateo / maxRateoGrafico) * 100);

            // Colore rateo
            const rateoColor =
              t.rateo >= 2.5 ? "from-orange-500 to-amber-400" :
              t.rateo >= 1.5 ? "from-amber-500 to-yellow-400" :
              t.rateo >= 0.8 ? "from-yellow-500 to-amber-300" :
              t.rateo >= 0.3 ? "from-sky-500 to-blue-400" :
              "from-slate-600 to-slate-500";

            return (
              <div key={idx} className="flex flex-col items-center min-w-[36px] sm:min-w-[44px]">
                {/* Etichetta top */}
                <div className="text-[8px] text-slate-500 mb-1 leading-tight text-center">
                  {t.top}
                  <br />
                  <span className="text-[6px]">m</span>
                </div>

                {/* Barra verticale */}
                <div className="relative w-6 sm:w-8 h-[140px] bg-slate-900/60 rounded-full border border-slate-700/30">
                  {/* Sovrapposizione termica */}
                  <div
                    className="absolute bottom-0 left-0 right-0 rounded-full bg-gradient-to-t transition-all duration-300"
                    style={{
                      height: `${Math.max(3, altezzaBarra)}%`,
                      bottom: `${Math.max(0, baseOffset)}%`,
                      background: `linear-gradient(to top, ${t.rateo >= 0.3 ? "rgba(251, 146, 60, 0.8)" : "rgba(71, 85, 105, 0.5)"}, ${t.rateo >= 0.3 ? "rgba(251, 191, 36, 0.6)" : "rgba(100, 116, 139, 0.3)"})`,
                      boxShadow: t.rateo >= 1 ? "0 0 8px rgba(251, 146, 60, 0.4)" : "none",
                    }}
                  />

                  {/* Linea base */}
                  <div
                    className="absolute left-0 right-0 h-px bg-slate-500/50"
                    style={{ bottom: `${Math.max(0, baseOffset)}%` }}
                  />
                </div>

                {/* Rateo (m/s) sotto la barra */}
                <div className="mt-1 text-[10px] font-bold"
                  style={{
                    color:
                      t.rateo >= 2.5 ? "#f97316" :
                      t.rateo >= 1.5 ? "#f59e0b" :
                      t.rateo >= 0.8 ? "#eab308" :
                      t.rateo >= 0.3 ? "#0ea5e9" :
                      "#64748b"
                  }}
                >
                  {t.rateo.toFixed(1)}
                </div>

                {/* Ora */}
                <div className="text-[8px] text-slate-500">{String(t.ora).padStart(2, "0")}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tabella dettagli orari */}
      <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-4">
        <div className="text-xs text-slate-400 text-center mb-3 font-bold uppercase tracking-wider">
          Dettaglio orario termiche
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-center text-[11px]">
            <thead>
              <tr className="text-slate-500 border-b border-slate-700/40">
                <th className="p-2">Ora</th>
                <th className="p-2">Rateo</th>
                <th className="p-2">Base</th>
                <th className="p-2">Top</th>
                <th className="p-2">Spessore</th>
                <th className="p-2">Vento</th>
                <th className="p-2">Nuvole</th>
                <th className="p-2">Temp</th>
              </tr>
            </thead>
            <tbody>
              {oreTermiche.map((t, idx) => (
                <tr key={idx} className="border-b border-slate-700/20 hover:bg-slate-700/20">
                  <td className="p-2 font-bold text-white">{String(t.ora).padStart(2, "0")}:00</td>
                  <td className="p-2">
                    <span className={
                      t.rateo >= 2.5 ? "text-orange-400 font-bold" :
                      t.rateo >= 1.5 ? "text-amber-400 font-bold" :
                      t.rateo >= 0.8 ? "text-yellow-400" :
                      t.rateo >= 0.3 ? "text-sky-400" :
                      "text-slate-500"
                    }>
                      {t.rateo.toFixed(1)}
                    </span>
                  </td>
                  <td className="p-2 text-slate-300">{t.base} m</td>
                  <td className="p-2 text-amber-300 font-bold">{t.top} m</td>
                  <td className="p-2 text-sky-300">{t.spessore} m</td>
                  <td className="p-2 text-slate-300">{t.ventoVel} km/h {t.ventoDir}</td>
                  <td className="p-2">
                    <span className={t.nuvole > 60 ? "text-slate-400" : t.nuvole > 30 ? "text-amber-300" : "text-sky-300"}>
                      {t.nuvole}%
                    </span>
                  </td>
                  <td className="p-2 text-slate-300">{Math.round(t.temperatura)}°C</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-[9px] text-slate-600 border-t border-slate-700/30 pt-2">
        {siteName || "Decollo"} · Modello termico avanzato · Base: {alt} m · Ultimo aggiornamento: {oraCorrente}
      </div>
    </div>
  );
}