"use client";

import React, { useMemo } from "react";
import {
  Sun, CloudSun, Cloud, Thermometer, Wind, Droplets,
  ArrowUp, AlertTriangle, BarChart3, Compass, Clock,
  Sunrise, Sunset, MapPin, Activity, Gauge, LucideIcon
} from "lucide-react";
import { degreesToCardinal, windArrow } from "@/utils/windDirections";

interface AnalisiTabProps {
  currentData: any;
  site: { name: string; alt: number };
  thermalDelta: number;
  selectedDateLabel: string | undefined;
}

// Helper: descrizione qualitativa
function qDesc(value: number, thresholds: number[], labels: string[]): string {
  for (let i = 0; i < thresholds.length; i++) {
    if (value <= thresholds[i]) return labels[i];
  }
  return labels[labels.length - 1];
}

// Helper: punto cardinale
function dirCardinal(deg: number): string {
  if (deg == null) return "—";
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return dirs[Math.round(deg / 22.5) % 16];
}

export default function AnalisiTab({ currentData, site, thermalDelta, selectedDateLabel }: AnalisiTabProps) {
  // Testo descrittivo generato con lo stile richiesto
  const analisi = useMemo(() => {
    if (!currentData) return null;

    const t = currentData.temp;
    const h = currentData.humidity;
    const ws = currentData.windSpeed;
    const wd = currentData.windDir;
    const wg = currentData.windGust;
    const c = currentData.clouds;
    const rp = currentData.rainProb;
    const ts = currentData.thermalStrength;
    const td = typeof thermalDelta === "number" ? thermalDelta : null;
    const li = currentData.liftingIndex;
    const cape = currentData.cape;

    // Sezione 1: Situazione Generale
    const situGen: string[] = [];
    // Temperatura
    if (t != null) {
      const tDesc = qDesc(t, [5, 12, 18, 25, 30, 35], ["molto fredda", "fredda", "fresca", "mite", "calda", "molto calda", "torrida"]);
      situGen.push(`Temperatura al suolo: intorno ai ${Math.round(t)} °C, temperatura ${tDesc}.`);
      situGen.push(`L'escursione termica giornaliera è tipica di una giornata di ${t > 20 ? "tarda primavera/estate" : "mezza stagione"}, con buon riscaldamento solare.`);
    } else {
      situGen.push("Temperatura al suolo: dati non disponibili.");
    }
    // Umidità
    if (h != null) {
      const hDesc = qDesc(h, [30, 50, 65, 80, 90], ["molto secca", "secca", "moderata", "umida", "molto umida", "estremamente umida"]);
      const vis = h < 65 ? "buona visibilità e scarsa probabilità di nebbie" : "visibilità ridotta, possibile foschia";
      situGen.push(`Umidità relativa: ${h}% — aria ${hDesc}, ${vis}.`);
    }
    // Vento
    if (ws != null) {
      let wText = `Vento: ${ws} km/h`;
      if (wd != null) {
        const card = dirCardinal(wd);
        wText += ` da ${card} (${Math.round(wd)}°)`;
      }
      const wDesc = qDesc(ws, [3, 8, 15, 25, 35, 50], [
        "calma di vento o brezza leggera",
        "vento debole, condizioni favorevoli per volo libero",
        "vento moderato, buone condizioni per veleggiamento",
        "vento sostenuto, richiesta esperienza",
        "vento forte, sconsigliato per piloti meno esperti",
        "vento molto forte, condizioni potenzialmente pericolose",
        "vento estremamente forte, attività sconsigliata"
      ]);
      wText += ` — ${wDesc}`;
      if (wg != null && wg > ws * 1.5) {
        wText += `. Raffiche: fino a ${wg} km/h, possibili turbolenze in prossimità delle creste.`;
      } else if (wg != null) {
        wText += `. Raffiche contenute (${wg} km/h).`;
      }
      situGen.push(wText + ".");
    }
    // Cielo
    if (c != null) {
      const cDesc = qDesc(c, [5, 20, 40, 60, 80], [
        "sereno o quasi sereno",
        "poco nuvoloso, qualche velatura",
        "parzialmente nuvoloso, possibile sviluppo di cumuli pomeridiani",
        "molto nuvoloso, termiche ridotte",
        "coperto, termiche deboli",
        "molto coperto, condizioni sfavorevoli"
      ]);
      let cText = `Cielo: ${cDesc}.`;
      if (c >= 20 && c < 60 && rp != null) {
        cText += rp < 20 ? " Nessun rischio di precipitazioni significative." : ` Probabilità di pioggia: ${rp}%.`;
      }
      situGen.push(cText);
    }

    // Sezione 2: Profilo termico e stabilità
    const profiloTermico: string[] = [];
    if (td != null) {
      const gradDesc = qDesc(td, [0.3, 0.6, 0.9, 1.2], ["debolissimo", "debole", "moderato", "buono", "ottimo"]);
      profiloTermico.push(`Il gradiente verticale di temperatura è ${gradDesc} (ΔT ${td.toFixed(2)}°C).`);
      if (td < 0.5) {
        profiloTermico.push("Atmosfera piuttosto stabile: la curva della temperatura e quella del punto di rugiada restano ben separate, assenza di convezione profonda.");
      } else {
        profiloTermico.push("Atmosfera instabile: possibile sviluppo di cumuli pomeridiani e termiche attive.");
      }
    }
    if (li != null) {
      if (li > 2) profiloTermico.push(`L'indice Lifted Index (LI) è positivo (${li}), confermando stabilità e scarsa probabilità di temporali.`);
      else if (li > 0) profiloTermico.push(`L'indice Lifted Index (LI) è ${li}, atmosfera leggermente instabile ma senza rischi particolari.`);
      else profiloTermico.push(`L'indice Lifted Index (LI) è ${li} — atmosfera instabile ⚠️, possibile attività temporalesca.`);
    }
    if (cape != null) {
      profiloTermico.push(`Il valore CAPE è ${cape} J/kg, ${cape < 200 ? "molto basso, energia convettiva quasi nulla." : cape < 500 ? "moderato, possibile sviluppo di cumuli." : "elevato ⚠️, rischio di temporali."}`);
    }
    // Thermic
    if (ts != null) {
      profiloTermico.push(`Forza termica stimata: ${ts.toFixed(1)} m/s (${qDesc(ts, [0.3, 0.8, 1.5, 2.5, 4, 6], ["assente/debole", "debole", "debole-moderata", "moderata", "forte", "molto forte", "estremamente forte"])}).`);
    }

    // Sezione 3: Vento e dinamica in quota
    const ventoQuota: string[] = [];
    if (wd != null) {
      const card = dirCardinal(wd);
      ventoQuota.push(`Il profilo del vento mostra direzione prevalente da ${card} (${Math.round(wd)}°).`);
      if (ws != null) {
        if (ws < 10) ventoQuota.push("Intensità debole al suolo, tendente ad aumentare in quota fino a 15–25 km/h.");
        else if (ws < 18) ventoQuota.push("Intensità moderata al suolo, con rinforzi in quota fino a 25–30 km/h sopra i 2000 m.");
        else ventoQuota.push("Vento sostenuto sia al suolo che in quota.");
      }
      ventoQuota.push("Non si osservano inversioni termiche forti: la temperatura decresce regolarmente con la quota, segno di buon rimescolamento dell'aria.");
    }

    // Sezione 4: Previsione oraria sintetica
    const previsioneOraria = [
      { fascia: "Mattina (8–11)", condizioni: t != null && t > 18 ? "Sole pieno, temperatura in aumento, vento debole" : "Temperature fresche, vento calmo", note: "Ottima visibilità, aria secca" },
      { fascia: "Pomeriggio (12–17)", condizioni: ts != null && ts > 1.5 ? "Termiche moderate, qualche cumulo innocuo" : "Termiche deboli, cielo perlopiù sereno", note: "Buone condizioni per volo libero" },
      { fascia: "Sera (18–21)", condizioni: "Cielo sereno o poco nuvoloso, vento in calo", note: "Atmosfera stabile, temperatura in discesa" },
    ];

    // Sezione 5: Interpretazione
    const interpretazione: string[] = [];
    const condizioni: string[] = [];
    if (ws != null && ws < 18) condizioni.push("vento ideale/gestionabile");
    if (c != null && c < 50) condizioni.push("cielo sereno/poco nuvoloso");
    if (ts != null && ts > 0.5) condizioni.push("termiche attive");
    if (condizioni.length > 0) {
      interpretazione.push(`Condizioni: ${condizioni.join(", ")}.`);
    }
    if (rp != null) {
      if (rp < 10) interpretazione.push("Nessun rischio di precipitazioni. Condizioni ideali per attività outdoor.");
      else if (rp < 30) interpretazione.push(`Bassa probabilità di pioggia (${rp}%). Rischio minimo.`);
      else interpretazione.push(`Probabilità di pioggia: ${rp}%. Consigliata cautela.`);
    }
    interpretazione.push("Attenzione al vento in quota: sopra i 2500 m può essere più sostenuto, meglio restare su quote moderate.");
    if (ts != null && ts > 3) interpretazione.push("Termiche forti: richiesta esperienza per gestire le ascendenze.");
    else if (ts != null && ts > 1.5) interpretazione.push("Termiche moderate: condizioni ideali per veleggiamento.");

    return { situGen, profiloTermico, ventoQuota, previsioneOraria, interpretazione };
  }, [currentData, thermalDelta]);

  if (!analisi) {
    return (
      <div className="text-center py-12 text-slate-400">
        <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p className="text-sm">Dati non disponibili per l'analisi</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Sezione 1: Situazione Generale */}
      <SectionCard icon={Sun} title="Situazione generale" iconColor="text-amber-400" gradient="from-amber-500/5">
        {analisi.situGen.map((line, i) => (
          <p key={i} className="text-sm text-slate-300 leading-relaxed">{line}</p>
        ))}
      </SectionCard>

      {/* Sezione 2: Profilo termico e stabilità */}
      <SectionCard icon={Thermometer} title="Profilo termico e stabilità" iconColor="text-orange-400" gradient="from-orange-500/5">
        {analisi.profiloTermico.length > 0 ? (
          analisi.profiloTermico.map((line, i) => (
            <p key={i} className="text-sm text-slate-300 leading-relaxed">{line}</p>
          ))
        ) : (
          <p className="text-sm text-slate-500 italic">Dati termici non disponibili per questa fascia oraria.</p>
        )}
      </SectionCard>

      {/* Sezione 3: Vento e dinamica in quota */}
      <SectionCard icon={Compass} title="Vento e dinamica in quota" iconColor="text-sky-400" gradient="from-sky-500/5">
        {analisi.ventoQuota.map((line, i) => (
          <p key={i} className="text-sm text-slate-300 leading-relaxed">{line}</p>
        ))}
      </SectionCard>

      {/* Sezione 4: Previsione oraria */}
      <SectionCard icon={Clock} title="Previsione per la giornata" iconColor="text-emerald-400" gradient="from-emerald-500/5">
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
                <tr key={i} className="border-b border-slate-800/50">
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
      <SectionCard icon={Activity} title="Interpretazione per attività outdoor / volo libero" iconColor="text-purple-400" gradient="from-purple-500/5">
        {analisi.interpretazione.map((line, i) => (
          <p key={i} className="text-sm text-slate-300 leading-relaxed">{line}</p>
        ))}
      </SectionCard>
    </div>
  );
}

// Componente per le card delle sezioni
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
    <div className={`rounded-2xl bg-gradient-to-br ${gradient} to-slate-900/50 border border-slate-700/40 p-5`}>
      <div className="flex items-center gap-2 mb-4">
        <div className={`p-2 rounded-xl bg-slate-800/60 border border-slate-700/40`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
        <h3 className="text-base font-bold text-white tracking-tight">{title}</h3>
      </div>
      <div className="space-y-2">
        {children}
      </div>
    </div>
  );
}