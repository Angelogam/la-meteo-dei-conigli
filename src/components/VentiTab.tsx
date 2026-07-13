"use client";

import React from "react";
import { getWindArrow, getWindDirection, getWeatherIcon } from "@/utils/weatherHelpers";

interface VentiTabProps {
  currentData: any;
  dayData: any[];
  windProfile: { alt: number; speed: number; dir: number; dirName: string }[];
}

export default function VentiTab({ currentData, dayData, windProfile }: VentiTabProps) {
  if (!currentData) return null;

  const windCards = [
    { label: '10 m (superficie)', speed: currentData.windSpeed, dir: currentData.windDir, gust: currentData.windGust, full: true },
    { label: '80 m (quota termica)', speed: currentData.wind80m, dir: currentData.windDir80m, gust: currentData.wind80m ? currentData.wind80m * 1.3 : null, full: !!currentData.wind80m },
    { label: '120 m (alta quota)', speed: currentData.wind120m, dir: currentData.windDir120m, gust: currentData.wind120m ? currentData.wind120m * 1.35 : null, full: !!currentData.wind120m },
  ];

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <div style={{ marginBottom: '12px' }}>
        <h4 style={{ fontSize: '0.95rem', color: '#4caf50', marginBottom: '10px', fontWeight: 600 }}>💨 Vento a differenti quote</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
          {windCards.map((w, i) => (
            <div key={i} style={{ textAlign: 'center', padding: '10px', background: 'rgba(0,0,0,0.2)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ fontSize: '0.7rem', color: '#8899aa' }}>{w.label}</div>
              <div style={{ fontSize: '1rem', fontWeight: 'bold', color: '#e8f0f8' }}>
                {w.full ? `${getWindArrow(w.dir)} ${Math.round(w.speed)} km/h` : 'N/D'}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#8899aa' }}>{w.full ? getWindDirection(w.dir) : '--'}</div>
              <div style={{ fontSize: '0.7rem', color: '#ff6b6b' }}>⚡ {w.gust ? `${Math.round(w.gust)} km/h` : '--'}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: '12px' }}>
        <h4 style={{ fontSize: '0.95rem', color: '#4caf50', marginBottom: '10px', fontWeight: 600 }}>📊 Profilo Vento (400m - 4000m)</h4>
        <div style={{
          background: 'rgba(0,0,0,0.2)', padding: '8px', borderRadius: '10px',
          maxHeight: '200px', overflowY: 'auto',
        }}>
          {windProfile.map((level, idx) => {
            const maxSpeed = currentData.windSpeed * 3.5;
            const width = Math.min(100, (level.speed / maxSpeed) * 100);
            const barColor = width < 30 ? '#4caf50' : width < 50 ? '#8bc34a' : width < 70 ? '#ff9800' : width < 90 ? '#ff5722' : '#f44336';
            return (
              <div key={idx} style={{ display: 'grid', gridTemplateColumns: '50px 1fr 50px', gap: '6px', alignItems: 'center', padding: '2px 4px', fontSize: '0.7rem' }}>
                <span style={{ color: '#8899aa' }}>{level.alt}m</span>
                <div style={{ height: '16px', background: 'rgba(255,255,255,0.06)', borderRadius: '10px', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: '10px', display: 'flex', alignItems: 'center',
                    justifyContent: 'flex-end', paddingRight: '4px', minWidth: '30px',
                    width: `${width}%`, background: barColor,
                  }}>
                    <span style={{ fontSize: '0.55rem', color: '#fff', fontWeight: 'bold', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
                      {level.speed} km/h
                    </span>
                  </div>
                </div>
                <span style={{ color: '#8899aa', textAlign: 'center' }}>{getWindArrow(level.dir)} {level.dirName}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ marginBottom: '12px' }}>
        <h4 style={{ fontSize: '0.95rem', color: '#4caf50', marginBottom: '10px', fontWeight: 600 }}>📊 Vento orario (9:00 - 19:00)</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(11, 1fr)', gap: '2px', overflowX: 'auto' }}>
          {Array.from({ length: 11 }, (_, i) => i + 9).map(hour => {
            const hData = dayData?.find((h: any) => h.time.getHours() === hour);
            if (!hData) return <div key={hour} style={{ textAlign: 'center', padding: '6px 2px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', minWidth: '40px' }}>--</div>;
            return (
              <div key={hour} style={{ textAlign: 'center', padding: '6px 2px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', minWidth: '40px' }}>
                <div style={{ fontSize: '0.55rem', color: '#8899aa' }}>{String(hour).padStart(2, '0')}:00</div>
                <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#e8f0f8' }}>{getWindArrow(hData.windDir)} {Math.round(hData.windSpeed)}</div>
                <div style={{ fontSize: '0.5rem', color: '#667788' }}>{getWindDirection(hData.windDir)}</div>
                <div style={{ fontSize: '0.7rem' }}>{getWeatherIcon(hData.weatherCode || 0, hData.isDay || 1)}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}