"use client";

import React from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface WindGramData {
  hours: string[];
  gradient: number[];
  windSpeed: number[];
  cloudBase: number[];
  zeroThermic: number[];
  cloudCover: number[];
  windDir: number[];
  date?: string;
}

interface WindGramUltimateProps {
  data: WindGramData;
}

const WindGramUltimate = ({ data }: WindGramUltimateProps) => {
  const chartData = {
    labels: data.hours,
    datasets: [
      {
        label: "Instabilità termica",
        data: data.gradient,
        borderColor: "rgba(255,120,0,0.9)",
        backgroundColor: (ctx: any) => {
          const chart = ctx.chart;
          if (!chart?.ctx) return "rgba(255,120,0,0.3)";
          const g = chart.ctx.createLinearGradient(0, 0, 0, 400);
          g.addColorStop(0, "rgba(255,0,0,0.6)");
          g.addColorStop(0.5, "rgba(255,200,0,0.4)");
          g.addColorStop(1, "rgba(0,120,255,0.3)");
          return g;
        },
        fill: true,
        tension: 0.4,
        yAxisID: "y1",
      },
      {
        label: "Quota base cumulo (m)",
        data: data.cloudBase,
        borderColor: "#66ff99",
        borderDash: [4, 4],
        pointStyle: "circle" as const,
        yAxisID: "y1",
      },
      {
        label: "Zero termico (m)",
        data: data.zeroThermic,
        borderColor: "#ffffff",
        borderWidth: 2,
        yAxisID: "y1",
      },
      {
        label: "Vento (km/h)",
        data: data.windSpeed,
        borderColor: "#3399ff",
        borderDash: [2, 2],
        pointBackgroundColor: "#3399ff",
        yAxisID: "y2",
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y1: {
        type: "linear" as const,
        position: "left" as const,
        title: { display: true, text: "Quota (m)", color: "#fff" },
        grid: { color: "rgba(255,255,255,0.1)" },
        ticks: { color: "#fff" },
      },
      y2: {
        type: "linear" as const,
        position: "right" as const,
        title: { display: true, text: "Vento (km/h)", color: "#fff" },
        grid: { drawOnChartArea: false },
        ticks: { color: "#fff" },
      },
    },
    plugins: {
      legend: {
        position: "bottom" as const,
        labels: { color: "#fff", boxWidth: 12, font: { size: 12 } },
      },
      title: {
        display: true,
        text: `WindGram MeteoConigli – ${data.date || ""}`,
        color: "#fff",
        font: { size: 18, weight: "bold" as const },
      },
      tooltip: {
        backgroundColor: "rgba(0,0,0,0.7)",
        titleColor: "#fff",
        bodyColor: "#fff",
        borderColor: "#ff9933",
        borderWidth: 1,
      },
    },
  };

  return (
    <div
      style={{
        background: "linear-gradient(180deg,#001a33 0%,#000000 100%)",
        borderRadius: "12px",
        padding: "10px",
        height: "480px",
        color: "#fff",
        position: "relative",
      }}
    >
      <Line data={chartData} options={options} />

      {/* Nuvole + frecce vento */}
      <div
        style={{
          position: "absolute",
          top: "50px",
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "space-around",
          fontSize: "1rem",
          pointerEvents: "none",
        }}
      >
        {data.hours.map((h, i) => (
          <div key={i} style={{ textAlign: "center" }}>
            <div style={{ opacity: 0.9 }}>
              {data.cloudBase[i] > 3000
                ? "☁️"
                : data.cloudBase[i] > 1500
                ? "🌤️"
                : "☀️"}
            </div>
            <div
              style={{
                transform: `rotate(${data.windDir[i]}deg)`,
                display: "inline-block",
                fontSize: "1.2rem",
              }}
            >
              ➤
            </div>
            <div style={{ fontSize: "0.8rem" }}>
              {data.windSpeed[i]} km/h
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default WindGramUltimate;