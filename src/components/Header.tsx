"use client";

import React from "react";

export const Header = () => {
  return (
    <header className="app-brand-header">
      <div className="app-brand-inner">
        <a className="app-brand-mark" href="#overview" aria-label="La Meteo dei Conigli, home">
          <img src="/logo.svg" alt="" className="app-brand-logo" />
          <span className="app-brand-copy">
            <strong>La Meteo dei Conigli</strong>
            <small>METEO · AEROLOGIA · VOLO LIBERO</small>
          </span>
        </a>
        <div className="app-brand-status">
          <span className="app-status-dot" />
          <span>Analisi meteo per il volo</span>
        </div>
      </div>
    </header>
  );
};
