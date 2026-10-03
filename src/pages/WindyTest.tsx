"use client";

import React from "react";
import WindySoundingsCard from "@/components/WindySoundingsCard";

export default function WindyTest() {
  return (
    <div className="min-h-screen bg-slate-950 p-8">
      <h1 className="text-3xl font-black text-white mb-8">TEST WINDY CARD</h1>
      <WindySoundingsCard siteName="Montoso" />
      <div style={{background:'red', color:'white', padding:'20px', fontSize:'20px'}}>
        ★ REACT FUNZIONA ★
      </div>
    </div>
  );
}
