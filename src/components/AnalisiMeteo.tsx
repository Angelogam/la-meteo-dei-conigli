"use client";

import React, { useMemo } from "react";
import { Sun, Thermometer, Wind, Cloud, Droplets, Gauge, TrendingUp, ArrowUp, AlertTriangle, CheckCircle, Clock, CloudRain, CloudLightning } from "lucide-react";
import type { HourData } from "@/types/meteo";

interface AnalisiMeteoProps {
  currentData: HourData | null;
  dayData: HourData[];
  site: { alt: number; lat?: number; lon?: number; name?: string; exposure?: string };
  cape?: number | null;
  liftedIndex?: number | null;
  cin?: number | null;
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

    // Ore con temporali/pioggia in mattinata
    const oreTemporaleMattina = mattina.filter(h => h.weatherCode >= 95 || h.weatherCode === 82).length;
    const orePioggiaMattina = mattina.filter(h => (h.precipitation || 0) > 0.3).length;
    if (oreTemporaleMattina > 0) {
      note += `, ⚠️ temporali alle ${String(mattina.find(h => h.weatherCode >= 95)?.time?.getHours() ?? 0).padStart(2, '0')}:00`;
    } else if (orePioggiaMattina > 0) {
      note += `, pioggia in ${orePioggiaMattina} ore`;
    }

    return { condizioni: cond, note };
  };

  const calcolaPomeriggio = () => {
    if (pomeriggio.length === 0) return { condizioni: "N/D", note: "" };
    const t = Math.round(media(pomeriggio.map(h => h.temperature)));
    const w = Math.round(media(pomeriggio.map(h => h.windSpeed)));
    const c = Math.round(media(pomeriggio.map(h => h.cloudCover)));
    const p = Math.round(media(pomeriggio.map(h => h.precipitation || 0)) * 10) / 10;
    const oreTemporale = pomeriggio.filter(h => h.weatherCode >= 95 || h.weatherCode === 82).length;
    const orePioggia = pomeriggio.filter(h => (h.precipitation || 0) > 0.3).length;
    let cond = `${t}°C, vento ${w} km/h, ${c}% nuvole`;
    let note = "";
    if (c >= 20 && c <= 50) note = "Possibili cumuli da termica";
    else if (c > 50) note = "Nuvoloso, termiche incerte";
    else note = "Cielo sereno, termiche buone";
    if (p > 0) note += `, pioggia: ${p} mm`;
    if (oreTemporale > 0) {
      // Trova le ore specifiche dei temporali
      const oreConTemporali = pomeriggio.filter(h => h.weatherCode >= 95 || h.weatherCode === 82).map(h => h.time.getHours());
      note += `, ⚠️ TEMPORALI alle ${oreConTemporali.map(h => `${String(h).padStart(2, '0')}:00`).join(', ')}`;
    } else if (orePioggia > 0) {
      note += `, ${orePioggia} ore con pioggia`;
    }
    if (w >= 5 && w <= 15) note += ", condizioni favorevoli per volo";
    else if (w > 18) note += ", vento sostenuto";
    return { condizioni: cond, note };
  };

  const calcolaSera = () => {
    if (sera.length === 0) return { condizioni: "N/D", note: "" };
    const t = Math.round(media(sera.map(h => h.temperature)));
    const w = Math.round(media(sera.map(h => h.windSpeed)));
    const c = Math.round(media(sera.map(h => h.cloudCover)));
    const p = Math.round(media(sera.map(h => h.precipitation || 0)) * 10) / 10;
    const oreTemporale = sera.filter(h => h.weatherCode >= 95 || h.weatherCode === 82).length;
    let cond = `${t}°C, vento ${w} km/h, ${c}% nuvole`;
    let note = "Atmosfera stabile, temperatura in calo";
    if (c < 20) note += ", cielo sereno";
    else if (c < 50) note += ", qualche nuvola residua";
    else note += ", molta nuvolosità residua";
    if (p > 0) note += `, pioggia: ${p} mm`;
    if (oreTemporale > 0) {
      const oreConTemporali = sera.filter(h => h.weatherCode >= 95 || h.weatherCode === 82).map(h => h.time.getHours());
      note += `, ⚠️ TEMPORALI residui alle ${oreConTemporali.map(h => `${String(h).padStart(2, '0')}:00`).join(', ')}`;
    }
    return { condizioni: cond, note };
  };

  return [
    { fascia: "Mattina (6–11)", ...calcolaMattina() },
    { fascia: "Pomeriggio (12–17)", ...calcolaPomeriggio() },
    { fascia: "Sera (18–21)", ...calcolaSera() },
  ];
}

