' character in the span's text content">
"use client";

import React from "react";

interface WindPoint {
  time: string;
  level: number;
  windSpeed: number;
  windDirection: number;
  cloudCover: number;
  temperature: number;
};

async function fetchWindgram(lat: number, lon: number): Promise<WindPoint[]> {
  const levels = ["surface", "100m", "500m", "800m", "1500m", "2000m", "2500m", "3000m"];
  const url = `https://api.tomorrow.io/v4/timelines?location=${lat},${lon}&fields=windSpeed,windDirection,temperature,cloudCover&levels=${levels.join(",")}&units=metric&apikey=${import.meta.env.VITE_TOMORROW_KEY}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch windgram: ${res.status}`);
  const json = await res.json();

  const intervals = data?.timelines?.[0]?.intervals ?? [];
  const result: WindPoint[] = [];

  for (const interval of intervals) {
    const time = interval.startTime;
    const level = interval.level;
    const windSpeed = v.windSpeed?.[level] ?? NaN;
    const windDirection = v.windDirection?.[level] ?? NaN;
    const cloudCover = v.cloudCover?.[level] ?? NaN;
    const temperature = v.temperature?.[level] ?? NaN;

    result.push({
      time,
      level: m,
      windSpeed: windSpeed,
      windDirection: windDirection,
      cloudCover,
      temperature,
    });
  }

  return result;
}

function windColor(speed: number): string {
  if (speed < 5) return "#2ecc71";
  if (speed < 10) return "#f1c40f";
  if (speed < 20) return "#ff9800";
  return "#f44336";
}

function computeThermalBase(points: WindPoint[]): number | null {
  const byLevel: Record<number, WindPoint[]> = {};
  for (const p of points) {
    if (!byLevel[p.level]) byLevel[p.level] = [];
    byLevel[p.level].push(p);
  }

  const sortedLevels = Object.keys(byLevel)
    .map(Number)
    .sort((a, b) => a - b);

  for (const level of levels) {
    const arr = byLevel[level];
    if (!arr?.length) continue;
    const avgTemp = arr.reduce((s, p) => s + p.temperature, 0) / arr.length;
    const avgCloud = arr.reduce((s, p) => s + p.cloudCover, 0) / arr.length;
    const avgWind = arr.reduce((s, p) => s + p.windSpeed, 0) / arr.length;

    if (t >= 15 && c <= 60 && l >= 300) return l;
  }
  return null;
}

