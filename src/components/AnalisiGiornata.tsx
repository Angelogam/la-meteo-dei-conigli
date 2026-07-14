"use client";

import React, { useMemo } from "react";
import {
  Sun,
  CloudSun,
  CloudRain,
  AlertTriangle,
  Wind,
  Thermometer,
  Cloud,
  Sparkles,
} from "lucide-react";

interface AnalisiGiornataProps {
  currentData: any;
  dayData: any[];
  thermalDelta: number;
  cape?: { cape: number; cin: number; liftedIndex: number } | null;
  dailyForecasts: any[];
  cloudCover: number;
  reportDate: string;
}

function getWindDescription(speed: number): string {
  if (speed <= 5) return "venticello leggero";
  if (speed <= 10) return "brezza piacevole";
  if (speed <= 15) return "vento moderato";
  if (speed <= 20) return "vento teso";
  return "vento forte";
}

function getWindIcon(speed: number) {
  if (speed <= 5) return "🍃";
  if (speed <= 10) return "🌬️";
  if (speed <= 15) return "💨";
  return "🌪️";
}

export default function AnalisiGiornata({
  currentData,
  dayData,
  thermalDelta,
  cape,
  dailyForecasts,
  cloudCover,
  reportDate,
}: AnalisiGiornataProps) {
  const analisi = useMemo(() => {
    if (!dayData || dayData.length === 0) {
      return {
        giudizio: "N/D",
        colore: "text-slate-400",
        bg: "bg-slate-800/30",
        icona: <AlertTriangle className="w-5 h-5 text-slate-400" />,
        titolo: "Dati non disponibili",
        descrizione: "Attendi il caricamento dei dati meteo.",
        dettagli: [],
        punteggio: 0,
      };
    }

    const oreGiorno = dayData.filter((h: any) => {
      const hr = h.time?.getHours?.() ?? h.hour ?? 0;
      return hr >= 8 && hr <= 19;
    });

    if (oreGiorno.length === 0) {
      return {
        giudizio: "N/D",
        colore: "text-slate-400",
        bg: "bg-slate-800/30",
        icona: <AlertTriangle className="w-5 h-5 text-slate-400" />,
        titolo: "Dati insufficienti",
        descrizione: "Non ci sono abbastanza ore diurne nei dati.",
        dettagli: [],
        punteggio: 0,
      };
    }

    const tempMedia = oreGiorno.reduce((s: number, h: any) => s + (h.temperature ?? 0), 0) / oreGiorno.length;
    const tempMax = Math.max(...oreGiorno.map((h: any) => h.temperature ?? 0));
    const ventoMedio = oreGiorno.reduce((s: number, h: any) => s + (h.windSpeed ?? 0), 0) / oreGiorno.length;
    const coperturaMedia = oreGiorno.reduce((s: number, h: any) => s + (h.cloudCover ?? 0), 0) / oreGiorno.length;
    const pioggiaMax = Math.max(...oreGiorno.map((h: any) => h.precipitation ?? 0));
    const oreConPioggia = oreGiorno.filter((h: any) => (h.precipitation ?? 0) > 0.2).length;
    const oreConSole = oreGiorno.filter((h: any) => (h.cloudCover ?? 0) < 30).length;
    const oreConNuvoloso = oreGiorno.filter((h: any) => (h.cloudCover ?? 0) >= 30 && (h.cloudCover ?? 0) < 70).length;

    // Punteggio composito (0-100)
    let punteggio = 0;
    const dettagli: string[] = [];

    // Temperatura (max 25pt)
    if (tempMax >= 25 && tempMax <= 35) {
      punteggio += 25;
      dettagli.push(`Temperatura perfetta: ${Math.round(tempMax)}°C`);
    } else if (tempMax >= 18 && tempMax <= 38) {
      punteggio += 15;
      dettagli.push(`Temperatura buona: ${Math.round(tempMax)}°C`);
    } else if (tempMax >= 10 && tempMax <= 40) {
      punteggio += 8;
    }

    // Delta termico (max 20pt)
    if (thermalDelta >= 12) {
      punteggio += 20;
      dettagli.push(`Buon differenziale termico: ${thermalDelta}°C`);
    } else if (thermalDelta >= 8) {
      punteggio += 12;
      dettagli.push(`Differenziale termico discreto: ${thermalDelta}°C`);
    } else if (thermalDelta >= 5) {
      punteggio += 5;
    }

    // Vento (max 25pt)
    if (ventoMedio <= 5) {
      punteggio += 25;
      dettagli.push(`Vento quasi assente: ${Math.round(ventoMedio)} km/h`);
    } else if (ventoMedio <= 10) {
      punteggio += 20;
      dettagli.push(`${getWindIcon(ventoMedio)} Vento favorevole: ${Math.round(ventoMedio)} km/h`);
    } else if (ventoMedio <= 15) {
      punteggio += 12;
      dettagli.push(`Vento moderato: ${Math.round(ventoMedio)} km/h — affidati a un decollo riparato`);
    } else if (ventoMedio <= 20) {
      punteggio += 5;
      dettagli.push(`Vento teso: ${Math.round(ventoMedio)} km/h — giornata impegnativa`);
    } else {
      dettagli.push(`Vento forte: ${Math.round(ventoMedio)} km/h — sconsigliato`);
    }

    // Nuvolosità (max 15pt)
    if (coperturaMedia < 20) {
      punteggio += 15;
      dettagli.push("Cielo sereno o poco nuvoloso ☀️");
    } else if (coperturaMedia < 40) {
      punteggio += 12;
      dettagli.push("Cielo per lo più soleggiato 🌤️");
    } else if (coperturaMedia < 60) {
      punteggio += 8;
      dettagli.push("Alternanza di nuvole e sole ⛅");
    } else if (coperturaMedia < 80) {
      punteggio += 4;
      dettagli.push("Cielo molto nuvoloso ☁️");
    } else {
      dettagli.push("Cielo coperto — poche finestre di sole");
    }

    // Pioggia (max 15pt)
    if (pioggiaMax === 0) {
      punteggio += 15;
      dettagli.push("Nessuna pioggia prevista ✅");
    } else if (oreConPioggia <= 2 && pioggiaMax < 2) {
      punteggio += 10;
      dettagli.push("Pioggia possibile ma isolata 🌦️");
    } else if (oreConPioggia <= 4) {
      punteggio += 5;
      dettagli.push("Rovesci intermittenti — porta una giacca");
    } else {
      dettagli.push("Pioggia frequente — giornata a rischio ☔");
    }

    // CAPE (max 15pt bonus)
    if (cape && cape.cape > 300) {
      punteggio += 15;
      dettagli.push(`Forte energia disponibile: ${Math.round(cape.cape)} J/kg — termiche potenti`);
    } else if (cape && cape.cape > 100) {
      punteggio += 10;
      dettagli.push(`Energia termica buona: ${Math.round(cape.cape)} J/kg`);
    } else if (cape && cape.cape > 0) {
      punteggio += 5;
    }

    // Giudizio
    let giudizio: string, colore: string, bg: string, titolo: string, descrizione: string, icona: React.ReactNode;

    if (punteggio >= 80) {
      giudizio = "Eccellente";
      colore = "text-emerald-300";
      bg = "bg-emerald-900/30 border-emerald-500/30";
      icona = <Sparkles className="w-6 h-6 text-emerald-400" />;
      titolo = "Ottima giornata per il volo!";
      if (ventoMedio <= 8 && tempMax >= 22) {
        descrizione = `Condizioni da manuale per volare: ${Math.round(tempMax)}°C, ${getWindDescription(ventoMedio)} e tanto sole. Le termiche promettono di essere robuste e ben organizzate.`;
      } else if (ventoMedio <= 10) {
        descrizione = `Giornata splendida per stare in aria: temperature piacevoli (${Math.round(tempMax)}°C), vento gestibile e cielo per lo più sereno.`;
      } else {
        descrizione = `Condizioni generalmente molto buone: il ${getWindDescription(ventoMedio)} è gestibile, le termiche ci sono e il cielo è favorevole.`;
      }
    } else if (punteggio >= 60) {
      giudizio = "Buona";
      colore = "text-lime-300";
      bg = "bg-lime-900/30 border-lime-500/30";
      icona = <Sun className="w-6 h-6 text-lime-400" />;
      titolo = "Buona giornata per il volo";
      descrizione = `Condizioni generalmente favorevoli: ${Math.round(tempMax)}°C con ${getWindDescription(ventoMedio)}. ${
        oreConNuvoloso > 4 ? "Qualche nuvola potrebbe rallentare le termiche a tratti, ma nel complesso si vola bene." : "Il cielo offre buone opportunità per un bel volo."
      }`;
    } else if (punteggio >= 40) {
      giudizio = "Discreta";
      colore = "text-amber-300";
      bg = "bg-amber-900/30 border-amber-500/30";
      icona = <CloudSun className="w-6 h-6 text-amber-400" />;
      titolo = "Giornata discreta — valutare con attenzione";
      descrizione = `Condizioni miste: ${Math.round(tempMax)}°C con ${getWindDescription(ventoMedio)}. ${
        pioggiaMax > 0 ? "Possibili rovesci sparsi, monitora l'evoluzione." : "La copertura nuvolosa potrebbe limitare lo sviluppo termico."
      } Meglio scegliere un sito adatto alle condizioni.`;
    } else if (punteggio >= 20) {
      giudizio = "Difficile";
      colore = "text-orange-300";
      bg = "bg-orange-900/30 border-orange-500/30";
      icona = <Wind className="w-6 h-6 text-orange-400" />;
      titolo = "Giornata impegnativa";
      descrizione = `Le condizioni sono complesse: ${
        ventoMedio > 15 ? "vento sostenuto" : "molta nuvolosità"
      } e temperature poco favorevoli. Se decolli, scegli un sito protetto e vola con prudenza.`;
    } else {
      giudizio = "Sconsigliata";
      colore = "text-red-300";
      bg = "bg-red-900/30 border-red-500/30";
      icona = <CloudRain className="w-6 h-6 text-red-400" />;
      titolo = "Giornata sconsigliata per il volo";
      descrizione = `Condizioni avverse: ${pioggiaMax > 0 ? "pioggia prevista" : "vento troppo forte"}, cielo coperto e scarsa energia termica. Meglio rimandare.`;
    }

    return {
      giudizio,
      colore,
      bg,
      icona,
      titolo,
      descrizione,
      dettagli,
      punteggio,
      tempMedia,
      ventoMedio,
      tempMax,
      coperturaMedia,
    };
  }, [dayData, thermalDelta, cape, currentData]);

  return (
    <div className={`rounded-2xl border p-5 space-y-4 ${analisi.bg}`}>
      {/* Intestazione */}
      <div className="flex items-start gap-4">
        <div className="shrink-0 mt-1">{analisi.icona}</div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-bold text-white">{analisi.titolo}</h3>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full bg-white/10 ${analisi.colore}`}>
              {analisi.giudizio}
            </span>
          </div>
          <p className="text-sm text-slate-300 leading-relaxed">{analisi.descrizione}</p>
        </div>
      </div>

      {/* Dettagli */}
      <div className="bg-black/20 rounded-xl p-4">
        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Dettagli</div>
        <ul className="space-y-1.5">
          {analisi.dettagli.map((d: string, i: number) => (
            <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
              <span className="text-emerald-400 mt-0.5">✦</span>
              {d}
            </li>
          ))}
        </ul>
      </div>

      {/* Metadati */}
      <div className="flex flex-wrap gap-3 text-xs text-slate-500">
        <span>Punteggio: {analisi.punteggio}/100</span>
        {analisi.tempMedia != null && (
          <span>Temp media: {Math.round(analisi.tempMedia)}°C</span>
        )}
        {analisi.ventoMedio != null && (
          <span>Vento medio: {Math.round(analisi.ventoMedio)} km/h</span>
        )}
        {reportDate && <span>Aggiornato: {reportDate}</span>}
      </div>
    </div>
  );
}