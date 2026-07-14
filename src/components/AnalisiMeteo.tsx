"use client";

import React from "react";
import { Sun, Thermometer, Wind, Cloud, Droplets, Gauge, TrendingUp, ArrowUp, AlertTriangle, CheckCircle, Clock } from "lucide-react";

interface AnalisiMeteoProps {
  analisi: {
    tempMattina: number;
    tempPomeriggio: number;
    umidita: number;
    ventoSuolo: number;
    li: number;
    cape: number;
    lcl: number;
    spread: number;
    salita: number;
    base: number;
    top: number;
  };
  ventoOrario: {
    quote: Record<number, { speed: number; dir: number }>;
  }[];
}

export default function AnalisiMeteo({ analisi, ventoOrario }: AnalisiMeteoProps) {
  const ventoQuota2000 = ventoOrario?.[0]?.quote?.[2000]?.speed || 0;
  const ventoQuota3000 = ventoOrario?.[0]?.quote?.[3000]?.speed || 0;

  const { tempMattina, tempPomeriggio, umidita, ventoSuolo, li, cape, lcl, spread, salita, base, top } = analisi;

  return (
    <div className="space-y-4">
      {/* ☀️ Situazione generale */}
      <div className="bg-gradient-to-br from-slate-900/60 to-slate-800/30 border-2 border-slate-700/30 rounded-2xl p-5 hover:border-green-400/40 transition-all duration-200">
        <div className="flex items-center gap-2 mb-4">
          <Sun className="w-6 h-6 text-orange-400" />
          <h3 className="text-base font-bold text-white">Situazione generale</h3>
        </div>
        <div className="space-y-2 text-sm text-slate-300 leading-relaxed">
          <p>
            Temperatura al suolo intorno ai {Math.round(tempMattina)}°C al mattino, con lieve aumento
            nelle ore centrali fino a circa {Math.round(tempPomeriggio)}°C.
          </p>
          <p>
            Umidità moderata ({Math.round(umidita)}%): aria piuttosto secca nei bassi strati,
            buona visibilità e scarsa probabilità di nebbie.
          </p>
          <p>
            Vento debole al suolo ({Math.round(ventoSuolo)} km/h), tendente a rinforzare in quota
            fino a {Math.round(ventoQuota3000)} km/h sopra i 3000 m.
          </p>
          <p>
            Cielo sereno o poco nuvoloso; possibili cumuli pomeridiani sulle creste,
            ma senza rischio di temporali significativi.
          </p>
        </div>
      </div>

      {/* 🌡️ Profilo termico e stabilità */}
      <div className="bg-gradient-to-br from-slate-900/60 to-slate-800/30 border-2 border-slate-700/30 rounded-2xl p-5 hover:border-green-400/40 transition-all duration-200">
        <div className="flex items-center gap-2 mb-4">
          <Thermometer className="w-6 h-6 text-amber-400" />
          <h3 className="text-base font-bold text-white">Profilo termico e stabilità</h3>
        </div>
        <div className="space-y-2 text-sm text-slate-300 leading-relaxed">
          <p>
            Gradiente verticale stabile: la temperatura e il punto di rugiada restano separati,
            indicando assenza di convezione profonda. Spread: {spread.toFixed(1)}°C.
          </p>
          <p>
            Lifted Index positivo (LI +{Math.abs(li).toFixed(1)}), atmosfera stabile.
          </p>
          <p>
            CAPE molto basso ({Math.round(cape)} J/kg) — energia convettiva quasi nulla.
          </p>
          <p>
            Base termica (LCL): {Math.round(lcl)} m · Top termico: {Math.round(top)} m · Salita media: {salita.toFixed(1)} m/s
          </p>
          <p>
            In quota (2000–3000 m) lieve raffreddamento, ma non sufficiente a generare instabilità.
          </p>
        </div>
      </div>

      {/* 🌬️ Vento e dinamica in quota */}
      <div className="bg-gradient-to-br from-slate-900/60 to-slate-800/30 border-2 border-slate-700/30 rounded-2xl p-5 hover:border-green-400/40 transition-all duration-200">
        <div className="flex items-center gap-2 mb-4">
          <Wind className="w-6 h-6 text-cyan-400" />
          <h3 className="text-base font-bold text-white">Vento e dinamica in quota</h3>
        </div>
        <div className="space-y-2 text-sm text-slate-300 leading-relaxed">
          <p>
            Direzione prevalente da Ovest–Sudovest, con intensità crescente:
            {Math.round(ventoQuota2000)} km/h a 2000 m, {Math.round(ventoQuota3000)} km/h a 3000 m.
          </p>
          <p>
            Condizioni favorevoli al volo libero: aria asciutta, termiche regolari,
            nessuna turbolenza marcata.
          </p>
          <p>
            Nessuna inversione termica forte: temperatura in calo regolare con la quota.
          </p>
        </div>
      </div>

      {/* 🌤️ Previsione per fascia oraria */}
      <div className="bg-gradient-to-br from-slate-900/60 to-slate-800/30 border-2 border-orange-500/40 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-6 h-6 text-sky-400" />
          <h3 className="text-base font-bold text-white">Previsione per la giornata</h3>
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
              <tr className="border-b border-slate-700/20 hover:bg-slate-700/20 transition-colors">
                <td className="py-2 pr-3 font-bold text-white">Mattina (8–11)</td>
                <td className="py-2 px-3">Sole pieno, vento debole</td>
                <td className="py-2 pl-3 text-slate-400">Ottima visibilità, aria secca</td>
              </tr>
              <tr className="border-b border-slate-700/20 hover:bg-slate-700/20 transition-colors">
                <td className="py-2 pr-3 font-bold text-white">Pomeriggio (12–17)</td>
                <td className="py-2 px-3">Termiche moderate, qualche cumulo</td>
                <td className="py-2 pl-3 text-slate-400">Buone condizioni per volo libero</td>
              </tr>
              <tr className="hover:bg-slate-700/20 transition-colors">
                <td className="py-2 pr-3 font-bold text-white">Sera (18–21)</td>
                <td className="py-2 px-3">Cielo sereno, vento in calo</td>
                <td className="py-2 pl-3 text-slate-400">Atmosfera stabile, temperatura in discesa</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 🪂 Interpretazione per il volo libero */}
      <div className="bg-gradient-to-br from-orange-900/20 to-amber-900/10 border-2 border-orange-700/30 rounded-2xl p-5 hover:border-green-400/40 transition-all duration-200">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">🪂</span>
          <h3 className="text-base font-bold text-orange-400">Interpretazione per il volo libero</h3>
        </div>
        <div className="space-y-2 text-sm text-slate-300 leading-relaxed">
          <p className="flex items-start gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            Condizioni ideali per decolli e veleggiamento: aria asciutta, termiche regolari, vento gestibile.
          </p>
          <p className="flex items-start gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            Nessun rischio di temporali o pioggia.
          </p>
          <p className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            Attenzione solo al vento in quota: sopra i 2500 m può essere più sostenuto, quindi meglio restare su quote moderate.
          </p>
        </div>
      </div>
    </div>
  );
}