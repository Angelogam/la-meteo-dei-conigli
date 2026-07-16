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

// Icone meteo dinamiche
const WeatherIcon = ({ cover }: { cover: number }) => {
  if (cover < 20) return <span>☀️</span>;
  if (cover < 50) return <span>🌤️</span>;
  if (cover < 80) return <span>⛅</span>;
  return <span>☁️</span>;
};

// Freccia direzione vento
const WindArrow = ({ dir }: { dir: string }) => {
  const rotation: Record<string, number> = {
    N: 180,
    NE: 225,
    E: 270,
    SE: 315,
    S: 0,
    SW: 45,
    W: 90,
    NW: 135,
  };
  const deg = rotation[dir] || 0;

  return (
    <span
      style={{
        display: "inline-block",
        transform: `rotate(${deg}deg)`,
        fontSize: "1.2rem",
      }}
    >
      ➤
    </span>
  );
};

interface WindGramData {
  hours: string[];
  gradient: number[];
  windSpeed: number[];
  cloudBase: number[];
  zeroThermic: number[];
  cloudCover: number[];
  windDir: string[];
}

interface WindGramProProps {
  data: WindGramData;
}

const WindGramPro = ({ data }: WindGramProProps) => {
  const chartData = {
    labels: data.hours,
    datasets: [
      {
        label: "Gradiente termico (°C/100m)",
        data: data.gradient,
        borderColor: "rgba(255, 80, 0, 0.9)",
        backgroundColor: "rgba(255, 80, 0, 0.3)",
        fill: true,
        tension: 0.4,
        yAxisID: "y1",
      },
      {
        label: "Vento (km/h)",
        data: data.windSpeed,
        borderColor: "rgba(0, 120, 255, 0.9)",
        borderDash: [5, 5],
        pointStyle: "rectRot",
        yAxisID: "y2",
      },
      {
        label: "Quota base cumulo (m)",
        data: data.cloudBase,
        borderColor: "rgba(0, 255, 150, 0.9)",
        borderDash: [3, 3],
        yAxisID: "y1",
      },
      {
        label: "Zero termico (m)",
        data: data.zeroThermic,
        borderColor: "rgba(255, 255, 255, 1)",
        borderWidth: 2,
        yAxisID: "y1",
      },
      {
        label: "Copertura nuvolosa (%)",
        data: data.cloudCover,
        borderColor: "rgba(200, 200, 200, 0.8)",
        backgroundColor: "rgba(200, 200, 200, 0.3)",
        fill: true,
        yAxisID: "y3",
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
        title: { display: true, text: "Quota (m)" },
        grid: { color: "rgba(255,255,255,0.1)" },
      },
      y2: {
        type: "linear" as const,
        position: "right" as const,
        title: { display: true, text: "Vento (km/h)" },
        grid: { drawOnChartArea: false },
      },
      y3: {
        type: "linear" as const,
        display: false,
      },
    },
    plugins: {
      legend: { position: "bottom" as const, labels: { color: "#fff" } },
      title: {
        display: true,
        text: "WindGram MeteoConigli",
        color: "#fff",
        font: { size: 18, weight: "bold" as const },
      },
      tooltip: {
        mode: "index" as const,
        intersect: false,
        backgroundColor: "rgba(0,0,0,0.7)",
        titleColor: "#fff",
        bodyColor: "#fff",
      },
    },
  };

  return (
    <div
      style={{
        background: "linear-gradient(180deg, #ff6600 0%, #ff3300 100%)",
        borderRadius: "12px",
        padding: "10px",
        height: "420px",
        color: "#fff",
      }}
    >
      <Line data={chartData} options={options} />

      {/* Barra icone meteo + vento */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-around",
          marginTop: "10px",
          fontSize: "1rem",
        }}
      >
        {data.hours.map((h, i) => (
          <div key={i} style={{ textAlign: "center" }}>
            <div>{h}</div>
            <WeatherIcon cover={data.cloudCover[i]} />
            <WindArrow dir={data.windDir[i]} />
            <div style={{ fontSize: "0.8rem" }}>{data.windSpeed[i]} km/h</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default WindGramPro;