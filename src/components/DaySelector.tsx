"use client";

import React from "react";
import { getWeatherIcon } from "@/utils/weatherHelpers";

interface DaySelectorProps {
  enrichedDaily: any[];
  dateLabels: string[];
  selectedDay: number;
  onSelect: (idx: number) => void;
}

export default function DaySelector({ enrichedDaily, dateLabels, selectedDay, onSelect }: DaySelectorProps) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '12px' }}>
      {enrichedDaily.map((day: any, idx: number) => (
        <button
          key={idx}
          onClick={() => onSelect(idx)}
          style={{
            border: `2px solid ${selectedDay === idx ? '#4caf50' : 'rgba(255,255,255,0.1)'}`,
            borderRadius: '12px', padding: '8px', cursor: 'pointer', textAlign: 'center',
            background: selectedDay === idx ? 'rgba(76, 175, 80, 0.2)' : 'rgba(255,255,255,0.03)',
          }}
        >
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#e8f0f8' }}>{dateLabels[idx]}</div>
          <div style={{ fontSize: '1.6rem', marginTop: '2px' }}>{getWeatherIcon(day.weatherCode, 1)}</div>
          <div style={{ fontSize: '0.95rem', color: '#4caf50', fontWeight: 600 }}>{Math.round(day.tempMax)}°/{Math.round(day.tempMin)}°</div>
          <div style={{ fontSize: '0.7rem', color: '#8899aa' }}>Δ{day.thermalDelta}°C</div>
          <div style={{ fontSize: '0.7rem', color: '#4fc3f7' }}>{day.precipitationSum > 0 ? `🌧️${Math.round(day.precipitationSum)}mm` : '☀️'}</div>
        </button>
      ))}
    </div>
  );
}