export default function AnalisiMeteo({ currentData, dayData, site, cape, liftedIndex, cin }: AnalisiMeteoProps) {
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
    const oreTemporale = oreGiorno.filter(h => h.weatherCode >= 95 || h.weatherCode === 82).length;
    const oreRovesci = oreGiorno.filter(h => h.weatherCode >= 80 && h.weatherCode <= 82).length;
    const orePioggiaIntensa = oreGiorno.filter(h => h.weatherCode === 63 || h.weatherCode === 65 || h.weatherCode === 67).length;
    const pioggiaMaxOraria = Math.round(max(oreGiorno.map(h => h.precipitation || 0)) * 10) / 10;
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

    // --- CALCOLO RISCHIO TEMPORALI REALE ---
    let rischioTemporali = 0;
    let dettaglioTemporali = "";

    // 1. CAPE reale (peso 40%)
    if (cape != null) {
      if (cape > 1500) rischioTemporali += 40;
      else if (cape > 1000) rischioTemporali += 30;
      else if (cape > 500) rischioTemporali += 20;
      else if (cape > 200) rischioTemporali += 10;
      else if (cape > 100) rischioTemporali += 5;
    } else {
      const stimaCape = Math.max(0, (tempMaxGiorno - 15) * 50 + (50 - umiditaMedia) * 10 - nuvoleMedia * 2);
      if (stimaCape > 1000) rischioTemporali += 25;
      else if (stimaCape > 500) rischioTemporali += 15;
      else if (stimaCape > 200) rischioTemporali += 8;
    }

    // 2. Lifted Index reale (peso 30%)
    if (liftedIndex != null) {
      if (liftedIndex <= -6) rischioTemporali += 30;
      else if (liftedIndex <= -4) rischioTemporali += 25;
      else if (liftedIndex <= -2) rischioTemporali += 18;
      else if (liftedIndex <= 0) rischioTemporali += 10;
      else if (liftedIndex <= 2) rischioTemporali += 4;
    } else {
      if (deltaTermico >= 14 && umiditaMedia >= 60) rischioTemporali += 15;
      else if (deltaTermico >= 10 && umiditaMedia >= 50) rischioTemporali += 8;
    }

    // 3. CIN reale (peso 10%)
    if (cin != null) {
      if (cin > -20) rischioTemporali += 10;
      else if (cin > -50) rischioTemporali += 6;
      else if (cin > -100) rischioTemporali += 3;
    }

    // 4. Precipitazioni reali già osservate (peso bonus)
    if (oreTemporale > 0) {
      rischioTemporali += 25; // Temporali già in atto!
      const oreConTemporali = oreGiorno.filter(h => h.weatherCode >= 95 || h.weatherCode === 82).map(h => h.time.getHours());
      dettaglioTemporali = `⚠️ TEMPORALI in atto alle ${oreConTemporali.map(h => `${String(h).padStart(2, '0')}:00`).join(', ')}`;
    } else if (oreRovesci > 0) {
      rischioTemporali += 15;
      const oreConRovesci = oreGiorno.filter(h => h.weatherCode >= 80 && h.weatherCode <= 82).map(h => h.time.getHours());
      dettaglioTemporali = `🌧️ Rovesci previsti alle ${oreConRovesci.map(h => `${String(h).padStart(2, '0')}:00`).join(', ')} — possibile evoluzione temporalesca`;
    } else if (orePioggiaIntensa > 0) {
      rischioTemporali += 10;
      dettaglioTemporali = `🌧️ Pioggia intensa prevista in ${orePioggiaIntensa} ore della giornata`;
    } else if (pioggiaTot > 2) {
      rischioTemporali += 8;
    } else if (pioggiaTot > 0) {
      rischioTemporali += 3;
    }

    // 5. Nuvolosità + umidità (peso 5%)
    if (nuvoleMedia > 60 && umiditaMedia > 60) rischioTemporali += 5;
    else if (nuvoleMedia > 40 && umiditaMedia > 50) rischioTemporali += 3;

    // 6. Pomeriggio con molta nuvolosità (peso 5%)
    const orePomeriggioConNuvole = pomeriggio.filter(h => h.cloudCover > 50).length;
    if (orePomeriggioConNuvole > 3) rischioTemporali += 5;
    else if (orePomeriggioConNuvole > 1) rischioTemporali += 3;

    // Normalizza
    rischioTemporali = Math.max(0, Math.min(100, Math.round(rischioTemporali)));

    // Genera descrizione finale se non già generata
    if (!dettaglioTemporali) {
      if (rischioTemporali >= 70) dettaglioTemporali = `ALTO rischio temporali (${rischioTemporali}%) — temporali probabili nel pomeriggio/sera ⚠️`;
      else if (rischioTemporali >= 50) dettaglioTemporali = `MODERATO-ALTO rischio temporali (${rischioTemporali}%) — possibile attività temporalesca nel pomeriggio 🌩️`;
      else if (rischioTemporali >= 30) dettaglioTemporali = `MODERATO rischio temporali (${rischioTemporali}%) — qualche temporale isolato possibile nel pomeriggio 🌦️`;
      else if (rischioTemporali >= 15) dettaglioTemporali = `BASSO rischio temporali (${rischioTemporali}%) — rovesci isolati possibili 🌦️`;
      else dettaglioTemporali = `RISCHIO MINIMO (${rischioTemporali}%) — nessun temporale previsto ✅`;
    }

    // --- VALUTAZIONE VOLO ---
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

    if (rischioTemporali >= 50) puntiNegativi.push(`rischio temporali: ${rischioTemporali}% ⚠️ — temporali probabili`);
    else if (rischioTemporali >= 30) puntiNegativi.push(`possibili temporali pomeridiani: ${rischioTemporali}% 🌩️`);
    else if (rischioTemporali >= 15) puntiNegativi.push(`qualche rovescio possibile: ${rischioTemporali}% 🌦️`);

    if (oreTemporale > 0) puntiNegativi.push(`temporali in atto in ${oreTemporale} ore della giornata ⚠️⛈️`);

    let valutazione = "";
    if (puntiPositivi.length >= 3 && rischioTemporali < 30 && oreTemporale === 0) {
      valutazione = `Condizioni complessivamente favorevoli: ${puntiPositivi.join(", ")}.`;
      if (puntiNegativi.length > 0) valutazione += ` Attenzione a: ${puntiNegativi.join(", ")}.`;
    } else if (puntiPositivi.length >= 1) {
      valutazione = `Condizioni discrete: ${puntiPositivi.join(", ")}.`;
      if (puntiNegativi.length > 0) valutazione += ` Criticità: ${puntiNegativi.join(", ")}.`;
    } else {
      valutazione = `Condizioni difficili: ${puntiNegativi.join(", ")}. Si consiglia prudenza.`;
    }

    return {
      tempMattina, tempPomeriggio, tempSera, tempMaxGiorno, tempMinGiorno, deltaTermico,
      umiditaMedia, ventoMedio, ventoMax, ventoGustsMax, ventoDirMedia,
      ventoDirNome: getWindDirName(ventoDirMedia),
      nuvoleMedia, pioggiaTot, pioggiaMaxOraria, oreConPioggia, oreTemporale, oreRovesci,
      pressioneMedia, lcl, zeroTermico, spread: Math.round(spread * 10) / 10,
      dateStr, fasceOrarie, valutazione, puntiPositivi, puntiNegativi,
      rischioTemporali, dettaglioTemporali,
    };
  }, [dayData, alt, cape, liftedIndex, cin]);

  if (!analisi) {
    return (
      <div className="text-center py-12 text-slate-400 text-base">
        <Sun className="w-10 h-10 mx-auto mb-3 text-slate-500" />
        Dati insufficienti per generare l'analisi della giornata.
      </div>
    );
  }

  const rischioColor = analisi.rischioTemporali >= 70 ? "text-red-400 bg-red-900/30 border-red-500/40" :
    analisi.rischioTemporali >= 50 ? "text-orange-400 bg-orange-900/30 border-orange-500/40" :
    analisi.rischioTemporali >= 30 ? "text-amber-400 bg-amber-900/30 border-amber-500/40" :
    analisi.rischioTemporali >= 15 ? "text-yellow-400 bg-yellow-900/20 border-yellow-500/30" :
    "text-green-400 bg-green-900/20 border-green-500/30";

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
              Delta termico: {analisi.deltaTermico}°C.
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
              {analisi.ventoGustsMax > analisi.ventoMedio * 1.5 ? ` Raffiche fino a ${analisi.ventoGustsMax} km/h.` : ""}
            </span>
          </p>
          <p className="flex items-start gap-2">
            <span className="text-emerald-400 mt-1 shrink-0">✦</span>
            <span>
              Cielo: {getCloudDescription(analisi.nuvoleMedia)} ({analisi.nuvoleMedia}% copertura media).
              {analisi.pioggiaTot === 0 ? " Nessuna precipitazione." :
               ` Precipitazioni totali: ${analisi.pioggiaTot.toFixed(1)} mm (${analisi.oreConPioggia} ore con pioggia).`}
              {analisi.oreTemporale > 0 && ` ⚠️ Temporali in ${analisi.oreTemporale} ore della giornata!`}
            </span>
          </p>
        </div>
      </div>

      {/* ⛈️ Rischio temporali — SEZIONE DEDICATA */}
      {(analisi.rischioTemporali > 0 || analisi.oreTemporale > 0) && (
        <div className={`rounded-2xl border-2 p-5 ${rischioColor}`}>
          <div className="flex items-center gap-3 mb-3">
            {analisi.rischioTemporali >= 50 || analisi.oreTemporale > 0 ? (
              <CloudLightning className="w-8 h-8 text-red-400" />
            ) : analisi.rischioTemporali >= 20 ? (
              <CloudRain className="w-8 h-8 text-amber-400" />
            ) : (
              <Cloud className="w-8 h-8 text-green-400" />
            )}
            <div>
              <h3 className="text-base font-bold text-white">⛈️ Rischio temporali — {analisi.dateStr}</h3>
              <p className="text-sm text-slate-200 font-medium">{analisi.dettaglioTemporali}</p>
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>Basso</span>
              <span className="text-base font-bold text-white">{analisi.rischioTemporali}%</span>
              <span>Alto</span>
            </div>
            <div className="h-4 bg-slate-700/50 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  analisi.rischioTemporali >= 70 ? "bg-red-500" :
                  analisi.rischioTemporali >= 50 ? "bg-orange-500" :
                  analisi.rischioTemporali >= 30 ? "bg-amber-500" :
                  analisi.rischioTemporali >= 15 ? "bg-yellow-500" : "bg-green-500"
                }`}
                style={{ width: `${analisi.rischioTemporali}%` }}
              />
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="bg-black/20 rounded-lg px-3 py-2 flex items-center justify-between">
              <span className="text-slate-400">CAPE:</span>
              <span className="font-bold text-white">{cape != null ? `${Math.round(cape)} J/kg` : "N/D"}</span>
            </div>
            <div className="bg-black/20 rounded-lg px-3 py-2 flex items-center justify-between">
              <span className="text-slate-400">LI:</span>
              <span className="font-bold text-white">{liftedIndex != null ? `${liftedIndex.toFixed(1)}°C` : "N/D"}</span>
            </div>
            <div className="bg-black/20 rounded-lg px-3 py-2 flex items-center justify-between">
              <span className="text-slate-400">CIN:</span>
              <span className="font-bold text-white">{cin != null ? `${Math.round(cin)} J/kg` : "N/D"}</span>
            </div>
            <div className="bg-black/20 rounded-lg px-3 py-2 flex items-center justify-between">
              <span className="text-slate-400">Pioggia max/h:</span>
              <span className="font-bold text-white">{analisi.pioggiaMaxOraria} mm</span>
            </div>
          </div>
          {analisi.oreTemporale > 0 && (
            <div className="mt-2 text-xs text-red-300 bg-red-900/20 rounded-lg px-3 py-2 border border-red-500/30">
              ⚠️ Sono già presenti temporali in {analisi.oreTemporale} ore della giornata. Si sconsiglia il volo durante questi eventi.
            </div>
          )}
        </div>
      )}

      {/* 🔬 Parametri temporali — mostra CAPE/LI/CIN anche se rischio basso */}
      {(cape != null || liftedIndex != null || cin != null) && analisi.rischioTemporali === 0 && (
        <div className="bg-gradient-to-br from-slate-900/60 to-slate-800/30 border-2 border-slate-700/30 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <CloudLightning className="w-6 h-6 text-green-400" />
            <h3 className="text-base font-bold text-green-300">Rischio temporali: MINIMO (0%)</h3>
          </div>
          <div className="text-sm text-slate-300">
            Nessun temporale previsto per questa giornata. Condizioni stabili.
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
            {cape != null && (
              <div className="bg-black/20 rounded-lg px-3 py-2 text-center">
                <div className="text-slate-400">CAPE</div>
                <div className="font-bold text-white">{Math.round(cape)} J/kg</div>
              </div>
            )}
            {liftedIndex != null && (
              <div className="bg-black/20 rounded-lg px-3 py-2 text-center">
                <div className="text-slate-400">LI</div>
                <div className="font-bold text-white">{liftedIndex.toFixed(1)}°C</div>
              </div>
            )}
            {cin != null && (
              <div className="bg-black/20 rounded-lg px-3 py-2 text-center">
                <div className="text-slate-400">CIN</div>
                <div className="font-bold text-white">{Math.round(cin)} J/kg</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 🌡️ Profilo termico */}
      <div className="bg-gradient-to-br from-slate-900/60 to-slate-800/30 border-2 border-slate-700/30 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Thermometer className="w-6 h-6 text-amber-400" />
          <h3 className="text-base font-bold text-white">Profilo termico</h3>
        </div>
        <div className="space-y-2 text-sm text-slate-300">
          <p><span className="text-emerald-400 mr-2">✦</span> Min {analisi.tempMinGiorno}°C, max {analisi.tempMaxGiorno}°C, delta {analisi.deltaTermico}°C.</p>
          <p><span className="text-emerald-400 mr-2">✦</span> Umidità media {analisi.umiditaMedia}%. Spread: {analisi.spread}°C.</p>
          <p><span className="text-emerald-400 mr-2">✦</span> Base termica (LCL): {analisi.lcl} m. Zero termico: ~{analisi.zeroTermico} m.</p>
          <p><span className="text-emerald-400 mr-2">✦</span> Pressione: {analisi.pressioneMedia} hPa ({getP<dyad-write path="src/components/AnalisiMeteo.tsx" description="Completamento della sezione Profilo termico, Venti, Fasce orarie e Interpretazione finale">
"use client";

import React, { useMemo } from "react";
import { Sun, Thermometer, Wind, Cloud, Droplets, Gauge, TrendingUp, ArrowUp, AlertTriangle, CheckCircle, Clock, CloudRain, CloudLightning } from "lucide-react";
import type { HourData } from "@/types/meteo";

interface AnalisiMeteoProps {
  currentData: HourData | null;
  dayData: HourData[];
  site: { alt: number; lat?: number; lon?: number; name?: string; exposure?: string };
  cape?: number | null;
  liftedIndex?: number | null;
  cin?: number | null;
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
    const oreTemporaleMattina = mattina.filter(h => h.weatherCode >= 95 || h.weatherCode === 82).length;
    const orePioggiaMattina = mattina.filter(h => (h.precipitation || 0) > 0.3).length;
    if (oreTemporaleMattina > 0) {
      note += `, ⚠️ temporali alle ${String(mattina.find(h => h.weatherCode >= 95)?.time?.getHours() ?? 0).padStart(2, '0')}:00`;
    } else if (orePioggiaMattina > 0) {
      note += `, pioggia in ${orePioggiaMattina} ore`;
    }
    return { condizioni: cond, note };
  };

  const calcolaPomeriggio = () => {
    if (pomeriggio.length === 0) return { condizioni: "N/D", note: "" };
    const t = Math.round(media(pomeriggio.map(h => h.temperature)));
    const w = Math.round(media(pomeriggio.map(h => h.windSpeed)));
    const c = Math.round(media(pomeriggio.map(h => h.cloudCover)));
    const p = Math.round(media(pomeriggio.map(h => h.precipitation || 0)) * 10) / 10;
    const oreTemporale = pomeriggio.filter(h => h.weatherCode >= 95 || h.weatherCode === 82).length;
    const orePioggia = pomeriggio.filter(h => (h.precipitation || 0) > 0.3).length;
    let cond = `${t}°C, vento ${w} km/h, ${c}% nuvole`;
    let note = "";
    if (c >= 20 && c <= 50) note = "Possibili cumuli da termica";
    else if (c > 50) note = "Nuvoloso, termiche incerte";
    else note = "Cielo sereno, termiche buone";
    if (p > 0) note += `, pioggia: ${p} mm`;
    if (oreTemporale > 0) {
      const oreConTemporali = pomeriggio.filter(h => h.weatherCode >= 95 || h.weatherCode === 82).map(h => h.time.getHours());
      note += `, ⚠️ TEMPORALI alle ${oreConTemporali.map(h => `${String(h).padStart(2, '0')}:00`).join(', ')}`;
    } else if (orePioggia > 0) {
      note += `, ${orePioggia} ore con pioggia`;
    }
    if (w >= 5 && w <= 15) note += ", condizioni favorevoli per volo";
    else if (w > 18) note += ", vento sostenuto";
    return { condizioni: cond, note };
  };

  const calcolaSera = () => {
    if (sera.length === 0) return { condizioni: "N/D", note: "" };
    const t = Math.round(media(sera.map(h => h.temperature)));
    const w = Math.round(media(sera.map(h => h.windSpeed)));
    const c = Math.round(media(sera.map(h => h.cloudCover)));
    const p = Math.round(media(sera.map(h => h.precipitation || 0)) * 10) / 10;
    const oreTemporale = sera.filter(h => h.weatherCode >= 95 || h.weatherCode === 82).length;
    let cond = `${t}°C, vento ${w} km/h, ${c}% nuvole`;
    let note = "Atmosfera stabile, temperatura in calo";
    if (c < 20) note += ", cielo sereno";
    else if (c < 50) note += ", qualche nuvola residua";
    else note += ", molta nuvolosità residua";
    if (p > 0) note += `, pioggia: ${p} mm`;
    if (oreTemporale > 0) {
      const oreConTemporali = sera.filter(h => h.weatherCode >= 95 || h.weatherCode === 82).map(h => h.time.getHours());
      note += `, ⚠️ TEMPORALI residui alle ${oreConTemporali.map(h => `${String(h).padStart(2, '0')}:00`).join(', ')}`;
    }
    return { condizioni: cond, note };
  };

  return [
    { fascia: "Mattina (6–11)", ...calcolaMattina() },
    { fascia: "Pomeriggio (12–17)", ...calcolaPomeriggio() },
    { fascia: "Sera (18–21)", ...calcolaSera() },
  ];
}

export default function AnalisiMeteo({ currentData, dayData, site, cape, liftedIndex, cin }: AnalisiMeteoProps) {
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
    const oreTemporale = oreGiorno.filter(h => h.weatherCode >= 95 || h.weatherCode === 82).length;
    const oreRovesci = oreGiorno.filter(h => h.weatherCode >= 80 && h.weatherCode <= 82).length;
    const orePioggiaIntensa = oreGiorno.filter(h => h.weatherCode === 63 || h.weatherCode === 65 || h.weatherCode === 67).length;
    const pioggiaMaxOraria = Math.round(max(oreGiorno.map(h => h.precipitation || 0)) * 10) / 10;
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

    // --- CALCOLO RISCHIO TEMPORALI REALE ---
    let rischioTemporali = 0;
    let dettaglioTemporali = "";

    // 1. CAPE reale (peso 40%)
    if (cape != null) {
      if (cape > 1500) rischioTemporali += 40;
      else if (cape > 1000) rischioTemporali += 30;
      else if (cape > 500) rischioTemporali += 20;
      else if (cape > 200) rischioTemporali += 10;
      else if (cape > 100) rischioTemporali += 5;
    } else {
      const stimaCape = Math.max(0, (tempMaxGiorno - 15) * 50 + (50 - umiditaMedia) * 10 - nuvoleMedia * 2);
      if (stimaCape > 1000) rischioTemporali += 25;
      else if (stimaCape > 500) rischioTemporali += 15;
      else if (stimaCape > 200) rischioTemporali += 8;
    }

    // 2. Lifted Index reale (peso 30%)
    if (liftedIndex != null) {
      if (liftedIndex <= -6) rischioTemporali += 30;
      else if (liftedIndex <= -4) rischioTemporali += 25;
      else if (liftedIndex <= -2) rischioTemporali += 18;
      else if (liftedIndex <= 0) rischioTemporali += 10;
      else if (liftedIndex <= 2) rischioTemporali += 4;
    } else {
      if (deltaTermico >= 14 && umiditaMedia >= 60) rischioTemporali += 15;
      else if (deltaTermico >= 10 && umiditaMedia >= 50) rischioTemporali += 8;
    }

    // 3. CIN reale (peso 10%)
    if (cin != null) {
      if (cin > -20) rischioTemporali += 10;
      else if (cin > -50) rischioTemporali += 6;
      else if (cin > -100) rischioTemporali += 3;
    }

    // 4. Precipitazioni reali già osservate (peso bonus)
    if (oreTemporale > 0) {
      rischioTemporali += 25;
      const oreConTemporali = oreGiorno.filter(h => h.weatherCode >= 95 || h.weatherCode === 82).map(h => h.time.getHours());
      dettaglioTemporali = `⚠️ TEMPORALI in atto alle ${oreConTemporali.map(h => `${String(h).padStart(2, '0')}:00`).join(', ')}`;
    } else if (oreRovesci > 0) {
      rischioTemporali += 15;
      const oreConRovesci = oreGiorno.filter(h => h.weatherCode >= 80 && h.weatherCode <= 82).map(h => h.time.getHours());
      dettaglioTemporali = `🌧️ Rovesci previsti alle ${oreConRovesci.map(h => `${String(h).padStart(2, '0')}:00`).join(', ')} — possibile evoluzione temporalesca`;
    } else if (orePioggiaIntensa > 0) {
      rischioTemporali += 10;
      dettaglioTemporali = `🌧️ Pioggia intensa prevista in ${orePioggiaIntensa} ore della giornata`;
    } else if (pioggiaTot > 2) {
      rischioTemporali += 8;
    } else if (pioggiaTot > 0) {
      rischioTemporali += 3;
    }

    // 5. Nuvolosità + umidità (peso 5%)
    if (nuvoleMedia > 60 && umiditaMedia > 60) rischioTemporali += 5;
    else if (nuvoleMedia > 40 && umiditaMedia > 50) rischioTemporali += 3;

    // 6. Pomeriggio con molta nuvolosità (peso 5%)
    const orePomeriggioConNuvole = pomeriggio.filter(h => h.cloudCover > 50).length;
    if (orePomeriggioConNuvole > 3) rischioTemporali += 5;
    else if (orePomeriggioConNuvole > 1) rischioTemporali += 3;

    // Normalizza
    rischioTemporali = Math.max(0, Math.min(100, Math.round(rischioTemporali)));

    // Genera descrizione finale se non già generata
    if (!dettaglioTemporali) {
      if (rischioTemporali >= 70) dettaglioTemporali = `ALTO rischio temporali (${rischioTemporali}%) — temporali probabili nel pomeriggio/sera ⚠️`;
      else if (rischioTemporali >= 50) dettaglioTemporali = `MODERATO-ALTO rischio temporali (${rischioTemporali}%) — possibile attività temporalesca nel pomeriggio 🌩️`;
      else if (rischioTemporali >= 30) dettaglioTemporali = `MODERATO rischio temporali (${rischioTemporali}%) — qualche temporale isolato possibile nel pomeriggio 🌦️`;
      else if (rischioTemporali >= 15) dettaglioTemporali = `BASSO rischio temporali (${rischioTemporali}%) — rovesci isolati possibili 🌦️`;
      else dettaglioTemporali = `RISCHIO MINIMO (${rischioTemporali}%) — nessun temporale previsto ✅`;
    }

    // --- VALUTAZIONE VOLO ---
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

    if (rischioTemporali >= 50) puntiNegativi.push(`rischio temporali: ${rischioTemporali}% ⚠️ — temporali probabili`);
    else if (rischioTemporali >= 30) puntiNegativi.push(`possibili temporali pomeridiani: ${rischioTemporali}% 🌩️`);
    else if (rischioTemporali >= 15) puntiNegativi.push(`qualche rovescio possibile: ${rischioTemporali}% 🌦️`);

    if (oreTemporale > 0) puntiNegativi.push(`temporali in atto in ${oreTemporale} ore della giornata ⚠️⛈️`);

    let valutazione = "";
    if (puntiPositivi.length >= 3 && rischioTemporali < 30 && oreTemporale === 0) {
      valutazione = `Condizioni complessivamente favorevoli: ${puntiPositivi.join(", ")}.`;
      if (puntiNegativi.length > 0) valutazione += ` Attenzione a: ${puntiNegativi.join(", ")}.`;
    } else if (puntiPositivi.length >= 1) {
      valutazione = `Condizioni discrete: ${puntiPositivi.join(", ")}.`;
      if (puntiNegativi.length > 0) valutazione += ` Criticità: ${puntiNegativi.join(", ")}.`;
    } else {
      valutazione = `Condizioni difficili: ${puntiNegativi.join(", ")}. Si consiglia prudenza.`;
    }

    return {
      tempMattina, tempPomeriggio, tempSera, tempMaxGiorno, tempMinGiorno, deltaTermico,
      umiditaMedia, ventoMedio, ventoMax, ventoGustsMax, ventoDirMedia,
      ventoDirNome: getWindDirName(ventoDirMedia),
      nuvoleMedia, pioggiaTot, pioggiaMaxOraria, oreConPioggia, oreTemporale, oreRovesci,
      pressioneMedia, lcl, zeroTermico, spread: Math.round(spread * 10) / 10,
      dateStr, fasceOrarie, valutazione, puntiPositivi, puntiNegativi,
      rischioTemporali, dettaglioTemporali,
    };
  }, [dayData, alt, cape, liftedIndex, cin]);

  if (!analisi) {
    return (
      <div className="text-center py-12 text-slate-400 text-base">
        <Sun className="w-10 h-10 mx-auto mb-3 text-slate-500" />
        Dati insufficienti per generare l'analisi della giornata.
      </div>
    );
  }

  const rischioColor = analisi.rischioTemporali >= 70 ? "text-red-400 bg-red-900/30 border-red-500/40" :
    analisi.rischioTemporali >= 50 ? "text-orange-400 bg-orange-900/30 border-orange-500/40" :
    analisi.rischioTemporali >= 30 ? "text-amber-400 bg-amber-900/30 border-amber-500/40" :
    analisi.rischioTemporali >= 15 ? "text-yellow-400 bg-yellow-900/20 border-yellow-500/30" :
    "text-green-400 bg-green-900/20 border-green-500/30";

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
              Delta termico: {analisi.deltaTermico}°C.
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
              {analisi.ventoGustsMax > analisi.ventoMedio * 1.5 ? ` Raffiche fino a ${analisi.ventoGustsMax} km/h.` : ""}
            </span>
          </p>
          <p className="flex items-start gap-2">
            <span className="text-emerald-400 mt-1 shrink-0">✦</span>
            <span>
              Cielo: {getCloudDescription(analisi.nuvoleMedia)} ({analisi.nuvoleMedia}% copertura media).
              {analisi.pioggiaTot === 0 ? " Nessuna precipitazione." :
               ` Precipitazioni totali: ${analisi.pioggiaTot.toFixed(1)} mm (${analisi.oreConPioggia} ore con pioggia).`}
              {analisi.oreTemporale > 0 && ` ⚠️ Temporali in ${analisi.oreTemporale} ore della giornata!`}
            </span>
          </p>
        </div>
      </div>

      {/* ⛈️ Rischio temporali — SEZIONE DEDICATA */}
      {(analisi.rischioTemporali > 0 || analisi.oreTemporale > 0) && (
        <div className={`rounded-2xl border-2 p-5 ${rischioColor}`}>
          <div className="flex items-center gap-3 mb-3">
            {analisi.rischioTemporali >= 50 || analisi.oreTemporale > 0 ? (
              <CloudLightning className="w-8 h-8 text-red-400" />
            ) : analisi.rischioTemporali >= 20 ? (
              <CloudRain className="w-8 h-8 text-amber-400" />
            ) : (
              <Cloud className="w-8 h-8 text-green-400" />
            )}
            <div>
              <h3 className="text-base font-bold text-white">⛈️ Rischio temporali — {analisi.dateStr}</h3>
              <p className="text-sm text-slate-200 font-medium">{analisi.dettaglioTemporali}</p>
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>Basso</span>
              <span className="text-base font-bold text-white">{analisi.rischioTemporali}%</span>
              <span>Alto</span>
            </div>
            <div className="h-4 bg-slate-700/50 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  analisi.rischioTemporali >= 70 ? "bg-red-500" :
                  analisi.rischioTemporali >= 50 ? "bg-orange-500" :
                  analisi.rischioTemporali >= 30 ? "bg-amber-500" :
                  analisi.rischioTemporali >= 15 ? "bg-yellow-500" : "bg-green-500"
                }`}
                style={{ width: `${analisi.rischioTemporali}%` }}
              />
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="bg-black/20 rounded-lg px-3 py-2 flex items-center justify-between">
              <span className="text-slate-400">CAPE:</span>
              <span className="font-bold text-white">{cape != null ? `${Math.round(cape)} J/kg` : "N/D"}</span>
            </div>
            <div className="bg-black/20 rounded-lg px-3 py-2 flex items-center justify-between">
              <span className="text-slate-400">LI:</span>
              <span className="font-bold text-white">{liftedIndex != null ? `${liftedIndex.toFixed(1)}°C` : "N/D"}</span>
            </div>
            <div className="bg-black/20 rounded-lg px-3 py-2 flex items-center justify-between">
              <span className="text-slate-400">CIN:</span>
              <span className="font-bold text-white">{cin != null ? `${Math.round(cin)} J/kg` : "N/D"}</span>
            </div>
            <div className="bg-black/20 rounded-lg px-3 py-2 flex items-center justify-between">
              <span className="text-slate-400">Pioggia max/h:</span>
              <span className="font-bold text-white">{analisi.pioggiaMaxOraria} mm</span>
            </div>
          </div>
          {analisi.oreTemporale > 0 && (
            <div className="mt-2 text-xs text-red-300 bg-red-900/20 rounded-lg px-3 py-2 border border-red-500/30">
              ⚠️ Sono già presenti temporali in {analisi.oreTemporale} ore della giornata. Si sconsiglia il volo durante questi eventi.
            </div>
          )}
        </div>
      )}

      {/* 🔬 Parametri temporali — mostra CAPE/LI/CIN anche se rischio basso */}
      {(cape != null || liftedIndex != null || cin != null) && analisi.rischioTemporali === 0 && (
        <div className="bg-gradient-to-br from-slate-900/60 to-slate-800/30 border-2 border-slate-700/30 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <CloudLightning className="w-6 h-6 text-green-400" />
            <h3 className="text-base font-bold text-green-300">Rischio temporali: MINIMO (0%)</h3>
          </div>
          <div className="text-sm text-slate-300">
            Nessun temporale previsto per questa giornata. Condizioni stabili.
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
            {cape != null && (
              <div className="bg-black/20 rounded-lg px-3 py-2 text-center">
                <div className="text-slate-400">CAPE</div>
                <div className="font-bold text-white">{Math.round(cape)} J/kg</div>
              </div>
            )}
            {liftedIndex != null && (
              <div className="bg-black/20 rounded-lg px-3 py-2 text-center">
                <div className="text-slate-400">LI</div>
                <div className="font-bold text-white">{liftedIndex.toFixed(1)}°C</div>
              </div>
            )}
            {cin != null && (
              <div className="bg-black/20 rounded-lg px-3 py-2 text-center">
                <div className="text-slate-400">CIN</div>
                <div className="font-bold text-white">{Math.round(cin)} J/kg</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 🌡️ Profilo termico */}
      <div className="bg-gradient-to-br from-slate-900/60 to-slate-800/30 border-2 border-slate-700/30 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Thermometer className="w-6 h-6 text-amber-400" />
          <h3 className="text-base font-bold text-white">Profilo termico</h3>
        </div>
        <div className="space-y-2 text-sm text-slate-300">
          <p><span className="text-emerald-400 mr-2">✦</span> Min {analisi.tempMinGiorno}°C, max {analisi.tempMaxGiorno}°C, delta {analisi.deltaTermico}°C.</p>
          <p><span className="text-emerald-400 mr-2">✦</span> Umidità media {analisi.umiditaMedia}%. Spread: {analisi.spread}°C.</p>
          <p><span className="text-emerald-400 mr-2">✦</span> Base termica (LCL): {analisi.lcl} m. Zero termico: ~{analisi.zeroTermico} m.</p>
          <p><span className="text-emerald-400 mr-2">✦</span> Pressione: {analisi.pressioneMedia} hPa ({getPressioneDescrizione(analisi.pressioneMedia)}).</p>
        </div>
      </div>

      {/* 🌬️ Vento }}
      <div className="bg-gradient-to-br from-slate-900/60 to-slate-800/30 border-2 border-slate-700/30 rounded-2xl p-5">
        <div className="flex<dyad-write path="src/components/AnalisiMeteo.tsx" description="Completamento delle sezioni mancanti del componente AnalisiMeteo">

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
        {analisi.puntiPositivi.length >= 3 && analisi.rischioTemporali < 30 ? (
          <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
        ) : analisi.puntiNegativi.length > 0 || analisi.rischioTemporali >= 30 ? (
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        ) : (
          <span className="text-emerald-400 mt-1 shrink-0">✦</span>
        )}
        <span>{analisi.valutazione}</span>
      </p>
      {analisi.rischioTemporali >= 30 && (
        <div className="ml-7 mt-2">
          <div className="text-xs text-amber-400 font-bold mb-1">⛈️ Temporali:</div>
          <p className="flex items-start gap-2 text-sm">
            <span className="text-amber-400 mt-1 shrink-0">•</span>
            <span>{analisi.dettaglioTemporali}</span>
          </p>
        </div>
      )}
      {analisi.puntiPositivi.length > 0 && (
        <div className="ml-7 mt-2">
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
        <div className="ml-7 mt-2">
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