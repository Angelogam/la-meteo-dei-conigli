"use client";

import { wic } from "@/utils/meteo";
import type { HourData } from "@/types/meteo";
import { useEffect, useState } from "react";

interface DayForecastPopupProps {
  data: HourData[];
  dayLabel: string;
  onClose: () => void;
  selectedHour?: number;
}

const cloudStyle = (cover: number) => {
  if (cover <= 15) return { color: "#f0f0f0", opacity: 0.1, size: 24 };
  if (cover <= 35) return { color: "#d4d4d8", opacity: 0.35, size: 30 };
  if (cover <= 55) return { color: "#a1a1aa", opacity: 0.55, size: 36 };
  if (cover <= 75) return { color: "#71717a", opacity: 0.75, size: 42 };
  return { color: "#3f3f46", opacity: 0.92, size: 50 };
};

const windColor = (speed: number) => {
  if (speed < 8) return "#22c55e";
  if (speed < 16) return "#f59e0b";
  if (speed < 28) return "#f97316";
  return "#ef4444";
};

const isSnow = (code: number) => code >= 71 && code <= 77;
const isRain = (code: number) => (code >= 51 && code <= 67) || (code >= 80 && code <= 82);
const isThunder = (code: number) => code >= 95;

const SingleHourCard = ({ h, isSelected }: { h: HourData; isSelected: boolean }) => {
  const c = cloudStyle(h.cloudCover);
  const snowing = isSnow(h.weatherCode);
  const raining = isRain(h.weatherCode) || h.precipitation > 0.3;
  const thunder = isThunder(h.weatherCode);
  const sunny = h.cloudCover <= 35 && !raining && !thunder;

  return (
    <div
      className={
        "flex flex-col items-center gap-1 p-2 rounded-xl border min-w-[64px] transition-all duration-200 " +
        (isSelected
          ? "bg-white border-red-400 shadow-md scale-105"
          : "bg-white/40 border-gray-200")
      }
    >
      {/* Ora */}
      <span className={`text-xs font-bold ${isSelected ? "text-red-600" : "text-gray-700"}`}>
        {String(h.time.getHours()).padStart(2, "0")}:00
      </span>

      {/* Animazione meteo */}
      <div className="relative w-11 h-11 flex items-center justify-center overflow-hidden">
        {/* SOLE */}
        {sunny && (
          <div className="absolute animate-spin-slow">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="5.5" fill="#facc15" />
              <path d="M12 1.5v2M12 20.5v2M2.5 12h2M19.5 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" stroke="#facc15" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </div>
        )}

        {/* LAMPEGGI (tuono) */}
        {thunder && (
          <div className="absolute animate-flash">
            <svg width="20" height="22" viewBox="0 0 24 28" fill="#fef08a">
              <polygon points="14,1 4,16 11,16 9,27 21,11 13,11 16,1" />
            </svg>
          </div>
        )}

        {/* NUVOLA */}
        {h.cloudCover > 15 && (
          <div className="absolute animate-float" style={{ animationDuration: "3.5s", animationDelay: `${(h.time.getHours() % 6) * 0.5}s` }}>
            <svg width={c.size} height={c.size * 0.55} viewBox="0 0 100 55" fill={c.color} opacity={c.opacity}>
              <ellipse cx="40" cy="38" rx="32" ry="16" />
              <ellipse cx="60" cy="32" rx="26" ry="18" />
              <ellipse cx="50" cy="28" rx="22" ry="14" />
            </svg>
          </div>
        )}

        {/* PIOGGIA */}
        {raining && !snowing && (
          <div className="absolute animate-rain" style={{ animationDelay: `${h.time.getHours() * 0.05}s` }}>
            <svg width="14" height="22" viewBox="0 0 14 22" fill="#60a5fa">
              <rect x="2" y="4" width="2.5" height="10" rx="1.2" opacity="0.8" />
              <rect x="7" y="2" width="2.5" height="12" rx="1.2" opacity="0.7" />
              <rect x="11" y="5" width="2.5" height="10" rx="1.2" opacity="0.6" />
            </svg>
          </div>
        )}

        {/* NEVE */}
        {snowing && (
          <div className="absolute">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="absolute animate-snow"
                style={{
                  left: `${4 + i * 5}px`,
                  animationDelay: `${i * 0.4}s`,
                  animationDuration: "2.8s",
                }}
              >
                <svg width="6" height="6" viewBox="0 0 8 8" fill="#e0f2fe">
                  <circle cx="4" cy="4" r="3" />
                </svg>
              </div>
            ))}
          </div>
        )}

        {/* TEMPERATURA dentro l'icona */}
        {!sunny && !thunder && (
          <span className="absolute bottom-0 right-0 text-[9px] font-extrabold text-gray-800 drop-shadow-sm">
            {Math.round(h.temperature)}°
          </span>
        )}
      </div>

      {/* Temperatura */}
      <span className={`text-xs font-bold ${isSelected ? "text-red-600" : "text-gray-800"}`}>
        {Math.round(h.temperature)}°
      </span>

      {/* Barra vento */}
      <div className="w-full h-1.5 rounded-full bg-gray-300 overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${Math.min(100, (h.windSpeed / 42) * 100)}%`,
            background: windColor(h.windSpeed),
          }}
        />
      </div>
      <span className="text-[9px] text-gray-500 -mt-0.5">
        {Math.round(h.windSpeed)} km/h
      </span>
    </div>
  );
};

