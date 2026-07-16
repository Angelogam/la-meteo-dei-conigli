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
  windDir: string[];
}

interface WindGramProCleanProps {
  data: WindGramData;
}

const WindGramProClean = ({ data }: WindGramProCleanProps) => {
  const chartData = {
    labels: data.hours,
    datasets: [
      {
        label: "Gradiente termico (°C/100m)",
        data: data.gradient,
        borderColor: "#ff9933",
        backgroundColor: "rgba(255,153,51,0.2)",
        fill: true,
        tension: 0.4,
        yAxisID: "y1",
      },
      {
        label: "Vento (km/h)",
        data: data.windSpeed,
        borderColor: "#3399ff",
        borderDash: [4, 4],
        pointBackgroundColor: "#3399ff",
        yAxisID: "y2",
      },
      {
        label: "Quota base cumulo (m)",
        data: data.cloudBase,
        borderColor: "#66cc66",
        borderDash: [2, 2],
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
        label: "Copertura nuvolosa (%)",
        data: data.cloudCover,
        borderColor: "rgba(180,180,180,0.6)",
        backgroundColor: "rgba(180,180,180,0.3)",
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
      y3: { display: false },
    },
    plugins: {
      legend: {
        position: "bottom" as const,
        labels: { color: "#fff", boxWidth: 12, font: { size: 12 } },
      },
      title: {
        display: true,
        text: "WindGram MeteoConigli",
        color: "#fff",
        font: { size: 18, weight: "bold" as const },
      },
      tooltip: {
        backgroundColor: "rgba(0,0,0,0.6)",
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
        background: "linear-gradient(180deg, #1a1a1a 0%, #000000 100%)",
        borderRadius: "12px",
        padding: "10px",
        height: "420px",
        color: "#fff",
      }}
    >
      <Line data={chartData} options={options} />

      <div
        style={{
          display: "flex",
          justifyContent: "space-around",
          marginTop: "10px",
          fontSize: "0.9rem",
        }}
      >
        {data.hours.map((h, i) => (
          <div key={i} style={{ textAlign: "center" }}>
            <div>{h}</div>
            <div style={{ fontSize: "1rem" }}>
              {data.cloudCover[i] < 20
                ? "☀️"
                : data.cloudCover[i] < 50
                ? "🌤️"
                : data.cloudCover[i] < 80
                ? "⛅"
                : "☁️"}
            </div>
            <div style={{ fontSize: "0.8rem" }}>{data.windSpeed[i]} km/h</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default WindGramProClean;