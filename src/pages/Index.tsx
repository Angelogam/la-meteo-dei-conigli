"use client";

import React, { useEffect, useState } from "react";

function Index() {
  const [testResult, setTestResult] = useState<string>("In attesa del test...");
  const [testOk, setTestOk] = useState<boolean | null>(null);

  useEffect(() => {
    const testAPI = async () => {
      try {
        const url = "https://api.open-meteo.com/v1/forecast?latitude=44.2587&longitude=7.7943&hourly=temperature_2m,wind_speed_10m,weather_code&daily=temperature_2m_max,temperature_2m_min&timezone=Europe/Rome&forecast_days=1";
        setTestResult(`Chiamata a: ${url}`);
        
        const res = await fetch(url);
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }
        const data = await res.json();
        setTestResult(`✅ Successo! Ricevuti ${data.hourly?.time?.length || 0} orari`);
        setTestOk(true);
        console.log("[TEST] Risposta Open-Meteo:", data);
      } catch (err: any) {
        setTestResult(`❌ Errore: ${err.message}`);
        setTestOk(false);
        console.error("[TEST] Errore Open-Meteo:", err);
      }
    };
    testAPI();
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 text-white p-8">
      <h1 className="text-2xl font-bold mb-4">Test API Open-Meteo</h1>
      <div className={`p-4 rounded-xl border ${testOk === true ? "bg-green-900/50 border-green-500" : testOk === false ? "bg-red-900/50 border-red-500" : "bg-slate-800 border-slate-600"}`}>
        <p className="text-sm font-mono">{testResult}</p>
      </div>
    </div>
  );
}

export default Index;