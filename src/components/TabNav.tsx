"use client";

import React from "react";

type Tab = 'meteo' | 'venti' | 'termiche' | 'analisi';

interface TabNavProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

const tabs: { id: Tab; label: string }[] = [
  { id: 'meteo', label: '🌤️ Meteo' },
  { id: 'venti', label: '💨 Venti' },
  { id: 'termiche', label: '🔥 Termiche' },
  { id: 'analisi', label: '🤖 Analisi' },
];

export default function TabNav({ activeTab, onTabChange }: TabNavProps) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px', marginBottom: '12px' }}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          style={{
            padding: '8px 4px', borderRadius: '8px 8px 0 0',
            border: 'none', color: '#e8f0f8', cursor: 'pointer',
            fontSize: '0.8rem', fontWeight: 500, textAlign: 'center',
            background: activeTab === tab.id ? 'rgba(76, 175, 80, 0.2)' : 'transparent',
            borderBottom: activeTab === tab.id ? '2px solid #4caf50' : '2px solid transparent',
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}