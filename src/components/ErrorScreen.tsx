"use client";

import React from "react";

interface ErrorScreenProps {
  error: string;
  onRetry: () => void;
}

export default function ErrorScreen({ error, onRetry }: ErrorScreenProps) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', padding: '20px', background: 'linear-gradient(145deg, #1a2a3a, #0d1b2a)'
    }}>
      <p style={{ color: '#ff6b6b', fontSize: '1.1rem', marginBottom: '16px', textAlign: 'center' }}>❌ {error}</p>
      <button
        onClick={onRetry}
        style={{
          background: '#4caf50', color: '#fff', border: 'none',
          padding: '10px 24px', borderRadius: '8px', cursor: 'pointer',
          fontSize: '1rem', fontWeight: 600
        }}
      >
        🔄 Riprova
      </button>
    </div>
  );
}