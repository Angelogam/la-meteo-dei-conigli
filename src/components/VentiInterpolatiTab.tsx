"use client";

import React, { useEffect, useState, useMemo } from "react";
import { Wind, Calendar, TrendingUp, Gauge } from "lucide-react";
import { weatherService, type WindProfileResult } from "@/services/weatherService";

function getDirAbbrev(deg: number): string {
  const d = ["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSW","SW","WSW","W","WNW","NW","NNW"];
  return d[Math.round(deg / 22.5) % 16] || "N";
}

function getDirArrow(deg: number): string {
  const a = ["↑","↗","→","↘","↓","↙","←","↖"];
  return a[Math.round(((deg % 360) + 360) % 360 / 45) % 8];
}

function fmt(s: Date): string {
  if (!s || isNaN(s.getTime())) return "";
  const g = ["Dom","Lun","Mar","Mer","Gio","Ven","Sab"];
  return `${g[s.getDay()]} ${String(s.getDate()).padStart(2,"0")}/${String(s.getMonth()+1).padStart(2,"0")}`;
}

const H = [9,10,11,12,13,14,15,16,17,18];
const QL = [500,1000,1500,2000,2500,3000];

function interp(
  q: Record<number,{speed:number;dir:number}>,
  t: number
): {speed:number;dir:number}|null {
  const k = Object.keys(q).map(Number).sort((a,b)=>a-b);
  if (!k.length) return null;
  if (k.length===1) return q[k[0]];
  const lo = k.filter(x=>x<=t).pop();
  const hi = k.filter(x=>x>=t).shift();
  if (!lo&&!hi) return null;
  if (!lo&&hi) return q[hi];
  if (lo&&!hi) return q[lo];
  if (lo===hi) return q[lo];
  const r = (t-lo)/(hi-lo);
  const sp = Math.round(q[lo].speed+(q[hi].speed-q[lo].speed)*r);
  let dd = q[hi].dir-q[lo].dir;
  if (dd>180) dd-=360;
  if (dd<-180) dd+=360;
  const dr = ((q[lo].dir+dd*r)%360+360)%360;
  return {speed:sp,dir:Math.round(dr)};
}

interface P {
  lat:number; lon:number; quotaDecollo:number;
  selectedDay:number; oraCorrente?:number;
  onOraChange?:(o:number)=>void; siteName?:string;
}

