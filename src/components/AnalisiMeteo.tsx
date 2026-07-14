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
  if (press > 1015) return "moderatamente alta, condizioni discrete";
  if (press > 1005) return "nella norma";
  if (press > 995) return "in calo, possibile peggioramento";
  return "bassa, condizioni instabili";
}

function getVentoDirezioneDescrizione(dir: number): string {
  const dirs = ["Nord", "Nord-Est", "Est", "Sud-Est", "Sud", "Sud-Ovest", "Ovest", "Nord-Ovest"];
  return dirs[Math.round(dir / 45) % 8];
}

export default function AnalisiMeteo({ currentData, dayData, site }: AnalisiMeteoProps) {
  const alt = site?.alt ?? 1000;

  const analisi = useMemo(() => {
    if (!dayData || dayData.length < 3) return null;

    // Ore diurne 8-19
    const oreGiorno = dayData.filter(h => {
      const hh = h.time.getHours();
      return hh >= 6 && hh <= 21;
    });

    if (oreGiorno.length < 3) return null;

    // --- METRICHE REALI ---
    const mattina = oreGiorno.filter(h => { const hh = h.time.getHours(); return hh >= 6 && hh <= 11; });
    const pomeriggio = oreGiorno.filter(h => { const hh = h.time.getHours(); return hh >= 12 && hh <= 17; });
    const sera = oreGiorno.filter(h => { const hh = h.time.getHours(); return hh >= 18 && hh <= 21; });

    const media = (arr: number[]) => arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0;
    const max = (arr: number[]) => arr.length ? Math.max(...arr) : 0;
    const minLocal = (arr: number[]) => arr.length ? Math.min(...arr) : 0;

    // Temperature
    const tempMattina = mattina.length ? Math.round(media(mattina.map(h => h.temperature))) : null;
    const tempPomeriggio = pomeriggio.length ? Math.round(media(pomeriggio.map(h => h.temperature))) : null;
    const tempSera = sera.length ? Math.round(media(sera.map(h => h.temperature))) : null;
    const tempMaxGiorno = Math.round(max(oreGiorno.map(h => h.temperature)));
    const tempMinGiorno = Math.round(minLocal(oreGiorno.map(h => h.temperature)));
    const deltaTermico = tempMaxGiorno - tempMinGiorno;

    // Umidità
    const umiditaMattina = mattina.length ? Math.round(media(mattina.map(h => h.humidity))) : null;
    const umiditaMedia = Math.round(media(oreGiorno.map(h => h.humidity)));

    // Vento
    const ventoMattina = mattina.length ? Math.round(media(mattina.map(h => h.windSpeed))) : null;
    const ventoPomeriggio = pomeriggio.length ? Math.round(media(pomeriggio.map(h => h.windSpeed))) : null;
    const ventoMedio = Math.round(media(oreGiorno.map(h => h.windSpeed)));
    const ventoMax = Math.round(max(oreGiorno.map(h => h.windSpeed)));
    const ventoGustsMax = Math.round(max(oreGiorno.map(h => h.windGusts || 0)));
    const ventoDirMedia = Math.round(media(oreGiorno.map(h => h.windDir).filter(d => d != null)));

    // Nuvolosità
    const nuvoleMattina = mattina.length ? Math.round(media(mattina.map(h => h.cloudCover))) : null;
    const nuvolePomeriggio = pomeriggio.length ? Math.round(media(pomeriggio.map(h => h.cloudCover))) : null;
    const nuvoleMedia = Math.round(media(oreGiorno.map(h => h.cloudCover)));

    // Precipitazioni
    const pioggiaTot = Math.round(oreGiorno.reduce((s, h) => s + (h.precipitation || 0), 0) * 10) / 10;
    const oreConPioggia = oreGiorno.filter(h => (h.precipitation || 0) > 0.3).length;

    // Pressione
    const pressioneMedia = Math.round(media(oreGiorno.map(h => h.pressure).filter(p => p != null)));

    // Delta termico e spread
    const tempMedia = media(oreGiorno.map(h => h.temperature));
    const dewMedia = media(oreGiorno.map(h => h.dewPoint));
    const spread = tempMedia - dewMedia;

    // Base nuvole (LCL)
    const lcl = Math.max(alt + 50, Math.min(alt + 3000, Math.round(spread * 125 + alt)));

    // Zero termico
    const zeroTermico = Math.max(alt, Math.round(alt + (tempMedia / 0.0098)));

    // Now: costruzione testo analisi con dati REALI
    const situazioni: string[] = [];

    const dataOggi = new Date();
    const dataGiorno = dayData[0]?.time ?? dataOggi;

    // --- SITUAZIONE GENERALE ---
    situazioni.push(
      `Analisi meteo per ${dataGiorno.toLocaleDateString("it-IT", {
        weekday: "long", day: "numeric", month: "long", year: "numeric"
      })}`
    );

    // Temperatura
    let tempText = `Temperatura al suolo: `;
    if (tempMattina != null && tempPomeriggio != null) {
      tempText += `intorno ai ${tempMattina}°C al mattino, con aumento nelle ore centrali fino a circa ${tempPomeriggio}°C. `;
      if (tempSera != null) tempText += `In serata si attesta sui ${tempSera}°C. `;
      tempText += `Massima giornaliera: ${tempMaxGiorno}°C, minima: ${tempMinGiorno}°C, `;
      if (deltaTermico >= 10) tempText += `con una buona escursione termica di ${deltaTermico}°C che favorisce lo sviluppo di termiche.`;
      else if (deltaTermico >= 6) tempText += `escursione termica moderata (${deltaTermico}°C).`;
      else tempText += `escursione termica contenuta (${deltaTermico}°C), termiche potenzialmente deboli.`;
    } else {
      tempText += `dati in aggiornamento.`;
    }
    situazioni.push(tempText + ".");

    // Umidità
    if (umiditaMedia != null) {
      situazioni.push(
        `Umidità relativa: ${umiditaMedia}% — aria ${getUmiditaDescrizione(umiditaMedia)}.`
      );
    }

    // Vento
    if (ventoMedio > 0) {
      const dirDesc = getVentoDirezioneDescrizione(ventoDirMedia);
      const dirName = getWindDirName(ventoDirMedia);
      let ventoText = `Vento: ${ventoMedio} km/h medi, prevalente da ${dirDesc} (${dirName} ${ventoDirMedia}°). `;
      ventoText += `Al suolo vento ${getWindDescription(ventoMedio)}`;
      if (ventoMattina != null && ventoPomeriggio != null) {
        ventoText += ` (${ventoMattina} km/h al mattino, ${ventoPomeriggio} km/h al pomeriggio)`;
      }
      ventoText += `. `;
      if (ventoGustsMax > ventoMedio * 1.5) {
        ventoText += `Attenzione alle raffiche: fino a ${ventoGustsMax} km/h.`;
      }
      situazioni.push(ventoText + ".");
    }

    // Nuvolosità
    if (nuvoleMedia != null) {
      let nuvoleText = `Cielo: ${getCloudDescription(nuvoleMedia)} (copertura media ${nuvoleMedia}%). `;
      if (nuvoleMattina != null && nuvolePomeriggio != null) {
        nuvoleText += `Al mattino ${getCloudDescription(nuvoleMattina)} (${nuvoleMattina}%), al pomeriggio ${getCloudDescription(nuvolePomeriggio)} (${nuvolePomeriggio}%). `;
      }
      if (nuvoleMedia >= 20 && nuvoleMedia < 60) {
        nuvoleText += `Possibile sviluppo di cumuli pomeridiani.`;
      } else if (nuvoleMedia >= 60) {
        nuvoleText += `Nuvolosità significativa che potrebbe limitare lo sviluppo termico.`;
      } else {
        nuvoleText += `Condizioni favorevoli per lo sviluppo di termiche.`;
      }
      if (pioggiaTot === 0) nuvoleText += ` Nessuna precipitazione prevista.`;
      else if (pioggiaTot < 1) nuvoleText += ` Qualche goccia sparsa (${pioggiaTot.toFixed(1)} mm).`;
      else nuvoleText += ` Precipitazioni previste: ${pioggiaTot.toFixed(1)} mm (${oreConPioggia} ore con pioggia).`;
      situazioni.push(nuvoleText + ".");
    }

    // Pressione
    if (pressioneMedia > 0) {
      situazioni.push(`Pressione atmosferica: ${pressioneMedia} hPa — pressione ${getPressioneDescrizione(pressioneMedia)}.`);
    }

    // --- PROFILO TERMICO ---
    situazioni.push(`Base termica stimata (LCL): ${lcl} m slm. Zero termico: ${zeroTermico} m slm.`);

    // --- VENTO IN QUOTA ---
    const ventoDirNome = getWindDirName(ventoDirMedia);
    const ventoDirDesc = getVentoDirezioneDescrizione(ventoDirMedia);
    situazioni.push(
      `Direzione vento prevalente: ${ventoDirDesc} (${ventoDirNome} ${ventoDirMedia}°). ` +
      `Vento medio: ${ventoMedio} km/h, massime raffiche: ${ventoGustsMax} km/h.`
    );

    // --- VALUTAZIONE FINALE ---
    let valutazione = "";
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

    if (puntiPositivi.length >= 3) {
      valutazione = `Condizioni complessivamente favorevoli: ${puntiPositivi.join(", ")}.`;
      if (puntiNegativi.length > 0) valutazione += ` Attenzione a: ${puntiNegativi.join(", ")}.`;
    } else if (puntiPositivi.length >= 1) {
      valutazione = `Condizioni discrete: ${puntiPositivi.join(", ")}.`;
      if (puntiNegativi.length > 0) valutazione += ` Criticità: ${puntiNegativi.join(", ")}.`;
    } else {
      valutazione = `Condizioni difficili: ${puntiNegativi.join(", ")}. Si consiglia prudenza.`;
    }
    situazioni.push(valutazione + ".");

    // --- FASCE ORARIE DINAMICHE ---
    const fasceOrarie = [
      {
        fascia: "Mattina (6–11)",
        condizioni: mattress => {
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
        }(mattina),
      },
      {
        fascia: "Pomeriggio (12–17)",
        condizioni: pomeriggio.length === 0 ? { condizioni: "N/D", note: "" } : (() => {
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
        })(),
      },
      {
        fascia: "Sera (18–21)",
        condizioni: sera.length === 0 ? { condizioni: "N/D", note: "" } : (() => {
          const t = Math.round(media(sera.map(h => h.temperature)));
          const w = Math.round(media(sera.map(h => h.windSpeed)));
          const c = Math.round(media(sera.map(h => h.cloudCover)));
          let cond = `${t}°C, vento ${w} km/h, ${c}% nuvole`;
          let note = "Atmosfera stabile, temperatura in calo";
          if (c < 20) note += ", cielo sereno";
          else note += ", qualche nuvola residua";
          return { condizioni: cond, note };
        })(),
      },
    ];

    return {
      situazioni,
      fasceOrarie,
      tempMaxGiorno,
      tempMinGiorno,
      deltaTermico,
      ventoMedio,
      ventoMax,
      ventoGustsMax,
      ventoDirMedia,
      ventoDirNome,
      nuvoleMedia,
      pioggiaTot,
      oreConPioggia,
      pressioneMedia,
      umiditaMedia,
      lcl,
      zeroTermico,
      tempMedia: Math.round(tempMedia),
      dewMedia: Math.round(dewMedia * 10) / 10,
      spread: Math.round(spread * 10) / 10,
      dataGiorno: dataGiorno.toLocaleDateString("it-IT", {
        weekday: "long", day: "numeric", month: "long"
      }),
    };
  }, [dayData, site]);

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
          <h3 className="text-base font-bold text-white">Situazione generale · {analisi.dataGiorno}</h3>
        </div>
        <div className="space-y-2 text-sm text-slate-300 leading-relaxed">
          {analisi.situazioni.slice(0, 5).map((linea, i) => (
            <p key={i} className="flex items-start gap-2">
              <span className="text-emerald-400 mt-1 shrink-0">✦</span>
              <span>{linea}</span>
            </p>
          ))}
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
            {analisi.deltaTermico >= 10 ? " Buona escursione termica per sviluppo termiche." :
             analisi.deltaTermico >= 6 ? " Escursione moderata." : " Scarsa escursione."}
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
            Vento medio al suolo: {analisi.ventoMedio} km/h.
          </p>
          <p>
            <span className="text-emerald-400 mr-2">✦</span>
            Raffiche massime: {analisi.ventoGustsMax} km/h.
            {analisi.ventoGustsMax > 30 ? " Attenzione a possibili turbolenze." : " Raffiche contenute."}
          </p>
          <p>
            <span className="text-emerald-400 mr-2">✦</span>
            {analisi.nuvoleMedia < 25 ? "Cielo prevalentemente sereno, buon riscaldamento solare." :
             analisi.nuvoleMedia < 50 ? "Nuvolosità moderata, possibile sviluppo di cumuli." :
             "Nuvolosità significativa che potrebbe limitare lo sviluppo termico."}
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
                  <td className="py-2 px-3 text-slate-200 whitespace-nowrap">{f.condizioni.condizioni}</td>
                  <td className="py-2 pl-3 text-slate-400 text-[13px] leading-snug">{f.condizioni.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 🪂 Interpretazione */}
      <div className="bg-gradient-to-br from-green-900/20 to-emerald-900/10 border-2 border-green-700/30 rounded-2xl p-5 hover:border-green-400/40 transition-all duration-200">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-6 h-6 text-green-400" />
          <h3 className="text-base font-bold text-green-300">Interpretazione della giornata</h3>
        </div>
        <div className="space-y-2 text-sm text-slate-300 leading-relaxed">
          {analisi.situazioni.slice(5).map((linea, i) => (
            <p key={i} className="flex items-start gap-2">
              {linea.includes("favorevoli") || linea.includes("buone") ? (
                <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              ) : linea.includes("Attenzione") || linea.includes("Criticità") || linea.includes("difficili") ? (
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              ) : (
                <span className="text-emerald-400 mt-1 shrink-0">✦</span>
              )}
              <span>{linea}</span>
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}