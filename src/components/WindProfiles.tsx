import { Wind as WindIcon } from "lucide-react";
import type { WindProfile } from "@/types/meteo";
import { wd } from "@/utils/meteo";

interface WindProfilesProps {
  profiles: WindProfile[];
}

const WindProfiles = ({ profiles }: WindProfilesProps) => {
  if (!profiles.length) return null;

  // Prendi il profilo più vicino all'ora corrente
  const now = new Date();
  const closest = profiles.reduce((prev, curr) => {
    const diffPrev = Math.abs(prev.time.getTime() - now.getTime());
    const diffCurr = Math.abs(curr.time.getTime() - now.getTime());
    return diffCurr < diffPrev ? curr : prev;
  });

  const maxSpeed = Math.max(...closest.levels.map((l) => l.speed ?? 0), 1);

  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 p-4 md:p-6">
      <div className="flex items-center gap-2 text-white/60 text-sm mb-4">
        <WindIcon className="h-4 w-4" />
        <span className="font-medium">Profilo vento in quota</span>
        <span className="text-white/30 ml-auto">
          {closest.time.getHours()}:00
        </span>
      </div>

      <div className="space-y-2">
        {closest.levels
          .filter((l) => l.speed !== null)
          .map((l, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="text-xs text-white/40 w-10 text-right shrink-0">
                {l.height}m
              </span>
              <div className="flex-1 h-6 rounded-full bg-white/5 overflow-hidden relative">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-500/40 to-blue-400/60 transition-all"
                  style={{ width: `${((l.speed ?? 0) / maxSpeed) * 100}%` }}
                />
              </div>
              <span className="text-xs text-white/60 w-16 shrink-0">
                {Math.round(l.speed ?? 0)} km/h
              </span>
              <span className="text-xs text-white/40 w-8 shrink-0">
                {l.dir !== null ? wd(l.dir) : "—"}
              </span>
            </div>
          ))}
      </div>

      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-white/10 text-[10px] text-white/30">
        <span>Velocità raggruppata per quota</span>
        <span className="ml-auto">Max: {Math.round(maxSpeed)} km/h</span>
      </div>
    </div>
  );
};

export default WindProfiles;
