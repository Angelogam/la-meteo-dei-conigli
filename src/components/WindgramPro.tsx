"use client";

import React, { useEffect, useState } from "react";

const TOMORROW_API_KEY = import.meta.env.VITE_TOMORROW_KEY || "";

type WindPoint = {
  time: string;
  level: number;
  windSpeed: number;
  windDirection: number;
  cloudCover: number;
  temperature: number;
};

async function fetchWindgram(lat: number, lon: number): Promise<WindPoint[]> {
  const levels = ["surface","100m","300m","500m","800m","1000m","1500m","2000m","2500m","3000m"];

  const url =
    `https://api.tomorrow.io/v4/timelines?location=${lat},${lon}` +
    `&fields=windSpeed,windDirection,temperature,cloudCover` +
    `&timesteps=1h&levels=${levels.join(",")}` +
    `&units=metric&apikey=${TOMORROW_API_KEY}`;

  const res = await fetch(url);
  const data = await res.json();

  const intervals = data.data?.timelines?.[0]?.intervals ?? [];
  const result: WindPoint[] = [];

  for (const interval of intervals) {
    const time = interval.startTime;
    const v = interval.values || {};
    for (const level of levels) {
      const m = level === "surface" ? 0 : parseInt(level.replace("m",""));
      result.push({
        time,
        level: m,
        windSpeed: v.windSpeed?.[level] ?? NaN,
        windDirection: v.windDirection?.[level] ?? NaN,
        cloudCover: v.cloudCover?.[level] ?? NaN,
        temperature: v.temperature?.[level] ?? NaN
      });
    }
  }
  return result;
}

function windColor(speed: number) {
  if (speed < 5) return "#2ecc71";
  if (speed < 10) return "#f1c40f";
  if (speed < 20) return "#e67e22";
  return "#e74c3c";
}

function computeThermalBase(points: WindPoint[]): number | null {
  const byLevel: Record<number, WindPoint[]> = {};
  for (const p of points) {
    if (!byLevel[p.level]) byLevel[p.level] = [];
    byLevel[p.level].push(p);
  }
  const levels = Object.keys(byLevel).map(Number).sort((a,b)=>a-b);
  for (const l of levels) {
    const arr = byLevel[l];
    const t = arr.reduce((s,p)=>s+p.temperature,0)/arr.length;
    const c = arr.reduce((s,p)=>s+p.cloudCover,0)/arr.length;
    if (t >= 15 && c <= 60 && l >= 300) return l;
  }
  return null;
}

const ParapendioIcon = ({x,y}:{x:number;y:number}) => (
  <g transform={`translate(${x},${y})`}>
    <path d="M -10 0 Q 0 -10 10 0" stroke="#fff" fill="none" strokeWidth={2}/>
    <line x1={-5} y1={0} x2={-2} y2={8} stroke="#fff" strokeWidth={1.5}/>
    <line x1={5} y1={0} x2={2} y2={8} stroke="#fff" strokeWidth={1.5}/>
    <circle cx={0} cy={10} r={2} fill="#fff"/>
  </g>
);

interface WindgramProProps {
  lat: number;
  lon: number;
  siteName: string;
}

