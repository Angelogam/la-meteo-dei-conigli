import React from "react";
import { Activity } from "lucide-react";

interface AnalisiApprofonditaCardProps {
  analisi: any;
  siteName?: string;
  dayData?: any[];
}

export default function AnalisiApprofonditaCard({ analisi, siteName, dayData }: AnalisiApprofonditaCardProps) {
  if (!analisi) return null;

  return (
    <div className="space-y-4">
      <div className="mt-2 flex items-center justify-end gap-1 text-[10px] text-slate-500">
        <Activity className="w-3 h-3" />
        <span>
          Confidenza: {Math.round(analisi.confidenza * 100)}%
          <span> · Pioggia: {analisi.oreTemporale > 0 ? `${analisi.oreTemporale}` : "0mm"}</span>
        </span>
      </div>
    </div>
  );
}