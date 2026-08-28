"use client";

import React, { useState } from "react";
import {
  Sun,
  Thermometer,
  Wind,
  Cloud,
  Droplets,
  CloudRain,
  CloudLightning,
  Eye,
  Gauge,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Clock,
  MapPin,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Minus,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import type { DettaglioMeteo, VentoQuota, Raccomandazione, AnalisiOraria } from "@/utils/dettaglioMeteo";

interface Props {
  dettaglio: DettaglioMeteo;
}

// Utility per direzione vento
const DIREZIONI = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
function getDirNome(gradi: number): string {
  const idx = Math.round(gradi / 22.5) % 16;
  return DIREZIONI[idx];
}

// Colori per intensità vento
function getVentoColore(intensita: string): string {
  switch (intensita) {
    case 'debole': return 'text-green-400';
    case 'moderato': return 'text-yellow-400';
    case 'forte': return 'text-orange-500';
    case 'molto_forte': return 'text-red-500';
    default: return 'text-slate-400';
  }
}

function getVentoBg(intensita: string): string {
  switch (intensita) {
    case 'debole': return 'bg-green-500/20 border-green-500/30';
    case 'moderato': return 'bg-yellow-500/20 border-yellow-500/30';
    case 'forte': return 'bg-orange-500/20 border-orange-500/30';
    case 'molto_forte': return 'bg-red-500/20 border-red-500/30';
    default: return 'bg-slate-500/20 border-slate-500/30';
  }
}

// Icona qualità volo
function QualitaIcon({ qualita }: { qualita: AnalisiOraria['qualitaVolo'] }) {
  switch (qualita) {
    case 'ottima': return <span className="text-emerald-400 font-bold">OTTIMA</span>;
    case 'buona': return <span className="text-green-400 font-bold">BUONA</span>;
    case 'discreta': return <span className="text-yellow-400 font-bold">DISCRETA</span>;
    case 'scarsa': return <span className="text-orange-400 font-bold">SCARSA</span>;
    case 'pessima': return <span className="text-red-400 font-bold">PESSIMA</span>;
    case 'non_volabile': return <span className="text-red-600 font-bold">NON VOLABILE</span>;
    default: return <span className="text-slate-400">-</span>;
  }
}

// Badge raccomandazione
function RaccomandazioneBadge({ r }: { r: Raccomandazione }) {
  const colors = {
    critica: { bg: 'bg-red-900/50', border: 'border-red-500', icon: '🚨', text: 'text-red-300' },
    negativa: { bg: 'bg-orange-900/50', border: 'border-orange-500', icon: '⚠️', text: 'text-orange-300' },
    neutrale: { bg: 'bg-slate-800/50', border: 'border-slate-600', icon: 'ℹ️', text: 'text-slate-300' },
    positiva: { bg: 'bg-emerald-900/50', border: 'border-emerald-500', icon: '✅', text: 'text-emerald-300' },
  };
  const c = colors[r.tipo];
  
  return (
    <div className={`${c.bg} border ${c.border} rounded-lg p-3`}>
      <div className="flex items-start gap-2">
        <span className="text-lg">{c.icon}</span>
        <div className="flex-1">
          <span className={`text-xs font-bold uppercase ${c.text}`}>{r.categoria}</span>
          <p className={`text-sm ${c.text} mt-0.5 leading-relaxed`}>{r.messaggio}</p>
        </div>
      </div>
    </div>
  );
}

// Componente vento quota
function VentoQuotaRow({ v }: { v: VentoQuota }) {
  const coloriIntensita = {
    debole: 'text-green-400',
    moderato: 'text-yellow-400',
    forte: 'text-orange-500',
    molto_forte: 'text-red-500',
  };
  
  return (
    <div className={`flex items-center justify-between p-2 rounded-lg border ${getVentoBg(v.intensita)}`}>
      <div className="flex items-center gap-3">
        <span className="text-xs text-slate-500 w-16">{v.quota}m</span>
        <Wind className={`w-4 h-4 ${coloriIntensita[v.intensita]}`} />
      </div>
      <div className="text-right">
        <span className={`font-bold ${coloriIntensita[v.intensita]}`}>{v.velocita} km/h</span>
        <span className="text-xs text-slate-500 ml-2">{v.direzioneNome} ({v.direzione}°)</span>
      </div>
    </div>
  );
}

// Sezione collapsible
function Sezione({ 
  titolo, 
  icona, 
  children, 
  defaultOpen = false 
}: { 
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
        {open ? (
          <ChevronUp className="w-4 h-4 text-slate-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400" />
        )}
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-2">
          {children}
        </div>
      )}
    </div>
  );
}

