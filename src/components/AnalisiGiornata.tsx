"use client";

import React, { useMemo } from "react";
import {
  Sun,
  CloudSun,
  CloudRain,
  AlertTriangle,
  Wind,
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

export default function AnalisiGiornata({
  dayData,
  thermalDelta,
  cape,
}: AnalisiGiornataProps) {
  const analisi = useMemo(() => {
    if (!dayData || dayData.length === 0) {
      return {
        giudizio: "N/D",
        colore: "text-slate-400",
        bg: "bg-slate-800/30",
        icona: <AlertTriangle className="w-6 h-6 text-slate-400" />,
        titolo: "Dati non disponibili per questo giorno",
        descrizione: "Attendi il caricamento completo dei dati meteo.",
        dettagli: [],
        punteggio: 0,
      };
    }

    // Filtra solo ore diurne 9-19
    const oreGiorno = dayData.filter((h: any) => {
      const hr = h.time?.getHours?.() ?? h.hour ?? 0;
      return hr >= 9 && hr <= 19;
    });

    if (oreGiorno.length < 3) {
      return {
        giudizio: "N/D",
        colore: "text-slate-400",
        bg: "bg-slate-800/30",
        icona: <AlertTriangle className="w-6 h-6 text-slate-400" />,
        titolo: "Dati insufficienti per questo giorno",
        descrizione: "I dati per il giorno selezionato non sono ancora completi. Torna tra qualche minuto.",
        dettagli: [],
        punteggio: 0,
      };
    }

    // Calcola metriche reali dai dati
    const tempMax = Math.max(...oreGiorno.map((h: any) => h.temperature ?? 0));
    const tempMedia = oreGiorno.reduce((s: number, h: any) => s + (h.temperature ?? 0), 0) / oreGiorno.length;
    const ventoMedio = oreGiorno.reduce((s: number, h: any) => s + (h.windSpeed ?? 0), 0) / oreGiorno.length;
    const ventoMax = Math.max(...oreGiorno.map((h: any) => h.windSpeed ?? 0));
    const coperturaMedia = oreGiorno.reduce((s: number, h: any) => s + (h.cloudCover ?? 0), 0) / oreGiorno.length;
    const pioggiaTot = oreGiorno.reduce((s: number, h: any) => s + (h.precipitation ?? 0), 0);
    const oreConPioggia = oreGiorno.filter((h: any) => (h.precipitation ?? 0) > 0.3).length;
    const oreSerene = oreGiorno.filter((h: any) => (h.cloudCover ?? 0) < 25).length;
    const umiditaMedia = oreGiorno.reduce((s: number, h: any) => s + (h.humidity ?? 50), 0) / oreGiorno.length;

    // Calcola punteggio realistico
    let punteggio = 50; // parte da 50 (neutro)
    const dettagli: string[] = [];

    // --- TEMPERATURA (max +15) ---
    if (tempMax >= 22 && tempMax <= 32) {
      punteggio += 15;
      if (tempMax >= 25 && tempMax <= 30) {
        dettagli.push(`Temperatura ideale: ${Math.round(tempMax)}°C 🌡️`);
      } else {
        dettagli.push(`Temperatura buona: ${Math.round(tempMax)}°C`);
      }
    } else if (tempMax >= 18 && tempMax <= 35) {
      punteggio += 10;
    } else if (tempMax >= 10) {
      punteggio += 5;
    } else {
      punteggio -= 10;
      dettagli.push(`Temperatura fredda: ${Math.round(tempMax)}°C`);
    }

    // --- DELTA TERMICO (max +15) ---
    if (thermalDelta >= 12) {
      punteggio += 15;
      dettagli.push(`Buona escursione termica: ${thermalDelta}°C — termiche attive`);
    } else if (thermalDelta >= 8) {
      punteggio += 10;
      dettagli.push(`Escursione termica discreta: ${thermalDelta}°C`);
    } else if (thermalDelta >= 5) {
      punteggio += 5;
    } else {
      punteggio -= 5;
    }

    // --- VENTO (max +20) ---
    if (ventoMedio >= 5 && ventoMedio <= 12) {
      punteggio += 20;
      dettagli.push(`Vento ideale: ${Math.round(ventoMedio)} km/h 💨`);
    } else if (ventoMedio >= 3 && ventoMedio < 5) {
      punteggio += 12;
      dettagli.push(`Vento leggero: ${Math.round(ventoMedio)} km/h — bene per decolli facili`);
    } else if (ventoMedio > 12 && ventoMedio <= 18) {
      punteggio += 10;
      dettagli.push(`Vento moderato: ${Math.round(ventoMedio)} km/h — gestibile`);
    } else if (ventoMedio > 18 && ventoMedio <= 25) {
      punteggio += 2;
      dettagli.push(`Vento sostenuto: ${Math.round(ventoMedio)} km/h — attenzione in quota`);
    } else if (ventoMedio > 25) {
      punteggio -= 10;
      dettagli.push(`Vento forte: ${Math.round(ventoMedio)} km/h — sconsigliato ⚠️`);
    } else if (ventoMedio < 3) {
      punteggio -= 5;
      dettagli.push(`Vento debole: ${Math.round(ventoMedio)} km/h — poche termiche`);
    }

    // --- NUVOLOSITÀ (max +10) ---
    if (coperturaMedia < 20) {
      punteggio += 10;
      dettagli.push("Cielo sereno o poco nuvoloso ☀️");
    } else if (coperturaMedia < 35) {
      punteggio += 8;
      dettagli.push("Cielo per lo più soleggiato 🌤️");
    } else if (coperturaMedia < 55) {
      punteggio += 5;
      dettagli.push("Qualche nuvola ⛅ — possibile sviluppo di cumuli");
    } else if (coperturaMedia < 75) {
      punteggio += 2;
      dettagli.push("Cielo nuvoloso ☁️ — termiche rallentate");
    } else {
      punteggio -= 5;
      dettagli.push("Cielo molto coperto — poche finestre di sole");
    }

    // --- PIOGGIA (max +15) ---
    if (pioggiaTot === 0) {
      punteggio += 15;
      dettagli.push("Nessuna pioggia prevista ✅");
    } else if (pioggiaTot < 0.5 && oreConPioggia <= 1) {
      punteggio += 10;
      dettagli.push("Qualche goccia sparsa, nulla di preoccupante 🌦️");
    } else if (pioggiaTot < 2) {
      punteggio += 3;
      dettagli.push("Rovesci isolati — monitora l'evoluzione");
    } else {
      punteggio -= 10;
      dettagli.push(`Pioggia prevista: ${pioggiaTot.toFixed(1)}mm — giornata a rischio ☔`);
    }

    // --- UMIDITÀ (max +5) ---
    if (umiditaMedia >= 25 && umiditaMedia <= 55) {
      punteggio += 5;
    } else if (umiditaMedia < 25) {
      punteggio -= 3;
      dettagli.push("Aria molto secca — possibile turbolenza");
    } else if (umiditaMedia > 70) {
      punteggio -= 3;
      dettagli.push("Aria umida — termiche meno efficienti");
    }

    // --- CAPE (max +10 bonus) ---
    if (cape && cape.cape > 800) {
      punteggio += 10;
      dettagli.push(`Forte energia termica: ${Math.round(cape.cape)} J/kg 🔥`);
    } else if (cape && cape.cape > 300) {
      punteggio += 7;
      dettagli.push(`Buona energia disponibile: ${Math.round(cape.cape)} J/kg`);
    } else if (cape && cape.cape > 100) {
      punteggio += 4;
      dettagli.push(`Energia termica moderata: ${Math.round(cape.cape)} J/kg`);
    }

    // --- VENTO MAX (penalità) ---
    if (ventoMax > 35) {
      punteggio -= 10;
      dettagli.push(`Raffiche forti: ${Math.round(ventoMax)} km/h ⚠️`);
    } else if (ventoMax > 25) {
      punteggio -= 5;
    }

    // Normalizza punteggio tra 0 e 100
    punteggio = Math.max(0, Math.min(100, Math.round(punteggio)));

    // --- GENERA TITOLO E DESCRIZIONE ---
    let giudizio: string, colore: string, bg: string, titolo: string, descrizione: string, icona: React.ReactNode;

    if (punteggio >= 80) {
      giudizio = "Eccellente";
      colore = "text-emerald-300";
      bg = "bg-emerald-900/40 border-emerald-500/40";
      icona = <Sparkles className="w-6 h-6 text-emerald-400" />;
      titolo = "⭐ Ottima giornata per il volo!";
      if (ventoMedio <= 8 && tempMax >= 22) {
        descrizione = `Condizioni da manuale: ${Math.round(tempMax)}°C, ${Math.round(ventoMedio)} km/h di vento e tanto sole. Le termiche promettono di essere robuste e ben organizzate. Perfetto per un bel volo! 🪂`;
      } else if (ventoMedio <= 12 && tempMax >= 20) {
        descrizione = `Giornata splendida per stare in aria! Temperature piacevoli (${Math.round(tempMax)}°C), vento ideale (${Math.round(ventoMedio)} km/h) e cielo favorevole. Si vola alla grande! 🪂`;
      } else {
        descrizione = `Condizioni molto buone: ${Math.round(tempMax)}°C, vento ${Math.round(ventoMedio)} km/h gestibile e buona energia termica. Ottima giornata per il volo libero! 🪂`;
      }
    } else if (punteggio >= 65) {
      giudizio = "Buona";
      colore = "text-lime-300";
      bg = "bg-lime-900/30 border-lime-500/30";
      icona = <Sun className="w-6 h-6 text-lime-400" />;
      titolo = "✅ Buona giornata per il volo";
      if (ventoMedio <= 12) {
        descrizione = `Condizioni generalmente favorevoli: ${Math.round(tempMax)}°C con ${Math.round(ventoMedio)} km/h di vento. ${
          oreSerene >= 5 ? "Tanto sole e buona energia termica. Si vola bene!" : "Qualche nuvola potrebbe rallentare le termiche a tratti, ma nel complesso si vola."
        }`;
      } else {
        descrizione = `Giornata buona ma con vento moderato (${Math.round(ventoMedio)} km/h). Le termiche ci sono, scegli un sito adatto e goditi il volo. 🪂`;
      }
    } else if (punteggio >= 45) {
      giudizio = "Discreta";
      colore = "text-amber-300";
      bg = "bg-amber-900/30 border-amber-500/30";
      icona = <CloudSun className="w-6 h-6 text-amber-400" />;
      titolo = "⚠️ Giornata discreta — valutare";
      if (pioggiaTot > 0.5) {
        descrizione = `Condizioni miste: ${Math.round(tempMax)}°C, vento ${Math.round(ventoMedio)} km/h. Possibili rovesci sparsi (${pioggiaTot.toFixed(1)}mm previsti). Monitora l'evoluzione e scegli con cura.`;
      } else if (ventoMedio > 15) {
        descrizione = `Vento sostenuto (${Math.round(ventoMedio)} km/h) ma temperature buone (${Math.round(tempMax)}°C). Scegli un decollo riparato e vola con prudenza.`;
      } else {
        descrizione = `Giornata così così: ${Math.round(tempMax)}°C, ${Math.round(ventoMedio)} km/h. La copertura nuvolosa (${Math.round(coperturaMedia)}%) potrebbe limitare lo sviluppo termico. Volo possibile ma non eccezionale.`;
      }
    } else if (punteggio >= 25) {
      giudizio = "Difficile";
      colore = "text-orange-300";
      bg = "bg-orange-900/30 border-orange-500/30";
      icona = <Wind className="w-6 h-6 text-orange-400" />;
      titolo = "🌬️ Giornata impegnativa";
      if (ventoMedio > 18) {
        descrizione = `Vento forte (${Math.round(ventoMedio)} km/h). Se sei un pilota esperto e conosci bene il sito, puoi valutare il volo. Altrimenti meglio rimandare.`;
      } else if (pioggiaTot > 2) {
        descrizione = `Pioggia prevista (${pioggiaTot.toFixed(1)}mm) e cielo molto coperto. Condizioni difficili per il volo libero.`;
      } else {
        descrizione = `Condizioni complesse: temperatura bassa (${Math.round(tempMax)}°C) e cielo nuvoloso (${Math.round(coperturaMedia)}%). Poche termiche, volo sconsigliato ai meno esperti.`;
      }
    } else {
      giudizio = "Sconsigliata";
      colore = "text-red-300";
      bg = "bg-red-900/30 border-red-500/30";
      icona = <CloudRain className="w-6 h-6 text-red-400" />;
      titolo = "❌ Giornata sconsigliata per il volo";
      if (pioggiaTot > 3) {
        descrizione = `Pioggia abbondante prevista (${pioggiaTot.toFixed(1)}mm) e condizioni instabili. Meglio rimandare a un giorno migliore.`;
      } else if (ventoMedio > 25) {
        descrizione = `Vento troppo forte (${Math.round(ventoMedio)} km/h) per volare in sicurezza. Scegli un altro giorno.`;
      } else {
        descrizione = `Condizioni avverse: cielo coperto, vento sfavorevole e scarsa energia termica. Meglio lasciar perdere e aspettare una giornata migliore.`;
      }
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
      tempMedia: Math.round(tempMedia),
      ventoMedio: Math.round(ventoMedio),
      tempMax: Math.round(tempMax),
    };
  }, [dayData, thermalDelta, cape]);

  if (!analisi || analisi.punteggio === 0) {
    return null;
  }

  return (
    <div className={`rounded-2xl border p-6 space-y-5 ${analisi.bg}`}>
      {/* Intestazione */}
      <div className="flex items-start gap-4">
        <div className="shrink-0 mt-1">{analisi.icona}</div>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <h3 className="text-xl font-bold text-white">{analisi.titolo}</h3>
            <span className={`text-sm font-bold px-3 py-0.5 rounded-full bg-white/10 ${analisi.colore}`}>
              {analisi.giudizio}
            </span>
          </div>
          <p className="text-base text-slate-200 leading-relaxed">{analisi.descrizione}</p>
        </div>
      </div>

      {/* Dettagli a punti */}
      {analisi.dettagli.length > 0 && (
        <div className="bg-black/20 rounded-2xl p-4">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Cosa influenza il giudizio</div>
          <ul className="space-y-2">
            {analisi.dettagli.map((d: string, i: number) => (
              <li key={i} className="text-sm text-slate-300 flex items-start gap-3">
                <span className="text-emerald-400 mt-0.5 shrink-0">✦</span>
                <span>{d}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Punteggio */}
      <div className="flex items-center gap-4">
        <div className="flex-1 h-2 bg-slate-700/50 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              analisi.punteggio >= 80 ? "bg-emerald-500" :
              analisi.punteggio >= 65 ? "bg-lime-500" :
              analisi.punteggio >= 45 ? "bg-amber-500" :
              analisi.punteggio >= 25 ? "bg-orange-500" :
              "bg-red-500"
            }`}
            style={{ width: `${analisi.punteggio}%` }}
          />
        </div>
        <span className="text-base font-bold text-white tabular-nums">{analisi.punteggio}/100</span>
      </div>
    </div>
  );
}