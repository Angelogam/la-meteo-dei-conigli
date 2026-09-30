"use client";

import React from "react";

export default function SimpleTest() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-8">
      <div className="bg-red-600 text-white font-black text-3xl py-12 px-16 rounded-2xl shadow-2xl text-center border-4 border-yellow-400">
        🚨 TEST PAGE SUCCESSO! 🚨
        <div className="text-xl mt-6 font-normal">
          Questa è una pagina di test semplice.<br />
          Se leggi questo messaggio, tutto funziona!
        </div>
        <div className="text-lg mt-4 text-yellow-200">
          VoloDecisionCard è stato integrato correttamente.
        </div>
      </div>
    </div>
  );
}
