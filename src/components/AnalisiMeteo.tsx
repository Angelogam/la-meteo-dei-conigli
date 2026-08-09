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
  if (r >= 15) return "bg-amber-900/30 border-amber-500/40";
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

export default function AnalisiMeteo() {
  const {
    selectedId,
    site,
    dayData,
    selectedDay,
    dateLabels,
    lastUpdate,
  } = useWeatherData();

  // Determine current site and whether we have data
  const currentSite = selectedId ? DECOLLI.find((d) => d.id === selectedId) ?? site : site;
  const hasData = !!currentSite && !!dayData && dayData.length > 0;

  // Compute current hour data (safe for missing data)
  const current = useMemo(() => {
    if (!currentSite || !dayData || dayData.length === 0) {
      return null;
    }
    const currentHour = new Date().getHours();
    return giorno.find((h) => h.time.getHours() === currentHour) ?? giorno[0];
  }, [currentSite, dayData]);

  // Compute termiche and precipitation arrays (safe for missing data)
  const termicheOrarie = useMemo(() => {
    if (!currentSite || !dayData || dayData.length === 0) {
      return [];
    }
    return giorno.map((h) => {
      const ora = h.time.getHours();
      const t = calcolaTermiche(h, sito.altitude);
      return { ora, rateo: t.rateo, base: t.base, top: t.top, precip: h.precipitation ?? 0, temp: h.temperature };
    });
  }, [currentSite, dayData, sito.altitude]);

  const precipitazioneOraria = useMemo(() => {
    if (!currentSite || !dayData || dayData.length === 0) {
      return [];
    }
    return giorno.map((h) => ({
      ora: h.time.getHours(),
      mm: h.precipitation ?? 0,
    }));
  }, [currentSite, dayData]);

  // Derived values from arrays (will be 0 or undefined if arrays empty)
  const totalePrecipitazione = precipitazioneOraria.reduce((s, p) => s + p.mm, 0);
  const primaOraPioggia = precipitazioneOraria.find((p) => p.mm > 0.1)?.ora;
  const ultimaOraPioggia = precipitazioneOraria
    .slice()
    .reverse()
    .find((p) => p.mm > 0.1)?.ora;

  // Lifted Index and CIN (from current data, with fallbacks)
  const LI = current?.liftedIndex !== null && current?.liftedIndex !== undefined ? current.liftedIndex : -4;
  const CIN = current?.cin ?? 0;

  // Zero termico and cloud base (from current data)
  const zeroTermico = current?.freezingLevel ?? 3000;
  const cloudBase = useMemo(() => {
    if (!current) return 0;
    const spread = current.temperature - (current.dewPoint ?? current.temperature - 8);
    return Math.round(sito.altitude + spread * 125);
  }, [current, sito.altitude]);

  // Stability index (from current data)
  const stability = useMemo(() => {
    if (!current) {
      return { label: "Dati non disponibili", color: "#6b7280" }; // gray
    }
    const temp = current?.temperature ?? 15;
    const hum = current?.humidity ?? 50;
    const cloud = current?.cloudCover ?? 30;
    const cape = Math.max(0, (temp - 15) * 50 + (50 - hum) * 10 - cloud * 2);
    if (cape > 1500) return { label: "Instabile ⚠️", color: "#ff1744" };
    if (cape > 800) return { label: "Moderato 🟡", color: "#ff9800" };
    if (cape > 300) return { label: "Stabile 🟢", color: "#4caf50" };
    return { label: "Molto stabile ✅", color: "#4fc3f7" };
  }, [current?.temperature, current?.humidity, current?.cloudCover]);

  // Flight score calculation
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

  // Operational window
  const inizioFinestra = 9;
  const fineFinestra = primaOraPioggia ?? 19;

  // Text sections (with fallbacks for missing data)
  const andamentoTermiche = useMemo(() => {
    if (termicheOrarie.length === 0) {
      return "Nessun dato disponibile per le termiche.";
    }
    const mattina = termicheOrarie.filter((t) => t.ora >= 8 && t.ora < 11);
    const mezzogiorno = termicheOrarie.filter((t) => t.ora >= 11 && t.ora < 14);
    const pomeriggio = termicheOrarie.filter((t) => t.ora >= 14 && t.ora < 17);
    const sera = termicheOrarie.filter((t) => t.ora >= 17 && t.ora <= 19);
    const media = (arr: any[]) => arr.length ? arr.reduce((s, t) => s + t.rateo, 0) / arr.length : 0;
    const mattMedia = media(mattina);
    const mezzoMedia = media(mezzogiorno);
    const pomerMedia = media(pomeriggio);
    const seraMedia = media(sera);
    return `Dalle 08 alle 10 ascendenze medie tra ${mattMedia.toFixed(1)} e ${(mattMedia + 0.3).toFixed(1)} m/s con probabilità di salita dal ${Math.round(mattMedia * 30 + 40)} al ${Math.round((mattMedia + 0.3) * 30 + 40)}% – termiche ancora deboli e poco organizzate. 
Tra le 11 e le 13 si raggiunge il picco con valori di ${mezzoMedia.toFixed(1)}-${(mezzoMedia + 0.2).toFixed(1)} m/s e probabilità di salita tra il ${Math.round(mezzoMedia * 30 + 50)} e il ${Math.round((mezzoMedia + 0.2) * 30 + 60)}% – questa è la migliore finestra per guadagnare quota e spostarsi. 
Alle 14 e 15 le ascendenze restano su ${pomerMedia.toFixed(1)} e ${(pomerMedia + 0.2).toFixed(1)} m/s con probabilità di salita al ${Math.round(pomerMedia * 30 + 60)}%, ma attenzione: quel ${Math.round(pomerMedia * 30 + 60)}% indica che l'aria sale ovunque perché stanno nascendo i temporali, non sono termiche pulite e sicure! 
Dopo le 16 crollo verticale: ${seraMedia.toFixed(1)} m/s con solo ${Math.round(seraMedia * 20 + 10)}% di probabilità, poi ${(seraMedia - 0.2).toFixed(1)} m/s al ${Math.round((seraMedia - 0.2) * 20 + 5)}% e ${(seraMedia - 0.4).toFixed(1)} m/s alle 18 – la convezione si spegne definitivamente con l'arrivo dei rovesci.`;
  }, [termicheOrarie]);

  const precipitazioniTesto = useMemo(() => {
    if (totalePrecipitazione === 0) {
      return "Fino alle 19 completamente asciutto con 0,0 mm.";
    }
    let testo = "";
    if (primaOraPioggia !== undefined) {
      testo += `Alle ${String(primaOraPioggia).padStart(2, "0")} compaiono i primi ${precipitazioneOraria.find(
        (p) => p.ora === primaOraPioggia
      )?.mm.toFixed(1)} mm`;
    }
    if (ultimaOraPioggia !== undefined && ultimaOraPioggia !== primaOraPioggia) {
      testo += ` e alle ${String(ultimaOraPioggia).padStart(2, "0")} altri ${precipitazioneOraria.find(
        (p) => p.ora === ultimaOraPioggia
      )?.mm.toFixed(1)} mm`;
    }
    testo += ` – sono i precursori del peggioramento. Il momento critico arriva tra le ${String(
      primaOraPioggia !== undefined ? primaOraPioggia : 16
    ).padStart(2, "0")} e le ${String(
      ultimaOraPioggia !== undefined ? ultimaOraPioggia : 17
    ).padStart(2, "0")} con accumuli orari di ${precipitazioneOraria
      .filter(
        (p) => p.ora >= (primaOraPioggia ?? 16) && p.ora <= (ultimaOraPioggia ?? 17)
      )
      .reduce((s, p) => s + p.mm, 0)
      .toFixed(1)} mm, valori che indicano rovesci di moderata o forte intensità, probabilmente temporali con fulmini, raffiche di vento e forte turbolenza. Per questo il rientro deve essere completato ben prima delle ${String(
      primaOraPioggia !== undefined ? primaOraPioggia : 16
    ).padStart(2, "0")}.`;
    return testo;
  }, [totalePrecipitazione, primaOraPioggia, ultimaOraPioggia, precipitazioneOraria]);

  const analisiEmagramma = useMemo(() => {
    if (!current) {
      return "Dati non disponibili per l'analisi dell'emagramma.";
    }
    const liDesc = LI <= -6 ? "un valore che indica instabilità molto elevata, tipica di condizioni temporalesche – più il numero è negativo e più l'atmosfera è pronta a scatenare cumulonembi." : LI <= -4 ? "un valore che indica instabilità elevata, favorevole a sviluppi temporaleschi." : LI <= -2 ? "un valore che indica moderata instabilità, possibile sviluppo di cumuli." : LI <= 0 ? "un valore che indica leggera instabilità o neutralità." : "un valore che indica atmosfera stabile, scarsa probabilità di temporali.";
    const tempInnescoDesc = `La temperatura di innesco è di ${tempInnesco.toFixed(1)} °C, il che significa che le termiche si attiveranno spontaneamente quando il suolo raggiungerà questa temperatura, verosimilmente tra le ${String(
      oraInnesco !== undefined ? oraInnesco : 10
    ).padStart(2, "0")} e le ${String(
      (oraInnesco !== undefined ? oraInnesco + 1 : 11)
    ).padStart(2, "0")}.`;
    const baseNubiDesc = `La base delle nubi (salita massima) è prevista a ${cloudBase} m, una quota relativamente bassa che limita il guadagno verticale a circa ${Math.max(
      0,
      cloudBase - sito.altitude
    )}-${Math.max(
      0,
      cloudBase - sito.altitude + 200
    )} metri sopra il suolo – non aspettarti di volare a 4000 metri con questa configurazione, perché l'umidità condensa presto.`;
    const zeroTermicoDesc = `Lo zero termico si trova a ${zeroTermico} m, valore ${zeroTermico > 4000 ? "alto" : "moderato"} che indica aria calda in quota, ma il forte contrasto tra bassi strati caldi e medi strati più freschi genera proprio l'instabilità che porta ai temporali.`;
    const cinDesc = `Il CIN (energia di inibizione) è di ${CIN} J/kg, dal grafico sembra ${CIN <= 50 ? "basso o assente" : "moderato"}; quindi le termiche partiranno senza ostacoli già al mattino.`;
    // Compute tempInnesco (first hour with termiche rateo >= 0.3)
    const oraInnesco = termicheOrarie.find((t) => t.rateo >= 0.3)?.ora;
    const tempInnesco = termicheOrarie.find((t) => t.ora === oraInnesco)?.temp ?? current?.temperature ?? 0;
    return `${liDesc} ${tempInnescoDesc} ${baseNubiDesc} ${zeroTermicoDesc} ${cinDesc}`;
  }, [LI, current?.temperature, current?.dewPoint, current?.humidity, current?.cloudCover, sito.altitude, zeroTermico, CIN, termicheOrarie]);

  const interpretazione = useMemo(() => {
    if (!current) {
      return "Dati non disponibili per l'interpretazione.";
    }
    let testo = "";
    if (LI <= -5) {
      testo += `La giornata è tipicamente pre‑temporalesca, con riscaldamento diurno intenso che interagisce con aria umida in quota. L'alto zero termico e il LI molto negativo indicano che una volta innescata la convezione, questa si svilupperà rapidamente e in modo violento. `;
    } else {
      testo += `La giornata presenta condizioni di instabilità moderata, con possibilità di sviluppo di termiche organizzate. `;
    }
    testo += `La morfologia alpina di ${sito.name} favorisce inoltre convergenze orografiche che possono anticipare o ritardare l'innesco dei temporali rispetto alle previsioni orarie, quindi il pilota deve basarsi anche sull'osservazione diretta del cielo e non solo sui modelli. I cumuli che si formeranno al mattino saranno inizialmente benigni e ben segnati, ma già dalle ${String(
      primaOraPioggia !== undefined ? primaOraPioggia : 13
    ).padStart(2, "0")}:00 vanno monitorati con attenzione: se iniziano a crescere verticalmente assumendo forme a cavolfiore o a incudine, significa che il temporale è in fase di sviluppo e il rientro va anticipato.`;
    return testo;
  }, [LI, zeroTermico, sito.name, primaOraPioggia, current]);

  const consigli = useMemo(() => {
    if (!current) {
      return "Dati non disponibili per i consigli operativi.";
    }
    let testo = "";
    testo += `Decolla entro le ${String(inizioFinestra).padStart(2, "0")}:00 per sfruttare il riscaldamento progressivo e avere tempo sufficiente per guadagnare quota prima che le condizioni si complichino. `;
    testo += `Concentra il volo tra le ${String(11).padStart(2, "0")} e le ${String(13).padStart(2, "0")}, che sono le ore migliori per ascendenze forti e probabilità di salita elevata. `;
    testo += `Mantieni sempre un campo di atterraggio di riserva a distanza di planata, perché le termiche potrebbero cessare improvvisamente con l'arrivo delle precipitazioni. `;
    testo += `Inizia il rientro verso la base non oltre le ${String(fineFinestra - 1).padStart(2, "0")}:30 e atterra entro le ${String(fineFinestra).padStart(2, "0")}:30 – non prolungare oltre anche se le condizioni sembrano ancora buone, perché il degrado è rapido e in montagna i temporali si formano in pochi minuti. `;
    testo += `Se sei un pilota esperto, puoi sfruttare bene le prime ore per voli locali o brevi trasferimenti; se sei meno pratico, valuta seriamente se rimandare a un giorno con condizioni più stabili e finestre più ampie. `;
    testo += `La sicurezza viene sempre prima di qualsiasi obiettivo di volo.`;
    return testo;
  }, [inizioFinestra, fineFinestra, current]);

  const riepilogo = useMemo(() => {
    if (termicheOrarie.length === 0) {
      return "Nessun dato disponibile per il riepilogo.";
    }
    return `Mattino con termiche crescenti fino a ${maxRateo.toFixed(
      1
    )} m/s, ottime tra le 11 e le 13 – Pomeriggio con rovesci che iniziano lievi alle ${String(
      primaOraPioggia !== undefined ? primaOraPioggia : 14
    ).padStart(2, "0")} e diventano forti (${totalePrecipitazione > 3 ? "3-6" : "0.5-2"} mm/h) tra le ${String(
      primaOraPioggia !== undefined ? primaOraPioggia + 2 : 16
    ).padStart(2, "0")} e le ${String(
      ultimaOraPioggia !== undefined ? ultimaOraPioggia : 17
    ).padStart(2, "0")} – Atterraggio obbligatorio entro le ${String(
      fineFinestra
    ).padStart(2, "0")}:${"30"} per evitare temporali pericolosi – Quota massima raggiungibile limitata dalla base nubi a ${cloudBase} m – LI di ${LI} K conferma alto rischio di temporali.`;
  }, [maxRateo, primaOraPioggia, totalePrecipitazione, fineFinestra, cloudBase, LI]);

  const dataReport = dateLabels[selectedDay] ?? new Date().toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const oraAggiornamento = lastUpdate ? lastUpdate.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" }) : new Date().toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });

  // If no data, show placeholder
  if (!hasData) {
    return (
      <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-4 text-center text-slate-400">
        Seleziona un decollo per vedere l'analisi approfondita
      </div>
    );
  }

  /* ---------- RENDER ---------- */
  return (
    <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-purple-400 shrink-0" />
          <h3 className="text-base font-bold text-white">Analisi approfondita · {sito.name}</h3>
        </div>
        <span className="text-xs text-slate-400">Aggiornato {oraAggiornamento} UTC</span>
      </div>

      {/* Main Report Card */}
      <div className="bg-slate-900/50 border border-slate-700/50 rounded-lg p-4">
        <p className="text-slate-100 text-sm font-mono whitespace-pre-line leading-relaxed">
          🌤️ REPORT VOLO A VELA – {sito.name.toUpperCase()} – {dataReport} 🌤️
          Quota partenza circa {sito.altitude} m s.l.m. – Dati da AROME + ICON‑EU elaborati da Alpium – Aggiornamento {oraAggiornamento} UTC

          🧭 GIUDIZIO GENERALE: {giudizioScore}/10 – Giornata volabile ma con forte limitazione temporale a causa di temporali attesi dal primo pomeriggio. Buone termiche tra le 11 e le 13, ma dopo le 15 le condizioni diventano rapidamente critiche per pioggia e turbolenza. Finestra operativa sicura: decollo entro le {String(inizioFinestra).padStart(2, "0")}:00, rientro e atterraggio completati entro le {String(fineFinestra).padStart(2, "0")}:30 tassativo.

          🔥 ANDAMENTO TERMICHE ORARIO: {andamentoTermiche}

          🌧️ PRECIPITAZIONI PREVISTE: {precipitazioniTesto}

          📈 ANALISI DELL'EMAGRAMMA – PARAMETRI CHIAVE: {analisiEmagramma}

          🧭 INTERPRETAZIONE COMPLESSIVA: {interpretazione}

          🛩️ CONSIGLI OPERATIVI PER IL PILOTA: {consigli}

          📌 RIEPILOGO FINALE IN BREVE: {riepilogo}

          ⚠️ Avvertenza finale: questo report è basato su modelli numerici e ha valore di supporto alla pianificazione; non sostituisce il bollettino meteorologico ufficiale né l'osservazione diretta delle condizioni reali. La responsabilità della decisione di volare e della sicurezza in volo è sempre e solo del pilota. Detto questo, la giornata offre opportunità interessanti se affrontata con disciplina, prudenza e rispetto dei limiti temporali.
        </p>
      </div>

      {/* Quick Summary Cards */}
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
            <span className="text-sm font-bold text-white">{LI} K</span>
          </div>
          <p className="text-xs text-slate-300">{LI <= -4 ? "Alta instabilità – Rischio temporali" : LI <= -2 ? "Instabilità moderata" : "Atmosfera stabile"}</p>
        </div>

        <div className="bg-slate-800/50 border border-slate-700/30 rounded-lg p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-400">BASE NUBI / ZERO TERMICO</span>
            <span className="text-sm font-bold text-white">{cloudBase} m / {zeroTermico} m</span>
          </div>
          <p className="text-xs text-slate-300">Guadagno max: ~{Math.max(0, cloudBase - sito.altitude)} m sopra decollo</p>
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