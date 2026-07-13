"use client";

import React from "react";
import { getWeatherIcon } from "@/utils/weatherHelpers";

interface SiteHeaderProps {
  name: string;
  exposure: string;
  valley: string;
  alt: number;
  currentData: any;
}

export default function SiteHeader({ name, exposure, valley, alt, currentData }: SiteHeaderProps) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      flexWrap: 'wrap', marginBottom: '12px', paddingBottom: '12px',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
    }}>
      <div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#e8f0f8' }}>{name}</h2>
        <span style={{ fontSize: '0.8rem', color: '#8899aa' }}>{exposure} • {valley} • {alt}m</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(76, 175, 80, 0.12)', padding: '6px 14px', borderRadius: '30px' }}>
        <span style={{ fontSize: '2rem' }}>{currentData ? getWeatherIcon(currentData.weatherCode || 0, currentData.isDay || 1) : '☁️'}</span>
        <span style={{ fontSize: '1.4rem', fontWeight: 'bold' }}>{currentData ? Math.round(currentData.temperature) : '--'}°C</span>
      </div>
    </div>
  );
}