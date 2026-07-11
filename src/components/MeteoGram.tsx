"use client";

import React, { useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ChartOptions,
} from 'chart.js';
import { Chart } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
);

interface MeteoGramData {
  hours: string[];
  temperatures: number[];
  capeValues: number[];
  cloudCover: number[];
  precipitation: number[];
  windSpeed: number[];
  windDir: number[];
  humidity: number[];
  dewPoint: number[];
}

interface MeteoGramProps {
  data: MeteoGramData;
  siteName?: string;
  siteAltitude?: number;
  date?: string;
  loading?: boolean;
}

export default function MeteoGram({ 
  data, 
  siteName = "Decollo", 
  siteAltitude = 1500,
  date = new Date().toLocaleDateString('it-IT'),
  loading = false 
}: MeteoGramProps) {
  const chartRef = useRef<any>(null);

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p style={styles.loadingText}>🔄 Caricamento meteogramma...</p>
      </div>
    );
  }

  if (!data || !data.hours || data.hours.length === 0) {
    return (
      <div style={styles.errorContainer}>
        <p style={styles.errorText}>⚠️ Dati non disponibili per il meteogramma</p>
      </div>
    );
  }

  const maxCape = Math.max(...data.capeValues, 1);
  const maxCapeValue = Math.max(...data.capeValues);
  const avgCape = data.capeValues.reduce((a, b) => a + b, 0) / data.capeValues.length;
  const maxTemp = Math.max(...data.temperatures);
  const minTemp = Math.min(...data.temperatures);
  const thermalDelta = maxTemp - minTemp;
  const thermalBase = Math.round(siteAltitude + (thermalDelta * 80));

  const stabilityIndex = maxCapeValue > 1500 ? 'Instabile ⚠️' : 
                         maxCapeValue > 800 ? 'Moderatamente instabile 🟡' : 
                         maxCapeValue > 300 ? 'Stabile 🟢' : 'Molto stabile ✅';

  const thermalStrength = avgCape > 1000 ? 'Forte 🔥' :
                          avgCape > 500 ? 'Media 💪' :
                          avgCape > 200 ? 'Debole 🫤' : 'Assente ❄️';

  const chartData = {
    labels: data.hours,
    datasets: [
      {
        label: 'CAPE (J/kg)',
        data: data.capeValues,
        borderColor: '#ff6b6b',
        backgroundColor: 'rgba(255, 107, 107, 0.2)',
        fill: true,
        tension: 0.4,
        yAxisID: 'y1',
        pointRadius: 3,
        pointBackgroundColor: '#ff6b6b',
        borderWidth: 2,
      },
      {
        label: 'Temperatura (°C)',
        data: data.temperatures,
        borderColor: '#ffd93d',
        backgroundColor: 'rgba(255, 217, 61, 0.1)',
        fill: false,
        tension: 0.4,
        yAxisID: 'y',
        pointRadius: 3,
        pointBackgroundColor: '#ffd93d',
        borderWidth: 2,
      },
      {
        label: 'Punto di Rugiada (°C)',
        data: data.dewPoint || data.temperatures.map(t => t - 3),
        borderColor: '#4fc3f7',
        backgroundColor: 'rgba(79, 195, 247, 0.1)',
        fill: false,
        tension: 0.4,
        yAxisID: 'y',
        pointRadius: 2,
        pointBackgroundColor: '#4fc3f7',
        borderWidth: 1.5,
        borderDash: [5, 5],
      },
      {
        label: 'Nuvolosità (%)',
        data: data.cloudCover,
        borderColor: '#78909c',
        backgroundColor: 'rgba(120, 144, 156, 0.3)',
        fill: true,
        tension: 0.3,
        yAxisID: 'y',
        pointRadius: 2,
        pointBackgroundColor: '#78909c',
        borderWidth: 1,
      },
      {
        label: 'Precipitazioni (mm)',
        data: data.precipitation,
        backgroundColor: 'rgba(33, 150, 243, 0.6)',
        borderColor: '#2196f3',
        borderWidth: 1,
        type: 'bar' as const,
        yAxisID: 'y',
        borderRadius: 4,
        barPercentage: 0.6,
      },
      {
        label: 'Vento (km/h)',
        data: data.windSpeed,
        borderColor: '#00e676',
        backgroundColor: 'rgba(0, 230, 118, 0.1)',
        fill: false,
        tension: 0.3,
        yAxisID: 'y',
        pointRadius: 3,
        pointBackgroundColor: '#00e676',
        borderWidth: 1.5,
        borderDash: [3, 3],
      },
    ],
  };

  const options: ChartOptions<'bar' | 'line'> = {
    responsive: true,
    maintainAspectRatio: true,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: '#eee',
          font: {
            size: 11,
            weight: 'bold',
          },
          padding: 15,
          usePointStyle: true,
          pointStyle: 'circle',
        },
      },
      title: {
        display: true,
        text: `📊 Meteogramma - ${siteName} (${siteAltitude}m) - ${date}`,
        color: '#fff',
        font: {
          size: 16,
          weight: 'bold',
        },
        padding: {
          bottom: 20,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0,0,0,0.8)',
        titleColor: '#fff',
        bodyColor: '#ddd',
        borderColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: function(context: any) {
            let label = context.dataset.label || '';
            let value = context.parsed.y;
            if (context.dataset.label === 'CAPE (J/kg)') {
              return `${label}: ${Math.round(value)} J/kg`;
            }
            if (context.dataset.label === 'Temperatura (°C)') {
              return `${label}: ${Math.round(value)}°C`;
            }
            if (context.dataset.label === 'Nuvolosità (%)') {
              return `${label}: ${Math.round(value)}%`;
            }
            if (context.dataset.label === 'Precipitazioni (mm)') {
              return `${label}: ${Math.round(value * 10) / 10} mm`;
            }
            if (context.dataset.label === 'Vento (km/h)') {
              return `${label}: ${Math.round(value)} km/h`;
            }
            return `${label}: ${Math.round(value)}`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(255,255,255,0.05)',
        },
        ticks: {
          color: '#aaa',
          font: {
            size: 10,
          },
          maxRotation: 45,
          autoSkip: true,
          maxTicksLimit: 15,
        },
      },
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        title: {
          display: true,
          text: 'Temperatura / Nuvolosità / Vento',
          color: '#aaa',
          font: {
            size: 11,
            weight: 'bold',
          },
        },
        grid: {
          color: 'rgba(255,255,255,0.05)',
        },
        ticks: {
          color: '#aaa',
          font: {
            size: 10,
          },
        },
        min: Math.min(
          Math.min(...data.temperatures) - 5,
          0,
          Math.min(...data.cloudCover) - 10,
          Math.min(...data.windSpeed) - 5
        ),
        max: Math.max(
          Math.max(...data.temperatures) + 5,
          Math.max(...data.cloudCover) + 10,
          Math.max(...data.windSpeed) + 5,
          30
        ),
      },
      y1: {
        type: 'linear',
        display: true,
        position: 'right',
        title: {
          display: true,
          text: 'CAPE (J/kg)',
          color: '#ff6b6b',
          font: {
            size: 11,
            weight: 'bold',
          },
        },
        grid: {
          drawOnChartArea: false,
        },
        ticks: {
          color: '#ff6b6b',
          font: {
            size: 10,
          },
          callback: function(value: any) {
            return Math.round(value) + ' J/kg';
          },
        },
        min: 0,
        max: Math.max(Math.max(...data.capeValues) * 1.2, 100),
      },
    },
  };

  return (
    <div style={styles.container}>
      <div style={styles.stabilityContainer}>
        <div style={styles.stabilityCard}>
          <div style={styles.stabilityLabel}>🌪️ Stabilità</div>
          <div style={{
            ...styles.stabilityValue,
            color: maxCapeValue > 1500 ? '#ff1744' : 
                   maxCapeValue > 800 ? '#ff9800' : 
                   maxCapeValue > 300 ? '#4caf50' : '#4fc3f7'
          }}>
            {stabilityIndex}
          </div>
          <div style={styles.stabilitySub}>CAPE max: {Math.round(maxCapeValue)} J/kg</div>
        </div>

        <div style={styles.stabilityCard}>
          <div style={styles.stabilityLabel}>🔥 Termiche</div>
          <div style={{
            ...styles.stabilityValue,
            color: avgCape > 1000 ? '#ff1744' : 
                   avgCape > 500 ? '#ff6d00' : 
                   avgCape > 200 ? '#ffd600' : '#4fc3f7'
          }}>
            {thermalStrength}
          </div>
          <div style={styles.stabilitySub}>CAPE medio: {Math.round(avgCape)} J/kg</div>
        </div>

        <div style={styles.stabilityCard}>
          <div style={styles.stabilityLabel}>🏔️ Base Termica</div>
          <div style={{...styles.stabilityValue, color: '#00e676'}}>
            {thermalBase}m
          </div>
          <div style={styles.stabilitySub}>Delta termico: {Math.round(thermalDelta)}°C</div>
        </div>

        <div style={styles.stabilityCard}>
          <div style={styles.stabilityLabel}>🪂 Galleggiamento</div>
          <div style={{
            ...styles.stabilityValue,
            color: thermalDelta > 10 ? '#4caf50' : 
                   thermalDelta > 6 ? '#ff9800' : '#ff1744'
          }}>
            {thermalDelta > 10 ? 'Eccellente ⭐' : 
             thermalDelta > 6 ? 'Buono 👍' : 'Limitato 🫤'}
          </div>
          <div style={styles.stabilitySub}>Delta termico: {Math.round(thermalDelta)}°C</div>
        </div>
      </div>

      <div style={styles.chartWrapper}>
        <Chart
          ref={chartRef}
          type="bar"
          data={chartData}
          options={options}
        />
      </div>

      <div style={styles.legendContainer}>
        <div style={styles.legendItem}>
          <span style={{ ...styles.legendDot, background: '#ff6b6b' }}></span>
          <span style={styles.legendText}>CAPE - Energia termica</span>
        </div>
        <div style={styles.legendItem}>
          <span style={{ ...styles.legendDot, background: '#ffd93d' }}></span>
          <span style={styles.legendText}>Temperatura</span>
        </div>
        <div style={styles.legendItem}>
          <span style={{ ...styles.legendDot, background: '#4fc3f7' }}></span>
          <span style={styles.legendText}>Punto di rugiada</span>
        </div>
        <div style={styles.legendItem}>
          <span style={{ ...styles.legendDot, background: '#78909c' }}></span>
          <span style={styles.legendText}>Nuvolosità</span>
        </div>
        <div style={styles.legendItem}>
          <span style={{ ...styles.legendDot, background: '#2196f3' }}></span>
          <span style={styles.legendText}>Precipitazioni</span>
        </div>
        <div style={styles.legendItem}>
          <span style={{ ...styles.legendDot, background: '#00e676' }}></span>
          <span style={styles.legendText}>Vento</span>
        </div>
      </div>

      <div style={styles.analysisContainer}>
        <h4 style={styles.analysisTitle}>📋 Analisi Automatica</h4>
        <div style={styles.analysisText}>
          {maxCapeValue > 1500 && (
            <p>⚠️ <strong>CAPE elevato</strong> - Rischio di temporali e turbolenze forti. Volo sconsigliato nelle ore centrali.</p>
          )}
          {maxCapeValue > 800 && maxCapeValue <= 1500 && (
            <p>🟡 <strong>CAPE moderato</strong> - Buona attività termica. Possibili turbolenze, richiesta esperienza.</p>
          )}
          {maxCapeValue > 300 && maxCapeValue <= 800 && (
            <p>🟢 <strong>CAPE stabile</strong> - Termiche moderate, condizioni ideali per volo tranquillo.</p>
          )}
          {maxCapeValue <= 300 && (
            <p>✅ <strong>CAPE basso</strong> - Condizioni stabili, poche termiche. Volo locale consigliato.</p>
          )}
          {thermalDelta > 10 && (
            <p>🔥 <strong>Buon delta termico</strong> ({Math.round(thermalDelta)}°C) - Condizioni favorevoli per cross country.</p>
          )}
          {data.precipitation.some(p => p > 0.5) && (
            <p>🌧️ <strong>Precipitazioni previste</strong> - Valutare attentamente le condizioni prima di volare.</p>
          )}
          {data.windSpeed.some(w => w > 25) && (
            <p>💨 <strong>Vento forte</strong> ({Math.round(Math.max(...data.windSpeed))} km/h) - Volo sconsigliato.</p>
          )}
          {data.cloudCover.some(c => c > 80) && (
            <p>☁️ <strong>Nuvolosità elevata</strong> - Visibilità ridotta, attenzione alle condizioni.</p>
          )}
        </div>
        <div style={styles.analysisAdvice}>
          <strong>🎯 Consiglio:</strong> {
            maxCapeValue > 1500 || Math.max(...data.windSpeed) > 25 || data.precipitation.some(p => p > 0.5)
              ? 'Condizioni sfavorevoli. Sconsigliato volare oggi. ❌'
              : maxCapeValue > 800 && thermalDelta > 8
                ? 'Condizioni favorevoli per cross country! Vola con sicurezza. 🪂'
                : 'Condizioni accettabili. Valuta attentamente prima di volare. ⚠️'
          }
        </div>
      </div>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    background: 'linear-gradient(135deg, #0a0e27 0%, #1a1a3e 50%, #16213e 100%)',
    borderRadius: '16px',
    padding: '20px',
    border: '1px solid rgba(255,255,255,0.08)',
    maxWidth: '100%',
    overflow: 'hidden',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px',
    minHeight: '300px',
    background: 'rgba(0,0,0,0.3)',
    borderRadius: '12px',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid rgba(255,255,255,0.1)',
    borderTopColor: '#ff6b6b',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  loadingText: {
    marginTop: '15px',
    color: '#aaa',
    fontSize: '0.9rem',
  },
  errorContainer: {
    padding: '30px',
    textAlign: 'center',
    background: 'rgba(255,107,107,0.1)',
    borderRadius: '12px',
    border: '1px solid rgba(255,107,107,0.3)',
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: '1rem',
  },
  stabilityContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '12px',
    marginBottom: '20px',
  },
  stabilityCard: {
    background: 'rgba(0,0,0,0.3)',
    padding: '12px 16px',
    borderRadius: '10px',
    border: '1px solid rgba(255,255,255,0.05)',
    textAlign: 'center',
  },
  stabilityLabel: {
    fontSize: '0.75rem',
    color: '#888',
    fontWeight: 500,
    marginBottom: '4px',
  },
  stabilityValue: {
    fontSize: '1.1rem',
    fontWeight: 'bold',
    color: '#fff',
  },
  stabilitySub: {
    fontSize: '0.65rem',
    color: '#666',
    marginTop: '2px',
  },
  chartWrapper: {
    position: 'relative',
    height: '400px',
    width: '100%',
    marginBottom: '15px',
  },
  legendContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '12px',
    justifyContent: 'center',
    padding: '10px',
    background: 'rgba(0,0,0,0.2)',
    borderRadius: '8px',
    marginBottom: '15px',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '0.7rem',
    color: '#aaa',
  },
  legendDot: {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    display: 'inline-block',
  },
  legendText: {
    fontSize: '0.7rem',
    color: '#aaa',
  },
  analysisContainer: {
    background: 'rgba(0,0,0,0.3)',
    padding: '15px 18px',
    borderRadius: '10px',
    border: '1px solid rgba(255,255,255,0.05)',
  },
  analysisTitle: {
    fontSize: '0.9rem',
    color: '#4fc3f7',
    marginBottom: '8px',
    fontWeight: 600,
  },
  analysisText: {
    fontSize: '0.8rem',
    color: '#ddd',
    lineHeight: '1.6',
  },
  analysisAdvice: {
    marginTop: '10px',
    paddingTop: '10px',
    borderTop: '1px solid rgba(255,255,255,0.05)',
    fontSize: '0.85rem',
    color: '#ffd93d',
  },
};