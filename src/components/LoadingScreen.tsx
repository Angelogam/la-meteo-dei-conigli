"use client";

import React from "react";

export default function LoadingScreen() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', background: 'linear-gradient(145deg, #1a2a3a, #0d1b2a)'
    }}>
      <div style={{
        width: '48px', height: '48px',
        border: '4px solid rgba(76, 175, 80, 0.2)',
        borderTopColor: '#4caf50',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
      }} />
      <p style={{ marginTop: '16px', fontSize: '1.2rem', color: '#e8f0f8' }}>🪂 Caricamento previsioni meteo...</p>
      <p style={{ fontSize: '0.9rem', color: '#8899aa' }}>Sto cercando le migliori fonti per te</p>
    </div>
  );
}