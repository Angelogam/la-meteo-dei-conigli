"use client";

import React from "react";

interface DecolloItem {
  nome: string;
  valle: string;
  quota: number;
  direzione: string;
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
        padding: "14px",
        borderRadius: "12px",
        color: "white",
        width: "100%",
        maxWidth: "420px",
        margin: "0 auto",
      }}
    >
      <h2 style={{ marginBottom: "10px", fontSize: "1.2rem" }}>
        Decolli disponibili ({decolli.length})
      </h2>

      <div
        style={{
          maxHeight: "420px",
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
                background: isSelected ? "#1a3a2a" : "#222",
                border: isSelected ? "1px solid #10b981" : "none",
                borderRadius: "8px",
                padding: "10px",
                marginBottom: "8px",
                textAlign: "left",
                color: "white",
                cursor: "pointer",
              }}
            >
              <div style={{ fontSize: "1rem", fontWeight: "bold" }}>
                {item.nome}
              </div>

              <div
                style={{
                  fontSize: "0.8rem",
                  opacity: 0.8,
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <span>{item.valle}</span>
                <span>{item.quota}m</span>
                <span>{item.direzione}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default DecolliCard;