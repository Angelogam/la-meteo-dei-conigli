"use client";

import React, { useMemo } from "react";
import { Sun, Thermometer, Wind, Cloud, CloudRain, CloudLightning, TrendingUp, AlertTriangle, CheckCircle } from "lucide-react";
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
  if (press > 1015) return "moderatamente alta, condizioni discrete";
  if (press > 1005) return "nella norma";
  if (press > 995) return "in calo, possibile peggioramento";
  return "bassa, condizioni instabili";
}

export default function AnalisiMeteo({ dayData, site }: AnalisiMeteoProps) {

  const analisi = useMemo(() => {
    if (!dayData || dayData.length < 3) return null;
    const oreGiorno = dayData.filter(h => {
      const hh = h.time.getHours();
      return hh >= 6 && hh <= 21;
    });
    if (oreGiorno.length < 3) return null;

    const media = (arr: number[]) => arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0;
    const max = (arr: number[]) => arr.length ? Math.max(...arr) : 0;
    const minLocal = (arr: number[]) => arr.length ? Math.min(...arr) : 0;

    const tempMaxGiorno = Math.round(max(oreGiorno.map(h => h.temperature)));
    const tempMinGiorno = Math.round(minLocal(oreGiorno.map(h => h.temperature)));
    const deltaTermico = tempMaxGiorno - tempMinGiorno;

    const umiditaMedia = Math.round(media(oreGiorno.map(h => h.humidity)));
    const ventoMedio = Math.round(media(oreGiorno.map(h => h.windSpeed)));
    const ventoGustsMax = Math.round(max(oreGiorno.map(h => h.windGusts || 0)));
    const ventoDirMedia = Math.round(media(oreGiorno.map(h => h.windDir).filter(d => d != null)));
    const nuvoleMedia = Math.round(media(oreGiorno.map(h => h.cloudCover)));
    const pioggiaTot = Math.round(oreGiorno.reduce((s, h) => s + (h.precipitation || 0), 0) * 10) / 10;
    const oreTemporale = oreGiorno.filter(h => h.weatherCode >= 95 || h.weatherCode === 82).length;
    const pressioneMedia = Math.round(media(oreGiorno.map(h => h.pressure).filter(p => p != null)));
    const tempMedia = media(oreGiorno.map(h => h.temperature));
    const dewMedia = media(oreGiorno.map(h => h.dewPoint));
    const spread = tempMedia - dewMedia;
    const lcl = Math.max(200, Math.min(3000, Math.round(spread * 125)));
    const zeroTermico = Math.max(0, Math.round((tempMedia / 0.0098) + 200));
    const dataGiorno = dayData[0]?.time ?? new Date();
    const dateStr = dataGiorno.toLocaleDateString("it-IT", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    // NUOVO CALCOLO RISCHIO TEMPORALI — molto più conservativo
    // Solo 3 fattori reali:
    let rischioTemporali = 0;

    // 1. Pioggia in atto o weather code di temporale
    if (oreTemporale > 0) {
      rischioTemporali = 85; // temporale in atto = rischio altissimo
    } else if (pioggiaTot > 3) {
      rischioTemporali = 45; // pioggia consistente
    } else if (pioggiaTot > 1) {
      rischioTemporali = 25; // pioggia leggera
    } else {
      // 2. Solo se NON piove, guarda instabilità atmosferica
      // Condizioni per temporale SERIO: tanto sole + tanto vapore + gradiente
      const haTantoSole = nuvoleMedia < 35;
      const haMoltoVapore = umiditaMedia >= 55 && umiditaMedia <= 80;
      const haAltaEscursione = deltaTermico >= 14;
      const haBassaPressione = pressioneMedia < 1005;

      // Solo se ci sono ALMENO 3 condizioni su 4
      const condizioniInstabilita = [haTantoSole, haMoltoVapore, haAltaEscursione, haBassaPressione].filter(Boolean).length;

      if (condizioniInstabilita >= 3) {
        rischioTemporali = 25; // possibile
      } else if (condizioniInstabilita === 2 && deltaTermico >= 16) {
        rischioTemporali = 20; // possibile
      } else {
        rischioTemporali = 2; // minimo — quasi sempre così
      }
    }

    // Arrotonda
    rischioTemporali = Math.max(0, Math.min(100, Math.round(rischioTemporali)));

    let dettaglioTemporali = "";
    if (oreTemporale > 0) {
      dettaglioTemporali = `ALTO (${rischioTemporali}%)`;
    } else if (rischioTemporali >= 40) {
      dettaglioTemporali = `MODERATO (${rischioTemporali}%)`;
    } else if (rischioTemporali >= 15) {
      dettaglioTemporali = `BASSO (${rischioTemporali}%)`;
    } else {
      dettaglioTemporali = `MINIMO (${rischioTemporali}%)`;
    }

    if (oreTemporale > 0) dettaglioTemporali += " - Temporali in atto!";

    const puntiPositivi: string[] = [];
    const puntiNegativi: string[] = [];

    if (ventoMedio >= 5 && ventoMedio <= 15) puntiPositivi.push("vento ideale per il volo");
    else if (ventoMedio > 22) puntiNegativi.push("vento forte, sconsigliato");
    else if (ventoMedio < 3) puntiNegativi.push("vento troppo debole");

    if (pioggiaTot === 0) puntiPositivi.push("nessuna pioggia prevista");
    else if (pioggiaTot > 2) puntiNegativi.push("pioggia prevista (" + pioggiaTot.toFixed(1) + " mm)");

    if (nuvoleMedia >= 15 && nuvoleMedia <= 50) puntiPositivi.push("cumuli da termica ben distribuiti");
    else if (nuvoleMedia > 70) puntiNegativi.push("cielo molto coperto");

    if (deltaTermico >= 10) puntiPositivi.push("buona escursione termica");
    else if (deltaTermico < 5) puntiNegativi.push("scarsa escursione termica");

    if (ventoGustsMax > 30) puntiNegativi.push("raffiche forti (" + ventoGustsMax + " km/h)");
    if (oreTemporale > 0) puntiNegativi.push("temporali in corso");

    let valutazione = "";
    if (puntiPositivi.length >= 3 && rischioTemporali < 20 && oreTemporale === 0) {
      valutazione = "Condizioni favorevoli: " + puntiPositivi.join(", ") + ".";
      if (puntiNegativi.length > 0) valutazione += " Attenzione: " + puntiNegativi.join(", ") + ".";
    } else if (puntiPositivi.length >= 1) {
      valutazione = "Condizioni discrete: " + puntiPositivi.join(", ") + ".";
      if (puntiNegativi.length > 0) valutazione += " Criticità: " + puntiNegativi.join(", ") + ".";
    } else {
      valutazione = "Condizioni difficili: " + puntiNegativi.join(", ") + ". Prudenza.";
    }

    return {
      tempMaxGiorno,
      tempMinGiorno,
      deltaTermico,
      umiditaMedia,
      ventoMedio,
      ventoGustsMax,
      ventoDirMedia,
      ventoDirNome: getWindDirName(ventoDirMedia),
      nuvoleMedia,
      pioggiaTot,
      oreTemporale,
      pressioneMedia,
      lcl,
      zeroTermico,
      spread: Math.round(spread * 10) / 10,
      dateStr,
      valutazione,
      puntiPositivi,
      puntiNegativi,
      rischioTemporali,
      dettaglioTemporali,
    };
  }, [dayData]);

  if (!analisi) {
    return (
      <div className="text-center py-12 text-slate-400 text-base">
        <Sun className="w-10 h-10 mx-auto mb-3 text-slate-500" />
        Dati insufficienti per generare l&apos;analisi.
      </div>
    );
  }

  const getRischioBg = (r: number) => {
    if (r >= 70) return "bg-red-900/30 border-red-500/40";
    if (r >= 40) return "bg-orange-900/30 border-orange-500/40";
    if (r >= 15) return "bg-amber-900/30 border-amber-500/40";
    if (r >= 5) return "bg-yellow-900/20 border-yellow-500/30";
    return "bg-green-900/20 border-green-500/30";
  };

  const getRischioText = (r: number) => {
    if (r >= 70) return "text-red-400";
    if (r >= 40) return "text-orange-400";
    if (r >= 15) return "text-amber-400";
    if (r >= 5) return "text-yellow-400";
    return "text-green-400";
  };

  const getRischioBar = (r: number) => {
    if (r >= 70) return "bg-red-500";
    if (r >= 40) return "bg-orange-500";
    if (r >= 15) return "bg-amber-500";
    if (r >= 5) return "bg-yellow-500";
    return "bg-green-500";
  };

  const rischioBg = getRischioBg(analisi.rischioTemporali);
  const rischioText = getRischioText(analisi.rischioTemporali);
  const rischioBarColor = getRischioBar(analisi.rischioTemporali);

  return (
    <div className="space-y-4">
      {/* Situazione generale */}
      <div className="bg-gradient-to-br from-slate-900/60 to-slate-800/30 border-2 border-slate-700/30 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Sun className="w-6 h-6 text-orange-400" />
          <h3 className="text-base font-bold text-white">Situazione generale</h3>
          <span className="text-xs text-slate-500 ml-auto">{analisi.dateStr}</span>
        </div>
        <div className="space-y-2 text-sm text-slate-300">
          <p><span className="text-emerald-400 mr-2">&bull;</span> Max {analisi.tempMaxGiorno}°C, min {analisi.tempMinGiorno}°C, delta {analisi.deltaTermico}°C.</p>
          <p><span className="text-emerald-400 mr-2">&bull;</span> Umidità: {analisi.umiditaMedia}% &mdash; {getUmiditaDescrizione(analisi.umiditaMedia)}.</p>
          <p><span className="text-emerald-400 mr-2">&bull;</span> Vento: {analisi.ventoMedio} km/h da {analisi.ventoDirNome} ({analisi.ventoDirMedia}°).{analisi.ventoGustsMax > analisi.ventoMedio * 1.5 ? " Raffiche " + analisi.ventoGustsMax + " km/h." : ""}</p>
          <p><span className="text-emerald-400 mr-2">&bull;</span> Cielo: {getCloudDescription(analisi.nuvoleMedia)} ({analisi.nuvoleMedia}%).{analisi.pioggiaTot === 0 ? " Nessuna pioggia." : " Pioggia: " + analisi.pioggiaTot.toFixed(1) + " mm."}</p>
        </div>
      </div>

      {/* Rischio temporali — RIVISTO */}
      <div className={"rounded-2xl border-2 p-5 " + rischioBg}>
        <div className="flex items-center gap-3 mb-3">
          {analisi.rischioTemporali >= 70 || analisi.oreTemporale > 0 ? (
            <CloudLightning className="w-8 h-8 text-red-400" />
          ) : analisi.rischioTemporali >= 15 ? (
            <CloudRain className="w-8 h-8 text-amber-400" />
          ) : (
            <Cloud className="w-8 h-8 text-green-400" />
          )}
          <div>
            <h3 className="text-base font-bold text-white">Rischio temporali</h3>
            <p className={"text-sm font-medium " + rischioText}>{analisi.dettaglioTemporali}</p>
          </div>
        </div>
        <div className="h-4 bg-slate-700/50 rounded-full overflow-hidden">
          <div className={"h-full rounded-full " + rischioBarColor} style={{ width: analisi.rischioTemporali + "%" }} />
        </div>
        <div className="flex items-center justify-between text-xs text-slate-500 mt-1">
          <span>0%</span><span>50%</span><span>100%</span>
        </div>
      </div>

      {/* Profilo termico */}
      <div className="bg-gradient-to-br from-slate-900/60 to-slate-800/30 border-2 border-slate-700/30 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Thermometer className="w-6 h-6 text-amber-400" />
          <h3 className="text-base font-bold text-white">Profilo termico e stabilità</h3>
        </div>
        <div className="space-y-2 text-sm text-slate-300">
          <p><span className="text-emerald-400 mr-2">&bull;</span> {analisi.tempMinGiorno}°C min / {analisi.tempMaxGiorno}°C max &middot; delta {analisi.deltaTermico}°C.</p>
          <p><span className="text-emerald-400 mr-2">&bull;</span> Umidità {analisi.umiditaMedia}% &middot; Spread {analisi.spread}°C.</p>
          <p><span className="text-emerald-400 mr-2">&bull;</span> Base termica (LCL): {analisi.lcl} m &middot; Zero termico: ~{analisi.zeroTermico} m.</p>
          <p><span className="text-emerald-400 mr-2">&bull;</span> Pressione: {analisi.pressioneMedia} hPa ({getPressioneDescrizione(analisi.pressioneMedia)}).</p>
        </div>
      </div>

      {/* Vento */}
      <div className="bg-gradient-to-br from-slate-900/60 to-slate-800/30 border-2 border-slate-700/30 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Wind className="w-6 h-6 text-cyan-400" />
          <h3 className="text-base font-bold text-white">Vento e dinamica in quota</h3>
        </div>
        <div className="space-y-2 text-sm text-slate-300">
          <p><span className="text-emerald-400 mr-2">&bull;</span> Direzione: {analisi.ventoDirNome} ({analisi.ventoDirMedia}°). Vento medio: {analisi.ventoMedio} km/h, raffiche max: {analisi.ventoGustsMax} km/h.</p>
          <p><span className="text-emerald-400 mr-2">&bull;</span> {analisi.nuvoleMedia < 25 ? "Cielo sereno." : analisi.nuvoleMedia < 50 ? "Nuvolosità moderata." : "Nuvolosità significativa."}</p>
        </div>
      </div>

      {/* Interpretazione */}
      <div className="bg-gradient-to-br from-green-900/20 to-emerald-900/10 border-2 border-green-700/30 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-6 h-6 text-green-400" />
          <h3 className="text-base font-bold text-green-300">Interpretazione della giornata</h3>
        </div>
        <div className="space-y-2 text-sm text-slate-300">
          <p className="flex items-start gap-2">
            {analisi.puntiPositivi.length >= 3 && analisi.rischioTemporali < 20 ? (
              <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            ) : analisi.puntiNegativi.length > 0 || analisi.rischioTemporali >= 20 ? (
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            ) : (
              <span className="text-emerald-400 mt-1 shrink-0 mr-2">&bull;</span>
            )}
            <span>{analisi.valutazione}</span>
          </p>
          {analisi.puntiPositivi.length > 0 && (
            <div className="ml-7 mt-2">
              <div className="text-xs text-emerald-400 font-bold mb-1">Punti positivi:</div>
              {analisi.puntiPositivi.map((p, i) => (
                <p key={i}><span className="text-emerald-400 mr-2">&bull;</span>{p}</p>
              ))}
            </div>
          )}
          {analisi.puntiNegativi.length > 0 && (
            <div className="ml-7 mt-2">
              <div className="text-xs text-amber-400 font-bold mb-1">Criticità:</div>
              {analisi.puntiNegativi.map((p, i) => (
                <p key={i}><span className="text-amber-400 mr-2">&bull;</span>{p}</p>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}