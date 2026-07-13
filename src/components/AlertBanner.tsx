"use client";

import React from "react";

interface AlertBannerProps {
  alert: { level: string; message: string; icon: string };
}

export default function AlertBanner({ alert }: AlertBannerProps) {
  const bgMap: Record<string, string> = {
    danger: 'rgba(255, 23, 68, 0.2)',
    warning: 'rgba(255, 152, 0, 0.2)',
    success: 'rgba(76, 175, 80, 0.15)',
    info: 'rgba(33, 150, 243, 0.15)',
  };
  const borderMap: Record<string, string> = {
    danger: '#ff1744',
    warning: '#ff9800',
    success: '#4caf50',
    info: '#2196f3',
  };

  return (
    <div style={{
      padding: '10px 14px', borderRadius: '10px', border: '2px solid',
      marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '10px',
      background: bgMap[alert.level] || bgMap.info,
      borderColor: borderMap[alert.level] || borderMap.info,
    }}>
      <span style={{ fontSize: '1.4rem' }}>{alert.icon}</span>
      <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{alert.message}</span>
    </div>
  );
}