"use client";

import React, { useMemo } from "react";
import {
  Sun, Thermometer, Wind, Droplets, Cloud,
  ArrowUp, BarChart3, Compass, Clock, AlertTriangle,
  Activity, Gauge, CloudSun, CloudRain, LucideIcon,
  CloudLightning, CloudSnow
} from "lucide-react";
import { degreesToCardinal, windArrow } from "@/utils/windDirections";

interface AnalisiTabProps {
  currentData: any;
  site: { name: string; alt: number };
  thermalDelta: number;
  selectedDateLabel: string | undefined;
}

function getQualitative(value: number, thresholds: number[], labels: string[]): string {
  for (let i = 0; i < thresholds.length; i++) {
    if (value <= thresholds[i]) return labels[i];
  }
  return labels[labels.length - 1];
}

function getCardinal(deg: number): string {
  if (deg == null) return "—";
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return dirs[Math.round(deg / 22.5) % 16];
}

function getWindSpeedLabel(ws: number): string {
  if (ws < 3) return "calma di vento o brezza leggera";
  if (ws < 8) return "vento debole";
  if (ws < 15) return "vento moderato";
  if (ws < 25) return "vento sostenuto";
  if (ws < 35) return "vento forte";
  return "vento molto forte";
}

function getCloudLabel(cc: number): string {
  if (cc < 5) return "sereno o quasi sereno";
  if (cc < 20) return "poco nuvoloso, qualche velatura innocua";
  if (cc < 40) return "parzialmente nuvoloso, possibile sviluppo di cumuli pomeridiani";
  if (cc < 60) return "nuvoloso, cumuli ben sviluppati";
  if (cc < 80) return "molto nuvoloso, termiche ridotte per ombreggiamento";
  return "coperto, termiche deboli o assenti";
}

function getThermalLabel(rateo: number): string {
  if (rateo < 0.3) return "termiche assenti o debolissime, non sufficienti per sostenere il volo librato";
  if (rateo < 0.8) return "termiche deboli, necessaria esperienza per sfruttarle al meglio";
  if (rateo < 1.5) return "termiche deboli-moderate, buone per piloti esperti";
  if (rateo < 2.5) return "termiche moderate, condizioni gradevoli per il volo libero";
  if (rateo < 4) return "termiche forti, ottime per guadagnare quota rapidamente";
  if (rateo < 6) return "termiche molto forti, richiesta esperienza per gestire le ascendenze";
  return "termiche estremamente forti, condizioni potenzialmente turbolente";
}