export default function DettaglioMeteoCard({ dettaglio }: Props) {
  const [tab, setTab] = useState<'sintesi' | 'vento' | 'ore' | 'report'>('sintesi');
  
  const hasCritical = dettaglio.raccomandazioni.some(r => r.tipo === 'critica');
  const hasNegative = dettaglio.raccomandazioni.some(r => r.tipo === 'negativa');
  
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className={`bg-gradient-to-br from-slate-900/70 to-slate-800/40 border-2 rounded-2xl p-4 ${
        hasCritical ? 'border-red-500/50' : hasNegative ? 'border-orange-500/50' : 'border-emerald-500/30'
      }`}>
        <div className="flex items-center gap-3 mb-3">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 ${
            hasCritical ? 'bg-red-500/20 border-red-500/50' :
            hasNegative ? 'bg-orange-500/20 border-orange-500/50' :
            'bg-emerald-500/20 border-emerald-500/50'
          }`}>
            {hasCritical ? (
              <CloudLightning className="w-6 h-6 text-red-400" />
            ) : hasNegative ? (
              <AlertTriangle className="w-6 h-6 text-orange-400" />
            ) : (
              <Sun className="w-6 h-6 text-emerald-400" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white truncate">
                {dettaglio.siteName}
              </h3>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                hasCritical ? 'bg-red-500/30 text-red-300' :
                hasNegative ? 'bg-orange-500/30 text-orange-300' :
                'bg-emerald-500/30 text-emerald-300'
              }`}>
                {dettaglio.descrizioneMeteo}
              </span>
            </div>
            <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
              <MapPin className="w-3 h-3" />
              {dettaglio.lat.toFixed(2)}°N, {dettaglio.lon.toFixed(2)}°E – {dettaglio.alt}m
              <span className="text-slate-600">•</span>
              <Clock className="w-3 h-3" />
              {new Date(dettaglio.data).toLocaleString('it-IT')}
            </div>
          </div>
        </div>

        {/* Condizioni attuali compatte */}
        <div className="grid grid-cols-4 gap-2 text-xs">
          <div className="bg-slate-800/60 rounded-lg p-2 text-center">
            <Thermometer className="w-4 h-4 text-orange-400 mx-auto mb-1" />
            <div className="text-white font-bold">{dettaglio.temperatura.toFixed(0)}°C</div>
            <div className="text-slate-500 text-[10px]">Temperatura</div>
          </div>
          <div className="bg-slate-800/60 rounded-lg p-2 text-center">
            <Wind className="w-4 h-4 text-cyan-400 mx-auto mb-1" />
            <div className="text-white font-bold">{dettaglio.ventoQuote[0]?.velocita || 0} km/h</div>
            <div className="text-slate-500 text-[10px]">{getDirNome(dettaglio.ventoQuote[0]?.direzione || 0)}</div>
          </div>
          <div className="bg-slate-800/60 rounded-lg p-2 text-center">
            <Cloud className="w-4 h-4 text-blue-400 mx-auto mb-1" />
            <div className="text-white font-bold">{dettaglio.nuvolositaTotale}%</div>
            <div className="text-slate-500 text-[10px]">Nuvolosità</div>
          </div>
          <div className="bg-slate-800/60 rounded-lg p-2 text-center">
            <Droplets className="w-4 h-4 text-cyan-300 mx-auto mb-1" />
            <div className="text-white font-bold">{dettaglio.precipitazione.toFixed(1)}</div>
            <div className="text-slate-500 text-[10px]">mm/h</div>
          </div>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 bg-slate-800/40 rounded-lg p-1">
        {[
          { id: 'sintesi', label: 'Sintesi' },
          { id: 'vento', label: 'Vento Quote' },
          { id: 'ore', label: 'Ore' },
          { id: 'report', label: 'Report' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as typeof tab)}
            className={`flex-1 text-xs font-medium py-2 px-3 rounded-md transition-colors ${
              tab === t.id
                ? 'bg-slate-700 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab: Sintesi */}
      {tab === 'sintesi' && (
        <div className="space-y-3">
          {/* Zero Termico */}
          <Sezione
            titolo={`Zero Termico: ${dettaglio.zeroTermico}m`}
            icona={<ArrowDown className="w-4 h-4 text-cyan-400" />}
            defaultOpen={true}
          >
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="bg-slate-800/60 rounded-lg p-2 text-center">
                <div className="text-cyan-300 font-bold text-lg">{dettaglio.zeroTermicoMin}m</div>
                <div className="text-slate-500">Minimo</div>
              </div>
              <div className="bg-cyan-900/30 border border-cyan-500/30 rounded-lg p-2 text-center">
                <div className="text-cyan-300 font-bold text-lg">{dettaglio.zeroTermico}m</div>
                <div className="text-slate-500">Atteso</div>
              </div>
              <div className="bg-slate-800/60 rounded-lg p-2 text-center">
                <div className="text-cyan-300 font-bold text-lg">{dettaglio.zeroTermicoMax}m</div>
                <div className="text-slate-500">Massimo</div>
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              {dettaglio.zeroTermico > 3000
                ? 'Zero termico ALTO - temperature positive anche in quota.'
                : dettaglio.zeroTermico > 2000
                  ? 'Zero termico nella MEDIA - attenzione alle zone montane sopra i 2000m.'
                  : 'Zero termico BASSO - aria fredda in quota, rischio ghiaccio.'}
            </p>
          </Sezione>

          {/* Parametri atmosferici */}
          <Sezione
            titolo="Parametri Atmosferici"
            icona={<Gauge className="w-4 h-4 text-purple-400" />}
          >
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-slate-800/60 rounded-lg p-2">
                <span className="text-slate-500">Umidità</span>
                <div className="text-blue-300 font-bold">{dettaglio.umidita.toFixed(0)}%</div>
              </div>
              <div className="bg-slate-800/60 rounded-lg p-2">
                <span className="text-slate-500">Punto rugiada</span>
                <div className="text-cyan-300 font-bold">{dettaglio.puntoRugiada.toFixed(1)}°C</div>
              </div>
              <div className="bg-slate-800/60 rounded-lg p-2">
                <span className="text-slate-500">Pressione</span>
                <div className="text-slate-300 font-bold">{dettaglio.pressione.toFixed(0)} hPa</div>
              </div>
              <div className="bg-slate-800/60 rounded-lg p-2">
                <span className="text-slate-500">Radiazione</span>
                <div className="text-amber-300 font-bold">{dettaglio.radiazione.toFixed(0)} W/m²</div>
              </div>
            </div>
          </Sezione>

          {/* Indici stabilità */}
          <Sezione
            titolo="Indici di Stabilità"
            icona={<TrendingUp className="w-4 h-4 text-emerald-400" />}
          >
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-slate-800/60 rounded-lg p-2">
                <span className="text-slate-500">CAPE</span>
                <div className="text-purple-300 font-bold">{dettaglio.cape} J/kg</div>
              </div>
              <div className="bg-slate-800/60 rounded-lg p-2">
                <span className="text-slate-500">Lifted Index</span>
                <div className={`font-bold ${dettaglio.liftedIndex > 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                  {dettaglio.liftedIndex > 0 ? '+' : ''}{dettaglio.liftedIndex}
                </div>
              </div>
              <div className="bg-slate-800/60 rounded-lg p-2">
                <span className="text-slate-500">Thermal Index</span>
                <div className="text-amber-300 font-bold">{dettaglio.thermalIndex}</div>
              </div>
              <div className="bg-slate-800/60 rounded-lg p-2">
                <span className="text-slate-500">Richardson</span>
                <div className="text-slate-300 font-bold">{dettaglio.Richardson.toFixed(2)}</div>
              </div>
            </div>
          </Sezione>

          {/* Raccomandazioni */}
          {dettaglio.raccomandazioni.length > 0 && (
            <Sezione
              titolo="Raccomandazioni"
              icona={<AlertTriangle className="w-4 h-4 text-yellow-400" />}
              defaultOpen={true}
            >
              <div className="space-y-2">
                {dettaglio.raccomandazioni.slice(0, 5).map((r, i) => (
                  <RaccomandazioneBadge key={i} r={r} />
                ))}
              </div>
            </Sezione>
          )}
        </div>
      )}

      {/* Tab: Vento Quote */}
      {tab === 'vento' && (
        <div className="space-y-3">
          <Sezione
            titolo="Profilo Vento alle Quote"
            icona={<Wind className="w-4 h-4 text-cyan-400" />}
            defaultOpen={true}
          >
            <div className="space-y-1">
              {dettaglio.ventoQuote.map((v, i) => (
                <VentoQuotaRow key={i} v={v} />
              ))}
            </div>
          </Sezione>
          
          {/* Grafico semplificato */}
          <Sezione
            titolo="Intensità per Quota"
            icona={<TrendingUp className="w-4 h-4 text-slate-400" />}
          >
            <div className="space-y-1">
              {dettaglio.ventoQuote.map((v, i) => {
                const maxV = Math.max(...dettaglio.ventoQuote.map(x => x.velocita));
                const width = (v.velocita / maxV) * 100;
                return (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <span className="text-slate-500 w-12">{v.quota}m</span>
                    <div className="flex-1 h-4 bg-slate-800 rounded overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          v.intensita === 'debole' ? 'bg-green-500' :
                          v.intensita === 'moderato' ? 'bg-yellow-500' :
                          v.intensita === 'forte' ? 'bg-orange-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${width}%` }}
                      />
                    </div>
                    <span className="text-slate-400 w-20 text-right">{v.velocita} km/h</span>
                  </div>
                );
              })}
            </div>
          </Sezione>
        </div>
      )}

      {/* Tab: Ore */}
      {tab === 'ore' && (
        <div className="space-y-2">
          <Sezione
            titolo="Previsione Oraria"
            icona={<Clock className="w-4 h-4 text-green-400" />}
            defaultOpen={true}
          >
            <div className="space-y-1">
              {dettaglio.analisiTemporale.map((ora, i) => {
                const qualitaColors = {
                  ottima: 'bg-emerald-500/20 border-emerald-500/40',
                  buona: 'bg-green-500/20 border-green-500/40',
                  discreta: 'bg-yellow-500/20 border-yellow-500/40',
                  scarsa: 'bg-orange-500/20 border-orange-500/40',
                  pessima: 'bg-red-500/20 border-red-500/40',
                  non_volabile: 'bg-red-900/40 border-red-600',
                };
                
                return (
                  <div
                    key={i}
                    className={`border rounded-lg p-3 ${qualitaColors[ora.qualitaVolo]}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-bold text-white">🕐 {ora.ora}</span>
                      <QualitaIcon qualita={ora.qualitaVolo} />
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-xs">
                      <div>
                        <span className="text-slate-500">T</span>
                        <div className="text-white font-medium">{ora.temperatura.toFixed(0)}°C</div>
                      </div>
                      <div>
                        <span className="text-slate-500">ZT</span>
                        <div className="text-cyan-300 font-medium">{ora.zeroTermico}m</div>
                      </div>
                      <div>
                        <span className="text-slate-500">💨</span>
                        <div className="text-cyan-300 font-medium">{ora.vento10m} km/h</div>
                      </div>
                      <div>
                        <span className="text-slate-500">☁️</span>
                        <div className="text-blue-300 font-medium">{ora.nuvolosita}%</div>
                      </div>
                    </div>
                    <p className="text-xs text-slate-400 mt-2">{ora.noteVolo}</p>
                  </div>
                );
              })}
            </div>
          </Sezione>
        </div>
      )}

      {/* Tab: Report */}
      {tab === 'report' && (
        <div className="bg-slate-900/50 border border-slate-700/40 rounded-xl p-4">
          <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap leading-relaxed">
            {dettaglio.reportCompleto}
          </pre>
        </div>
      )}

      {/* Fonti */}
      <div className="text-center text-[10px] text-slate-600">
        Dati: {dettaglio.fonti.join(', ')} | Confidenza: {(dettaglio.confidenza * 100).toFixed(0)}%
      </div>
    </div>
  );
}