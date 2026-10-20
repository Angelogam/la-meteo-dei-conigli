"use client";

import React, { useMemo, useState } from "react";
import { Clock, Search, ArrowRight, Star, Wind, Thermometer, RefreshCw } from "lucide-react";
import type { Decollo } from "@/data/decolli";
import type { MeteoDecollo } from "@/hooks/useThreeSourceWeather";

/* ── Helpers ── */
function toNum(v: string | number | null | undefined): number | null {
  if (v === null || v === undefined || v === "" || v === "N/D" || v === "--") return null;
  const n = Number.parseFloat(String(v));
  return Number.isFinite(n) ? n : null;
}

function getWindCardinal(deg: number): string {
  const dirs = ["N", "NE", "E", "SE", "S", "SO", "O", "NO"];
  return dirs[Math.round((((deg % 360) + 360) % 360) / 45) % 8];
}

/* ── SVG weather icons ── */
const RainIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
    <defs>
      <linearGradient id="rg" x1="12" y1="4" x2="12" y2="20" gradientUnits="userSpaceOnUse">
        <stop stopColor="#7dd3fc"/><stop offset="1" stopColor="#0284c7"/>
      </linearGradient>
      <linearGradient id="cg" x1="8" y1="6" x2="16" y2="12" gradientUnits="userSpaceOnUse">
        <stop stopColor="#e2e8f0"/><stop offset="1" stopColor="#94a3b8"/>
      </linearGradient>
    </defs>
    <path d="M4 14c0-3.3 2.7-6 6-6 .3 0 .7 0 1 .1C11.6 5.5 13.7 4 16 4c3.3 0 6 2.7 6 6 0 .3 0 .7-.1 1 .5.3.9.8.9 1.5 0 1.7-1.3 3-3 3H7c-1.7 0-3-1.3-3-3 0-.7.4-1.2.9-1.5C4.7 14.7 4 13.5 4 14z" fill="url(#cg)" stroke="#64748b" strokeWidth="1"/>
    <line x1="8" y1="17" x2="7" y2="21" stroke="url(#rg)" strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="12" y1="17" x2="11" y2="21" stroke="url(#rg)" strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="16" y1="17" x2="15" y2="21" stroke="url(#rg)" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

const CloudIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
    <defs>
      <linearGradient id="cg2" x1="8" y1="6" x2="16" y2="14" gradientUnits="userSpaceOnUse">
        <stop stopColor="#f1f5f9"/><stop offset="1" stopColor="#94a3b8"/>
      </linearGradient>
    </defs>
    <path d="M4 16c0-3.3 2.7-6 6-6 .3 0 .7 0 1 .1C11.6 7.5 13.7 6 16 6c3.3 0 6 2.7 6 6 0 .3 0 .7-.1 1 .5.3.9.8.9 1.5 0 1.7-1.3 3-3 3H7c-1.7 0-3-1.3-3-3 0-.7.4-1.2.9-1.5C4.7 16.7 4 15.5 4 16z" fill="url(#cg2)" stroke="#64748b" strokeWidth="1"/>
  </svg>
);

const TempIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
    <defs>
      <linearGradient id="tg" x1="12" y1="2" x2="12" y2="22" gradientUnits="userSpaceOnUse">
        <stop stopColor="#fca5a5"/><stop offset=".5" stopColor="#ef4444"/><stop offset="1" stopColor="#7f1d1d"/>
      </linearGradient>
    </defs>
    <rect x="10" y="2" width="4" height="14" rx="2" fill="url(#tg)" stroke="#7f1d1d" strokeWidth="1"/>
    <circle cx="12" cy="19" r="3.5" fill="url(#tg)" stroke="#7f1d1d" strokeWidth="1"/>
    <line x1="12" y1="6" x2="12" y2="12" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" opacity=".7"/>
  </svg>
);