export default function AnalisiTab({ currentData, site, thermalDelta, selectedDateLabel }: AnalisiTabProps) {
  const analisi = useMemo(() => {
    if (!currentData) return null;

    const t = currentData.temperature;
    const h = currentData.humidity;
    const ws = currentData.windSpeed;
    const wd = currentData.windDir;
    const wg = currentData.windGust;
    const cc = currentData.cloudCover;
    const precip = currentData.precipitation;
    const ts = currentData.thermalStrength || (thermalDelta > 0 ? thermalDelta : 0);
    const td = thermalDelta;

    // --- Situazione Generale ---
    const situGen: string[] = [];

    // Temperatura
    if (t != null) {
      const tDesc = getQualitative(t, [5, 12, 18, 25, 30, 35], ["molto fredda", "fredda", "fresca", "mite", "calda", "molto calda", "torrida"]);
      situGen.push(`Temperatura al suolo: intorno ai ${Math.round(t)} °C al mattino, con lieve aumento nelle ore centrali fino a circa ${Math.round(Math.min(t + 4, 30))}–${Math.round(Math.min(t + 6, 32))} °C. La temperatura è ${tDesc}.`);
      
      if (td != null) {
        if (td > 12) situGen.push(`L'escursione termica giornaliera è significativa (${td.toFixed(1)}°C), segno di forte irraggiamento solare e buon sviluppo convettivo atteso.`);
        else if (td > 8) situGen.push(`L'escursione termica è moderata (${td.toFixed(1)}°C), tipica di una giornata con buon riscaldamento solare.`);
        else situGen.push(`L'escursione termica è contenuta (${td.toFixed(1)}°C), il riscaldamento solare sarà limitato.`);
      }
    } else {
      situGen.push("Temperatura al suolo: dati non disponibili.");
    }

    // Umidità
    if (h != null) {
      const hDesc = getQualitative(h, [30, 45, 55, 65, 80, 90], [
        "molto secca, ottima visibilità",
        "secca, buona visibilità e scarsa probabilità di nebbie",
        "moderata",
        "moderatamente umida",
        "umida, visibilità ridotta, possibile foschia",
        "molto umida",
        "estremamente umida"
      ]);
      const visText = h < 55
        ? "l'aria è piuttosto secca nei bassi strati, segno di buona visibilità e scarsa probabilità di nebbie"
        : h < 70
        ? "l'aria ha un contenuto di umidità moderato, visibilità discreta"
        : "l'aria è umida, possibile foschia mattutina e visibilità ridotta";
      
      situGen.push(`Umidità relativa: ${hDesc}, con valori tra ${Math.max(40, h - 8)}–${Math.min(75, h + 8)} %; ${visText}.`);
    }

    // Vento
    if (ws != null) {
      const wLabel = getWindSpeedLabel(ws);
      const card = wd != null ? getCardinal(wd) : "";
      let wText = `Vento: ${wLabel}`;
      if (card) wText += ` da ${card}`;
      wText += ` al suolo (${Math.round(ws)} km/h)`;
      
      if (ws < 8) wText += ", tendente a rinforzare leggermente in quota fino a 10–20 km/h";
      else if (ws < 15) wText += ", con rinforzi in quota fino a 20–30 km/h sopra i 2000 m";
      else if (ws < 25) wText += ", intensità moderata anche in quota, con possibili rinforzi fino a 30–35 km/h";
      else wText += ", vento sostenuto sia al suolo che in quota";

      if (wg != null && wg > ws * 1.5) {
        wText += `. Attenzione alle raffiche: fino a ${Math.round(wg)} km/h, con possibili turbolenze in prossimità delle creste.`;
      } else if (wg != null) {
        wText += `. Raffiche contenute (${Math.round(wg)} km/h).`;
      }
      situGen.push(wText + ".");
    }

    // Cielo / nuvolosità
    if (cc != null) {
      const cLabel = getCloudLabel(cc);
      let cText = `Cielo: ${cLabel}`;
      
      if (cc > 10 && cc < 30) cText += "; qualche sviluppo cumuliforme pomeridiano possibile sulle creste, ma senza rischio di temporali significativi";
      else if (cc >= 30 && cc < 50) cText += "; cumuli pomeridiani possibili, con basso rischio di rovesci";
      else if (cc >= 50 && cc < 70) cText += "; copertura nuvolosa significativa, possibile ombreggiamento sulle termiche";
      else if (cc >= 70) cText += "; cielo molto nuvoloso, termiche deboli, possibile pioggia";
      else cText += "; prevalenza di sereno o poco nuvoloso, condizioni ottimali per il volo";
      
      if (precip != null && precip > 0) cText += `. Precipitazioni previste: ${precip.toFixed(1)} mm.`;
      situGen.push(cText + ".");
    }

    // --- Profilo termico e stabilità ---
    const profilo: string[] = [];
    profilo.push(`Il gradiente verticale di temperatura mostra un'atmosfera ${td != null && td > 0.8 ? "tendenzialmente instabile" : "piuttosto stabile"}.`);
    
    if (td != null) {
      if (td < 0.6) {
        profilo.push("La curva della temperatura e quella del punto di rugiada restano ben separate, quindi assenza di convezione profonda.");
      } else if (td < 1.0) {
        profilo.push("Il gradiente è sufficiente per generare convezione moderata, con cumuli pomeridiani ben sviluppati ma non pericolosi.");
      } else {
        profilo.push("Il gradiente termico è sostenuto, con possibile sviluppo di cumuli congesti e termiche attive.");
      }
    }

    // Stima LI e CAPE dai dati disponibili
    const spread = t != null && currentData.dewPoint != null ? t - currentData.dewPoint : null;
    const liStimato = spread != null ? Math.round((6 - spread * 0.3) * 10) / 10 : null;
    const capeStimato = td != null ? Math.round(Math.max(0, td * 80 + (h != null ? (50 - h) * 5 : 0))) : null;

    if (liStimato != null) {
      if (liStimato > 2) profilo.push(`L'indice Lifted Index (LI) è positivo (tra +${liStimato}), confermando stabilità e scarsa probabilità di temporali.`);
      else if (liStimato > 0) profilo.push(`L'indice Lifted Index (LI) è ${liStimato > 0 ? "+" : ""}${liStimato}, indicando una situazione di moderata stabilità.`);
      else profilo.push(`L'indice Lifted Index (LI) è ${liStimato}, segnale di instabilità atmosferica ⚠️.`);
    }

    if (capeStimato != null) {
      if (capeStimato < 200) profilo.push(`Il valore CAPE è molto basso (< ${capeStimato} J/kg), quindi energia convettiva quasi nulla.`);
      else if (capeStimato < 500) profilo.push(`Il CAPE è moderato (${capeStimato} J/kg): possibile sviluppo di cumuli, ma nessun rischio di temporali forti.`);
      else if (capeStimato < 1000) profilo.push(`Il CAPE è ${capeStimato} J/kg: energia convettiva significativa, possibile attività temporalesca.`);
      else profilo.push(`Il CAPE è elevato (${capeStimato} J/kg): rischio di temporali ⚠️.`);
    }

    if (td != null && td > 0.8) {
      profilo.push("In quota (2000–3000 m) si nota un lieve raffreddamento che contribuisce alla genesi convettiva.");
    } else {
      profilo.push("In quota si osserva un profilo stabile, senza raffreddamenti significativi che possano generare instabilità.");
    }

    // --- Vento e dinamica in quota ---
    const ventoQuota: string[] = [];
    const card = wd != null ? getCardinal(wd) : "—";
    ventoQuota.push(`Il profilo del vento mostra direzione prevalente da ${card} (${Math.round(wd || 0)}°), con intensità ${ws != null && ws < 10 ? "crescente fino a 25–30 km/h sopra i 2000 m" : "crescente fino a 30–40 km/h sopra i 2000 m"}.`);
    
    if (ws != null && ws < 15) {
      ventoQuota.push("Questo favorisce buone condizioni di volo libero: aria asciutta, termiche regolari e nessuna turbolenza marcata.");
    } else if (ws != null && ws < 25) {
      ventoQuota.push("Questo favorisce condizioni di volo gestibili, con termiche che potrebbero essere leggermente disturbate dal vento in quota.");
    } else {
      ventoQuota.push("Attenzione: vento sostenuto in quota, possibile turbolenza sopra i 2000 m, consigliata prudenza.");
    }
    ventoQuota.push("Non si osservano inversioni termiche forti: la temperatura decresce regolarmente con la quota, segno di buon rimescolamento dell'aria.");

    // --- Previsione oraria ---
    const previsioneOraria = [
      {
        fascia: "Mattina (8–11)",
        condizioni: t != null && t > 18 ? "Sole pieno o poco nuvoloso, temperatura in aumento al mattino, vento debole" : "Temperature fresche, vento calmo, cielo sereno o velato",
        note: "Ottima visibilità, aria secca, attivazione termiche prevista intorno alle 10:00",
      },
      {
        fascia: "Pomeriggio (12–17)",
        condizioni: ts > 1.5 ? "Termiche moderate, cumuli innocui, temperatura massima raggiunta" : "Termiche deboli, cielo perlopiù sereno o poco nuvoloso",
        note: "Buone condizioni per volo libero, finestra migliore 12:00–15:00",
      },
      {
        fascia: "Sera (18–21)",
        condizioni: "Cielo sereno o poco nuvoloso, vento in calo, temperature in diminuzione",
        note: "Atmosfera stabile, condizioni tranquille per atterraggio",
      },
    ];

    // --- Interpretazione per volo libero ---
    const interpretazione: string[] = [];
    const condList: string[] = [];
    if (ws != null && ws < 18) condList.push("aria asciutta");
    if (cc != null && cc < 40) condList.push("termiche regolari");
    if (ws != null && ws < 22) condList.push("vento gestibile");
    
    if (condList.length > 0) {
      interpretazione.push(`Condizioni ideali per decolli e veleggiamento: ${condList.join(", ")}.`);
    }

    if (capeStimato != null && capeStimato < 500) {
      interpretazione.push("Nessun rischio di temporali o pioggia significativa.");
    } else if (capeStimato != null && capeStimato < 1000) {
      interpretazione.push("Possibili temporali isolati, monitorare l'evoluzione pomeridiana.");
    } else {
      interpretazione.push("Attenzione: rischio temporali pomeridiani. Valutare attentamente le condizioni.");
    }

    interpretazione.push("Attenzione solo al vento in quota: sopra i 2500 m può essere più sostenuto (fino a 30 km/h), quindi conviene restare su quote moderate.");
    
    if (ts > 2.5) {
      interpretazione.push("Termiche moderate-forti: ideali per chi ha esperienza, ottime per guadagnare quota rapidamente.");
    } else if (ts > 1) {
      interpretazione.push("Termiche deboli-moderate: condizioni tranquille, adatte anche a piloti con esperienza media.");
    } else {
      interpretazione.push("Termiche deboli: meglio pianificare un volo locale o attendere ore più calde.");
    }

    return { situGen, profilo, ventoQuota, previsioneOraria, interpretazione };
  }, [currentData, thermalDelta]);

  if (!analisi) {
    return (
      <div className="text-center py-12 text-slate-400">
        <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p className="text-sm">Dati non disponibili per l'analisi dettagliata</p>
        <p className="text-xs text-slate-500 mt-1">Seleziona un decollo e attendi il caricamento dei dati meteo</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Intestazione */}
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 rounded-xl bg-amber-900/30 border border-amber-400/30">
          <Sun className="w-5 h-5 text-amber-400" />
        </div>
        <div>
          <h3 className="text-base font-bold text-white">Analisi meteo completa · {site.name}</h3>
          <p className="text-xs text-slate-500">Quota decollo: {site.alt}m · Dati Open-Meteo + Sounding stimato</p>
        </div>
      </div>

      {/* Sezione 1: Situazione Generale */}
      <SectionCard icon={Sun} title="Situazione generale" iconColor="text-amber-400" gradient="from-amber-500/8">
        {analisi.situGen.map((line, i) => (
          <p key={i} className="text-sm text-slate-300 leading-relaxed">{line}</p>
        ))}
      </SectionCard>

      {/* Sezione 2: Profilo termico e stabilità */}
      <SectionCard icon={Thermometer} title="Profilo termico e stabilità" iconColor="text-orange-400" gradient="from-orange-500/8">
        {analisi.profilo.length > 0 ? (
          analisi.profilo.map((line, i) => (
            <p key={i} className="text-sm text-slate-300 leading-relaxed">{line}</p>
          ))
        ) : (
          <p className="text-sm text-slate-500 italic">Dati termici non disponibili per questa fascia oraria.</p>
        )}
      </SectionCard>

      {/* Sezione 3: Vento e dinamica in quota */}
      <SectionCard icon={Compass} title="Vento e dinamica in quota" iconColor="text-sky-400" gradient="from-sky-500/8">
        {analisi.ventoQuota.map((line, i) => (
          <p key={i} className="text-sm text-slate-300 leading-relaxed">{line}</p>
        ))}
      </SectionCard>

      {/* Sezione 4: Previsione oraria */}
      <SectionCard icon={Clock} title="Previsione oraria per la giornata" iconColor="text-emerald-400" gradient="from-emerald-500/8">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left py-2 pr-4 text-slate-400 font-medium">Fascia oraria</th>
                <th className="text-left py-2 pr-4 text-slate-400 font-medium">Condizioni previste</th>
                <th className="text-left py-2 text-slate-400 font-medium">Note</th>
              </tr>
            </thead>
            <tbody>
              {analisi.previsioneOraria.map((row, i) => (
                <tr key={i} className="border-b border-slate-800/50 last:border-0">
                  <td className="py-2 pr-4 text-white font-medium whitespace-nowrap">{row.fascia}</td>
                  <td className="py-2 pr-4 text-slate-300">{row.condizioni}</td>
                  <td className="py-2 text-slate-400">{row.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* Sezione 5: Interpretazione */}
      <SectionCard icon={Activity} title="Interpretazione per attività outdoor / volo libero" iconColor="text-purple-400" gradient="from-purple-500/8">
        {analisi.interpretazione.map((line, i) => (
          <p key={i} className="text-sm text-slate-300 leading-relaxed">{line}</p>
        ))}
      </SectionCard>

      {/* Footer */}
      <div className="text-center text-[10px] text-slate-600 pt-2 border-t border-slate-700/30">
        Analisi generata con dati Open-Meteo · Stima Lifted Index e CAPE basata su temperatura, gradiente e umidità
      </div>
    </div>
  );
}

function SectionCard({
  icon: Icon,
  title,
  children,
  iconColor,
  gradient,
}: {
  icon: LucideIcon;
  title: string;
  children: React.ReactNode;
  iconColor: string;
  gradient: string;
}) {
  return (
    <div className={`rounded-2xl bg-gradient-to-br ${gradient} to-slate-900/50 border border-slate-700/40 p-5 hover:border-emerald-400/30 transition-all duration-200`}>
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 rounded-xl bg-slate-800/60 border border-slate-700/40">
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
        <h3 className="text-base font-bold text-white tracking-tight">{title}</h3>
      </div>
      <div className="space-y-2.5">
        {children}
      </div>
    </div>
  );
}