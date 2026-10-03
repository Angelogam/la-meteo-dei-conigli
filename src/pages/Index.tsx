"use client";

import React from "react";
import WindySoundingsCard from "@/components/WindySoundingsCard";

export default function Index() {
  console.log("[Index] RENDER CHECK");
  return (
    <>
      {/* OVERLAY DI EMERGENZA — QUESTO DEVE ESSERE VISIBLE */}
      <div style={{position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(255,0,0,0.9)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:99999}}>
        <h1 style={{color:'white', fontSize:'48px', fontWeight:'bold'}}>★ PREVIEW ATTIVA — WINDY CARD CREATA CON SUCCESSO ★</h1>
      </div>
      <div className="min-h-screen bg-slate-950 p-8">
        <h1 className="text-3xl font-black text-white mb-6">TEST PAGINA PRINCIPALE</h1>
        
        <WindySoundingsCard siteName="Montoso" />
        
        <div style={{background:'red', color:'white', padding:'20px', fontSize:'18px', marginTop:'20px'}}>
          ★ REACT FUNZIONA — SE VEDI QUESTO DIV, LA CARD WINDY DOVREBBE ESSERE SOPRA ★
        </div>
      </div>
    </>
  );
}
