"use client";

import React, { useMemo } from "react";
import type { HourData } from "@/types/meteo";
import { Wind, Thermometer, CloudRain, CloudSun, ArrowUpRight, AlertTriangle, CheckCircle, XCircle, Zap, Droplets, Eye, Sunrise, Sunset, Mountain } from "lucide-react";
import { calcolaTermiche } from "@/utils/termiche";

interface VoloDecisionCardProps {
  dayData: HourData[];
  selectedHour: number;
  altitude: number;
  siteName?: string;
}

// ─── 工具函数 ────────────────────────────────────────────────────────────────
function ventoTesto(speed: number): string {
  if (speed < 3) return "静风";
  if (speed < 8) return "微风";
  if (speed < 15) return "和风";
  if (speed < 22) return "清风";
  if (speed < 30) return "强风";
  return "危险";
}

function direzioneVento(deg: number): string {
  const dirs = ["北", "东北", "东", "东南", "南", "西南", "西", "西北"];
  return dirs[Math.round(deg / 45) % 8];
}

function termicheTesto(rateo: number): string {
  if (rateo >= 3) return "极佳 🔥";
  if (rateo >= 2) return "良好 🪂";
  if (rateo >= 1) return "中等 🌤️";
  if (rateo >= 0.3) return "微弱 🌥️";
  return "无 ❄️";
}

function liftedIndexTesto(li: number): string {
  if (li < -5) return "极不稳定 — 热气流强但湍流大";
  if (li < -2) return "不稳定 — 动力热力混合条件";
  if (li < 0) return "中性 — 条件多变";
  if (li < 3) return "稳定 — 适合巡航飞行";
  return "极稳定 — 热气流微弱";
}