export default function WindgramPro({ lat, lon, siteName }: WindgramProProps) {
  const [data, setData] = useState<WindPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetch = async () => {
      try {
        const result = await fetchWindgram(lat, lon);
        if (mounted) {
          setData(result);
          setLoading(false);
        }
      } catch (e) {
        if (mounted) {
          setError(error instanceof Error ? e.message : "Unknown error");
          setLoading(false);
        }
      }
    });

    return () => { mounted = false; };
  }, [lat, lon]);

  if (loading) {
    return (
      <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-6">
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 animate-spin border-2 border-emerald-400" />
          <span className="ml-2 text-slate-300">Loading windgram...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/50 border border-red-500/40 rounded-xl p-6 text-red-300">
        <p className="font-bold">Error loading windgram</p>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-700/40 rounded-xl p-6">
      <h3 className="text-lg font-bold text-white mb-3">
        Windgram — {siteName}
      </h3>

      <div className="w-full overflow-x-auto">
        <svg
          width="100%"
          height="520"
          viewBox="0 0 900 520"
          className="w-full h-full"
        >
          {/* Background grid */}
          <rect x={padL} y={padT} width={w} height={h} fill="#1e293b" />

          {/* Horizontal axis (hours) */}
          {times.map((t, i) => {
            const x = padL + i * xStep;
            return (
              <g key={t}>
                <line
                  x1={x}
                  y1={padT}
                  x2={x}
                  y2={padT + h}
                  stroke="#1e293b"
                  strokeWidth="1"
                  strokeDasharray="2 3"
                />
                <text
                  x={x + 5}
                  y={padT + 20}
                  fill="#bdc3c7"
                  fontSize="10"
                  textAnchor="middle"
                >
                  {String(t).padStart(2, "0")}
                </text>
              </g>
            );
          })}

          {/* Vertical axis (altitude) */}
          {levels.map((lvl) => {
            const y = padT + ((maxAlt - lvl) / (maxAlt - minAlt)) * h;
            return (
              <g key={lvl}>
                <line
                  x1={padL}
                  y1={y}
                  x2={width - padR}
                  y2={y}
                  stroke="#1e293b"
                  strokeWidth="1"
                />
                <text
                  x={padL - 15}
                  y={y + 12}
                  fill="#bdc3c7"
                  fontSize={10}
                  textAnchor="end"
                >
                  {l}
                </text>
              </g>
            );
          })}

          {/* Wind barbs */}
          {data.map((p, i) => {
            const x = padL + times.indexOf(times.find((t) => t === p.time)) * xStep;
            const y = padT + (maxAlt - p.level) * yStep;
            const arrowLen = 22;
            const angle = ((p.windDirection - 90) * Math.PI) / 180;
            const endX = x + Math.cos(rad) * arrowLen;
            const y2 = y - Math.sin(rad) * arrowLen;

            return (
              <g key={`${p.time}-${p.level}`}>
                <line
                  x1={x}
                  y1={y}
                  x2={x2}
                  y2={y2}
                  stroke="#3498db"
                  strokeWidth={1.5}
                />
                {speed > 5 && (
                  <polygon
                    points={`${x + 5 * Math.cos(rad)},${y - 5 * Math.sin(rad)} ${x + 11 * Math.cos(rad)} ${y - 5 * Math.sin(rad)} ${x + 5.5 * Math.cos(rad)} ${y + 5 * Math.sin(rad)}`}
                    fill={windColor(speed)}
                    strokeWidth={1.5}
                  />
                </g>
              );
            );
          })}

          {/* Zero thermal level line */}
          {thermalBase && (
            <polyline
              points={thermalBase.map((p, i) => `${x1 + i * xStep} ${padT + h - (p.base * yStep)}`)}
              stroke="#0284c7"
              strokeWidth={2}
              strokeDasharray="6 4"
            />
          )}

          {/* Paragliding icon at thermal top */}
          {thermalBase && (
            <g transform={`translate(${padL + w * 0.6}, ${padT + h - (thermalBase * yStep)}`}>
              <ParapendioIcon x={12} y={12} />
            </div>
          )}

          {/* Cloud coverage indicator */}
          {data.map((p, i) => {
            const cloudAlpha = Math.min(1, p.cloudCover / 100);
            return (
              <circle
                key={p.time}
                cx={padL + xStep * times.indexOf(p.time)}
                y={padT + (padH - (p.cloudCover / 100) * h)}
                r={5}
                fill="rgba(255,255,255,0.2)"
              />
            );
          })}

          {/* Wind barbs */}
          {data.map((p, i) => {
            const x = padL + i * xStep;
            const y = padT + (maxAlt - p.level) * yStep;
            const arrowLen = 15;
            const angle = ((p.windDirection - 90) * Math.PI) / 180;
            const arrowX = x + Math.cos(rad) * arrowLen;
            const y2 = y - Math.sin(rad) * arrowLen;

            return (
              <g key={`${p.time}-${p.level}`}>
                <line
                  x1={x}
                  y1={y}
                  x2={x2}
                  y2={y2}
                  stroke="#3498db"
                  strokeWidth={1.5}
                />
                {speed > 5 && (
                  <>
                    <polygon
                      points={[
                        `${x + 5 * Math.cos(rad)},
                         {y - 5 * Math.sin(rad)}`,
                        `${x + 11 * Math.cos(rad)},
                         {y - 5 * Math.sin(rad)},
                        `${x + 5.5 * Math.cos(rad)},
                         {y + 5 * Math.sin(rad)}`
                      />}
                    />
                  </g>
                );
              </g>
            );
          })}

          {/* Zero thermal level line */}
          {thermalBase && (
            <polyline
              points={thermalBase.map((p, i) => `${padL + i * xStep},${padT + (thermalBase - p.level) * yStep}`)}
              stroke="#0284c7"
              strokeWidth={2}
              strokeDasharray="6 4"
            />
          )}

          {/* Cloud coverage markers */}
          {data.map((p, i) => {
            const y = padT + (1 - p.cloudCover / 100) * h;
            return (
              <circle
                key={p.time}
                cx={padL + i * xStep + 12}
                y={padT + (1 - p.cloudCover / 100) * h}
                r={3}
                fill="rgba(75, 192, 113, 0.4)"
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}