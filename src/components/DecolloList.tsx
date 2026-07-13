"use client";

import React from "react";
import { getWeatherIcon } from "@/utils/weatherHelpers";

interface DecolloListProps {
  decolli: { id: string; name: string; valley: string; exposure: string; alt: number }[];
  selectedId: string;
  onSelect: (id: string) => void;
  currentData: any;
}

function getFlightRating(temp: number, windSpeed: number, cloudCover: number, precipitation: number): { label: string; color: string; icon: string } {
  let score = 0;

  // Temperature (ideal 20-30°C)
  if (temp >= 20 && temp <= 30) score += 3;
  else if (temp >= 15 && temp < 20) score += 2;
  else if (temp >= 10 && temp < 15) score += 1;

  // Wind speed (ideal 8-20 km/h)
  if (windSpeed >= 8 && windSpeed <= 20) score += 3;
  else if (windSpeed >= 5 && windSpeed < 8) score += 2;
  else if (windSpeed >= 20 && windSpeed <= 25) score += 1;
  else if (windSpeed > 25) score -= 1;

  // Cloud cover (ideal 10-40%)
  if (cloudCover >= 10 && cloudCover <= 40) score += 3;
  else if (cloudCover >= 0 && cloudCover < 10) score += 2;
  else if (cloudCover > 40 && cloudCover <= 60) score += 1;
  else if (cloudCover > 60) score -= 1;

  // Precipitation
  if (precipitation === 0) score += 2;
  else if (precipitation > 0 && precipitation <= 1) score += 1;
  else score -= 1;

  if (score >= 8) return { label: "Ottimo", color: "#4caf50", icon: "🟢" };
  if (score >= 5) return { label: "Buono", color: "#8bc34a", icon: "🟡" };
  if (score >= 2) return { label: "Medio", color: "#ff9800", icon: "🟠" };
  return { label: "Scarso", color: "#f44336", icon: "🔴" };
}

export default function DecolloList({ decolli, selectedId, onSelect, currentData }: DecolloListProps) {
  const rating = currentData
    ? getFlightRating(currentData.temperature, currentData.windSpeed, currentData.cloudCover, currentData.precipitation)
    : null;

  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)', borderRadius: '16px',
      border: '2px solid rgba(76, 175, 80, 0.25)', padding: '12px',
      height: 'calc(100vh - 200px)', overflow: 'hidden',
      backdropFilter: 'blur(8px)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h2 style={{ fontSize: '1.1rem', color: '#4caf50', fontWeight: 600 }}>📍 Decolli</h2>
        {rating && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            background: 'rgba(0,0,0,0.2)', padding: '4px 10px', borderRadius: '8px',
            fontSize: '0.8rem', fontWeight: 600, color: rating.color,
          }}>
            <span>{rating.icon}</span>
            <span>{rating.label} per il volo</span>
          </div>
        )}
      </div>
      <div style={{ overflowY: 'auto', height: 'calc(100% - 56px)', paddingRight: '4px' }}>
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