// ─── 组件定义 ─────────────────────────────────────────────────────────────
export default function VoloDecisionCard({ dayData, selectedHour, altitude, siteName }: VoloDecisionCardProps) {
  if (!dayData || dayData.length === 0) {
    return (
      <div className="bg-slate-900/80 border border-slate-700/50 rounded-3xl p-8 text-center">
        <div className="w-10 h-10 rounded-full border-2 border-sky-500/20 border-t-sky-400 animate-spin mx-auto mb-3" />
        <p className="text-sm text-sky-300 font-semibold">加载气象数据中…</p>
      </div>
    );
  }

  // ── 计算 ──────────────────────────────────────────────────────────────
  const current = dayData[selectedHour] || dayData[0];
  const currentThermal = calcolaTermiche(current as any, altitude);

  const ventoMedia = dayData.slice(selectedHour, Math.min(selectedHour + 3, dayData.length)).reduce((s: number, h: any) => s + (h.windSpeed || 0), 0) / Math.min(3, dayData.length - selectedHour);
  const rafficheMedia = dayData.slice(selectedHour, Math.min(selectedHour + 3, dayData.length)).reduce((s: number, h: any) => s + (h.windGusts || 0), 0) / Math.min(3, dayData.length - selectedHour);
  const spreadVento = rafficheMedia - ventoMedia;

  const pioggiaProb = dayData.slice(selectedHour, Math.min(selectedHour + 6, dayData.length)).filter((h: any) => h.precipitation > 0.3).length / Math.min(6, dayData.length - selectedHour) * 100;
  const liftedIndex = current.liftedIndex || 0;
  const cape = current.cape || 0;
  const baseNuvole = current.dewPoint != null && current.temperature != null
    ? Math.round((current.temperature - current.dewPoint) * 125)
    : 0;

  const ventoPericoloso = ventoMedia > 25;
  const raffichePericolose = spreadVento > 15;
  const temporaliProbabili = pioggiaProb > 50 || (current.weatherCode >= 95 && current.weatherCode <= 99);
  const instabile = liftedIndex < -3;

  // 飞行评分
  let voto = 10;
  let votoLabel = "极佳";
  let votoColor = "emerald";
  if (temporaliProbabili) { voto = 0; votoLabel = "雷暴"; votoColor = "red"; }
  else if (ventoPericoloso && spreadVento > 10) { voto = 1; votoLabel = "危险"; votoColor = "red"; }
  else if (pioggiaProb > 60) { voto = 2; votoLabel = "降雨可能"; votoColor = "red"; }
  else if (ventoMedia > 25) { voto = 3; votoLabel = "大风"; votoColor = "red"; }
  else if (ventoMedia > 18 || spreadVento > 10) { voto = 4; votoLabel = "注意"; votoColor = "orange"; }
  else if (pioggiaProb > 30 || instabile) { voto = 5; votoLabel = "一般"; votoColor = "amber"; }
  else if (currentThermal.rateo < 0.3) { voto = 6; votoLabel = "无热气流"; votoColor = "amber"; }
  else if (currentThermal.rateo < 1) { voto = 7; votoLabel = "较弱"; votoColor = "yellow"; }
  else if (currentThermal.rateo < 1.5) { voto = 8; votoLabel = "良好"; votoColor = "lime"; }
  else if (currentThermal.rateo < 2.5) { voto = 9; votoLabel = "优秀"; votoColor = "emerald"; }
  else { voto = 10; votoLabel = "极佳"; votoColor = "emerald"; }

  // 飞行窗口
  const oreVolo = dayData.filter((h: any) => {
    const ora = new Date(h.time).getHours();
    return ora >= 9 && ora <= 18 && h.windSpeed < 25 && h.precipitation < 0.5;
  });
  let finestraInizio = 9, finestraFine = 18;
  if (oreVolo.length > 0) {
    finestraInizio = oreVolo[0].time.getHours();
    finestraFine = oreVolo[oreVolo.length - 1].time.getHours();
  }
  const oreFavorevoli = finestraFine - finestraInizio;

  // 警报
  const alerte: { tipo: string; testo: string; icona: React.ReactNode; colore: string }[] = [];
  if (temporaliProbabili) alerte.push({ tipo: "pericolo", testo: "雷暴可能 — 避免飞行", icona: <Zap className="w-4 h-4" />, colore: "purple" });
  if (ventoPericoloso) alerte.push({ tipo: "pericolo", testo: `地面风速${Math.round(ventoMedia)} km/h — 无法起飞`, icona: <Wind className="w-4 h-4" />, colore: "red" });
  if (raffichePericolose) alerte.push({ tipo: "pericolo", testo: `阵风+${Math.round(spreadVento)} km/h — 有塌翼风险`, icona: <Wind className="w-4 h-4" />, colore: "orange" });
  if (instabile) alerte.push({ tipo: "attenzione", testo: "大气不稳定 — 热气流强但湍流大", icona: <Thermometer className="w-4 h-4" />, colore: "amber" });
  if (baseNuvole < 800) alerte.push({ tipo: "attenzione", testo: "云底极低 — 起飞时可能有雾", icona: <CloudRain className="w-4 h-4" />, colore: "amber" });
  if (cape < 50) alerte.push({ tipo: "info", testo: "CAPE值低 — 热气流弱，建议滑翔", icona: <ArrowUpRight className="w-4 h-4" />, colore: "sky" });
  if (liftedIndex > 3) alerte.push({ tipo: "info", testo: "大气极稳定 — 无热气流，仅滑翔", icona: <Thermometer className="w-4 h-4" />, colore: "sky" });

  // ── 渲染 ───────────────────────────────────────────────────────────────
  const votoColors: Record<string, { bg: string; border: string; text: string; sub: string; glow: string }> = {
    red: { bg: "from-red-950/60 to-red-900/30", border: "border-red-500/50", text: "text-red-300", sub: "text-red-400/60", glow: "shadow-red-900/40" },
    orange: { bg: "from-orange-950/60 to-orange-900/30", border: "border-orange-500/50", text: "text-orange-300", sub: "text-orange-400/60", glow: "shadow-orange-900/40" },
    amber: { bg: "from-amber-950/60 to-amber-900/30", border: "border-amber-500/50", text: "text-amber-300", sub: "text-amber-400/60", glow: "shadow-amber-900/40" },
    yellow: { bg: "from-yellow-950/60 to-yellow-900/30", border: "border-yellow-500/50", text: "text-yellow-300", sub: "text-yellow-400/60", glow: "shadow-yellow-900/40" },
    lime: { bg: "from-lime-950/60 to-lime-900/30", border: "border-lime-500/50", text: "text-lime-300", sub: "text-lime-400/60", glow: "shadow-lime-900/40" },
    emerald: { bg: "from-emerald-950/60 to-emerald-900/30", border: "border-emerald-500/50", text: "text-emerald-300", sub: "text-emerald-400/60", glow: "shadow-emerald-900/40" },
  };
  const vc = votoColors[votoColor];

  return (
    <div className={`bg-gradient-to-br ${vc.bg} border ${vc.border} rounded-3xl overflow-hidden shadow-xl ${vc.glow}`}>

      {/* ═══ 头部 ═══ */}
      <div className="px-6 py-4 border-b border-white/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${vc.bg} border ${vc.border} flex items-center justify-center`}>
              {voto >= 7 ? <CheckCircle className="w-5 h-5 text-emerald-400" /> :
               voto >= 4 ? <AlertTriangle className="w-5 h-5 text-amber-400" /> :
               <XCircle className="w-5 h-5 text-red-400" />}
            </div>
            <div>
              <div className={`text-sm font-black ${vc.text}`}>{votoLabel}</div>
              <div className="text-xs text-slate-500 font-medium">
                {siteName && <span className="text-emerald-400/70">{siteName} · </span>}
                飞行评分 {voto}/10
              </div>
            </div>
          </div>
          {/* 飞行窗口徽章 */}
          <div className="text-right">
            <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">飞行窗口</div>
            <div className="flex items-center gap-1 mt-1">
              <span className="text-lg font-black text-white">{String(finestraInizio).padStart(2, "0")}:00</span>
              <span className="text-slate-600">→</span>
              <span className="text-lg font-black text-white">{String(finestraFine).padStart(2, "0")}:00</span>
            </div>
            <div className="text-xs text-sky-400 font-bold">{oreFavorevoli}小时适宜</div>
          </div>
        </div>
      </div>

      {/* ═══ 巨大评分 ═══ */}
      <div className="px-6 py-5 border-b border-white/5">
        <div className="flex items-end gap-4">
          <div>
            <div className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-1">飞行评分</div>
            <div className={`text-7xl font-black tabular-nums ${vc.text} leading-none`}>
              {voto}
              <span className="text-2xl text-slate-600 font-bold ml-1">/10</span>
            </div>
          </div>
          <div className="flex-1 mb-2">
            <div className={`text-lg font-black ${vc.text}`}>{votoLabel}</div>
            <div className="text-sm text-slate-400 mt-0.5">
              {voto >= 8 ? "飞行条件理想" :
               voto >= 6 ? "条件可接受，需谨慎" :
               voto >= 4 ? "条件临界 — 仅专家" :
               "禁止起飞 — 条件危险"}
            </div>
          </div>
        </div>
        {/* 进度条 */}
        <div className="mt-4 h-2 bg-slate-800/80 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              voto >= 8 ? "bg-emerald-500" :
              voto >= 6 ? "bg-lime-500" :
              voto >= 4 ? "bg-amber-500" :
              "bg-red-500"
            }`}
            style={{ width: `${voto * 10}%` }}
          />
        </div>
      </div>

      {/* ═══ 条件网格 ═══ */}
      <div className="px-6 py-4 grid grid-cols-2 md:grid-cols-4 gap-3">

        {/* 风 */}
        <div className="bg-slate-900/60 border border-slate-700/40 rounded-2xl p-4 hover:border-sky-500/40 transition-colors">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-xl bg-sky-500/20 border border-sky-500/30 flex items-center justify-center">
              <Wind className="w-4 h-4 text-sky-400" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">地面风</div>
              <div className="text-[10px] text-slate-600">起飞辅助</div>
            </div>
          </div>
          <div className="flex items-baseline gap-1">
            <span className={`text-3xl font-black tabular-nums ${ventoMedia > 20 ? "text-red-400" : ventoMedia > 12 ? "text-amber-400" : "text-sky-300"}`}>
              {Math.round(ventoMedia)}
            </span>
            <span className="text-sm text-slate-500 font-semibold">km/h</span>
          </div>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-xs font-bold text-slate-400">{current.windDir !== null ? `${direzioneVento(current.windDir)}°` : "N/D"}</span>
            <span className="text-xs text-slate-600">·</span>
            <span className={`text-xs font-bold ${ventoMedia > 20 ? "text-red-400" : ventoMedia > 12 ? "text-amber-400" : "text-emerald-400"}`}>
              {ventoTesto(ventoMedia)}
            </span>
          </div>
          {spreadVento > 8 && (
            <div className="mt-2 text-xs text-rose-400 font-semibold">
              🌪️ 阵风：+{Math.round(spreadVento)} km/h
            </div>
          )}
          <div className="mt-2 text-[10px] text-slate-600">
            {ventoMedia < 5 ? "平静 — 降落轻柔" :
             ventoMedia < 12 ? "理想 — 适合初学者" :
             ventoMedia < 20 ? "中等 — 建议有经验" :
             "危险 — 禁止起飞"}
          </div>
        </div>

        {/* 热气流 */}
        <div className="bg-slate-900/60 border border-slate-700/40 rounded-2xl p-4 hover:border-violet-500/40 transition-colors">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4 text-violet-400" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">热气流</div>
              <div className="text-[10px] text-slate-600">平均上升率</div>
            </div>
          </div>
          <div className="flex items-baseline gap-1">
            <span className={`text-3xl font-black tabular-nums ${currentThermal.rateo >= 2 ? "text-violet-300" : currentThermal.rateo >= 1 ? "text-sky-300" : "text-slate-400"}`}>
              ↑{currentThermal.rateo.toFixed(1)}
            </span>
            <span className="text-sm text-slate-500 font-semibold">m/s</span>
          </div>
          <div className={`text-xs font-bold mt-1.5 ${currentThermal.rateo >= 2 ? "text-violet-400" : currentThermal.rateo >= 1 ? "text-sky-400" : "text-slate-500"}`}>
            {termicheTesto(currentThermal.rateo)}
          </div>
          {cape > 0 && (
            <div className="mt-2 flex items-center gap-1.5">
              <Zap className={`w-3 h-3 ${cape > 200 ? "text-amber-400" : "text-slate-500"}`} />
              <span className="text-xs text-slate-500">CAPE: <span className={`font-bold ${cape > 200 ? "text-amber-400" : "text-slate-400"}`}>{Math.round(cape)}</span> J/kg</span>
            </div>
          )}
          <div className="mt-1.5 text-[10px] text-slate-600">
            {currentThermal.rateo >= 2 ? "适合长距离飞行" :
             currentThermal.rateo >= 1 ? "适合本地飞行" :
             currentThermal.rateo >= 0.3 ? "较弱 — 建议滑翔" :
             "无热气流 — 仅滑翔起飞"}
          </div>
        </div>

        {/* 稳定性 */}
        <div className="bg-slate-900/60 border border-slate-700/40 rounded-2xl p-4 hover:border-rose-500/40 transition-colors">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center">
              <Thermometer className="w-4 h-4 text-rose-400" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">稳定性</div>
              <div className="text-[10px] text-slate-600"> lifted Index</div>
            </div>
          </div>
          <div className="flex items-baseline gap-1">
            <span className={`text-3xl font-black tabular-nums ${liftedIndex < -2 ? "text-rose-400" : liftedIndex < 0 ? "text-amber-400" : "text-emerald-400"}`}>
              {liftedIndex > 0 ? "+" : ""}{Math.round(liftedIndex)}
            </span>
            <span className="text-sm text-slate-500 font-semibold">°C</span>
          </div>
          <div className={`text-xs font-bold mt-1.5 ${liftedIndex < -2 ? "text-rose-400" : liftedIndex < 0 ? "text-amber-400" : "text-emerald-400"}`}>
            {liftedIndex < -2 ? "不稳定 ⚠️" : liftedIndex < 0 ? "中性" : "稳定 ✓"}
          </div>
          <div className="mt-2 text-[10px] text-slate-500 leading-relaxed">
            {liftedIndexTesto(liftedIndex)}
          </div>
        </div>

        {/* 云底 */}
        <div className="bg-slate-900/60 border border-slate-700/40 rounded-2xl p-4 hover:border-sky-500/40 transition-colors">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-xl bg-sky-500/20 border border-sky-500/30 flex items-center justify-center">
              <Mountain className="w-4 h-4 text-sky-400" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">云底高度</div>
              <div className="text-[10px] text-slate-600">云层起始高度</div>
            </div>
          </div>
          <div className="flex items-baseline gap-1">
            <span className={`text-3xl font-black tabular-nums ${baseNuvole > 2500 ? "text-emerald-400" : baseNuvole > 1500 ? "text-sky-400" : "text-amber-400"}`}>
              {baseNuvole > 0 ? Math.round(baseNuvole / 100) * 100 : "--"}
            </span>
            <span className="text-sm text-slate-500 font-semibold">m</span>
          </div>
          <div className="mt-1.5 text-xs font-bold text-slate-400">
            {baseNuvole > 2500 ? "高 — 最佳飞行高度 🪂" :
             baseNuvole > 1500 ? "良好高度" :
             baseNuvole > 800 ? "较低 — 需注意" :
             "极低 — 可能有雾"}
          </div>
          <div className="mt-1.5 text-[10px] text-slate-600">
            露点差: {current.temperature != null && current.dewPoint != null ? Math.round(current.temperature - current.dewPoint) : "--"}°C
          </div>
        </div>

      </div>

      {/* ═══ 附加参数 ═══ */}
      <div className="px-6 pb-4 grid grid-cols-2 md:grid-cols-4 gap-3">

        {/* 湿度 */}
        <div className="bg-slate-900/40 border border-slate-700/30 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-2">
            <Droplets className="w-4 h-4 text-sky-400" />
            <span className="text-xs font-bold text-slate-400">湿度</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-black text-sky-300">{current.humidity ?? "--"}</span>
            <span className="text-xs text-slate-500">%</span>
          </div>
          <div className="mt-1.5 h-1 bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-sky-500/60 rounded-full" style={{ width: `${current.humidity ?? 0}%` }} />
          </div>
          <div className="mt-1 text-[10px] text-slate-600">
            {(current.humidity ?? 0) > 80 ? "空气潮湿 — 积云发展" :
             (current.humidity ?? 0) > 60 ? "中等湿度" :
             "空气干燥 — 热气流稳定"}
          </div>
        </div>

        {/* 能见度 */}
        <div className="bg-slate-900/40 border border-slate-700/30 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-2">
            <Eye className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold text-slate-400">能见度</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-black text-emerald-300">{current.visibility ? Math.round(current.visibility / 1000) : "--"}</span>
            <span className="text-xs text-slate-500">km</span>
          </div>
          <div className="mt-1.5 h-1 bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500/60 rounded-full" style={{ width: `${Math.min(100, (current.visibility ?? 10000) / 10000 * 100)}%` }} />
          </div>
          <div className="mt-1 text-[10px] text-slate-600">
            {(current.visibility ?? 10000) > 10000 ? "极佳 — 导航安全" :
             (current.visibility ?? 10000) > 5000 ? "良好能见度" :
             "能见度较低 — 注意"}
          </div>
        </div>

        {/* 温度 */}
        <div className="bg-slate-900/40 border border-slate-700/30 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-2">
            <Thermometer className="w-4 h-4 text-rose-400" />
            <span className="text-xs font-bold text-slate-400">温度</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-black text-rose-300">{Math.round(current.temperature ?? 0)}</span>
            <span className="text-xs text-slate-500">°C</span>
          </div>
          <div className="mt-1 text-[10px] text-slate-600">
            体感: <span className="text-slate-400 font-semibold">{Math.round(current.apparentTemp ?? current.temperature ?? 0)}°C</span>
          </div>
          <div className="mt-0.5 text-[10px] text-slate-600">
            温差: <span className="text-slate-400 font-semibold">{Math.round((current.temperature ?? 0) - (current.dewPoint ?? (current.temperature ?? 18) - 8))}°C</span>
          </div>
        </div>

        {/* 降雨 */}
        <div className="bg-slate-900/40 border border-slate-700/30 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-2">
            <CloudRain className="w-4 h-4 text-sky-400" />
            <span className="text-xs font-bold text-slate-400">降雨概率(6h)</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className={`text-xl font-black ${pioggiaProb > 50 ? "text-rose-400" : pioggiaProb > 20 ? "text-amber-400" : "text-emerald-400"}`}>
              {Math.round(pioggiaProb)}%
            </span>
          </div>
          <div className="mt-1.5 h-1 bg-slate-800 rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${pioggiaProb > 50 ? "bg-rose-500/60" : pioggiaProb > 20 ? "bg-amber-500/60" : "bg-emerald-500/60"}`} style={{ width: `${pioggiaProb}%` }} />
          </div>
          <div className="mt-1 text-[10px] text-slate-600">
            {pioggiaProb > 50 ? "可能降雨 — 不建议起飞" :
             pioggiaProb > 20 ? "可能有零星降雨" :
             " unlikely — 天空晴朗"}
          </div>
        </div>

      </div>

      {/* ═══ 警报 ═══ */}
      {alerte.length > 0 && (
        <div className="px-6 pb-4 space-y-2">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-black text-amber-400 uppercase tracking-wider">飞行员注意 ({alerte.length})</span>
          </div>
          {alerte.map((a, i) => (
            <div key={i} className={`flex items-center gap-3 p-3 rounded-xl border ${
              a.tipo === "pericolo" ? "bg-red-950/40 border-red-500/30" :
              a.tipo === "attenzione" ? "bg-amber-950/40 border-amber-500/30" :
              "bg-sky-950/30 border-sky-500/20"
            }`}>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                a.tipo === "pericolo" ? "bg-red-500/20 text-red-400" :
                a.tipo === "attenzione" ? "bg-amber-500/20 text-amber-400" :
                "bg-sky-500/20 text-sky-400"
              }`}>
                {a.icona}
              </div>
              <span className={`text-sm font-semibold ${
                a.tipo === "pericolo" ? "text-red-300" :
                a.tipo === "attenzione" ? "text-amber-300" :
                "text-sky-300"
              }`}>
                {a.testo}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ═══ 免责声明 ═══ */}
      <div className="px-6 pb-4">
        <div className="text-[10px] text-slate-600 text-center py-2 border-t border-white/5">
          ⚠️ 请始终在现场核实条件。本应用仅为辅助工具，不能替代飞行员的判断。
        </div>
      </div>
    </div>
  );
}
