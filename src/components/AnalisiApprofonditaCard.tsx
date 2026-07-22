"use client";

import React, { useState } from "react";
import {
  Sun, Thermometer, Wind, Cloud, Droplets, Eye, Zap,
  TrendingUp, Activity, Shield, Layers, Map,
  ChevronDown, ChevronUp, Clock, Gauge, AlertTriangle, CheckCircle,
} from "lucide-react";
import type { AnalisiApprofondita } from "@/utils/analisiApprofondita";
import ProfiloVentoVerticale from "./ProfiloVentoVerticale";
import type { HourData } from "@/types/meteo";

interface Props {
  analisi: AnalisiApprofondita;
  siteName: string;
  dayData?: HourData[];
}

function getPunteggioColore(p: number): string {
  if (p >= 80) return "bg-emerald-500";
  if (p >= 60) return "bg-green-500";
  if (p >= 40) return "bg-yellow-500";
  if (p >= 20) return "bg-orange-500";
  return "bg-red-500";
}

function getPunteggioTesto(p: number): string {
  if (p >= 80) return "text-emerald-300";
  if (p >= 60) return "text-green-300";
  if (p >= 40) return "text-yellow-300";
  if (p >= 20) return "text-orange-300";
  return "text-red-300";
}

function Sezione({ titolo, icona, children, defaultOpen = true }: {
  titolo: string;
  icona: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-700/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          {icona}
          <span className="text-sm font-bold text-white">{titolo}</span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>
      {open && <div className="px-4 pb-4 space-y-2">{children}</div>}
    </div>
  );
}

