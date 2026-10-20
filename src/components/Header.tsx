"use client";

import React from "react";
import { Settings, User, CloudSun, Wind, Droplets, Mountain } from "lucide-react";
import type { MeteoCurrent } from "@/services/openMeteoService";

interface HeaderProps {
  siteName?: string;
  siteAlt?: number;
  currentData?: MeteoCurrent | null;
}

function getWindDir(deg: number): string {
  const dirs = ["N", "NE", "E", "SE", "S", "SO", "O", "NO"];
  return dirs[Math.round(((deg % 360) + 360) % 360 / 45) % 8];
}

export function Header({ siteName, siteAlt, currentData }: HeaderProps) {
  const temp = currentData?.temperature;
  const windSpeed = currentData?.windSpeed;
  const windDir = currentData?.windDir;
  const rain = currentData?.precipitation;
  const now = new Date();
  const timeStr = now.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });

  return (
    <header className="app-topbar">
      <div className="app-topbar-left">
        {/* Logo */}
        <a href="#" className="app-logo">
          <Mountain size={22} />
          <span className="app-logo-text">
            <strong>La Meteo dei Conigli</strong>
            <small>Vola con le giuste condizioni</small>
          </span>
        </a>
      </div>

      {/* Center nav */}
      <nav className="app-topbar-nav" aria-label="Navigazione principale">
        {[
          { id: "home", label: "Home", icon: "🏠" },
          { id: "meteo", label: "Meteo", icon: "☁️" },
          { id: "decolli", label: "Decolli", icon: "🪂" },
          { id: "mappa", label: "Mappa", icon: "🗺️" },
          { id: "info", label: "Info", icon: "ℹ️" },
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            className={`app-nav-item${item.id === "home" ? " is-active" : ""}`}
          >
            <span className="app-nav-icon">{item.icon}</span>
            {item.label}
            {item.id === "home" && <span className="app-nav-indicator" />}
          </button>
        ))}
      </nav>

      {/* Right - live weather + user */}
      <div className="app-topbar-right">
        <div className="app-location-badge">
          <CloudSun size={14} className="app-weather-icon" />
          <span className="app-location-name">{siteName || "Valle Po"}</span>
          <span className="app-weather-temp">
            {temp !== null && temp !== undefined ? `${Math.round(temp)}°C` : "—"}
          </span>
          <span className="app-weather-wind">
            {windSpeed !== null && windSpeed !== undefined
              ? `⚡ ${Math.round(windSpeed)} km/h ${windDir !== null && windDir !== undefined ? getWindDir(windDir) : ""}`
              : "—"}
          </span>
        </div>
        <div className="app-topbar-time">{timeStr}</div>
        <button type="button" className="app-icon-btn" aria-label="Utente"><User size={16} /></button>
        <button type="button" className="app-icon-btn" aria-label="Impostazioni"><Settings size={16} /></button>
      </div>
    </header>
  );
}
