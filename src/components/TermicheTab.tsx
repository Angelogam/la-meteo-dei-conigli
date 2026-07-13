"use client";

import React from "react";
import { getCloudBase, getThermalPlafond } from "@/utils/weatherHelpers";

interface TermicheTabProps {
  currentData: any;
  dayData: any[];
  site: { alt: number };
  thermalDelta: number;
  thermalStrength: { label: string; color: string };
}

export default function TermicheTab({ currentData, dayData, site, thermalDelta, thermalStrength }: TermicheTabProps) {
  if (!currentData) return null;

  const cards = [
    { label: 'Temperatura media', value: `${Math.round(currentData.temperature)}°C` },
    { label: 'Delta termico', value: `${thermalDelta}°C` },
    { label: 'Nuvolosità media', value: `${Math.round(currentData.cloudCover)}%` },
    { label: 'Umidità media', value: `${Math.round(currentData.humidity)}%` },
    { label: 'Base nuvole', value: `${getCloudBase(currentData.temperature, currentData.dewPoint, site.alt)}m` },
    { label: 'Plafond', value: `${getThermalPlafond(site.alt, thermalDelta)}m` },
    { label: 'Galleggiamento', value: thermalDelta > 10 ? 'Eccellente ⭐' : thermalDelta > 6 ? 'Buono 👍' : 'Limitato 🫤' },
    { label: 'Cross Country', value: thermalDelta > 10 && currentData.windSpeed < 20 ? '✅ Favorevole' : '🫤 Valutare', valueColor: thermalDelta > 10 && currentData.windSpeed < 20 ? '#4caf50' : '#ff9800' },
  ];

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <div style={{ marginBottom: '12px' }}>
        <h4 style={{ fontSize: '0.95rem', color: '#4caf50', marginBottom: '10px', fontWeight: 600 }}>🔥 Analisi Termiche</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
          {cards.map((card, i) => (
            <div key={i} style={{ background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '10px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ fontSize: '0.7rem', color: '#8899aa' }}>{card.label}</div>
              <div style={{ fontSize: '1rem', fontWeight: 'bold', color: (card as any).valueColor || '#e8f0f8' }}>{card.value}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: '12px' }}>
        <h4 style={{ fontSize: '0.95rem', color: '#4caf50', marginBottom: '10px', fontWeight: 600 }}>⏰ Sviluppo orario termiche (10:00 - 18:00)</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(9, 1fr)', gap: '4px', overflowX: 'auto' }}>
          {Array.from({ length: 9 }, (_, i) => i + 10).map(hour => {
            const hData = dayData?.find((h: any) => h.time.getHours() === hour);
            if (!hData) return <div key={hour} style={{ textAlign: 'center', padding: '6px 2px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', minWidth: '50px' }}>--</div>;
            const temp = hData.temperature;
            const cloud = hData.cloudCover;
            const hum = hData.humidity;
            const score = (temp > 22 ? 2 : temp > 18 ? 1 : 0) +
                          (cloud < 30 ? 2 : cloud < 50 ? 1 : 0) +
                          (hum < 50 ? 1 : 0);
            const label = score >= 5 ? 'Forte 🔥' : score >= 3 ? 'Media 💪' : score >= 1 ? 'Debole 🫤' : 'Assente ❄️';
            const color = score >= 5 ? '#ff1744' : score >= 3 ? '#ff6d00' : score >= 1 ? '#ffd600' : '#4fc3f7';
            return (
              <div key={hour} style={{ textAlign: 'center', padding: '6px 2px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', minWidth: '50px' }}>
                <div style={{ fontSize: '0.55rem', color: '#8899aa' }}>{String(hour).padStart(2, '0')}:00</div>
                <div style={{ fontSize: '0.7rem', fontWeight: 'bold', color }}>{label}</div>
                <div style={{ fontSize: '0.55rem', color: '#667788' }}>{Math.round(temp)}°C • {Math.round(cloud)}%</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}