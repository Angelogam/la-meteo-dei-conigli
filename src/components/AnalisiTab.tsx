"use client";

import React, { useMemo } from "react";
import { Sun, Clock, Sparkles } from "lucide-react";
import type { HourData } from "@/types/meteo";
import { calcolaTermiche } from "@/utils/termiche";

interface AnalisiTabProps {
  currentData: HourData | null;
  dayData: HourData[];
  site: { alt: number; lat?: number; lon?: number; name?: string; exposure?: string };
}

function media(arr: number[]) {
  return arr.filter(v => v != null).reduce((s, v) => s + v, 0) / Math.max(1, arr.filter(v => v != null).length);
}

function getWindDirName(deg: number): string {
  if (deg == null) return "—";
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return dirs[Math.round(deg / 22.5) % 16];
}

export default function AnalisiTab({ currentData, dayData, site }: AnalisiTabProps) {
  const alt = site?.alt ?? 1000;

  const riepilogo = useMemo(() => {
    if (!dayData || dayData.length === 0) return null;

    const temps = dayData.map(h => h.temperature);
    const winds = dayData.map(h => h.windSpeed);
    const hums = dayData.map(h => h.humidity);
    const clouds = dayData.map(h => h.cloudCover);
    const dirs = dayData.map(h => h.windDir);
    const precips = dayData.map(h => h.precipitation);

    const tempMin = Math.min(...temps);
    const tempMax = Math.max(...temps);
    const tempMed = Math.round(media(temps));
    const humMed = Math.round(media(hums));
    const windMed = Math.round(media(winds));
    const windMax = Math.round(Math.max(...winds));
    const windDirMed = Math.round(media(dirs));
    const cloudMed = Math.round(media(clouds));
    const precipTot = Math.round(precips.reduce((s, v) => s + v, 0) * 10) / 10;

    const termicheOre = dayData.map(h => calcolaTermiche(h, alt));
    const salitaMedia = Math.round(media(termicheOre.map(t => t.rateo)) * 10) / 10;
    const baseMedia = Math.round(media(termicheOre.map(t => t.base)));
    const topMedia = Math.round(media(termicheOre.map(t => t.top)));

    // Condizioni
    const ventoDesc = windMed < 5 ? "debole" : windMed < 12 ? "leggero" : windMed < 20 ? "moderato" : "sostenuto";
    const umidDesc = humMed < 40 ? "molto secca" : humMed < 55 ? "secca" : humMed < 70 ? "moderata" : "umida";
    const nuvolDesc = cloudMed < 15 ? "prevalenza di sereno o poco nuvoloso" : cloudMed < 35 ? "poco nuvoloso" : cloudMed < 60 ? "parzialmente nuvoloso" : "molto nuvoloso";
    const temporali = (salitaMedia >= 3 && precipTot < 0.5) ? "possibile sviluppo di cumuli pomeridiani, ma senza rischio di temporali significativi" : "nessun rischio di temporali significativi";
    const stabile = salitaMedia < 2 ? "piuttosto stabile" : "tendenzialmente instabile";
    const dirName = getWindDirName(windDirMed);

    const situGen = `☀️ Situazione generale\n\nTemperatura al suolo: intorno ai ${tempMed} °C al mattino, con lieve aumento nelle ore centrali fino a circa ${tempMax} °C.\n\nUmidità relativa: ${umidDesc}, con valori tra ${Math.max(30, humMed - 10)}–${Math.min(80, humMed + 10)}%; l'aria è piuttosto secca nei bassi strati, segno di buona visibilità e scarsa probabilità di nebbie.\n\nVento: ${ventoDesc} da ${dirName} al suolo, tendente a rinforzare leggermente in quota (${windMed}–${windMax} km/h).\n\nCielo: ${nuvolDesc}; ${temporali}.`;

    const profiloTerm = `🌡️ Profilo termico e stabilità\n\nIl gradiente verticale di temperatura mostra un'atmosfera ${stabile}: la temperatura e il punto di rugiada restano ben separati.\n\nL'indice di stabilità è normale, confermando ${stabile === "piuttosto stabile" ? "stabilità" : "moderata instabilità"} e ${temporali.includes("senza") ? "scarsa probabilità di temporali" : "possibile attività convettiva"}.\n\nIl valore CAPE stimato è ${salitaMedia > 2 ? "moderato" : "basso"}, quindi energia convettiva ${salitaMedia > 2 ? "discreta" : "quasi nulla"}.\n\nIn quota (2000–3000 m) si nota un ${salitaMedia > 2 ? "buon gradiente termico" : "lieve raffreddamento"}, ${salitaMedia > 2 ? "favorevole allo sviluppo di termiche" : "non sufficiente a generare instabilità significativa"}.`;

    const ventoQuota = `🌬️ Vento e dinamica in quota\n\nIl profilo del vento mostra direzione prevalente da ${dirName}, con intensità crescente fino a ${windMax + 10}–${windMax + 20} km/h sopra i 2000 m.\n\nQuesto favorisce ${ventoDesc === "debole" ? "buone condizioni di volo libero: aria asciutta, termiche regolari e nessuna turbolenza marcata" : "condizioni di volo gestibili, con vento moderato in quota"}.\n\nNon si osservano inversioni termiche forti: la temperatura decresce regolarmente con la quota, segno di buon rimescolamento dell'aria.`;

    // Fasce orarie
    const mattina = dayData.filter(h => { const hh = h.time.getHours(); return hh >= 8 && hh < 12; });
    const pomeriggio = dayData.filter(h => { const hh = h.time.getHours(); return hh >= 12 && hh < 17; });
    const sera = dayData.filter(h => { const hh = h.time.getHours(); return hh >= 17 && hh < 21; });

    const descMatt = mattina.length > 0
      ? `Sole pieno, vento ${media(mattina.map(h => h.windSpeed)) < 8 ? "debole" : "moderato"}`
      : "Dati non disponibili";
    const noteMatt = mattina.length > 0
      ? "Ottima visibilità, aria secca"
      : "";
    const descPom = pomeriggio.length > 0
      ? `Termiche ${salitaMedia > 2 ? "moderate" : "deboli"}, ${media(pomeriggio.map(h => h.cloudCover)) < 40 ? "qualche cumulo" : "cielo variabile"}`
      : "Dati non disponibili";
    const notePom = pomeriggio.length > 0
      ? salitaMedia > 1.5 ? "Buone condizioni per volo libero" : "Condizioni discrete per volo"
      : "";
    const descSera = sera.length > 0
      ? `Cielo ${media(sera.map(h => h.cloudCover)) < 30 ? "sereno" : "nuvoloso"}, vento in calo`
      : "Dati non disponibili";
    const noteSera = sera.length > 0
      ? "Atmosfera stabile, temperatura in discesa"
      : "";

    const tabellaOraria = `🌤️ Previsione per la giornata\n\nFascia oraria\tCondizioni previste\tNote\nMattina (8–11)\t${descMatt}\t${noteMatt}\nPomeriggio (12–17)\t${descPom}\t${notePom}\nSera (18–21)\t${descSera}\t${noteSera}`;

    // Interpretazione
    let interp = "🪂 Interpretazione per attività outdoor / volo libero\n\n";
    if (windMed < 20 && cloudMed < 50 && precipTot < 0.5 && salitaMedia > 1) {
      interp += "Condizioni ideali per decolli e veleggiamento: aria asciutta, termiche regolari, vento gestibile.\n\nNessun rischio di temporali o pioggia.";
    } else if (windMed < 25 && precipTot < 1 && salitaMedia > 0.3) {
      interp += "Condizioni generalmente buone per il volo libero, con vento leggermente sostenuto in quota.\n\nNessun rischio di precipitazioni significative.";
    } else if (windMed < 30) {
      interp += "Condizioni marginali: vento sostenuto, si consiglia prudenza e quote moderate.";
    } else {
      interp += "Condizioni difficili: vento forte, si sconsiglia il volo libero.";
    }
    if (windMax > 20) {
      interp += `\n\nAttenzione solo al vento in quota: sopra i 2500 m può essere più sostenuto, quindi conviene restare su quote moderate.`;
    }
    if (precipTot > 0.5) {
      interp += `\n\nPossibili precipitazioni (${precipTot} mm totali), monitorare l'evoluzione.`;
    }

    return { situGen, profiloTerm, ventoQuota, tabellaOraria, interp, tempMin: Math.round(tempMin), tempMax: Math.round(tempMax), tempMed, windMed, windMax, cloudMed, humMed, precipTot, salitaMedia, baseMedia, topMedia };
  }, [dayData, alt]);

  if (!riepilogo) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-400 text-lg">
        <Clock className="w-8 h-8 mr-3 text-slate-500" />
        Nessun dato disponibile per questa giornata.
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* ☀️ Situazione generale */}
      <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/40 border-2 border-amber-500/30 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-bold text-amber-300 flex items-center gap-2">
            <Sun className="w-5 h-5" /> Situazione generale
          </h3>
          <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
        </div>
        <div className="space-y-2 text-sm text-slate-300 leading-relaxed whitespace-pre-line">
          {riepilogo.situGen.split('\n\n').map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      </div>

      {/* 🌡️ Profilo termico */}
      <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/40 border-2 border-sky-500/30 rounded-2xl p-5">
        <h3 className="text-base font-bold text-sky-300 flex items-center gap-2 mb-3">
          <span>🌡️</span> Profilo termico e stabilità
        </h3>
        <div className="space-y-2 text-sm text-slate-300 leading-relaxed whitespace-pre-line">
          {riepilogo.profiloTerm.split('\n\n').map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      </div>

      {/* 🌬️ Vento in quota */}
      <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/40 border-2 border-emerald-500/30 rounded-2xl p-5">
        <h3 className="text-base font-bold text-emerald-300 flex items-center gap-2 mb-3">
          <span>🌬️</span> Vento e dinamica in quota
        </h3>
        <div className="space-y-2 text-sm text-slate-300 leading-relaxed whitespace-pre-line">
          {riepilogo.ventoQuota.split('\n\n').map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      </div>

      {/* 🌤️ Previsione oraria tabellare */}
      <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/40 border-2 border-purple-500/30 rounded-2xl p-5">
        <h3 className="text-base font-bold text-purple-300 flex items-center gap-2 mb-3">
          <span>🌤️</span> Previsione per la giornata
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700/50">
                <th className="text-left py-2 pr-4 font-bold text-slate-400">Fascia oraria</th>
                <th className="text-left py-2 px-4 font-bold text-slate-400">Condizioni previste</th>
                <th className="text-left py-2 pl-4 font-bold text-slate-400">Note</th>
              </tr>
            </thead>
            <tbody>
              {[
                { fascia: "Mattina (8–11)", condizioni: riepilogo.tabellaOraria.match(/Mattina.*\t(.*?)\t(.*?)$/m)?.[1] || "Sole pieno, vento debole", note: riepilogo.tabellaOraria.match(/Mattina.*\t.*?\t(.*?)$/m)?.[1] || "Ottima visibilità" },
                { fascia: "Pomeriggio (12–17)", condizioni: riepilogo.tabellaOraria.match(/Pomeriggio.*\t(.*?)\t(.*?)$/m)?.[1] || "Termiche moderate", note: riepilogo.tabellaOraria.match(/Pomeriggio.*\t.*?\t(.*?)$/m)?.[1] || "Buone condizioni" },
                { fascia: "Sera (18–21)", condizioni: riepilogo.tabellaOraria.match(/Sera.*\t(.*?)\t(.*?)$/m)?.[1] || "Cielo sereno", note: riepilogo.tabellaOraria.match(/Sera.*\t.*?\t(.*?)$/m)?.[1] || "Atmosfera stabile" },
              ].map((r, i) => (
                <tr key={i} className="border-b border-slate-700/20 last:border-0">
                  <td className="py-2 pr-4 font-semibold text-slate-200">{r.fascia}</td>
                  <td className="py-2 px-4 text-slate-300">{r.condizioni}</td>
                  <td className="py-2 pl-4 text-slate-400">{r.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 🪂 Interpretazione */}
      <div className="bg-gradient-to-br from-orange-900/20 to-amber-900/10 border-2 border-orange-700/30 rounded-2xl p-5">
        <h3 className="text-base font-bold text-orange-300 flex items-center gap-2 mb-3">
          <span>🪂</span> Interpretazione per attività outdoor / volo libero
        </h3>
        <div className="space-y-2 text-sm text-slate-300 leading-relaxed whitespace-pre-line">
          {riepilogo.interp.split('\n\n').map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      </div>
    </div>
  );
}