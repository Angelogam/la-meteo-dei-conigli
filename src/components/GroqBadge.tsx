"use client";

import { CheckCircle, AlertTriangle, XCircle, Loader2, Brain } from "lucide-react";
import { GroqResult } from "@/hooks/useGroqValidation";

interface GroqBadgeProps {
  result: GroqResult | null;
  loading?: boolean;
  error?: string | null;
}

const GIUDIZIO_STYLE: Record<GroqResult["giudizio"], { bg: string; text: string; border: string; icon: any }> = {
  Ottimo:       { bg: "bg-emerald-900/40", text: "text-emerald-300", border: "border-emerald-500/50", icon: CheckCircle },
  Buono:        { bg: "bg-lime-900/40",    text: "text-lime-300",    border: "border-lime-500/50",    icon: CheckCircle },
  Discreto:     { bg: "bg-amber-900/40",   text: "text-amber-300",   border: "border-amber-500/50",   icon: AlertTriangle },
  Rischioso:    { bg: "bg-orange-900/40",  text: "text-orange-300",  border: "border-orange-500/50",  icon: AlertTriangle },
  "Non volabile": { bg: "bg-red-900/40",    text: "text-red-300",     border: "border-red-500/50",     icon: XCircle },
};

export default function GroqBadge({ result, loading, error }: GroqBadgeProps) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800/50 border border-slate-700/40">
        <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
        <span className="text-xs text-slate-400">Validazione AI...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-900/20 border border-red-500/30">
        <XCircle className="w-4 h-4 text-red-400" />
        <span className="text-xs text-red-300">AI non disponibile</span>
      </div>
    );
  }

  if (!result) return null;

  const style = GIUDIZIO_STYLE[result.giudizio] || GIUDIZIO_STYLE["Non volabile"];
  const Icon = style.icon;

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${style.bg} ${style.border}`}>
      <Brain className={`w-4 h-4 ${style.text}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <Icon className={`w-3.5 h-3.5 ${style.text}`} />
          <span className={`text-sm font-bold ${style.text}`}>{result.giudizio}</span>
          <span className={`text-xs font-mono ${style.text}`}>{result.score}/100</span>
        </div>
        <p className="text-[10px] text-slate-400 mt-0.5 truncate">{result.alert}</p>
      </div>
      <div className="text-right text-[10px] text-slate-500">
        <div>Finestra: {result.finestra_volo}</div>
        <div>Max: {result.quota_max_consigliata}m</div>
      </div>
    </div>
  );
}