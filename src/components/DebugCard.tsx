import React from "react";

export default function DebugCard() {
  return (
    <div className="bg-red-900/50 border-4 border-red-500 rounded-xl p-6 text-center">
      <h2 className="text-2xl font-black text-white">★ DEBUG CARD — QUESTA CARD DEVE ESSERE VISIBLE ★</h2>
      <p className="text-red-200 mt-2">Se vedi questo testo, React sta funzionando correttamente.</p>
    </div>
  );
}