"use client";

import React from "react";
import type { HourData } from "@/types/meteo";
import type { MeteoDaily } from "@/services/openMeteoService";
import { CloudRain, Wind, Thermometer, Sun, Droplets, Mountain } from "lucide-react";

interface PrevisioniGiornaliereProps {
  enrichedDaily: MeteoDaily[];
  dateLabels: string[];
  currentData: HourData | null;
  dayData: HourData[];
  site: { name: string; altitude: number; exposure: string };
  selectedDay: number;
  onSelectDay: (dayIdx: number) => void;
  nomeDecollo?: string;
}

function getWeatherEmoji(code: number): string {
  if (code >= 95) return "⛈️";
  if (code >= 80) return "🌧️";
  if (code >= 71) return "❄️";
  if (code >= 61) return "🌧️";
  if (code >= 51) return "🌦️";
  if (code >= 45) return "🌫️";
  if (code >= 20) return "☁️";
  if (code >= 10) return "⛅";
  if (code >= 5) return "🌤️";
  return "☀️";
}

function getWeatherDesc(code: number): string {
  if (code >= 95) return "雷暴";
  if (code >= 80) return "阵雨";
  if (code >= 71) return "雪";
  if (code >= 61) return "雨";
  if (code >= 51) return "毛毛雨";
  if (code >= 45) return "雾";
  if (code >= 30) return "阴天";
  if (code >= 20) return "多云";
  if (code >= 10) return "多变";
  if (code >= 5) return "少云";
  return "晴朗";
}

