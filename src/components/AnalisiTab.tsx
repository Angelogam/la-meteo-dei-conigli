"use client";

import React from "react";

interface AnalisiTabProps {
  currentData: any;
  site: { name: string; alt: number };
  thermalDelta: number;
  thermalStrength: { label: string; color: string };
}

export default function AnalisiTab({ currentData, site, thermalDelta, thermalStrength }: AnalisiTabProps) {
  if (!currentData) return null;

  const sections = [
    {
      title: '📋 Panoramica Generale',
      text: `🌅 La giornata al decollo di ${site.name} si presenta con temperatura di ${Math.round(currentData.temperature)}°C, umidità al ${Math.round(currentData.humidity)}% e nuvolosità al ${Math.round(currentData.cloudCover)}%.${currentData.windSpeed > 20 ? ` 💨 Vento sostenuto a ${Math.round(currentData.windSpeed)} km/h.` : ` 🍃 Vento leggero a ${Math.round(currentData.windSpeed)} km/h.`}${currentData.precipitation > 0 ? ` 🌧️ Possibili precipitazioni (${currentData.precipitation} mm).` : ' ✅ Nessuna precipitazione prevista.'}${thermalDelta > 8 ? ' 🔥 Buon delta termico, condizioni favorevoli per il volo.' : ' 🫤 Delta termico ridotto, volo locale.'}`
    },
    {
      title: '💡 Consigli per il Volo',
      text: `<strong>Valutazione del rischio:</strong> ${currentData.windSpeed > 25 || currentData.precipitation > 0.5 ? '🔴 ALTO - Condizioni pericolose, sconsigliato volare.' : currentData.windSpeed > 18 ? '🟡 MEDIO - Condizioni impegnative, richiesta esperienza.' : '🟢 BASSO - Condizioni favorevoli.'}\n<strong>Vento:</strong> ${currentData.windSpeed < 8 ? '💨 Vento debole, possibili difficoltà di decollo.' : currentData.windSpeed < 20 ? '✅ Vento ideale (5-18 km/h).' : '⚠️ Vento sostenuto, attenzione.'}\n<strong>Termiche:</strong> ${thermalStrength.label}\n<strong>Momento migliore:</strong> ${currentData.windSpeed < 20 && currentData.cloudCover < 60 ? '🕐 Condizioni ottimali per volare ora!' : '⚠️ Valutare le condizioni prima di volare.'}`
    },
    {
      title: '🏔️ Quote e Plafond',
      text: `<strong>Base decollo:</strong> ${site.alt}m\n<strong>Base delle nuvole:</strong> ${Math.round((currentData.temperature - currentData.dewPoint) * 120 + site.alt)}m\n<strong>Plafond termico massimo:</strong> ${Math.round(site.alt + (thermalDelta * 100))}m\n<strong>Delta termico:</strong> ${thermalDelta}°C\n${thermalDelta > 8 && currentData.windSpeed < 20 ? '✅ Condizioni favorevoli per cross country.' : '🫤 Condizioni limitate per cross country.'}`
    },
    {
      title: '⛈️ Allerta Temporali',
      text: currentData.weatherCode >= 95 ? '🔴 ALLERTA TEMPORALI IN CORSO! Volo sconsigliato.' : currentData.weatherCode >= 80 ? '🟡 ATTENZIONE: Possibili rovesci. Monitorare l\'evoluzione.' : '✅ Nessun temporale previsto. Cielo sereno o poco nuvoloso.'
    },
  ];

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      {sections.map((section, i) => (
        <div key={i} style={{
          background: 'rgba(0,0,0,0.2)', padding: '12px 14px', borderRadius: '10px',
          border: '1px solid rgba(255,255,255,0.05)', marginBottom: '10px',
        }}>
          <h4 style={{ fontSize: '0.95rem', color: '#4caf50', marginBottom: '8px', fontWeight: 600 }}>{section.title}</h4>
          <p style={{ fontSize: '0.85rem', lineHeight: '1.6', color: '#d0d8e0', whiteSpace: 'pre-wrap' }}
            dangerouslySetInnerHTML={{ __html: section.text }}
          />
        </div>
      ))}
    </div>
  );
}