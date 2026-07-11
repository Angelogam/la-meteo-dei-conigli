"use client";

import type { HourData } from "@/types/meteo";
import { useEffect, useRef, useState } from "react";

interface DayForecastPopupProps {
  data: HourData[];
  dayLabel: string;
  onClose: () => void;
  selectedHour?: number;
  onHourSelect?: (hour: number) => void;
}

const cloudStyle = (cover: number) => {
  if (cover <= 15) return { color: "#94a3b8", opacity: 0.2, size: 24 };
  if (cover <= 35) return { color: "#64748b", opacity: 0.4, size: 30 };
  if (cover <= 55) return { color: "#475569", opacity: 0.6, size: 36 };
  if (cover <= 75) return { color: "#334155", opacity: 0.8, size: 42 };
  return { color: "#1e293b", opacity: 0.95, size: 50 };
};

const windColor = (speed: number) => {
  if (speed < 8) return "#16a34a";
  if (speed < 16) return "#ca8a04";
  if (speed < 28) return "#ea580c";
  return "#dc2626";
};

const isSnow = (code: number) => code >= 71 && code <= 77;
const isRain = (code: number) => (code >= 51 && code <= 67) || (code >= 80 && code <= 82);
const isThunder = (code: number) => code >= 95;

const SunIcon = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" className="drop-shadow-md">
    <circle cx="12" cy="12" r="5.5" fill="#f59e0b" stroke="#d97706" strokeWidth="1" />
    {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
      <line
        key={deg}
        x1="12"
        y1="1"
        x2="12"
        y2="3.5"
        stroke="#f59e0b"
        strokeWidth="2"
        strokeLinecap="round"
        transform={`rotate(${deg} 12 12)`}
      />
    ))}
  </svg>
);

const CloudIcon = ({ size, color, opacity }: { size: number; color: string; opacity: number }) => (
  <svg width={size} height={size * 0.55} viewBox="0 0 100 55" fill={color} opacity={opacity}>
    <ellipse cx="40" cy="38" rx="32" ry="16" />
    <ellipse cx="60" cy="32" rx="26" ry="18" />
    <ellipse cx="50" cy="28" rx="22" ry="14" />
  </svg>
);

const RainIcon = () => (
  <svg width="16" height="24" viewBox="0 0 16 24" fill="#0ea5e9" className="drop-shadow-md">
    <rect x="2" y="4" width="3" height="11" rx="1.5" opacity="0.85" />
    <rect x="7.5" y="2" width="3" height="13" rx="1.5" opacity="0.75" />
    <rect x="12" y="5" width="3" height="11" rx="1.5" opacity="0.65" />
  </svg>
);

const SnowIcon = () => (
  <svg width="14" height="24" viewBox="0 0 14 24" fill="#bae6fd" className="drop-shadow-md">
    {[0, 1, 2].map((i) => (
      <circle key={i} cx={3 + i * 5} cy={4 + i * 7} r="2.5" opacity={0.9} />
    ))}
  </svg>
);

const ThunderIcon = () => (
  <svg width="22" height="28" viewBox="0 0 24 28" className="drop-shadow-lg" fill="#fef08a" stroke="#ca8a04" strokeWidth="0.5">
    <polygon points="14,1 4,16 11,16 9,27 21,11 13,11 16,1" />
  </svg>
);

