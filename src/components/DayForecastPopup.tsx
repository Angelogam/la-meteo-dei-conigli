"use client";

import { wic } from "@/utils/meteo";
import type { HourData } from "@/types/meteo";
import { useEffect, useState } from "react";

interface DayForecastPopupProps {
  data: HourData[];
  dayLabel: string;
  onClose: () => void;
}

const cloudAnimation = (cloudCover: number) => {
  if (cloudCover <= 20) return { opacity: 0.1, size: 0, color: "#87ceeb" };
  if (cloudCover <= 40) return { opacity: 0.3, size: 28, color: "#94a3b8" };
  if (cloudCover <= 60) return { opacity: 0.5, size: 36, color: "#64748b" };
  if (cloudCover <= 80) return { opacity: 0.7, size: 44, color: "#475569" };
  return { opacity: 0.9, size: 52, color: "#334155" };
};

const windToColor = (speed: number) => {
  if (speed < 8) return "#22c55e";
  if (speed < 16) return "#f59e0b";
  if (speed < 28) return "#f97316";
  return "#ef4444";
};

const SingleHourCard = ({ h }: { h: HourData }) => {
  const style = cloudAnimation(h.cloudCover);
  return (
    <div className="flex flex-col items-center gap-1 p-2 rounded-xl bg-white/40 border border-gray-200 min-w-[60px]">
      <span className="text-xs font-bold text-gray-700">
        {String(h.time.getHours()).padStart(2, "0")}:00
      </span>

      {/* Nuvole animate */}
      <div className="relative w-10 h-10 flex items-center justify-center">
        {/* Sole se poca copertura */}
        {h.cloudCover <= 40 && (
          <div className="absolute animate-spin-slow">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="5" fill="#fbbf24" />
              <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" stroke="#fbbf24" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
        )}

        {/* Nuvole */}
        {h.cloudCover > 20 && (
          <div className="absolute animate-float" style={{ animationDelay: `${h.time.getHours() * 0.1}s` }}>
            <svg width={style.size} height={style.size * 0.6} viewBox="0 0 100 60" fill={style.color} opacity={style.opacity}>
              <ellipse cx="40" cy="40" rx="30" ry="18" />
              <ellipse cx="60" cy="35" rx="25" ry="20" />
              <ellipse cx="50" cy="30" rx="20" ry="15" />
            </svg>
          </div>
        )}

        {/* Pioggia */}
        {h.precipitation > 0 && (
          <div className="absolute animate-rain" style={{ animationDelay: `${h.time.getHours() * 0.05}s` }}>
            <svg width="16" height="20" viewBox="0 0 16 20" fill="#60a5fa">
              <rect x="3" y="4" width="3" height="10" rx="1.5" opacity={Math.min(1, h.precipitation * 2)} />
              <rect x="9" y="6" width="3" height="12" rx="1.5" opacity={Math.min(1, h.precipitation * 2)} />
            </svg>
          </div>
        )}
      </div>

      {/* Temperatura */}
      <span className="text-xs font-bold text-gray-800">
        {Math.round(h.temperature)}°
      </span>

      {/* Barra vento */}
      <div className="w-full h-1.5 rounded-full bg-gray-300 overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${Math.min(100, (h.windSpeed / 40) * 100)}%`,
            background: windToColor(h.windSpeed),
          }}
        />
      </div>
      <span className="text-[10px] text-gray-500">{Math.round(h.windSpeed)} km/h</span>
    </div>
  );
};

export const DayForecastPopup = ({ data, dayLabel, onClose }: DayForecastPopupProps) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      className={
        "overflow-hidden transition-all duration-300 ease-in-out " +
        (visible ? "max-h-[500px] opacity-100 mt-3" : "max-h-0 opacity-0")
      }
    >
      <div className="bg-white/80 rounded-2xl border border-gray-300 shadow-md p-3 relative">
        {/* Header */}
        <div className="flex justify-between items-center mb-3">
          <h4 className="text-sm font-bold text-gray-800">
            📅 Evoluzione giornata — {dayLabel}
          </h4>
          <button
            onClick={onClose}
            className="w-6 h-6 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-xs font-bold text-gray-600"
          >
            ✕
          </button>
        </div>

        {/* Scroll orizzontale con le ore */}
        <div className="overflow-x-auto pb-2">
          <div className="flex gap-2 min-w-max">
            {data.map((h, i) => (
              <SingleHourCard key={i} h={h} />
            ))}
          </div>
        </div>

        {/* Legenda */}
        <div className="flex flex-wrap gap-2 mt-2 text-[10px] text-gray-500 justify-center">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-fbbf24" /> Sole
          </span>
          <span className="flex items-center gap-1">
            <span className="w-4 h-2 rounded-full bg-gray-400" /> Nuvole
          </span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-3 rounded-full bg-blue-400" /> Pioggia
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-1.5 rounded-full bg-orange-400" /> Vento
          </span>
        </div>

        {/* Note aggiuntive */}
        <div className="mt-2 text-center text-[10px] text-gray-400 italic">
          Le nuvole si muovono e la pioggia cade in modo continuo per simulare l&apos;evoluzione
        </div>
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-4px); }
        }
        @keyframes rain {
          0%, 100% { transform: translateY(0px); opacity: 1; }
          50% { transform: translateY(6px); opacity: 0.6; }
        }
        @keyframes spin-slow {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        .animate-rain {
          animation: rain 1.5s ease-in-out infinite;
        }
        .animate-spin-slow {
          animation: spin-slow 8s linear infinite;
        }
      `}</style>
    </div>
  );
};