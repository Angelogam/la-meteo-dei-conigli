"use client";

import React from "react";
import { Clock, MapPin, TrendingUp, Award } from "lucide-react";

interface Flight {
  id: number;
  pilot: string;
  site: string;
  distance: number;
  duration: string;
  date: string;
  type: "cross" | "locale" | "termico";
  score: number;
}

const SAMPLE_FLIGHTS: Flight[] = [
  { id: 1, pilot: "Marco V.", site: "Malanotte", distance: 32.5, duration: "1h 45m", date: "2 giorni fa", type: "cross", score: 88 },
  { id: 2, pilot: "Laura B.", site: "Pian Munè", distance: 18.2, duration: "1h 10m", date: "3 giorni fa", type: "termico", score: 72 },
  { id: 3, pilot: "Stefano R.", site: "Monte Birrone", distance: 45.1, duration: "2h 30m", date: "4 giorni fa", type: "cross", score: 95 },
  { id: 4, pilot: "Anna M.", site: "Colle dell'Agnello", distance: 8.5, duration: "45m", date: "5 giorni fa", type: "locale", score: 55 },
  { id: 5, pilot: "Giovanni P.", site: "Iretta", distance: 22.3, duration: "1h 20m", date: "6 giorni fa", type: "termico", score: 78 },
];

function typeStyle(type: string): string {
  switch (type) {
    case "cross": return "bg-emerald-900/30 text-emerald-300 border-emerald-500/30";
    case "termico": return "bg-orange-900/30 text-orange-300 border-orange-500/30";
    case "locale": return "bg-blue-900/30 text-blue-300 border-blue-500/30";
    default: return "bg-slate-800/30 text-slate-400 border-slate-600/30";
  }
}

function getTypeIcon(type: string): string {
  switch (type) {
    case "cross": return "🪂";
    case "termico": return "🔥";
    case "locale": return "🏔️";
    default: return "❓";
  }
}

const RecentFlights: React.FC = () => {
  return (
    <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/40 border border-amber-500/30 rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Award className="w-5 h-5 text-amber-400" />
        <h3 className="text-sm font-bold text-amber-300 uppercase tracking-wider">Voli recenti della community</h3>
      </div>

      <div className="space-y-2">
        {SAMPLE_FLIGHTS.map((flight) => (
          <div
            key={flight.id}
            className="bg-slate-900/40 rounded-xl p-3 border border-slate-700/30 hover:border-amber-500/30 transition-all hover:bg-slate-800/40"
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <span className="text-lg">{getTypeIcon(flight.type)}</span>
                <div>
                  <div className="text-sm font-bold text-white">{flight.pilot} · {flight.site}</div>
                  <div className="text-[10px] text-slate-500 flex items-center gap-2 mt-0.5">
                    <Clock className="w-3 h-3" />
                    <span>{flight.date} · {flight.duration}</span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-extrabold text-emerald-300">{flight.score}</div>
                <div className="text-[9px] text-slate-500">punti</div>
              </div>
            </div>

            <div className="flex items-center gap-3 text-[10px] mt-1 pt-1.5 border-t border-slate-700/20">
              <span className="flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-sky-400" />
                <span className="text-slate-400">{flight.distance} km</span>
              </span>
              <span className={`px-2 py-0.5 rounded-full border text-[9px] font-bold ${typeStyle(flight.type)}`}>
                {flight.type === "cross" ? "Cross" : flight.type === "termico" ? "Termico" : "Locale"}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RecentFlights;