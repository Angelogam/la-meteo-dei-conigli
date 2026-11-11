import type { HourlyPoint } from "@/services/threeSourceWeather";

function lerpAngle(a: number | null | undefined, b: number | null | undefined, t: number): number | null {
  if (a == null && b == null) return null;
  if (a == null) return b as number;
  if (b == null) return a;
  const d = ((b - a + 540) % 360) - 180;
  return (a + d * t + 360) % 360;
}

/** Vento interpolato alla quota scelta (m s.l.m.) dal sounding a livelli di pressione. */
export function windAtAltitude(
  point: HourlyPoint | null,
  altM: number | null,
  surfaceWind: number | null,
  surfaceDir: number | null,
): { ws: number | null; wd: number | null } {
  if (!point) return { ws: null, wd: null };
  if (altM === null) return { ws: point.wind ?? surfaceWind, wd: point.dir ?? surfaceDir };
  const levels = (point.levels ?? []).slice().sort((a, b) => a.gh - b.gh);
  if (!levels.length) return { ws: point.wind ?? surfaceWind, wd: point.dir ?? surfaceDir };
  if (altM <= levels[0].gh) return { ws: levels[0].ws, wd: levels[0].wd ?? point.dir ?? surfaceDir };
  for (let i = 0; i < levels.length - 1; i++) {
    const a = levels[i];
    const b = levels[i + 1];
    if (altM >= a.gh && altM <= b.gh) {
      const t = (altM - a.gh) / Math.max(1, b.gh - a.gh);
      return { ws: a.ws + (b.ws - a.ws) * t, wd: lerpAngle(a.wd, b.wd ?? a.wd ?? point.dir, t) };
    }
  }
  const top = levels[levels.length - 1];
  return { ws: top.ws, wd: top.wd ?? point.dir ?? surfaceDir };
}
