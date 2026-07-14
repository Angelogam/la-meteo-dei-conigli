"use client";

import React, { useMemo } from "react";
import { Sun, Thermometer, Wind, Cloud, Droplets, Gauge, TrendingUp, ArrowUp, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import type { HourData } from "@/types/meteo";

interface AnalisiMeteoProps {
  currentData: HourData | null;
  dayData: HourData[];
  site: { alt: number; lat?: number; lon?: number; name?: string; exposure?: string };
}

function getWindDirName(deg: number): string {
  if (deg == null) return "N/D";
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return dirs[Math.round(deg / 22.5) % 16];
}

function getWindDescription(speed: number): string {
  if (speed < 3) return "calma o brezza molto leggera";
  if (speed < 8) return "brezza leggera";
  if (speed < 15) return "vento moderato";
  if (speed < 22) return "vento sostenuto";
  if (speed < 30) return "vento forte";
  return "vento molto forte";
}

function getCloudDescription(cover: number): string {
  if (cover < 10) return "sereno";
  if (cover < 25) return "poco nuvoloso";
  if (cover < 45) return "parzialmente nuvoloso";
  if (cover < 65) return "nuvoloso";
  if (cover < 85) return "molto nuvoloso";
  return "coperto";
}

function getThermalLabel(rateo: number): string {
  if (rateo >= 4) return "forti 🔥";
  if (rateo >= 3) return "buone 🪂";
  if (rateo >= 2) return "moderate 🌤️";
  if (rateo >= 1) return "deboli 🌥️";
  if (rateo >= 0.3) return "molto deboli ☁️";
  return "assenti ❄️";
}

function getUmiditaDescrizione(hum: number): string {
  if (hum < 30) return "molto secca, ottima visibilità";
  if (hum < 50) return "secca, buona visibilità";
  if (hum < 65) return "moderata, visibilità discreta";
  if (hum < 80) return "umida, visibilità ridotta";
  return "molto umida, possibile foschia";
}

function getPressioneDescrizione(press: number): string {
  if (press > 1025) return "alta, tempo stabile";
  if (press > 1015) return "moderatamene alta, condizioni discrete";
  if (press > 1005) return "nella norma";
  if (press > 995) return "in calo, possibile peggioramento";
  return "bassa, condizioni instabili";
}

function getVentoDirezioneDescrizione(dir: number): string {
  const dirs = ["Nord", "Nord-Est", "Est", "Sud-Est", "Sud", "Sud-Ovest", "Ovest", "Nord-Ovest"];
  return dirs[Math.round(dir / 45) % 8];
}

function getFasceCondizioni(
  mattina: HourData[],
  pomeriggio: HourData[],
  sera: HourData[]
): { fascia: string; condizioni: string; note: string }[] {
  const media = (arr: number[]) => arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0;

  const calcolaMattina = () => {
    if (mattina.length === 0) return { condizioni: "N/D", note: "" };
    const t = Math.round(media(mattina.map(h => h.temperature)));
    const w = Math.round(media(mattina.map(h => h.windSpeed)));
    const c = Math.round(media(mattina.map(h => h.cloudCover)));
    let cond = `${t}°C, vento ${w} km/h, ${c}% nuvole`;
    let note = c < 30 ? "Sereno, buona visibilità" : c < 60 ? "Qualche nuvola" : "Nuvoloso";
    if (w < 5) note += ", vento debole";
    else if (w < 12) note += ", vento gestibile";
    else if (w < 18) note += ", vento sostenuto";
    else note += ", vento forte";
    return { condizioni: cond, note };
  };

  const calcolaPomeriggio = () => {
    if (pomeriggio.length === 0) return { condizioni: "N/D", note: "" };
    const t = Math.round(media(pomeriggio.map(h => h.temperature)));
    const w = Math.round(media(pomeriggio.map(h => h.windSpeed)));
    const c = Math.round(media(pomeriggio.map(h => h.cloudCover)));
    const p = Math.round(media(pomeriggio.map(h => h.precipitation || 0)) * 10) / 10;
    let cond = `${t}°C, vento ${w} km/h, ${c}% nuvole`;
    let note = c >= 20 && c <= 50 ? "Possibili cumuli da termica" : c > 50 ? "Nuvoloso, termiche incerte" : "Cielo sereno, termiche buone";
    if (p > 0) note += `, pioggia: ${p} mm`;
    if (w >= 5 && w <= 15) note += ", condizioni favorevoli per volo";
    else if (w > 18) note += ", vento sostenuto";
    return { condizioni: cond, note };
  };

  const calcolaSera = () => {
    if (sera.length === 0) return { condizioni: "N/D", note: "" };
    const t = Math.round(media(sera.map(h => h.temperature)));
    const w = Math.round(media(sera.map(h => h.windSpeed)));
    const c = Math.round(media(sera.map(h => h.cloudCover)));
    let cond = `${t}°C, vento ${w} km/h, ${c}% nuvole`;
    let note = "Atmosfera stabile, temperatura in calo";
    if (c < 20) note += ", cielo sereno";
    else note += ", qualche nuvola residua";
    return { condizioni: cond, note };
  };

  return [
    { fascia: "Mattina (6–11)", ...calcolaMattina() },
    { fascia: "Pomeriggio (12–17)", ...calcolaPomeriggio() },
    { fascia: "Sera (18–21)", ...calcolaSera() },
  ];
}

export default function AnalisiMeteo({ currentData, dayData, site }: AnalisiMeteoProps) {
  const alt = site?.alt ?? 1000;

  const analisi = useMemo(() => {
    if (!dayData || dayData.length < 3) return null;

    const oreGiorno = dayData.filter(h => {
      const hh = h.time.getHours();
      return hh >= 6 && hh <= 21;
    });

    if (oreGiorno.length < 3) return null;

    const mattina = oreGiorno.filter(h => { const hh = h.time.getHours(); return hh >= 6 && hh <= 11; });
    const pomeriggio = oreGiorno.filter(h => { const hh = h.time.getHours(); return hh >= 12 && hh <= 17; });
    const sera = oreGiorno.filter(h => { const hh = h.time.getHours(); return hh >= 18 && hh <= 21; });

    const media = (arr: number[]) => arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0;
    const max = (arr: number[]) => arr.length ? Math.max(...arr) : 0;
    const minLocal = (arr: number[]) => arr.length ? Math.min(...arr) : 0;

    const tempMattina = mattina.length ? Math.round(media(mattina.map(h => h.temperature))) : null;
    const tempPomeriggio = pomeriggio.length ? Math.round(media(pomeriggio.map(h => h.temperature))) : null;
    const tempSera = sera.length ? Math.round(media(sera.map(h => h.temperature))) : null;
    const tempMaxGiorno = Math.round(max(oreGiorno.map(h => h.temperature)));
    const tempMinGiorno = Math.round(minLocal(oreGiorno.map(h => h.temperature)));
    const deltaTermico = tempMaxGiorno - tempMinGiorno;

    const umiditaMedia = Math.round(media(oreGiorno.map(h => h.humidity)));

    const ventoMedio = Math.round(media(oreGiorno.map(h => h.windSpeed)));
    const ventoMax = Math.round(max(oreGiorno.map(h => h.windSpeed)));
    const ventoGustsMax = Math.round(max(oreGiorno.map(h => h.windGusts || 0)));
    const ventoDirMedia = Math.round(media(oreGiorno.map(h => h.windDir).filter(d => d != null)));

    const nuvoleMedia = Math.round(media(oreGiorno.map(h => h.cloudCover)));

    const pioggiaTot = Math.round(oreGiorno.reduce((s, h) => s + (h.precipitation || 0), 0) * 10) / 10;
    const oreConPioggia = oreGiorno.filter(h => (h.precipitation || 0) > 0.3).length;

    const pressioneMedia = Math.round(media(oreGiorno.map(h => h.pressure).filter(p => p != null)));

    const tempMedia = media(oreGiorno.map(h => h.temperature));
    const dewMedia = media(oreGiorno.map(h => h.dewPoint));
    const spread = tempMedia - dewMedia;

    const lcl = Math.max(alt + 50, Math.min(alt + 3000, Math.round(spread * 125 + alt)));
    const zeroTermico = Math.max(alt, Math.round(alt + (tempMedia / 0.0098)));

    const dataGiorno = dayData[0]?.time ?? new Date();
    const dateStr = dataGiorno.toLocaleDateString("it-IT", {
      weekday: "long", day: "numeric", month: "long", year: "numeric"
    });

    const fasceOrarie = getFasceCondizioni(mattina, pomeriggio, sera);

    const puntiPositivi: string[] = [];
    const puntiNegativi: string[] = [];

    if (ventoMedio >= 5 && ventoMedio <= 15) puntiPositivi.push("vento ideale per il volo");
    else if (ventoMedio > 15 && ventoMedio <= 22) puntiNegativi.push("vento sostenuto, attenzione in quota");
    else if (ventoMedio > 22) puntiNegativi.push("vento forte, sconsigliato ai meno esperti");
    else if (ventoMedio < 3) puntiNegativi.push("vento troppo debole per termiche significative");

    if (pioggiaTot === 0) puntiPositivi.push("nessuna pioggia prevista");
    else if (pioggiaTot > 2) puntiNegativi.push(`pioggia prevista (${pioggiaTot.toFixed(1)} mm)`);

    if (nuvoleMedia >= 15 && nuvoleMedia <= 50) puntiPositivi.push("cumuli da termica ben distribuiti");
    else if (nuvoleMedia > 70) puntiNegativi.push("cielo molto coperto, termiche rallentate");

    if (deltaTermico >= 10) puntiPositivi.push("buona escursione termica");
    else if (deltaTermico < 5) puntiNegativi.push("scarsa escursione termica");

    if (ventoGustsMax > 30) puntiNegativi.push(`raffiche forti (${ventoGustsMax} km/h)`);

    let valutazione = "";
    if (puntiPositivi.length >= 3) {
      valutazione = `Condizioni complessivamente favorevoli: ${puntiPositivi.join(", ")}.`;
      if (puntiNegativi.length > 0) valutazione += ` Attenzione a: ${puntiNegativi.join(", ")}.`;
    } else if (puntiPositivi.length >= 1) {
      valutazione = `Condizioni discrete: ${puntiPositivi.join(", ")}.`;
      if (puntiNegativi.length > 0) valutazione += ` Criticità: ${puntiNegativi.join(", ")}.`;
    } else {
      valutazione = `Condizioni difficili: ${puntiNegativi.join(", ")}. Si consiglia prudenza.`;
    }

    return {
      tempMattina,
      tempPomeriggio,
      tempSera,
      tempMaxGiorno,
      tempMinGiorno,
      deltaTermico,
      umiditaMedia,
      ventoMedio,
      ventoMax,
      ventoGustsMax,
      ventoDirMedia,
      ventoDirNome: getWindDirName(ventoDirMedia),
      nuvoleMedia,
      pioggiaTot,
      oreConPioggia,
      pressioneMedia,
      lcl,
      zeroTermico,
      spread: Math.round(spread * 10) / 10,
      dateStr,
      fasceOrarie,
      valutazione,
      puntiPositivi,
      puntiNegativi,
    };
  }, [dayData, alt]);

  if (!analisi) {
    return (
      <div className="text-center py-12 text-slate-400 text-base">
        <Sun className="w-10 h-10 mx-auto mb-3 text-slate-500" />
        Dati insufficienti per generare l'analisi della giornata.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ☀️ Situazione generale */}
      <div className="bg-gradient-to-br from-slate-900/60 to-slate-800/30 border-2 border-slate-700/30 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Sun className="w-6 h-6 text-orange-400" />
          <h3 className="text-base font-bold text-white">Situazione generale · {analisi.dateStr}</h3>
        </div>
        <div className="space-y-2 text-sm text-slate-300 leading-relaxed">
          <p className="flex items-start gap-2">
            <span className="text-emerald-400 mt-1 shrink-0">✦</span>
            <span>
              Temperatura al suolo: {analisi.tempMattina != null ? `intorno ai ${analisi.tempMattina}°C al mattino` : "dati in aggiornamento"},
              {analisi.tempPomeriggio != null ? ` con aumento fino a circa ${analisi.tempPomeriggio}°C nel pomeriggio` : ""}.
              {analisi.tempSera != null ? ` In serata scende a ${analisi.tempSera}°C.` : ""}
              Massima giornaliera: {analisi.tempMaxGiorno}°C, minima: {analisi.tempMinGiorno}°C.
              {analisi.deltaTermico >= 10
                ? ` Buona escursione termica (${analisi.deltaTermico}°C) che favorisce le termiche.`
                : analisi.deltaTermico >= 6
                ? ` Escursione moderata (${analisi.deltaTermico}°C).`
                : ` Escursione contenuta (${analisi.deltaTermico}°C).`}
            </span>
          </p>
          <p className="flex items-start gap-2">
            <span className="text-emerald-400 mt-1 shrink-0">✦</span>
            <span>Umidità relativa: {analisi.umiditaMedia}% — aria {getUmiditaDescrizione(analisi.umiditaMedia)}.</span>
          </p>
          <p className="flex items-start gap-2">
            <span className="text-emerald-400 mt-1 shrink-0">✦</span>
            <span>
              Vento: {analisi.ventoMedio} km/h medi, prevalente da {getVentoDirezioneDescrizione(analisi.ventoDirMedia)} ({analisi.ventoDirNome} {analisi.ventoDirMedia}°).
              Al suolo vento {getWindDescription(analisi.ventoMedio)}.
              {analisi.ventoGustsMax > analisi.ventoMedio * 1.5 ? ` Attenzione alle raffiche: fino a ${analisi.ventoGustsMax} km/h.` : ""}
            </span>
          </p>
          <p className="flex items-start gap-2">
            <span className="text-emerald-400 mt-1 shrink-0">✦</span>
            <span>
              Cielo: {getCloudDescription(analisi.nuvoleMedia)} (copertura media {analisi.nuvoleMedia}%).
              {analisi.nuvoleMedia >= 20 && analisi.nuvoleMedia < 60
                ? " Possibile sviluppo di cumuli pomeridiani."
                : analisi.nuvoleMedia >= 60
                ? " Nuvolosità significativa che potrebbe limitare lo sviluppo termico."
                : " Condizioni favorevoli per lo sviluppo di termiche."}
              {analisi.pioggiaTot === 0
                ? " Nessuna precipitazione prevista."
                : analisi.pioggiaTot < 1
                ? ` Qualche goccia sparsa (${analisi.pioggiaTot.toFixed(1)} mm).`
                : ` Precipitazioni previste: ${analisi.pioggiaTot.toFixed(1)} mm (${analisi.oreConPioggia} ore con pioggia).`}
            </span>
          </p>
          <p className="flex items-start gap-2">
            <span className="text-emerald-400 mt-1 shrink-0">✦</span>
            <span>Pressione atmosferica: {analisi.pressioneMedia} hPa — pressione {getPressioneDescrizione(analisi.pressioneMedia)}.</span>
          </p>
        </div>
      </div>

      {/* 🌡️ Profilo termico e stabilità */}
      <div className="bg-gradient-to-br from-slate-900/60 to-slate-800/30 border-2 border-slate-700/30 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Thermometer className="w-6 h-6 text-amber-400" />
          <h3 className="text-base font-bold text-white">Profilo termico e stabilità</h3>
        </div>
        <div className="space-y-2 text-sm text-slate-300 leading-relaxed">
          <p>
            <span className="text-emerald-400 mr-2">✦</span>
            Temperatura: min {analisi.tempMinGiorno}°C, max {analisi.tempMaxGiorno}°C, delta {analisi.deltaTermico}°C.
            {analisi.deltaTermico >= 10
              ? " Buona escursione termica per lo sviluppo di termiche."
              : analisi.deltaTermico >= 6
              ? " Escursione moderata."
              : " Scarsa escursione."}
          </p>
          <p>
            <span className="text-emerald-400 mr-2">✦</span>
            Umidità media: {analisi.umiditaMedia}%. Spread (T - Td): {analisi.spread}°C.
          </p>
          <p>
            <span className="text-emerald-400 mr-2">✦</span>
            Base termica (LCL): {analisi.lcl} m slm. Zero termico: circa {analisi.zeroTermico} m.
          </p>
          <p>
            <span className="text-emerald-400 mr-2">✦</span>
            Pressione atmosferica: {analisi.pressioneMedia} hPa.
          </p>
        </div>
      </div>

      {/* 🌬️ Vento e dinamica in quota */}
      <div className="bg-gradient-to-br from-slate-900/60 to-slate-800/30 border-2 border-slate-700/30 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Wind className="w-6 h-6 text-cyan-400" />
          <h3 className="text-base font-bold text-white">Vento e dinamica in quota</h3>
        </div>
        <div className="space-y-2 text-sm text-slate-300 leading-relaxed">
          <p>
            <span className="text-emerald-400 mr-2">✦</span>
            Direzione prevalente: {analisi.ventoDirNome} ({analisi.ventoDirMedia}°).
            Vento medio al suolo: {analisi.ventoMedio} km/h, raffiche massime: {analisi.ventoGustsMax} km/h.
            {analisi.ventoGustsMax > 30 ? " Attenzione a possibili turbolenze in quota." : ""}
          </p>
          <p>
            <span className="text-emerald-400 mr-2">✦</span>
            {analisi.nuvoleMedia < 25
              ? "Cielo prevalentemente sereno, buon riscaldamento solare."
              : analisi.nuvoleMedia < 50
              ? "Nuvolosità moderata, possibile sviluppo di cumuli."
              : "Nuvolosità significativa che potrebbe limitare lo sviluppo termico."}
          </p>
        </div>
      </div>

      {/* 🌤️ Previsione per fascia oraria */}
      <div className="bg-gradient-to-br from-slate-900/60 to-slate-800/30 border-2 border-orange-500/40 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-6 h-6 text-sky-400" />
          <h3 className="text-base font-bold text-white">Previsione per fascia oraria</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-slate-300">
            <thead>
              <tr className="border-b border-slate-700/50">
                <th className="text-left py-2 pr-3 font-medium text-slate-400">Fascia oraria</th>
                <th className="text-left py-2 px-3 font-medium text-slate-400">Condizioni</th>
                <th className="text-left py-2 pl-3 font-medium text-slate-400">Note</th>
              </tr>
            </thead>
            <tbody>
              {analisi.fasceOrarie.map((f, i) => (
                <tr key={i} className="border-b border-slate-700/20 last:border-0 hover:bg-slate-700/20 transition-colors">
                  <td className="py-2 pr-3 font-bold text-white whitespace-nowrap">{f.fascia}</td>
                  <td className="py-2 px-3 text-slate-200 whitespace-nowrap">{f.condizioni}</td>
                  <td className="py-2 pl-3 text-slate-400 text-[13px] leading-snug">{f.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 🪂 Interpretazione */}
      <div className="bg-gradient-to-br from-green-900/20 to-emerald-900/10 border-2 border-green-700/30 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-6 h-6 text-green-400" />
          <h3 className="text-base font-bold text-green-300">Interpretazione della giornata</h3>
        </div>
        <div className="space-y-2 text-sm text-slate-300 leading-relaxed">
          <p className="flex items-start gap-2">
            {analisi.puntiPositivi.length >= 3 ? (
              <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            ) : analisi.puntiNegativi.length > 0 ? (
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            ) : (
              <span className="text-emerald-400 mt-1 shrink-0">✦</span>
            )}
            <span>{analisi.valutazione}</span>
          </p>
          {analisi.puntiPositivi.length > 0 && (
            <div className="ml-7">
              <div className="text-xs text-emerald-400 font-bold mb-1">✅ Punti positivi:</div>
              {analisi.puntiPositivi.map((p, i) => (
                <p key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-emerald-400 mt-1 shrink-0">•</span>
                  <span>{p}</span>
                </p>
              ))}
            </div>
          )}
          {analisi.puntiNegativi.length > 0 && (
            <div className="ml-7">
              <div className="text-xs text-amber-400 font-bold mb-1">⚠️ Criticità:</div>
              {analisi.puntiNegativi.map((p, i) => (
                <p key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-amber-400 mt-1 shrink-0">•</span>
                  <span>{p}</span>
                </p>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}