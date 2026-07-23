"use client";

import React, { useState } from "react";
import { Bell, X, Wind, CloudRain, Sun } from "lucide-react";

interface Notification {
  id: number;
  icon: React.ReactNode;
  title: string;
  message: string;
  time: string;
  type: "info" | "warning" | "success";
}

const SAMPLE_NOTIFICATIONS: Notification[] = [
  { id: 1, icon: <Sun className="w-4 h-4 text-emerald-400" />, title: "Condizioni perfette", message: "Malanotte: vento ideale 12 km/h, cielo sereno. Ottima giornata per volare!", time: "5 min fa", type: "success" },
  { id: 2, icon: <Wind className="w-4 h-4 text-amber-400" />, title: "Vento in aumento", message: "Pian Munè: raffiche previste fino a 28 km/h nel pomeriggio. Consigliata prudenza.", time: "15 min fa", type: "warning" },
  { id: 3, icon: <CloudRain className="w-4 h-4 text-blue-400" />, title: "Pioggia in arrivo", message: "Colle dell'Agnello: possibili rovesci dalle 15:00. Meglio anticipare il volo.", time: "30 min fa", type: "warning" },
];

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications] = useState(SAMPLE_NOTIFICATIONS);

  return (
    <div className="fixed top-4 right-16 z-50">
      <button
        onClick={() => setOpen(!open)}
        className="relative w-10 h-10 rounded-full bg-slate-800/80 border border-slate-700/50 flex items-center justify-center hover:bg-slate-700/80 transition-all shadow-lg backdrop-blur-sm"
      >
        <Bell className="w-5 h-5 text-slate-300" />
        {notifications.length > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-[9px] font-bold text-white flex items-center justify-center animate-pulse">
            {notifications.length}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-12 w-80 bg-slate-900/95 backdrop-blur-xl border border-slate-700/60 rounded-2xl shadow-2xl z-50 overflow-hidden animate-slide-up">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/30">
              <h3 className="text-sm font-bold text-white">Notifiche</h3>
              <button onClick={() => setOpen(false)} className="p-1 rounded-lg hover:bg-slate-700">
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            <div className="divide-y divide-slate-700/20 max-h-80 overflow-y-auto">
              {notifications.map((n) => (
                <div key={n.id} className="px-4 py-3 hover:bg-slate-800/50 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="shrink-0 mt-0.5">{n.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-white">{n.title}</div>
                      <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{n.message}</p>
                      <span className="text-[10px] text-slate-500 mt-1 block">{n.time}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}