export default function PrevisioniGiornaliere({
  enrichedDaily,
  dateLabels,
  selectedDay,
  onSelectDay,
  nomeDecollo,
  site,
}: PrevisioniGiornaliereProps) {
  const tabs = ["今天", "明天", "后天"];

  return (
    <div className="space-y-3">
      {/* 头部 */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-sky-500/20 to-violet-500/20 border border-sky-500/30 flex items-center justify-center">
            <Sun className="w-4 h-4 text-sky-400" />
          </div>
          <div>
            <h3 className="text-sm font-black text-white">3天预报</h3>
            <p className="text-[10px] text-slate-500 font-medium">选择日期查看详情</p>
          </div>
        </div>
        {nomeDecollo && (
          <span className="text-xs text-slate-500 font-semibold bg-slate-800/60 px-2.5 py-1 rounded-full">
            {nomeDecollo}
          </span>
        )}
      </div>

      {/* 卡片 */}
      <div className="grid grid-cols-3 gap-3">
        {tabs.map((tabName, idx) => {
          const daily = enrichedDaily[idx];
          const isActive = selectedDay === idx;
          const label = dateLabels[idx] || tabName;
          const isRainy = daily && daily.precipitationSum > 0.5;
          const freezingLevel = daily?.freezingLevel ?? null;
          const trend = daily?.trend;

          return (
            <button
              key={idx}
              onClick={() => onSelectDay(idx)}
              className={`relative overflow-hidden transition-all duration-300 rounded-2xl p-4 text-left cursor-pointer border-2 group ${
                isActive
                  ? "border-emerald-400 bg-emerald-950/50 shadow-lg shadow-emerald-900/30 scale-[1.02]"
                  : isRainy
                  ? "border-rose-500/30 bg-rose-950/30 hover:border-rose-500/60 hover:bg-rose-950/40"
                  : "border-slate-700/50 bg-slate-800/50 hover:border-slate-600 hover:bg-slate-800/70"
              }`}
            >
              {/* 背景装饰 */}
              <div className={`absolute inset-0 opacity-5 ${
                isActive ? "bg-emerald-500" : isRainy ? "bg-rose-500" : "bg-slate-400"
              }`} />

              <div className="relative">
                {/* 顶部：表情符号 + 趋势 */}
                <div className="flex items-center justify-between mb-2">
                  <span className="text-3xl drop-shadow-lg">{daily ? getWeatherEmoji(daily.weatherCode) : "☀️"}</span>
                  {trend && (
                    <span className={`text-sm font-black ${
                      trend === "↑" ? "text-orange-400" : trend === "↓" ? "text-sky-400" : "text-slate-500"
                    }`}>
                      {trend === "↑" ? "↑ 升温" : trend === "↓" ? "↓ 降温" : "→ 稳定"}
                    </span>
                  )}
                </div>

                {/* 日期名称 */}
                <div className="font-black text-white text-base mb-0.5">{tabName}</div>
                <div className="text-xs text-slate-500 font-medium mb-3">{label}</div>

                {daily && (
                  <>
                    {/* 温度 */}
                    <div className="flex items-baseline gap-1 mb-2">
                      <span className="text-2xl font-black text-amber-300">{Math.round(daily.temperatureMax)}°</span>
                      <span className="text-xs text-slate-600 font-medium">/</span>
                      <span className="text-lg font-bold text-sky-300">{Math.round(daily.temperatureMin)}°</span>
                    </div>

                    {/* 天气描述 */}
                    <div className="text-xs text-slate-400 font-semibold mb-3">
                      {getWeatherDesc(daily.weatherCode)}
                    </div>

                    {/* 指标网格 */}
                    <div className="space-y-1.5 pt-2 border-t border-white/5">
                      {/* 风 */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Wind className="w-3.5 h-3.5 text-sky-400" />
                          <span className="text-xs text-slate-500 font-medium">最大风速</span>
                        </div>
                        <span className="text-xs font-black text-sky-300">{Math.round(daily.windSpeedMax)} km/h</span>
                      </div>

                      {/* 降雨 */}
                      {daily.precipitationSum > 0 && (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <CloudRain className="w-3.5 h-3.5 text-rose-400" />
                            <span className="text-xs text-slate-500 font-medium">降雨</span>
                          </div>
                          <span className="text-xs font-black text-rose-300">{daily.precipitationSum.toFixed(1)} mm</span>
                        </div>
                      )}

                      {/* 零度层 */}
                      {freezingLevel && (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <Thermometer className="w-3.5 h-3.5 text-violet-400" />
                            <span className="text-xs text-slate-500 font-medium">0°C</span>
                          </div>
                          <span className="text-xs font-black text-violet-300">{freezingLevel}m</span>
                        </div>
                      )}

                      {/* UV */}
                      {daily.uvIndexMax != null && (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <Sun className="w-3.5 h-3.5 text-amber-400" />
                            <span className="text-xs text-slate-500 font-medium">UV指数</span>
                          </div>
                          <span className="text-xs font-black text-amber-300">{Math.round(daily.uvIndexMax)}</span>
                        </div>
                      )}

                      {/* 日照时间 */}
                      {daily.sunshineDuration != null && daily.sunshineDuration > 0 && (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <Sun className="w-3.5 h-3.5 text-amber-400" />
                            <span className="text-xs text-slate-500 font-medium">日照时数</span>
                          </div>
                          <span className="text-xs font-black text-amber-300">{(daily.sunshineDuration / 3600).toFixed(1)}h</span>
                        </div>
                      )}
                    </div>

                    {/* 飞行员提示 */}
                    <div className={`mt-3 pt-2 border-t border-white/5 text-[10px] font-semibold leading-relaxed ${
                      isRainy ? "text-rose-400/80" :
                      daily.windSpeedMax > 20 ? "text-orange-400/80" :
                      (daily.uvIndexMax ?? 0) > 6 ? "text-amber-400/80" :
                      "text-emerald-400/70"
                    }`}>
                      {isRainy ? "⚠️ 可能降雨 — 谨慎决策" :
                       daily.windSpeedMax > 25 ? "💨 大风预测 — 仅专家" :
                       daily.windSpeedMax > 18 ? "🌬️ 中风 — 注意阵风" :
                       (daily.uvIndexMax ?? 0) > 6 ? "☀️ 高UV — 注意防晒" :
                       daily.windSpeedMax <= 10 && daily.precipitationSum <= 0.2 ? "✅ 条件理想 — 适合飞行" :
                       "🪂 条件总体良好"}
                    </div>
                  </>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