export default function VentiInterpolatiTab({
  lat,lon,quotaDecollo,selectedDay,
  oraCorrente=12,onOraChange,siteName
}: P) {
  const [wd,setWd] = useState<WindProfileResult|null>(null);
  const [ld,setLd] = useState(false);
  const [er,setEr] = useState<string|null>(null);
  const [os,setOs] = useState(oraCorrente);

  useEffect(()=>{
    if (!lat||!lon||!quotaDecollo) return;
    const t = new Date(); t.setDate(t.getDate()+selectedDay);
    const ds = t.toISOString().split("T")[0];
    setLd(true); setEr(null);
    weatherService.fetchWindProfile(lat,lon,ds).then(r=>{
      setWd(r); setLd(false);
      if (r?.ventoOrario?.length) {
        const c = r.ventoOrario.reduce((p,v)=>Math.abs(v.ora-oraCorrente)<Math.abs(p.ora-oraCorrente)?v:p);
        setOs(c.ora);
      }
    }).catch((e)=>{setEr(e instanceof Error?e.message:"Errore");setLd(false);});
  },[lat,lon,quotaDecollo,selectedDay,oraCorrente]);

  const dg = fmt(new Date(new Date().getTime()+selectedDay*86400000));
  const od = useMemo(()=>{
    if (!wd) return null;
    return wd.ventoOrario.find(v=>v.ora===os)||wd.ventoOrario[0]||null;
  },[wd,os]);

  const qv = useMemo(()=>{
    if (!od) return [];
    const r:{quota:number;speed:number;dir:number}[] = [];
    for (const q of QL) if (od.quote[q]) r.push({quota:q,speed:od.quote[q].speed,dir:od.quote[q].dir});
    const di = interp(od.quote,quotaDecollo);
    if (di&&!r.find(x=>Math.abs(x.quota-quotaDecollo)<50)) r.push({quota:quotaDecollo,speed:di.speed,dir:di.dir});
    return r.sort((a,b)=>a.quota-b.quota);
  },[od,quotaDecollo]);

  const ms = useMemo(()=>Math.max(...qv.map(x=>x.speed),1),[qv]);

  if (ld) return (
    <div className="flex items-center justify-center py-16 text-slate-400">
      <div className="w-8 h-8 rounded-full border-2 border-emerald-500/20 border-t-emerald-400 animate-spin mr-3" />
      <span>Caricamento venti per {siteName||"decollo"}...</span>
    </div>
  );
  if (er) return (
    <div className="flex flex-col items-center justify-center py-16 text-slate-400">
      <Wind className="w-16 h-16 text-slate-600 mb-4" />
      <p className="text-lg font-bold">Errore venti</p>
      <p className="text-sm text-slate-500 mt-1">{er}</p>
    </div>
  );
  if (!wd||!wd.ventoOrario.length) return (
    <div className="flex flex-col items-center justify-center py-16 text-slate-400">
      <Wind className="w-16 h-16 text-slate-600 mb-4" />
      <p className="text-lg font-bold">Nessun dato vento per {siteName||"decollo"}</p>
    </div>
  );

  const sc = (s:number)=>{
    if (s<=8) return "bg-emerald-400";
    if (s<=15) return "bg-lime-400";
    if (s<=22) return "bg-amber-400";
    if (s<=30) return "bg-orange-400";
    return "bg-red-400";
  };
  const stc = (s:number)=>{
    if (s<=8) return "text-emerald-300";
    if (s<=15) return "text-lime-300";
    if (s<=22) return "text-amber-300";
    if (s<=30) return "text-orange-300";
    return "text-red-300";
  };

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-slate-800/70 to-slate-900/50 border border-cyan-500/30 rounded-2xl px-5 py-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-800/60 to-cyan-700/30 border border-cyan-500/40 flex items-center justify-center shrink-0">
          <Wind className="w-5 h-5 text-cyan-400" />
        </div>
        <div>
          <div className="text-base font-bold text-white">{siteName||"Decollo"} — Venti in quota</div>
          <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
            <Calendar className="w-3.5 h-3.5" /><span>{dg}</span>
            <span className="text-slate-600">·</span><span>{quotaDecollo}m slm</span>
          </div>
        </div>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {wd.ventoOrario.filter(v=>H.includes(v.ora)).map(v=>(
          <button key={v.ora} onClick={()=>{setOs(v.ora);onOraChange?.(v.ora);}}
            className={`shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
              v.ora===os?"bg-cyan-600/30 border-cyan-400/50 text-cyan-200 shadow-sm"
              :"bg-slate-800/50 border-slate-700/50 text-slate-400 hover:bg-slate-700/40"}`}>
            {String(v.ora).padStart(2,"0")}:00
          </button>
        ))}
      </div>

      <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/30 border border-slate-700/40 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-cyan-400" />
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">
              Profilo verticale — {String(os).padStart(2,"0")}:00
            </h4>
          </div>
          <span className="text-[10px] text-slate-500">{quotaDecollo}m → 3000m</span>
        </div>
        <div className="space-y-2">
          {qv.map(q=>{
            const pct = Math.max(6,(q.speed/ms)*100);
            const id = Math.abs(q.quota-quotaDecollo)<150;
            return (
              <div key={q.quota} className="grid grid-cols-[3.5rem_1fr_5rem] gap-2 items-center">
                <span className={`text-xs font-mono text-right ${id?"text-emerald-400 font-bold":"text-slate-500"}`}>
                  {q.quota}m{id&&<span className="ml-0.5">🪂</span>}
                </span>
                <div className="h-6 bg-slate-800/60 rounded-full overflow-hidden relative">
                  <div className={`h-full rounded-full transition-all ${sc(q.speed)}`} style={{width:`${pct}%`}}>
                    <span className="absolute inset-0 flex items-center justify-end pr-3 text-[10px] text-white font-bold">
                      {q.speed>=12&&Math.round(q.speed)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs font-mono">
                  <span className={`font-bold ${stc(q.speed)}`}>{Math.round(q.speed)}</span>
                  <span className="text-slate-500">km/h</span>
                  <span className="text-sky-300 ml-1">{getDirArrow(q.dir)}{getDirAbbrev(q.dir)}</span>
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-2 text-[10px] text-slate-400 mt-4 pt-3 border-t border-slate-700/30">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-400" /> {"<="}8</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-lime-400" /> 9–15</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-amber-400" /> 16–22</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-orange-400" /> 23–30</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-400" /> {">"}30 km/h</span>
          <span className="ml-2 flex items-center gap-1"><span className="text-emerald-400">🪂</span> Decollo</span>
        </div>
      </div>

      <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/30 border border-slate-700/40 rounded-2xl overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3 border-b border-slate-700/30">
          <Gauge className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-bold text-cyan-300 uppercase tracking-wider">Vento al decollo ({quotaDecollo}m)</span>
        </div>
        <div className="divide-y divide-slate-700/20">
          {wd.ventoOrario.filter(v=>H.includes(v.ora)).map(v=>{
            const vd = interp(v.quote,quotaDecollo)||{speed:0,dir:0};
            const sl = v.ora===os;
            return (
              <button key={v.ora} onClick={()=>{setOs(v.ora);onOraChange?.(v.ora);}}
                className={`w-full grid grid-cols-[3rem_1fr_3.5rem_3rem] gap-2 px-5 py-3 text-xs transition-all text-left ${
                  sl?"bg-cyan-900/20 border-l-2 border-l-cyan-400":"hover:bg-slate-700/30"}`}>
                <span className={`font-bold font-mono ${sl?"text-cyan-300":"text-slate-300"}`}>
                  {String(v.ora).padStart(2,"0")}
                </span>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-slate-700/50 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${sc(vd.speed)}`} style={{width:`${Math.min(100,(vd.speed/40)*100)}%`}} />
                  </div>
                  <span className={`font-bold font-mono tabular-nums w-8 text-right ${stc(vd.speed)}`}>{Math.round(vd.speed)}</span>
                </div>
                <span className="text-sky-300 text-center font-mono">{getDirArrow(vd.dir)} {getDirAbbrev(vd.dir)}</span>
                <span className="text-red-300 text-right font-mono">{Math.round(v.gust)}</span>
              </button>
            );
          })}
        </div>
        <div className="grid grid-cols-[3rem_1fr_3.5rem_3rem] gap-2 px-5 py-2 border-t border-slate-700/30 text-[9px] text-slate-500 font-bold uppercase tracking-wider">
          <span>Ora</span><span>Vento</span><span className="text-center">Dir</span><span className="text-right">Raff.</span>
        </div>
      </div>
    </div>
  );
}