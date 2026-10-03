"use client";

import React from "react";
import WindySoundingsCard from "@/components/WindySoundingsCard";

export default function Index() {
  return (
    <div className="min-h-screen bg-slate-950 p-8">
      <h1 className="text-3xl font-black text-white mb-6">TEST PAGINA PRINCIPALE</h1>
      
      <WindySoundingsCard siteName="Montoso" />
      
      <div style={{background:'red', color:'white', padding:'20px', fontSize:'18px', marginTop:'20px'}}>
        ★ REACT FUNZIONA — SE VEDI QUESTO DIV, LA CARD WINDY DOVREBBE ESSERE SOPRA ★
      </div>
    </div>
  );
}
