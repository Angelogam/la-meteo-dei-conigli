"use client";

import React from "react";

interface DecolloItem {
  nome: string;
  valle: string;
  quota: number;
  direzione: string;
  vento: number;
  iconaMeteo: string;
  coloreMeteo: string;
}

interface DecolliCardProps {
  decolli: DecolloItem[];
  selectedId: string;
  onSelect: (item: DecolloItem) => void;
  weatherMap?: Record<string, any>;
}

const DecolliCard = ({ decolli, selectedId, onSelect }: DecolliCardProps) => {
  return (
    <div
      style={{
        background: "#111",
        padding: "16px",
        borderRadius: "14px",
        color: "white",
        width: "100%",
        maxWidth: "420px",
        margin: "0 auto",
        boxShadow: "0 0 12px rgba(0,0,0,0.4)",
      }}
    >
      <h2 style={{ marginBottom: "12px", fontSize: "1.3rem", fontWeight: "bold" }}>
        Decolli disponibili ({decolli.length})
      </h2>

      <div
        style={{
          maxHeight: "160px",
          overflowY: "auto",
          paddingRight: "6px",
        }}
      >
        {decolli.map((item) => {
          const isSelected = item.nome === selectedId;
          return (
            <button
              key={item.nome}
              onClick={() => onSelect(item)}
              style={{
                width: "100%",
                background: isSelected
                  ? "#1a3a2a"
                  : item.coloreMeteo,
                border: isSelected ? "2px solid #10b981" : "none",
                borderRadius: "10px",
                padding: "12px",
                marginBottom: "10px",
                textAlign: "left",
                color: "white",
                cursor: "pointer",
                transition: "0.2s",
              }}
            >
              {/* NOME DECOLLO */}
              <div style={{ fontSize: "1.05rem", fontWeight: "bold" }}>
                {item.nome}
              </div>

              {/* INFO VALLE / QUOTA / DIREZIONE */}
              <div
                style={{
                  fontSize: "0.85rem",
                  opacity: 0.9,
                  display: "flex",
                  justifyContent: "space-between",
                  marginTop: "4px",
                }}
              >
                <span>{item.valle}</span>
                <span>{item.quota} m</span>
                <span>{item.direzione}</span>
              </div>

              {/* METEO ICONA + VENTO */}
              <div
                style={{
                  marginTop: "6px",
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "0.9rem",
                }}
              >
                <span>{item.iconaMeteo}</span>
                <span>{item.vento} km/h</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default DecolliCard;