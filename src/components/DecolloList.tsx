"use client";

import React from "react";
import { getWeatherIcon } from "@/utils/weatherHelpers";

interface DecolloListProps {
  decolli: { id: string; name: string; valley: string; exposure: string; alt: number }[];
  selectedId: string;
  onSelect: (id: string) => void;
  currentData: any;
}

export default function DecolloList({ decolli, selectedId, onSelect, currentData }: DecolloListProps) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)', borderRadius: '16px',
      border: '2px solid rgba(76, 175, 80, 0.25)', padding: '12px',
      height: 'calc(100vh - 200px)', overflow: 'hidden',
      backdropFilter: 'blur(8px)',
    }}>
      <h2 style={{ fontSize: '1.1rem', color: '#4caf50', marginBottom: '12px', fontWeight: 600 }}>📍 Decolli</h2>
      <div style={{ overflowY: 'auto', height: 'calc(100% - 44px)', paddingRight: '4px' }}>
        {decolli.map((d) => {
          const isSelected = d.id === selectedId;
          let weatherIcon = '☁️';
          if (isSelected && currentData) {
            weatherIcon = getWeatherIcon(currentData.weatherCode || 0, currentData.isDay || 1);
          }
          return (
            <button
              key={d.id}
              onClick={() => onSelect(d.id)}
              style={{
                width: '100%', textAlign: 'left',
                background: isSelected ? 'rgba(76, 175, 80, 0.15)' : 'rgba(255,255,255,0.03)',
                border: `2px solid ${isSelected ? '#4caf50' : 'rgba(255,255,255,0.1)'}`,
                borderRadius: '12px', padding: '10px 12px', marginBottom: '8px',
                cursor: 'pointer', transition: 'all 0.2s ease',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.95rem', fontWeight: 600, color: '#e8f0f8' }}>{d.name}</span>
                <span style={{ fontSize: '1.3rem' }}>{weatherIcon}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#8899aa', marginTop: '2px' }}>
                <span>{d.valley}</span>
                <span>{d.exposure} • {d.alt}m</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}