export default function WindgramPro({ lat, lon, siteName }: WindgramProProps) {
  const [data,setData] = useState<WindPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(()=>{
    let mounted = true;
    setLoading(true);
    setError(null);
    (async()=>{
      try {
        const result = await fetchWindgram(lat,lon);
        if (mounted) {
          setData(result);
          setLoading(false);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Errore nel caricamento del windgram");
          setLoading(false);
        }
      }
    })();
    return () => { mounted = false; };
  },[lat,lon]);

  if (loading) return (
    <div className="bg-slate-900/80 border border-slate-700/60 rounded-2xl p-6 shadow-xl">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-6 h-6 border-4 border-emerald-500/30 border-t-emerald-400 rounded-full animate-spin" />
        <h3 className="text-white font-bold text-lg">
          Windgram — {siteName}
        </h3>
      </div>
      <p className="text-slate-400 text-sm">
        Caricamento dati vento in quota da Tomorrow.io...
      </p>
    </div>
  );

  if (error || !data.length) return (
    <div className="bg-slate-900/80 border border-red-500/40 rounded-2xl p-6 shadow-xl">
      <div className="flex items-center gap-3 mb-2">
        <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h3 className="text-white font-bold text-lg">
          Windgram — {siteName}
        </h3>
      </div>
      <p className="text-red-300 text-sm">
        {error || "Nessun dato disponibile per questo decollo"}
      </p>
    </div>
  );

  const times = Array.from(new Set(data.map(p=>p.time))).sort();
  const levels = Array.from(new Set(data.map(p=>p.level))).sort((a,b)=>a-b);

  const width=900, height=520;
  const padL=70, padR=20, padT=35, padB=45;
  const w = width-padL-padR;
  const h = height-padT-padB;
  const xStep = w/(times.length-1);
  const yStep = h/(levels.length-1);

  const thermalBase = computeThermalBase(data);

  return (
    <div className="bg-slate-900/80 border border-slate-700/60 rounded-2xl p-4 shadow-xl">
      <h3 className="text-white font-bold mb-3 text-lg flex items-center gap-2">
        <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.59 4.59A2 2 0 1111 8H2m14 0a2 2 0 11-2 2m2-4a2 2 0 11-2 2M2 16a2 2 0 112-2m18 0a2 2 0 11-2 2M2 12a2 2 0 112 2m18 0a2 2 0 11-2 2" />
        </svg>
        Windgram — {siteName}
      </h3>

      <div className="overflow-x-auto">
        <svg width={width} height={height} style={{background:"#2c3e50",borderRadius:"8px"}} className="max-w-full">
          {levels.map((l,i)=>{
            const y = padT + h - i*yStep;
            return (
              <g key={l}>
                <line x1={padL} y1={y} x2={width-padR} y2={y} stroke="#34495e" strokeDasharray="3 3"/>
                <text x={padL-8} y={y+4} fill="#bdc3c7" fontSize={10} textAnchor="end">{l} m</text>
              </g>
            );
          })}

          {times.map((t,i)=>{
            const x = padL + i*xStep;
            const hh = new Date(t).getHours();
            return (
              <g key={t}>
                <line x1={x} y1={padT} x2={x} y2={height-padB} stroke="#34495e" strokeDasharray="3 3"/>
                <text x={x} y={height-padB+14} fill="#bdc3c7" fontSize={10} textAnchor="middle">{String(hh).padStart(2,"0")}:00</text>
              </g>
            );
          })}

          {data.map(p=>{
            const ti = times.indexOf(p.time);
            const li = levels.indexOf(p.level);
            const x = padL + ti*xStep;
            const y = padT + h - li*yStep;

            const speed = p.windSpeed;
            const dir = p.windDirection;
            const cloud = p.cloudCover;

            const bg = windColor(speed);
            const cloudAlpha = Math.min(Math.max(cloud/100,0),0.8);

            const arrowLen=11;
            const rad=(dir-90)*Math.PI/180;
            const x2=x+Math.cos(rad)*arrowLen;
            const y2=y+Math.sin(rad)*arrowLen;

            return (
              <g key={`${p.time}-${p.level}`}>
                <rect x={x-xStep/2} y={y-yStep/2} width={xStep} height={yStep} fill={bg} opacity={0.4} rx={2}/>
                <rect x={x-xStep/2} y={y-yStep/2} width={xStep} height={yStep} fill="#fff" opacity={cloudAlpha} rx={2}/>
                {!isNaN(speed)&&!isNaN(dir)&&(
                  <>
                    <line x1={x} y1={y} x2={x2} y2={y2} stroke="#fff" strokeWidth={1.3} strokeLinecap="round"/>
                    <circle cx={x} cy={y} r={1.7} fill="#fff"/>
                  </>
                )}
                <text x={x} y={y+11} fill="#fff" fontSize={9} textAnchor="middle" fontWeight="bold">{Math.round(speed)}</text>
                <text x={x} y={y-9} fill="#fff" fontSize={8} textAnchor="middle">{Math.round(cloud)}%</text>
              </g>
            );
          })}

          {thermalBase!==null && (
            <>
              <ParapendioIcon x={padL+w*0.12} y={padT+h-levels.indexOf(thermalBase)*yStep-18}/>
              <text x={padL+w*0.12} y={padT+h-levels.indexOf(thermalBase)*yStep-32} fill="#fff" fontSize={11} textAnchor="middle" fontWeight="bold">
                Base termiche ~ {thermalBase} m
              </text>
            </>
          )}
        </svg>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-slate-400">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm" style={{backgroundColor:"#2ecc71"}}></span>
          <span>{"<"} 5 km/h</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm" style={{backgroundColor:"#f1c40f"}}></span>
          <span>5–10 km/h</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm" style={{backgroundColor:"#e67e22"}}></span>
          <span>10–20 km/h</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm" style={{backgroundColor:"#e74c3c"}}></span>
          <span>{">"} 20 km/h</span>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-white/80 border border-slate-500"></span>
          <span>Copertura nuvole</span>
        </div>
      </div>
    </div>
  );
}