/* ── Hero images per site ── */
const HERO_IMAGES: Record<string, string> = {
  "Malanotte": "https://images.unsplash.com/photo-1551632811-561732d1e306?w=120&h=90&fit=crop&q=80",
  "Colle di Tenda": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=120&h=90&fit=crop&q=80",
  "Boves": "https://images.unsplash.com/photo-1464822759023-fed622ff2c8b?w=120&h=90&fit=crop&q=80",
  "Monte Male": "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=120&h=90&fit=crop&q=80",
  "Iretta": "https://images.unsplash.com/photo-1486870591958-9b9d0d1dda29?w=120&h=90&fit=crop&q=80",
  "Pratoni di Val Mala": "https://images.unsplash.com/photo-1483728642387-6c3bdd6c93e5?w=120&h=90&fit=crop&q=80",
  "Monte Birrone": "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=120&h=90&fit=crop&q=80",
  "Colle dell'Agnello": "https://images.unsplash.com/photo-1454496522488-7a8e488e8606?w=120&h=90&fit=crop&q=80",
  "Pian Munè": "https://images.unsplash.com/photo-1485594050903-8e8ee5322c03?w=120&h=90&fit=crop&q=80",
  "Martiniana Po": "https://images.unsplash.com/photo-1491555103944-8c2a772256e7?w=120&h=90&fit=crop&q=80",
  "Rucas Alto": "https://images.unsplash.com/photo-1465056836900-8f1e940b3fc9?w=120&h=90&fit=crop&q=80",
  "Montoso": "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=120&h=90&fit=crop&q=80",
  "Monte Vandalino": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=120&h=90&fit=crop&q=80",
  "Pian dell'Alpe": "https://images.unsplash.com/photo-1500534623283-312a7ada7f2e?w=120&h=90&fit=crop&q=80",
  "Roletto": "https://images.unsplash.com/photo-1470071459604-3b5e3267c02b?w=120&h=90&fit=crop&q=80",
  "Piossasco": "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=120&h=90&fit=crop&q=80",
  "Truccetti": "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=120&h=90&fit=crop&q=80",
  "Val della Torre": "https://images.unsplash.com/photo-1446329813274-7c9036bd9a1f?w=120&h=90&fit=crop&q=80",
  "Rocca Canavese": "https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=120&h=90&fit=crop&q=80",
  "Santa Elisabetta": "https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=120&h=90&fit=crop&q=80",
  "Monte Cavallaria": "https://images.unsplash.com/photo-1497436072909-60f360e1d4b1?w=120&h=90&fit=crop&q=80",
  "Andrate": "https://images.unsplash.com/photo-1464822759023-fed622ff2c8b?w=120&h=90&fit=crop&q=80",
};

function getHeroImage(name: string): string {
  const key = Object.keys(HERO_IMAGES).find(k => name.toLowerCase().includes(k.toLowerCase()));
  return key ? HERO_IMAGES[key] : "https://images.unsplash.com/photo-1551632811-561732d1e306?w=120&h=90&fit=crop&q=80";
}

interface DecolliCardProps {
  decolli: (Decollo & { aggressiveWeather?: MeteoDecollo | null })[];
  selectedId: string;
  onSelect: (item: Decollo) => void;
  selectedDay?: number;
  isUpdating?: boolean;
  error?: string | null;
  onRefresh?: () => void;
}

