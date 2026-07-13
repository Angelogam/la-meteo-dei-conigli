"use client";

import React from "react";

interface HourSliderProps {
  selectedHour: number;
  onChange: (hour: number) => void;
}

export default function HourSlider({ selectedHour, onChange }: HourSliderProps) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '12px',
      padding: '8px 12px', background: 'rgba(255,255,255,0.04)',
      borderRadius: '10px', marginBottom: '12px',
    }}>
      <span style={{ fontSize: '0.85rem', color: '#8899aa' }}>⏰ Ora:</span>
      <input
        type="range"
        min="0"
        max="23"
        value={selectedHour}
        onChange={(e) => onChange(parseInt(e.target.value))}
        style={{ flex: 1, accentColor: '#4caf50', height: '4px' }}
      />
      <span style={{ fontSize: '0.85rem', fontWeight: 'bold', minWidth: '44px', textAlign: 'center' }}>
        {String(selectedHour).padStart(2, '0')}:00
      </span>
    </div>
  );
}