export const DayForecastPopup = ({ data, dayLabel, onClose, selectedHour }: DayForecastPopupProps) => {
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const t = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  if (!mounted) return null;

  return (
    <div className="transition-all duration-300 ease-in-out overflow-hidden"
      style={{
        maxHeight: visible ? "520px" : "0px",
        opacity: visible ? 1 : 0,
      }}
    >
      <div className="bg-white/80 rounded-2xl border border-gray-300 shadow-md p-3 relative">
        {/* Header */}
        <div className="flex justify-between items-center mb-3">
          <h4 className="text-sm font-bold text-gray-800">
            📅 Evoluzione giornata — {dayLabel}
          </h4>
          <button
            onClick={onClose}
            className="w-6 h-6 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-xs font-bold text-gray-600 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Scroll orizzontale con ore animate */}
        <div className="overflow-x-auto pb-2">
          <div className="flex gap-2 min-w-max">
            {data.map((h, i) => (
              <SingleHourCard key={i} h={h} isSelected={h.time.getHours() === selectedHour} />
            ))}
          </div>
        </div>

        {/* Legenda colori */}
        <div className="flex flex-wrap gap-2 mt-2 text-[10px] text-gray-500 justify-center">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> Sole
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-1.5 rounded-full bg-gray-400" /> Nuvola
          </span>
          <span className="flex items-center gap-1">
            <span className="w-1 h-2.5 rounded-full bg-blue-400" /> Pioggia
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-200" /> Neve
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-1 rounded-full bg-orange-500" /> Vento
          </span>
          <span className="flex items-center gap-1">
            <span className="text-[10px]">⚡</span> Temporale
          </span>
        </div>

        {/* Nota */}
        <div className="mt-2 text-center text-[9px] text-gray-400 italic leading-tight">
          Le nuvole si muovono, la pioggia e la neve scendono — animazioni continue per simulare l&apos;evoluzione oraria
        </div>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-5px); }
        }
        @keyframes rain {
          0%, 100% { transform: translateY(0px); opacity: 0.8; }
          50% { transform: translateY(8px); opacity: 0.4; }
        }
        @keyframes snow {
          0% { transform: translateY(-6px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(16px) rotate(360deg); opacity: 0.3; }
        }
        @keyframes spin-slow {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes flash {
          0%, 100% { opacity: 0; transform: scale(1); }
          10% { opacity: 1; transform: scale(1.1); }
          20% { opacity: 0; transform: scale(1); }
          45% { opacity: 0; }
          55% { opacity: 1; transform: scale(1.05); }
          65% { opacity: 0; }
        }
        .animate-float { animation: float 3.5s ease-in-out infinite; }
        .animate-rain { animation: rain 1.2s ease-in-out infinite; }
        .animate-snow { animation: snow 2.8s linear infinite; }
        .animate-spin-slow { animation: spin-slow 10s linear infinite; }
        .animate-flash { animation: flash 2s ease-in-out infinite; }
      `}</style>
    </div>
  );
};