export default function DecolliCard({
  decolli, selectedId, onSelect, selectedDay = 0, isUpdating = false, error, onRefresh,
}: DecolliCardProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("it-IT");
    if (!q) return decolli;
    return decolli.filter((item) => [
      item.site_name, item.location_name, item.orientation,
    ].some((v) => String(v ?? "").toLocaleLowerCase("it-IT").includes(q)));
  }, [decolli, query]);

  const dt = useMemo(() => {
    const today = new Date();
    const target = new Date(today);
    target.setDate(today.getDate() + selectedDay);
    const giorni = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];
    const mesi = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];
    return `${giorni[target.getDay()]} ${target.getDate()} ${mesi[target.getMonth()]}`;
  }, [selectedDay]);

  return (
    <section className="dc-panel" aria-labelledby="dc-title">
      {/* Panel header */}
      <div className="dc-header">
        <div className="dc-header-left">
          <h2 id="dc-title" className="dc-title">Decolli</h2>
          <span className="dc-count">{decolli.length} siti</span>
        </div>
        <div className="dc-header-right">
          <button type="button" className="dc-sort-btn" aria-label="Ordina">▼</button>
        </div>
      </div>

      {/* Search bar */}
      <div className="dc-search">
        <Search size={14} className="dc-search-icon" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cerca decollo…"
          aria-label="Cerca decollo"
        />
      </div>

      {/* Site list */}
      <div className="dc-list" role="list" aria-label="Lista decolli">
        {filtered.map((item) => {
          const selected = item.id === selectedId;
          const w = item.aggressiveWeather;
          const temp = toNum(w?.temp);
          const wind = toNum(w?.wind);
          const windDir = toNum(w?.dir);
          const rain = toNum(w?.rain);
          const cloud = toNum(w?.cloud);
          const fz = toNum(w?.freezingLevel) ?? (temp !== null ? Math.round(item.elevation_m + temp * 125) : null);

          return (
            <button
              key={item.id}
              type="button"
              role="listitem"
              onClick={() => onSelect(item)}
              aria-pressed={selected}
              className={`dc-row${selected ? " is-selected" : ""}`}
            >
              {/* Thumbnail */}
              <div className="dc-thumb">
                <img src={getHeroImage(item.site_name || item.name)} alt={item.site_name || item.name} loading="lazy" />
                {selected && <span className="dc-thumb-dot" />}
              </div>

              {/* Site info */}
              <div className="dc-info">
                <div className="dc-name">{item.site_name || item.name}</div>
                <div className="dc-meta">
                  {item.elevation_m || item.altitude} m s.l.m.
                </div>
              </div>

              {/* Weather metrics */}
              <div className="dc-weather">
                <div className="dc-w-item">
                  <span className="dc-w-label">
                    <Thermometer size={10} />
                    {temp !== null ? `${Math.round(temp)}°C` : "—"}
                  </span>
                </div>
                <div className="dc-w-item">
                  <span className="dc-w-label">
                    <Wind size={10} />
                    {wind !== null ? `${Math.round(wind)} km/h ${windDir !== null ? getWindCardinal(windDir) : ""}` : "—"}
                  </span>
                </div>
                <div className="dc-w-row">
                  <span className="dc-w-item"><RainIcon /><span>{rain === null ? "—" : `${rain.toFixed(1)} mm`}</span></span>
                  <span className="dc-w-item"><CloudIcon /><span>{cloud === null ? "—" : `${Math.round(cloud)}%`}</span></span>
                  <span className="dc-w-item"><TempIcon /><span>{fz === null ? "—" : `${fz}m`}</span></span>
                </div>
              </div>

              {/* Actions */}
              <div className="dc-actions">
                <button type="button" className="dc-star" aria-label="Preferito"><Star size={13} /></button>
                <span className="dc-arrow"><ArrowRight size={14} /></span>
              </div>
            </button>
          );
        })}

        {filtered.length === 0 && (
          <p className="dc-empty">Nessun decollo trovato.</p>
        )}
      </div>

      {error && <p className="dc-error">{error}</p>}

      {/* Footer */}
      <div className="dc-footer">
        <span className="dc-footer-time">
          <Clock size={11} />
          {dt}
        </span>
        <button type="button" className="dc-footer-refresh" onClick={onRefresh} disabled={isUpdating}>
          <RefreshCw size={12} className={isUpdating ? "dc-spin" : ""} />
          Aggiorna
        </button>
        <a href="#" className="dc-see-all">Vedi tutti →</a>
      </div>
    </section>
  );
}
