"use client";

import React, { useMemo } from "react";
import { Activity, CloudSun, Wind, Flame, BrainCircuit, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import { useWeatherData } from "@/hooks/useWeatherData";
import { calcolaTermiche } from "@/utils/termiche";
import { DECOLLI } from "@/data/decolli";

/* ---------- HELPER FUNCTIONS ---------- */
function formatDateShort(date: Date): string {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return "";
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}
function getWindDirName(deg: number | null): string {
  if (deg == null) return "N/D";
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return dirs[Math.round((deg ?? 0) / 22.5) % 16];
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
function getRischioBg(r: number): string {
  if (r >= 70) return "bg-red-900/30 border-red-500/40";
  if (r >= 40) return "bg-orange-900/30 border-orange-500/40";
  if (r >= 15) return "bg-amber-900/30 border-orange-500/40";
  if (r >= 5) return "bg-yellow-900/20 border-yellow-500/30";
  return "bg-green-900/20 border-green-500/30";
}
function getRischioText(r: number): string {
  if (r >= 70) return "text-red-400";
  if (r >= 40) return "text-orange-400";
  if (r >= 15) return "text-amber-400";
  if (r >= 5) return "text-yellow-400";
  return "text-green-400";
}
function getRischioBar(r: number): string {
  if (r >= 70) return "bg-red-500";
  if (r >= 40) return "bg-orange-500";
  if (r >= 15) return "bg-amber-500";
  if (r >= 5) return "bg-yellow-500";
  return "bg-green-500";
}

/* ---------- MAIN COMPONENT ---------- */
export default function AnalisiMeteo() {
  const {
    selectedId,
    site,
    selectedDay,
    dayData,
    currentData,
    lastUpdate,
  } = useWeatherData();

  const currentSite = selectedId ? DECOLLI.find((d) => d.id === selectedId) ?? site : site;
  const hasData = !!currentSite && dayData?.length > 0;

  const current = useMemo(() => {
    if (!currentSite || !dayData || dayData.length === 0) return null;
    const currentHour = new Date().getHours();
    return dayData.find((h) => h.time.getHours() === currentHour) ?? dayData[0];
  }, [currentSite, dayData]);

  const termicheOrarie = useMemo(() => {
    if (!currentSite || !dayData || dayData.length === 0) return [];
    return dayData.map((h) => {
      const ora = h.time.getHours();
      const t = calcolaTermiche(h, currentSite.altitude);
      return { ora, rateo: t.rateo, base: t.base, top: t.top, precip: h.precipitation ?? 0, temp: h.temperature };
    });
  }, [currentSite, dayData]);

  const precipitazioneOraria = useMemo(() => {
    if (!currentSite || !dayData || dayData.length === 0) return [];
    return dayData.map((h) => ({
      ora: h.time.getHours(),
      mm: h.precipitation ?? 0,
    }));
  }, [currentSite, dayData]);

  const totalePrecipitazione = precipitazioneOraria.reduce((s, p) => s + p.mm, 0);
  const primaOraPioggia = precipitazioneOraria.find((p) => p.mm > 0.1)?.ora;
  const ultimaOraPioggia = precipitazioneOraria
    .slice()
    .reverse()
    .find((p) => p.mm > 0.1)?.ora;

  const LI = current?.liftedIndex !== null && current?.liftedIndex !== undefined ? current.liftedIndex : -4;
  const CIN = current?.cin ?? 0;
  const zeroTermico = current?.freezingLevel ?? 3000;
  const cloudBase = useMemo(() => {
    if (!current) return 0;
    const spread = current.temperature - (current.dewPoint ?? current.temperature - 8);
    return Math.round(currentSite.altitude + spread * 125);
  }, [current, currentSite.altitude]);

  const maxRateo = termicheOrarie.length > 0 ? Math.max(...termicheOrarie.map((t) => t.rateo), 0) : 0;
  let giudizioScore = 5;
  if (maxRateo >= 2) giudizioScore += 3;
  else if (maxRateo >= 1) giudizioScore += 2;
  else if (maxRateo >= 0.5) giudizioScore += 1;
  if (totalePrecipitazione === 0) giudizioScore += 2;
  else if (totalePrecipitazione < 1) giudizioScore += 1;
  else if (totalePrecipitazione < 3) giudizioScore -= 1;
  else giudizioScore -= 2;
  giudizioScore = Math.min(10, Math.max(0, giudizioScore));
  const giudizioLabel =
    giudizioScore >= 8 ? "Eccellente" : giudizioScore >= 6 ? "Buona" : giudizioScore >= 4 ? "Discreta" : giudizioScore >= 2 ? "Scarsa" : "Pessima";

  const inizioFinestra = 9;
  const fineFinestra = primaOraPioggia ?? 19;

  // Dynamically generate the report text based on actual data
  const reportText = useMemo(() => {
    if (!current || !currentSite) {
      return "Dati non disponibili per generare il report.";
    }

    const temp = current.temperature;
    const wind = current.windSpeed;
    const gusts = current.windGusts;
    const clouds = current.cloudCover;
    const precip = current.precipitation;
    const hum = current.humidity;
    const pressure = current.pressure;
    const weatherCode = current.weatherCode;

    const isRainy = precip > 0.5 || weatherCode >= 61;
    const isStormy = weatherCode >= 95;
    const isWindy = wind > 25;
    const isCalm = wind < 5;

    let giudizio = "";
    if (isStormy) {
      giudizio = "8/10 – Giornata con temporali, non volare";
    } else if (isRainy) {
      giudizio = "6/10 – Pioggia presente, volo a rischio";
    } else if (isWindy) {
      giudizio = "5/10 – Vento forte, attenzione in quota";
    } else if (isCalm) {
      giudizio = "4/10 – Vento debole, termiche limitate";
    } else {
      giudizio = "7/10 – Buone condizioni per il volo";
    }

    const andamento = `Alle ${String(current.time.getHours()).padStart(2, "0")}:00 la temperatura è di ${Math.round(temp)}°C con vento da ${getWindDirName(current.windDir)} a ${Math.round(wind)} km/h (raffiche ${Math.round(gusts)} km/h). Nuvolosità al ${Math.round(clouds)}%, umidità ${Math.round(hum)}%, pressione ${Math.round(pressure)} hPa. ${precip > 0 ? `Pioggia: ${precip.toFixed(1)} mm.` : "Nessuna precipitazione."}`;

    const termicheDesc = `Le termiche massime raggiungono ${maxRateo.toFixed(1)} m/s. ${maxRateo >= 2 ? "Ottime ascendenze per guadagnare quota." : maxRateo >= 1 ? "Termiche moderate, volo locale consigliato." : "Termiche deboli, difficile sostenere il volo."}`;

    const precipDesc = totalePrecipitazione > 0
      ? `Pioggia totale prevista: ${totalePrecipitazione.toFixed(1)} mm. Prima pioggia alle ${primaOraPioggia ? String(primaOraPioggia).padStart(2, "0") + ":00" : "N/D"}.`
      : "Nessuna pioggia prevista per oggi.";

    const emagrammaDesc = `LI: ${LI}°C (${LI <= -4 ? "alta instabilità" : LI <= -2 ? "moderata instabilità" : "stabile"}). CIN: ${CIN} J/kg. Zero termico a ${zeroTermico}m. Base nuvole a ${cloudBase}m.`;

    const interpretazione = isStormy
      ? "La giornata presenta condizioni temporalesche. Evita assolutamente il volo."
      : isRainy
        ? "Pioggia presente. Valuta attentamente le condizioni locali."
        : isWindy
          ? "Vento forte in quota. Consigliato solo per piloti esperti."
          : isCalm
            ? "Vento debole. Le termiche saranno deboli, volo difficile."
            : "Condizioni favorevoli. Buona giornata per il volo.";

    const consigli = isStormy
      ? "Non volare. Aspetta condizioni migliori."
      : `Decolla entro le ${String(inizioFinestra).padStart(2, "0")}:00. Concentra il volo tra le 11:00 e le 13:00. Rientra entro le ${String(fineFinestra).padStart(2, "0")}:30.`;

    const riepilogo = `Temp max ${Math.round(Math.max(...termicheOrarie.map(t => t.temp), 0))}°C, vento ${Math.round(wind)} km/h, termiche ${maxRateo.toFixed(1)} m/s, pioggia ${totalePrecipitazione.toFixed(1)} mm. Finestra operativa: ${String(inizioFinestra).padStart(2, "0")}:00 - ${String(fineFinestra).padStart(2, "0")}:30.`;

    return `🧭 GIUDIZIO GENERALE: ${giudizio}

🔥 ANDAMENTO ORARIO: ${andamento}

📈 TERMICHE: ${termicheDesc}

🌧️ PRECIPITAZIONI: ${precipDesc}

📊 ANALISI DELL'EMAGRAMMA: ${emagrammaDesc}

🧭 INTERPRETAZIONE: ${interpretazione}

🛩️ CONSIGLI: ${consigli}

📌 RIEPILOGO: ${riepilogo}

⚠️ Avvertenza: questo report è basato su modelli numerici e non sostituisce il bollettino ufficiale. La responsabilità del volo è del pilota.`;
  }, [current, currentSite, termicheOrarie, precipitazioneOraria, totalePrecipitazione, primaOraPioggia, LI, CIN, zeroTermico, cloudBase, maxRateo, inizioFinestra, fineFinestra]);

  const dataReport = useMemo(() => {
    if (!dayData || dayData.length === 0) {
      const now = new Date();
      return formatDateShort(now);
    }
    return formatDateShort(new Date(dayData[0].time));
  }, [dayData]);

  const oraAggiornamento = lastUpdate
    ? lastUpdate.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })
    : new Date().toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });

  if (!hasData) {
    return (
      <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-4 text-center text-slate-400">
        Seleziona un decollo per vedere l'analisi approfondita
      </div>
    );
  }

  return (
    <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-purple-400 shrink-0" />
          <h3 className="text-base font-bold text-white">Analisi approfondita · {currentSite.name}</h3>
        </div>
        <span className="text-xs text-slate-400">Aggiornato {oraAggiornamento} UTC</span>
      </div>

      <div className="bg-slate-900/50 border border-slate-700/50 rounded-lg p-4">
        <p className="text-slate-100 text-sm font-mono whitespace-pre-line leading-relaxed">
          🌤️ REPORT VOLO A VELA – {currentSite.name.toUpperCase()} – {dataReport} 🌤️
          Quota partenza circa {currentSite.altitude} m s.l.m. – Dati da AROME + ICON‑EU elaborati da Alpium – Aggiornamento {oraAggiornamento} UTC

          {reportText}

          ⚠️ Avvertenza finale: questo report è basato su modelli numerici e ha valore di supporto alla pianificazione; non sostituisce il bollettino meteorologico ufficiale né l'osservazione diretta delle condizioni reali. La responsabilità della decisione di volare e della sicurezza in volo è sempre e solo del pilota. Detto questo, la giornata offre opportunità interessanti se affrontata con disciplina, prudenza e rispetto dei limiti temporali.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className={`rounded-lg p-3 border ${getRischioBg(giudizioScore * 10)}`}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-400">GIUDIZIO GIORNATA</span>
            <span className={`text-sm font-bold ${getRischioText(giudizioScore * 10)}`}>{giudizioScore}/10</span>
          </div>
          <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
            <div className={`h-full ${getRischioBar(giudizioScore * 10)} rounded-full transition-all duration-500`} style={{ width: `${giudizioScore * 10}%` }} />
          </div>
          <p className="text-xs text-slate-300 mt-1">{giudizioLabel}</p>
        </div>

        <div className="bg-slate-800/50 border border-slate-700/30 rounded-lg p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-400">FINESTRA OPERATIVA</span>
            <span className="text-sm font-bold text-white">{String(inizioFinestra).padStart(2, "0")}:00 – {String(fineFinestra).padStart(2, "0")}:30</span>
          </div>
          <p className="text-xs text-slate-300">Decollo entro {String(inizioFinestra).padStart(2, "0")}:00, atterraggio tassativo entro {String(fineFinestra).padStart(2, "0")}:30</p>
        </div>

        <div className="bg-slate-800/50 border border-slate-700/30 rounded-lg p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-400">LI (Lifted Index)</span>
            <span className="text-sm font-bold text-white">LI</span>
          </div>
          <p className="text-xs text-slate-300">{LI <= -4 ? "Alta instabilità – Rischio temporali" : LI <= -2 ? "Instabilità moderata" : "Atmosfera stabile"}</p>
        </div>

        <div className="bg-slate-800/50 border border-slate-700/30 rounded-lg p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-400">BASE NUBI / ZERO TERMICO</span>
            <span className="text-sm font-bold text-white">{cloudBase} m / {zeroTermico} m</span>
          </div>
          <p className="text-xs text-slate-300">Guadagno max: ~{Math.max(0, cloudBase - currentSite.altitude)} m sopra decollo</p>
        </div>

        <div className="bg-slate-800/50 border border-slate-700/30 rounded-lg p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-400">PRECIPITAZIONI TOTALI</span>
            <span className="text-sm font-bold text-white">{totalePrecipitazione.toFixed(1)} mm</span>
          </div>
          <p className="text-xs text-slate-300">Prima pioggia: {primaOraPioggia ? String(primaOraPioggia).padStart(2, "0") + ":00" : "Nessuna"}</p>
        </div>

        <div className="bg-slate-800/50 border border-slate-700/30 rounded-lg p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-400">TERMICHE MAX</span>
            <span className="text-sm font-bold text-white">{maxRateo.toFixed(1)} m/s</span>
          </div>
          <p className="text-xs text-slate-300">Picco tra le 11-13, crollo dopo le 16</p>
        </div>
      </div>
    </div>
  );
}