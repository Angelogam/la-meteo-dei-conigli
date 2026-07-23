"use client";

import React, { useState } from "react";
import { MapPin, Navigation, Mountain, ExternalLink } from "lucide-react";

interface SiteMapViewProps {
  sites: { id: string; nome: string; lat: number; lon: number; alt: number; valle: string; score?: number }[];
}

export default function SiteMapView({ sites }: SiteMapViewProps) {
  const [hoveredSite, setHoveredSite] = useState<string | null>(null);

  if (!sites || sites.length === 0) return null;

  // Normalizza coordinate per schermo (semplificato)
  const lats = sites.map(s => s.lat);
  const lons = sites.map(s => s.lon);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);
  const rangeLat = Math.max(maxLat - minLat, 0.1);
  const rangeLon = Math.max(maxLon - minLon, 0.1);

  // Padding per visualizzazione
  const padding = 0.15;
  const normLat = (lat: number) => ((lat - minLat) / rangeLat) * 100;
  const normLon = (lon: number) => ((lon - minLon) / rangeLon) * 100;

  return (
    <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/40 border border-emerald-500/30 rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <MapPin className="w-5 h-5 text-emerald-400" />
        <h3 className="text-sm font-bold text-emerald-300 uppercase tracking-wider">Mappa decolli</h3>
        <span className="text-[10px] text-slate-500 ml-auto">{sites.length} siti</span>
      </div>

      {/* Mappa stilizzata */}
      <div className="relative w-full aspect-[4/3] bg-slate-900/60 rounded-xl border border-slate-700/40 overflow-hidden">
        {/* Griglia di sfondo */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
              <path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(148,163,184,0.06)" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100" height="100" fill="url(#grid)" />
        </svg>

        {/* Montagne stilizzate */}
        <svg className="absolute bottom-0 w-full h-1/3" viewBox="0 0 100 30" preserveAspectRatio="none">
          <path d="M0,30 L5,25 L10,28 L15,18 L20,22 L25,12 L30,16 L35,8 L40,14 L45,6 L50,10 L55,4 L60,8 L65,14 L70,10 L75,18 L80,14 L85,22 L90,16 L95,24 L100,20 L100,30 Z" fill="rgba(16,185,129,0.08)" />
          <path d="M0,30 L10,26 L20,28 L30,20 L40,22 L50,14 L60,18 L70,12 L80,16 L90,24 L100,22 L100,30 Z" fill="rgba(16,185,129,0.05)" style={{ transform: 'translateY(2px)' }} />
        </svg>

        {/* Punti decolli */}
        {sites.map((site) => {
          const x = normLon(site.lon);
          const y = 100 - normLat(site.lat);
          const isHovered = hoveredSite === site.id;

          return (
            <div
              key={site.id}
              className="absolute transition-all duration-200 cursor-pointer"
              style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)' }}
              onMouseEnter={() => setHoveredSite(site.id)}
              onMouseLeave={() => setHoveredSite(null)}
            >
              <div className={`relative ${isHovered ? 'z-10' : ''}`}>
                {/* Glow */}
                <div className={`absolute inset-0 w-6 h-6 rounded-full bg-emerald-400/30 blur-md transition-opacity ${isHovered ? 'opacity-100' : 'opacity-0'}`} />

                {/* Pin */}
                <div className={`w-4 h-4 md:w-5 md:h-5 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 border-2 border-white flex items-center justify-center shadow-lg transition-transform ${isHovered ? 'scale-150' : ''}`}>
                  <Navigation className="w-2 h-2 text-white" />
                </div>

                {/* Tooltip */}
                {isHovered && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-slate-900/95 backdrop-blur-sm border border-slate-700/60 rounded-xl px-3 py-2 shadow-2xl whitespace-nowrap z-20 animate-fade-in min-w-[140px]">
                    <div className="text-xs font-bold text-white">{site.nome}</div>
                    <div className="text-[9px] text-slate-400 mt-0.5">{site.valle} · {site.alt}m</div>
                    {site.score != null && (
                      <div className="text-[10px] text-emerald-300 font-bold mt-1">Score: {site.score}/10</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}