export default function AnalisiApprofonditaCard({ analisi, siteName, dayData }: Props) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="space-y-3">
      {/* Header con punteggio */}
      <div className="bg-gradient-to-br from-slate-900/70 to-slate-800/40 border-2 border-slate-700/40 rounded-2xl p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-500/30 to-orange-500/20 flex items-center justify-center border-2 border-amber-500/30">
            <Sun className="w-6 h-6 text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white truncate">
                {siteName}
              </h3>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${getPunteggioTesto(analisi.punteggio)} bg-slate-800`}>
                {analisi.punteggio}/100
              </span>
            </div>
            <div className="text-xs text-slate-400 mt-0.5">
              {analisi.data} ({analisi.lat.toFixed(2)}°N, {analisi.lon.toFixed(2)}°E – {analisi.alt}m)
            </div>
          </div>
        </div>

        {/* Barra punteggio */}
        <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden mb-3">
          <div
            className={`h-full rounded-full transition-all duration-500 ${getPunteggioColore(analisi.punteggio)}`}
            style={{ width: `${analisi.punteggio}%` }}
          />
        </div>

        {/* Valutazione sintetica */}
        <p className="text-sm text-slate-300 leading-relaxed">
          {analisi.valutazione}
        </p>
      </div>

      {/* Condizioni al suolo */}
      <Sezione titolo="Condizioni al suolo" icona={<Thermometer className="w-4 h-4 text-orange-400" />}>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-slate-800/60 rounded-lg p-2">
            <span className="text-slate-500">Temperatura</span>
            <div className="text-white font-bold mt-0.5">
              {analisi.tempMin}°C / {analisi.tempMax}°C <span className="text-slate-400">(attuale {analisi.tempAttuale}°C)</span>
            </div>
          </div>
          <div className="bg-slate-800/60 rounded-lg p-2">
            <span className="text-slate-500">Punto di rugiada</span>
            <div className="text-cyan-300 font-bold mt-0.5">{analisi.dewPoint}°C</div>
          </div>
          <div className="bg-slate-800/60 rounded-lg p-2">
            <span className="text-slate-500">Umidità relativa</span>
            <div className="text-blue-300 font-bold mt-0.5">{analisi.umidita}%</div>
          </div>
          <div className="bg-slate-800/60 rounded-lg p-2">
            <span className="text-slate-500">Radiazione solare</span>
            <div className="text-amber-300 font-bold mt-0.5">{analisi.radiazione} W/m²</div>
          </div>
        </div>
      </Sezione>

      {/* Vento e struttura verticale — ORA INCLUDE IL PROFILO COMPLETO */}
      <Sezione titolo="Vento e struttura verticale" icona={<Wind className="w-4 h-4 text-cyan-400" />} defaultOpen={true}>
        {/* Prima il riepilogo compatto */}
        <div className="grid grid-cols-2 gap-2 text-xs mb-3">
          <div className="bg-slate-800/60 rounded-lg p-2">
            <span className="text-slate-500">Vento al suolo</span>
            <div className="text-cyan-300 font-bold mt-0.5">
              {analisi.ventoSuolo} km/h da {analisi.ventoDirNome} ({analisi.ventoDir}°)
            </div>
          </div>
          <div className="bg-slate-800/60 rounded-lg p-2">
            <span className="text-slate-500">Raffiche</span>
            <div className="text-cyan-300 font-bold mt-0.5">{analisi.rafficheSuolo} km/h</div>
          </div>
          <div className="col-span-2 bg-slate-800/60 rounded-lg p-2">
            <span className="text-slate-500">Gradiente verticale</span>
            <div className="text-white font-bold mt-0.5">
              {analisi.gradienteVento === "debole" ? "Debole: vento omogeneo fino a 3000m, termiche stabili" :
               analisi.gradienteVento === "moderato" ? "Moderato: vento cresce gradualmente in quota, termiche irregolari" :
               "Forte: significativo aumento del vento in quota, possibile turbolenza"}
            </div>
          </div>
          <div className="col-span-2 bg-slate-800/60 rounded-lg p-2">
            <span className="text-slate-500">Wind shear verticale</span>
            <div className="text-white font-bold mt-0.5 capitalize">{analisi.windShear}</div>
          </div>
          <div className="col-span-2 bg-slate-800/60 rounded-lg p-2">
            <span className="text-slate-500">Inversione termica</span>
            <div className="text-white font-bold mt-0.5 capitalize">{analisi.inversione}</div>
          </div>
        </div>

        {/* Profilo verticale completo con gradiente, zero termico e quote 250m */}
        {dayData && dayData.length > 0 && (
          <ProfiloVentoVerticale
            dayData={dayData}
            siteAlt={analisi.alt}
            siteName={siteName}
          />
        )}
      </Sezione>

      {/* Termiche */}
      <Sezione titolo="Analisi termica" icona={<Activity className="w-4 h-4 text-amber-400" />}>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="col-span-2 bg-slate-800/60 rounded-lg p-2">
            <span className="text-slate-500">Altezza PBL (strato limite)</span>
            <div className="text-emerald-300 font-bold mt-0.5">
              {analisi.pbl.toLocaleString()} m
              {analisi.pbl > 3000 ? " — Ottima: garantisce termiche sviluppate in verticale" :
               analisi.pbl > 2000 ? " — Buona: termiche sufficienti" :
               " — Limitata: termiche basse"}
            </div>
          </div>
          <div className="col-span-2 bg-slate-800/60 rounded-lg p-2">
            <span className="text-slate-500">Top termiche</span>
            <div className="text-emerald-300 font-bold mt-0.5">
              {analisi.topTermiche.toLocaleString()} m
            </div>
          </div>
          <div className="bg-slate-800/60 rounded-lg p-2">
            <span className="text-slate-500">Rateo medio</span>
            <div className="text-amber-300 font-bold mt-0.5">{analisi.rateoMedio} m/s</div>
          </div>
          <div className="bg-slate-800/60 rounded-lg p-2">
            <span className="text-slate-500">Thermal Index (TI)</span>
            <div className={`font-bold mt-0.5 ${analisi.thermalIndex < -6 ? "text-emerald-300" : analisi.thermalIndex < -3 ? "text-yellow-300" : "text-red-300"}`}>
              {analisi.thermalIndex} ({analisi.thermalIndexDesc})
            </div>
          </div>
        </div>
      </Sezione>

      {/* Stabilità atmosferica */}
      <Sezione titolo="Indici di stabilità" icona={<Shield className="w-4 h-4 text-purple-400" />}>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-slate-800/60 rounded-lg p-2">
            <span className="text-slate-500">CAPE</span>
            <div className="text-purple-300 font-bold mt-0.5">
              {analisi.cape} J/kg
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">{analisi.capeDesc}</div>
          </div>
          <div className="bg-slate-800/60 rounded-lg p-2">
            <span className="text-slate-500">Lifted Index (LI)</span>
            <div className={`font-bold mt-0.5 ${analisi.liftedIndex > 0 ? "text-emerald-300" : "text-red-300"}`}>
              {analisi.liftedIndex > 0 ? "+" : ""}{analisi.liftedIndex}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">{analisi.liDesc}</div>
          </div>
          <div className="bg-slate-800/60 rounded-lg p-2">
            <span className="text-slate-500">CIN (energia di inibizione)</span>
            <div className="text-orange-300 font-bold mt-0.5">{analisi.cin} J/kg</div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              {analisi.cin < 50 ? "Assente: termiche partono facilmente" :
               analisi.cin < 100 ? "Debole: possibile ritardo innesco" :
               "Presente: potrebbe ritardare l'innesco"}
            </div>
          </div>
          <div className="bg-slate-800/60 rounded-lg p-2">
            <span className="text-slate-500">Rischio temporali</span>
            <div className={`font-bold mt-0.5 ${analisi.rischioTemporali >= 40 ? "text-red-300" : analisi.rischioTemporali >= 15 ? "text-yellow-300" : "text-green-300"}`}>
              {analisi.rischioTemporali}%
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">{analisi.temporaliDesc}</div>
          </div>
        </div>
      </Sezione>

      {/* Nuvolosità e visibilità */}
      <Sezione titolo="Nuvolosità e visibilità" icona={<Cloud className="w-4 h-4 text-blue-400" />}>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-slate-800/60 rounded-lg p-2">
            <span className="text-slate-500">Nuvole basse</span>
            <div className="text-blue-300 font-bold mt-0.5">{analisi.nuvoleBasse}%</div>
          </div>
          <div className="bg-slate-800/60 rounded-lg p-2">
            <span className="text-slate-500">Nuvole medie</span>
            <div className="text-blue-300 font-bold mt-0.5">{analisi.nuvoleMedie}%</div>
          </div>
          <div className="bg-slate-800/60 rounded-lg p-2">
            <span className="text-slate-500">Nuvole alte</span>
            <div className="text-blue-300 font-bold mt-0.5">{analisi.nuvoleAlte}%</div>
          </div>
          <div className="bg-slate-800/60 rounded-lg p-2">
            <span className="text-slate-500">Visibilità</span>
            <div className="text-emerald-300 font-bold mt-0.5">{analisi.visibilita} km</div>
          </div>
        </div>
      </Sezione>

      {/* Slot orari */}
      <Sezione titolo="Slot orari consigliati" icona={<Clock className="w-4 h-4 text-green-400" />} defaultOpen={true}>
        <div className="bg-gradient-to-r from-emerald-900/30 to-green-900/20 border border-emerald-700/30 rounded-lg p-3">
          <div className="flex items-center gap-2 text-sm text-emerald-300 font-bold">
            <Zap className="w-4 h-4" />
            {analisi.slotMigliori}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            {analisi.rateoMedio > 2
              ? "Termiche ben sviluppate per tutto l'arco della giornata. Le condizioni migliori si avranno nelle ore centrali con vento regolare e termiche attive."
              : analisi.rateoMedio > 1
                ? "Finestra di volo nelle ore centrali. Valutare condizioni locali."
                : "Slot limitato: attendere l'innesco termico nelle ore più calde."
            }
          </div>
        </div>
      </Sezione>

      {/* Condizioni complete */}
      <Sezione titolo="Analisi completa" icona={<Layers className="w-4 h-4 text-slate-400" />} defaultOpen={true}>
        <div className="text-xs text-slate-300 leading-relaxed space-y-2">
          <p>
            <span className="text-emerald-400 font-bold">☀️ Analisi termica e meteo</span> – {analisi.data} ({analisi.lat.toFixed(2)}°N, {analisi.lon.toFixed(2)}°E – {analisi.alt}m)
          </p>
          <p>
            La giornata si presenta con condizioni
            {analisi.punteggio >= 80 ? " ideali" : analisi.punteggio >= 60 ? " favorevoli" : analisi.punteggio >= 40 ? " moderate" : " difficili"}
            {" "}per il volo libero.
            {analisi.tempAttuale > 30
              ? ` La temperatura è elevata (${analisi.tempAttuale}°C),`
              : ` La temperatura è di ${analisi.tempAttuale}°C,`
            }

            {analisi.dewPoint < 10
              ? ` il punto di rugiada di ${analisi.dewPoint}°C indica aria secca e un'umidità del ${analisi.umidita}%.`
              : ` il punto di rugiada di ${analisi.dewPoint}°C e un'umidità del ${analisi.umidita}%.`
            }
          </p>
          <p>
            Il vento al suolo è{" "}
            {analisi.ventoSuolo <= 3 ? "debole" : analisi.ventoSuolo <= 8 ? "moderato" : "vivace"},
            {" "}{analisi.ventoSuolo} km/h da {analisi.ventoDirNome} con raffiche fino a {analisi.rafficheSuolo} km/h,
            {analisi.rischioTemporali < 15
              ? " senza precipitazioni e con probabilità di temporali molto bassa, segno di atmosfera stabile."
              : ` con probabilità di temporali del ${analisi.rischioTemporali}%.`
            }
            {analisi.visibilita > 30
              ? ` Visibilità eccellente di circa ${{analisi.visibilita} km.`
              : ` Visibilità di ${analisi.visibilita} km.`
            }
          </p>
          <p>
            La struttura verticale mostra un'altezza dello strato limite (PBL) di circa {analisi.pbl.toLocaleString()} m,
            con correnti ascensionali convettive fino a {analisi.rateoMedio} m/s,
            {analisi.rateoMedio > 2
              ? " ottime per il volo termico."
              : " sufficienti per il volo termico."
            }
            {' '}Il CAPE è di {analisi.cape} J/kg ({analisi.capeDesc}),
            mentre il Lifted Index di {analisi.liftedIndex > 0 ? "+" : ""}{analisi.liftedIndex} ({analisi.liDesc}).
          </p>
          <p>
            Il gradiente del vento è {analisi.gradienteVento},
            {analisi.inversione.includes("assente") || analisi.inversione.includes("debole")
              ? " con inversione assente o debole, che non penalizza le termiche pomeridiane."
              : " con inversione presente, che potrebbe limitare lo sviluppo verticale delle termiche."
            }
            {' '}L'indice termico (TI) di {analisi.thermalIndex} indica {analisi.thermalIndexDesc},
            {analisi.topTermiche > 3000
              ? ` con altezza massima delle termiche secche tra ${(analisi.topTermiche - 300).toLocaleString()} m e ${analisi.topTermiche.toLocaleString()} m.`
              : ` con top termiche a ${analisi.topTermiche.toLocaleString()} m.`
            }
          </p>
          <p className="text-emerald-400 font-bold">
            🪂 Valutazione: {analisi.valutazione}
          </p>
        </div>
      </Sezione>

      {/* Legenda */}
      {!expanded && (
        <button
          onClick={() => setExpanded(true)}
          className="w-full text-xs text-slate-500 hover:text-slate-300 py-2 flex items-center justify-center gap-1"
        >
          <Map className="w-3 h-3" />
          Mostra legenda parametri
        </button>
      )}
      {expanded && (
        <div className="bg-slate-800/30 border border-slate-700/40 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={() => setExpanded(false)}
              className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1"
            >
              <ChevronUp className="w-3 h-3" />
              Nascondi legenda
            </button>
          </div>
          <h4 className="text-xs text-slate-400 font-bold mb-1">Parametri</h4>
          <div className="space-y-1">
            <p><span className="text-slate-500">PBL:</span> Planetary Boundary Layer — lo strato limite atmosferico dove si sviluppano le termiche.</p>
            <p><span className="text-slate-500">Thermal Index (TI):</span> Indica la forza delle termiche. Più negativo = più forti.</p>
            <p><span className="text-slate-500">CAPE:</span> Convective Available Potential Energy — energia disponibile per la convezione.</p>
            <p><span className="text-slate-500">Lifted Index (LI):</span> Stabilità atmosferica. Positivo = stabile, negativo = instabile.</p>
            <p><span className="text-slate-500">CIN:</span> Convective Inhibition — energia che blocca l'innesco delle termiche.</p>
          </div>
        </div>
      )}
    </div>
  );
}