const SingleHourCard = ({ h, isSelected, onSelect }: { h: HourData; isSelected: boolean; onSelect?: () => void }) => {
  const c = cloudStyle(h.cloudCover);
  const snowing = isSnow(h.weatherCode);
  const raining = isRain(h.weatherCode) || h.precipitation > 0.3;
  const thunder = isThunder(h.weatherCode);
  const sunny = h.cloudCover <= 35 && !raining && !thunder;

  return (
    <button
      onClick={onSelect}
      className={
        "flex flex-col items-center gap-1.5 p-2.5 rounded-xl border-2 min-w-[72px] transition-all duration-200 " +
        (isSelected
          ? "bg-white border-red-500 shadow-lg scale-105"
          : "bg-white/80 border-gray-300 hover:bg-white hover:border-gray-400 shadow-sm")
      }
    >
      <span className={`text-sm font-extrabold ${isSelected ? "text-red-600" : "text-gray-900"}`}>
        {String(h.time.getHours()).padStart(2, "0")}:00
      </span>

      <div className="relative w-14 h-14 flex items-center justify-center">
        {sunny && (
          <div className="absolute animate-spin-slow drop-shadow-lg">
            <SunIcon />
          </div>
        )}
        {thunder && (
          <div className="absolute animate-flash">
            <ThunderIcon />
          </div>
        )}
        {h.cloudCover > 15 && !thunder && (
          <div className="absolute animate-float" style={{ animationDelay: `${(h.time.getHours() % 6) * 0.3}s` }}>
            <CloudIcon size={c.size} color={c.color} opacity={c.opacity} />
          </div>
        )}
        {raining && !snowing && (
          <div className="absolute animate-rain" style={{ animationDelay: `${h.time.getHours() * 0.05}s` }}>
            <RainIcon />
          </div>
        )}
        {snowing && (
          <div className="absolute animate-snow" style={{ animationDelay: `${h.time.getHours() * 0.02}s` }}>
            <SnowIcon />
          </div>
        )}
        <span className={`absolute bottom-0 right-0 text-xs font-black drop-shadow-md ${isSelected ? "text-red-600" : "text-gray-900"}`}>
          {Math.round(h.temperature)}°
        </span>
      </div>

      <span className={`text-sm font-black ${isSelected ? "text-red-600" : "text-gray-900"}`}>
        {Math.round(h.temperature)}°
      </span>

      <div className="w-full h-2 rounded-full bg-gray-300 overflow-hidden shadow-inner">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${Math.min(100, (h.windSpeed / 42) * 100)}%`,
            background: windColor(h.windSpeed),
          }}
        />
      </div>
      <span className={`text-xs font-semibold ${isSelected ? "text-red-600" : "text-gray-700"}`}>
        {Math.round(h.windSpeed)} km/h
      </span>
    </button>
  );
};

export const DayForecastPopup = ({ data, dayLabel, onClose, selectedHour, onHourSelect }: DayForecastPopupProps) => {
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    const t = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  // Scroll all'ora selezionata
  useEffect(() => {
    if (!visible || !scrollRef.current || selectedHour === undefined) return;
    const container = scrollRef.current;
    const selectedEl = container.querySelector(`[data-hour="${selectedHour}"]`);
    if (selectedEl) {
      const offset = (selectedEl as HTMLElement).offsetLeft - container.offsetLeft - container.clientWidth / 2 + (selectedEl as HTMLElement).clientWidth / 2;
      container.scrollTo({ left: offset, behavior: "smooth" });
    }
  }, [visible, selectedHour]);

  if (!mounted) return null;

  return (
    <div className="transition-all duration-300 ease-in-out overflow-hidden mb-4"
      style={{
        maxHeight: visible ? "600px" : "0px",
        opacity: visible ? 1 : 0,
      }}
    >
      <div className="bg-white/90 rounded-2xl border-2 border-gray-400 shadow-xl p-4 relative">
        <div className="flex justify-between items-center mb-3">
          <h4 className="text-base font-extrabold text-gray-900 drop-shadow-sm">
            📅 Evoluzione giornata — {dayLabel}
          </h4>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-red-100 hover:bg-red-200 border border-red-300 flex items-center justify-center text-sm font-bold text-red-700 transition-colors"
          >
            ✕
          </button>
        </div>

        <div ref={scrollRef} className="overflow-x-auto pb-2 scroll-smooth">
          <div className="flex gap-2.5 min-w-max">
            {data.map((h) => (
              <div key={h.time.getHours()} data-hour={h.time.getHours()}>
                <SingleHourCard
                  h={h}
                  isSelected={h.time.getHours() === selectedHour}
                  onSelect={() => onHourSelect?.(h.time.getHours())}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-3 mt-3 text-xs text-gray-600 justify-center font-semibold">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-amber-400 border border-amber-600 shadow-sm" /> Sole
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-2 rounded-full bg-gray-500 border border-gray-600 shadow-sm" /> Nuvola
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-3 rounded-full bg-sky-500 border border-sky-600 shadow-sm" /> Pioggia
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-200 border border-sky-400 shadow-sm" /> Neve
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-1.5 rounded bg-orange-500 border border-orange-600 shadow-sm" /> Vento
          </span>
          <span className="flex items-center gap-1.5">
            <span className="text-sm">⚡</span> Temporale
          </span>
        </div>

        <div className="mt-2 text-center text-[10px] text-gray-500 italic leading-tight font-medium">
          Clicca su un&apos;ora per spostare la barra • Le nuvole fluttuano, pioggia e neve scendono
        </div>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-5px); }
        }
        @keyframes rain {
          0%, 100% { transform: translateY(0px); opacity: 0.9; }
          50% { transform: translateY(8px); opacity: 0.5; }
        }
        @keyframes snow {
          0% { transform: translateY(-6px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(16px) rotate(360deg); opacity: 0.4; }
        }
        @keyframes spin-slow {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes flash {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          10% { opacity: 1; transform: scale(1.15); }
          20% { opacity: 0.3; transform: scale(1); }
          45% { opacity: 0.3; }
          55% { opacity: 1; transform: scale(1.1); }
          65% { opacity: 0.3; }
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