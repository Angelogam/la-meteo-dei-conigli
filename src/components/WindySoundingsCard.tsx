"use client";

import React, { useEffect, useRef, useState } from "react";
import { CloudRain, CloudLightning, Wind, AlertTriangle } from "lucide-react";

interface WindySoundingsCardProps {
  siteName?: string;
}

export default function WindySoundingsCard({ siteName }: WindySoundingsCardProps) {
  console.log("[WindySoundingsCard] Rendering with siteName:", siteName);
  const containerRef = useRef<HTMLDivElement>(null);
  const [pluginLoaded, setPluginLoaded] = useState(false);
  const [pluginError, setPluginError] = useState<string | null>(null);
  const [selectedSite, setSelectedSite] = useState("montoso-decollo-basso");

  useEffect(() => {
    let mounted = true;
    let script: HTMLScriptElement | null = null;

    async function loadPlugin() {
      try {
        const res = await fetch("/api/windy-soundings?action=plugin");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!mounted) return;

        // Crea elemento <script> temporaneo per iniettare il plugin
        if (data.js) {
          const temp = document.createElement("script");
          temp.textContent = data.js;
          temp.onload = () => {
            if (mounted) setPluginLoaded(true);
            document.head.removeChild(temp);
          };
          temp.onerror = () => {
            if (mounted) setPluginError("Impossibile caricare il plugin Windy");
            document.head.removeChild(temp);
          };
          document.head.appendChild(temp);
        } else {
          throw new Error("Plugin JS non ricevuto");
        }
      } catch (err: any) {
        if (mounted) {
          setPluginError(err.message || "Errore nel caricamento del plugin");
        }
      }
    }

    loadPlugin();
    return () => {
      mounted = false;
    };
  }, []);

  const sites = [
    { id: "montoso-decollo-basso", name: "Montoso" },
    { id: "pian-mune-seggiovia", name: "Pian Munè" },
    { id: "colle-agnello", name: "Colle Agnello" },
    { id: "monte-birrone", name: "Monte Birrone" },
  ];

  return (
    <div className="bg-slate-900/90 border border-sky-500/50 rounded-2xl overflow-hidden shadow-xl shadow-sky-900/20">
      {/* Header */}
      <div className="bg-gradient-to-r from-sky-900/80 to-slate-900/80 px-4 py-3 border-b border-sky-500/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CloudLightning className="w-5 h-5 text-sky-400" />
            <span className="text-sm font-black text-white">Windy PG Soundings</span>
          </div>
          <span className="text-[10px] text-sky-300/70 font-semibold">v1.6.2</span>
        </div>
      </div>

      {/* Corpo */}
      <div ref={containerRef} className="p-4">
        {/* Selezionatore sito */}
        {!pluginLoaded && !pluginError && (
          <div className="flex items-center justify-center gap-3 text-slate-400 text-sm py-6">
            <div className="w-5 h-5 rounded-full border-2 border-sky-500/20 border-t-sky-400 animate-spin" />
            <span>Caricamento plugin Windy…</span>
          </div>
        )}

        {pluginError && (
          <div className="bg-red-950/30 border border-red-500/30 rounded-xl p-4 text-center">
            <AlertTriangle className="w-5 h-5 text-red-400 mx-auto mb-2" />
            <p className="text-sm text-red-300 font-semibold mb-2">Plugin non disponibile</p>
            <p className="text-xs text-red-400/70">{pluginError}</p>
            <a
              href="https://windy-plugins.com/2727410/windy-plugin-pg-soundings/1.6.2/plugin.min.js"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 mt-3 text-xs text-sky-400 hover:text-sky-300 font-medium"
            >
              <Wind className="w-3.5 h-3.5" />
              Apri plugin in nuova scheda
            </a>
          </div>
        )}

        {/* Placeholder visuale quando il plugin non è caricato */}
        {pluginLoaded && (
          <div className="space-y-4">
            {/* Grafico placeholder con dati realistici */}
            <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <CloudRain className="w-4 h-4 text-sky-400" />
                  <span className="text-xs font-bold text-white">Profilo verticale</span>
                </div>
                <select
                  value={selectedSite}
                  onChange={(e) => setSelectedSite(e.target.value)}
                  className="bg-slate-900/60 border border-slate-700/50 text-xs text-slate-300 rounded-lg px-2 py-1"
                >
                  {sites.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Skew-T diagram placeholder */}
              <div className="relative h-48 bg-gradient-to-b from-slate-900/60 to-slate-800/60 rounded-lg overflow-hidden">
                {/* Linee isoterme */}
                {Array.from({ length: 12 }, (_, i) => (
                  <div
                    key={`isotherm-${i}`}
                    className="absolute border-l border-dashed border-slate-600/30 h-full"
                    style={{ left: `${10 + i * 8}%`, transform: "rotate(30deg)", transformOrigin: "bottom left" }}
                  />
                ))}
                {/* Linee adiabatiche */}
                {Array.from({ length: 8 }, (_, i) => (
                  <div
                    key={`adiabatic-${i}`}
                    className="absolute border-r border-dashed border-slate-600/30 h-full"
                    style={{ right: `${10 + i * 12}%`, transform: "rotate(-30deg)", transformOrigin: "bottom left" }}
                  />
                ))}
                {/* Profilo temperatura */}
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 200 100" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="tempGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#F59E0B" />
                      <stop offset="100%" stopColor="#3B82F6" />
                    </linearGradient>
                  </defs>
                  <polyline
                    fill="none"
                    stroke="url(#tempGradient)"
                    strokeWidth="1.2"
                    points={
                      "0,100 10,90 20,82 30,75 40,68 50,60 60,52 70,45 80,38 90,32 100,26 110,22 120,18 130,15 140,12 150,10 160,8 170,6 180,4 200,2"
                    }
                  />
                  {/* Profilo rugiada */}
                  <polyline
                    fill="none"
                    stroke="#6366F1"
                    strokeWidth="1.2"
                    strokeDasharray="4,2"
                    points={
                      "0,100 10,95 20,88 30,82 40,76 50,70 60,64 70,58 80,53 90,48 100,44 110,40 120,37 130,34 140,31 150,28 160,26 170,24 180,22 200,20"
                    }
                  />
                  {/* Livello di congelamento */}
                  <line x1="0" y1="38" x2="200" y2="38" stroke="#EF4444" strokeWidth="0.8" strokeDasharray="2,2" />
                </svg>
                {/* Etichette */}
                <div className="absolute bottom-1 left-2 text-[8px] text-slate-500">-40°C</div>
                <div className="absolute bottom-1 right-2 text-[8px] text-slate-500">+20°C</div>
                <div className="absolute top-1 left-2 text-[8px] text-slate-500">0 hPa</div>
                <div className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[8px] text-sky-400">
                  T {siteName || "Montoso"}
                </div>
              </div>

              <div className="flex items-center justify-center gap-4 mt-2 text-[10px] text-slate-500">
                <div className="flex items-center gap-1">
                  <span className="w-3 h-0.5 bg-gradient-to-r from-amber-500 to-blue-500" /> Temperatura
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-3 h-0.5 bg-indigo-500 border-t border-dashed" /> Rugiada
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-3 h-0.5 bg-red-500 border-t border-dashed" /> 0°C
                </div>
              </div>
            </div>

            {/* Info rapide */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-800/40 rounded-xl p-3 border border-slate-700/40 text-center">
                <div className="text-xs text-slate-500 font-medium">CAPE</div>
                <div className="text-lg font-black text-emerald-400">120</div>
                <div className="text-[9px] text-emerald-400/70">J/kg</div>
              </div>
              <div className="bg-slate-800/40 rounded-xl p-3 border border-slate-700/40 text-center">
                <div className="text-xs text-slate-500 font-medium">Liv. 0°C</div>
                <div className="text-lg font-black text-amber-400">3,800m</div>
                <div className="text-[9px] text-slate-500">quota</div>
              </div>
              <div className="bg-slate-800/40 rounded-xl p-3 border border-slate-700/40 text-center">
                <div className="text-xs text-slate-500 font-medium">Vento 850hPa</div>
                <div className="text-lg font-black text-sky-400">22 km/h</div>
                <div className="text-[9px] text-slate-500">S-SE</div>
              </div>
            </div>

            <div className="text-center">
              <a
                href="https://windy-plugins.com/2727410/windy-plugin-pg-soundings/1.6.2/plugin.min.js"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-xs text-sky-400 hover:text-sky-300 font-medium transition-colors"
              >
                <Wind className="w-3.5 h-3.5" />
                Vedi plugin originale (Windy Plugins)
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}