"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";

// ----------------------------------------------------------------
// 1. LISTA DECOLLI
// ----------------------------------------------------------------
const DECOLLI = [
  { id: "malanotte", name: "Malanotte", lat: 44.25874571728482, lon: 7.794304664370852, exposure: "S/SE", alt: 1740, valley: "Valle Infernotto" },
  { id: "colle_tenda", name: "Colle di Tenda", lat: 44.15093973937469, lon: 7.569262924652476, exposure: "S", alt: 1990, valley: "Valle Roya/Vermenagna" },
  { id: "boves", name: "Boves", lat: 44.32113720462757, lon: 7.544697617792515, exposure: "NE", alt: 900, valley: "Cuneese" },
  { id: "monte_male", name: "Monte Male – Dronero", lat: 44.43163071064606, lon: 7.362886778152897, exposure: "S", alt: 950, valley: "Valle Maira" },
  { id: "iretta", name: "Iretta", lat: 44.49893744007536, lon: 7.382036612070795, exposure: "SO", alt: 1050, valley: "Valle Maira" },
  { id: "val_mala", name: "Pratoni di Val Mala", lat: 44.50780117336976, lon: 7.346618978966227, exposure: "S", alt: 1400, valley: "Valle Maira" },
  { id: "birrone", name: "Monte Birrone", lat: 44.5398927839592, lon: 7.25293945830122, exposure: "S", alt: 2131, valley: "Valle Maira" },
  { id: "agnello", name: "Colle dell'Agnello", lat: 44.68282592463814, lon: 6.978200601250462, exposure: "S", alt: 2748, valley: "Valle Varaita" },
  { id: "pian_mune", name: "Pian Munè – Seggiovia", lat: 44.63861029121272, lon: 7.230889474766025, exposure: "S/SW", alt: 1870, valley: "Valle Po" },
  { id: "pian_mune_basso", name: "Pian Munè – Bric Lombatera", lat: 44.65736521807557, lon: 7.260017009542715, exposure: "S", alt: 1350, valley: "Valle Po" },
  { id: "martiniana", name: "Martiniana Po", lat: 44.60695265332723, lon: 7.38322612877631, exposure: "NE", alt: 1400, valley: "Valle Po" },
  { id: "rucas", name: "Rucas alto", lat: 44.74213930591463, lon: 7.220118689737356, exposure: "S/SE", alt: 1500, valley: "Valle Infernotto" },
  { id: "montoso", name: "Montoso – decollo basso", lat: 44.7643723437882, lon: 7.249757926713178, exposure: "SE", alt: 1250, valley: "Valle Infernotto" },
  { id: "vandalino", name: "Monte Vandalino", lat: 44.83671231480542, lon: 7.173866924055591, exposure: "S/SE", alt: 2120, valley: "Val Pellice" },
  { id: "pian_alpe", name: "Pian dell'Alpe", lat: 45.06396153999711, lon: 7.028266530872771, exposure: "S", alt: 1990, valley: "Val Chisone" },
  { id: "roletto", name: "Roletto – Piggi", lat: 44.93249288285819, lon: 7.310959031722244, exposure: "S", alt: 820, valley: "Pinerolese" },
  { id: "piossasco", name: "Piossasco – Monte S. Giorgio", lat: 44.99671840144012, lon: 7.44800217882953, exposure: "S", alt: 673, valley: "Collina Torinese" },
  { id: "truccetti", name: "Truccetti", lat: 45.07973511679036, lon: 7.342018342463826, exposure: "S", alt: 900, valley: "Canavese" },
  { id: "val_torre", name: "Val della Torre", lat: 45.16262748864921, lon: 7.463716167415302, exposure: "S", alt: 970, valley: "Val della Torre" },
  { id: "rocca_canavese", name: "Rocca Canavese – M. della Neve", lat: 45.32757754837493, lon: 7.572793582322621, exposure: "S", alt: 1100, valley: "Canavese" },
  { id: "elisabetta", name: "Santa Elisabetta", lat: 45.4182733880574, lon: 7.641945041749434, exposure: "S", alt: 1000, valley: "Canavese" },
  { id: "elisabetta_alto", name: "Santa Elisabetta alto", lat: 45.44019393073506, lon: 7.648025947229948, exposure: "S", alt: 1400, valley: "Canavese" },
  { id: "cavallaria", name: "Monte Cavallaria", lat: 45.51729363773779, lon: 7.798808327293107, exposure: "S", alt: 1430, valley: "Canavese" },
  { id: "andrate", name: "Andrate", lat: 45.55063933418272, lon: 7.880775591143394, exposure: "S", alt: 1000, valley: "Canavese" },
];

// ----------------------------------------------------------------
// 2. SERVIZIO METEO
// ----------------------------------------------------------------
class WeatherService {
  private sources = [
    'https://api.open-meteo.com/v1/forecast',
  ];

  async fetchWithFallback(lat: number, lon: number): Promise<any> {
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const url = this.buildUrl(this.sources[0], lat, lon);
        const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        if (!data?.hourly?.time?.length) throw new Error('Dati non validi');
        return this.parseData(data);
      } catch (err) {
        lastError = err instanceof Error ? err : new Error('Errore sconosciuto');
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
      }
    }
    throw new Error(`Impossibile ottenere dati: ${lastError?.message || 'nessuna risposta'}`);
  }

  private buildUrl(base: string, lat: number, lon: number): string {
    const params = new URLSearchParams({
      latitude: lat.toString(),
      longitude: lon.toString(),
      hourly: [
        'temperature_2m', 'dewpoint_2m', 'relativehumidity_2m',
        'cloudcover', 'precipitation', 'visibility',
        'wind_speed_10m', 'wind_gusts_10m', 'wind_direction_10m',
        'wind_speed_80m', 'wind_direction_80m',
        'wind_speed_120m', 'wind_direction_120m',
        'uv_index', 'is_day', 'weathercode', 'pressure_msl'
      ].join(','),
      daily: [
        'weathercode', 'temperature_2m_max', 'temperature_2m_min',
        'sunrise', 'sunset', 'uv_index_max',
        'precipitation_sum', 'precipitation_hours',
        'wind_speed_10m_max', 'wind_direction_10m_dominant'
      ].join(','),
      timezone: 'Europe/Rome',
      forecast_days: '3',
    });
    params.append('_t', Date.now().toString());
    return `${base}?${params.toString()}`;
  }

  private parseData(data: any) {
    const hourly = data.hourly;
    const daily = data.daily;
    const hours = hourly.time.map((t: string, i: number) => ({
      time: new Date(t),
      temperature: hourly.temperature_2m[i],
      dewPoint: hourly.dewpoint_2m[i],
      humidity: hourly.relativehumidity_2m[i],
      cloudCover: hourly.cloudcover[i],
      precipitation: hourly.precipitation[i] || 0,
      visibility: hourly.visibility ? hourly.visibility[i] / 1000 : 40,
      windSpeed: hourly.wind_speed_10m[i],
      windGust: hourly.wind_gusts_10m ? hourly.wind_gusts_10m[i] : hourly.wind_speed_10m[i] + 8,
      windDir: hourly.wind_direction_10m[i],
      wind80m: hourly.wind_speed_80m ? hourly.wind_speed_80m[i] : null,
      windDir80m: hourly.wind_direction_80m ? hourly.wind_direction_80m[i] : null,
      wind120m: hourly.wind_speed_120m ? hourly.wind_speed_120m[i] : null,
      windDir120m: hourly.wind_direction_120m ? hourly.wind_direction_120m[i] : null,
      uvIndex: hourly.uv_index ? hourly.uv_index[i] : 0,
      isDay: hourly.is_day ? hourly.is_day[i] : 1,
      weatherCode: hourly.weathercode ? hourly.weathercode[i] : 0,
      pressure: hourly.pressure_msl ? hourly.pressure_msl[i] : 1013,
    }));

    const dailyData = daily.time.map((d: string, i: number) => ({
      date: new Date(d),
      weatherCode: daily.weathercode[i],
      tempMax: daily.temperature_2m_max[i],
      tempMin: daily.temperature_2m_min[i],
      sunrise: new Date(daily.sunrise[i]),
      sunset: new Date(daily.sunset[i]),
      uvMax: daily.uv_index_max[i],
      precipitationSum: daily.precipitation_sum[i],
      precipitationHours: daily.precipitation_hours[i],
      windMax: daily.wind_speed_10m_max[i],
      windDirDominant: daily.wind_direction_10m_dominant[i],
    }));

    return { hourly: hours, daily: dailyData };
  }
}

const weatherService = new WeatherService();

// ----------------------------------------------------------------
// 3. UTILITY
// ----------------------------------------------------------------
function getWeatherIcon(code: number, isDay: number): string {
  const icons: Record<number, string> = {
    0: isDay ? '☀️' : '🌙',
    1: isDay ? '🌤️' : '🌤️',
    2: isDay ? '⛅' : '☁️',
    3: '☁️',
    45: '🌫️',
    48: '🌫️',
    51: '🌦️',
    53: '🌧️',
    55: '🌧️',
    61: '🌧️',
    63: '🌧️',
    65: '🌧️',
    71: '❄️',
    73: '❄️',
    75: '❄️',
    80: '🌧️',
    81: '🌧️',
    82: '⛈️',
    95: '⛈️',
    96: '⛈️',
    99: '⛈️',
  };
  return icons[code] || (isDay ? '☀️' : '🌙');
}

function getWindDirection(deg: number): string {
  if (deg == null) return '--';
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round(deg / 45) % 8];
}

function getWindArrow(deg: number): string {
  if (deg == null) return '➡️';
  const arrows = ['↑', '↗', '→', '↘', '↓', '↙', '←', '↖'];
  return arrows[Math.round(deg / 45) % 8];
}

function getCloudCondition(cover: number): { text: string; icon: string; color: string } {
  if (cover < 20) return { text: 'Sereno', icon: '☀️', color: '#ffd93d' };
  if (cover < 40) return { text: 'Poco nuvoloso', icon: '🌤️', color: '#f9a825' };
  if (cover < 60) return { text: 'Nuvoloso', icon: '⛅', color: '#90a4ae' };
  if (cover < 80) return { text: 'Molto nuvoloso', icon: '☁️', color: '#78909c' };
  return { text: 'Coperto', icon: '☁️', color: '#546e7a' };
}

function getWindProfile(surfaceWind: number, surfaceDir: number) {
  const profile = [];
  for (let alt = 400; alt <= 4000; alt += 250) {
    const factor = 1 + (alt - 10) * 0.0025;
    let speed = Math.min(surfaceWind * factor, surfaceWind * 3.5);
    let dirOffset = (alt - 10) / 1000 * 15;
    dirOffset = Math.min(dirOffset, 45);
    let dir = (surfaceDir + dirOffset) % 360;
    profile.push({
      alt,
      speed: Math.round(speed * 10) / 10,
      dir: Math.round(dir),
      dirName: getWindDirection(dir)
    });
  }
  return profile;
}

// ----------------------------------------------------------------
// 4. COMPONENTE PRINCIPALE
// ----------------------------------------------------------------
export default function Page() {
  const [selectedId, setSelectedId] = useState(DECOLLI[0].id);
  const [meteoData, setMeteoData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState(0);
  const [selectedHour, setSelectedHour] = useState(12);
  const [activeTab, setActiveTab] = useState<'meteo' | 'venti' | 'termiche' | 'analisi'>('meteo');
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const site = DECOLLI.find(d => d.id === selectedId)!;

  const loadWeather = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await weatherService.fetchWithFallback(site.lat, site.lon);
      setMeteoData(data);
      setLastUpdate(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore sconosciuto');
    } finally {
      setLoading(false);
    }
  }, [site.lat, site.lon]);

  useEffect(() => {
    loadWeather();
    setSelectedHour(new Date().getHours());
    const interval = setInterval(loadWeather, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [loadWeather]);

  // Dati del giorno selezionato
  const dayData = useMemo(() => {
    if (!meteoData) return [];
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() + selectedDay);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return meteoData.hourly.filter((h: any) => h.time >= start && h.time < end);
  }, [meteoData, selectedDay]);

  const currentData = useMemo(() => {
    if (!dayData || dayData.length === 0) return null;
    const idx = Math.min(selectedHour, dayData.length - 1);
    return dayData[idx];
  }, [dayData, selectedHour]);

  const thermalDelta = useMemo(() => {
    if (!dayData || dayData.length === 0) return 0;
    const temps = dayData.map((h: any) => h.temperature).filter((t: any) => t != null);
    if (temps.length === 0) return 0;
    return Math.round(Math.max(...temps) - Math.min(...temps));
  }, [dayData]);

  const enrichedDaily = useMemo(() => {
    if (!meteoData || !meteoData.daily) return [];
    return meteoData.daily.map((day: any) => {
      const d = new Date(day.date);
      const hours = meteoData.hourly.filter((h: any) =>
        h.time.getDate() === d.getDate() && h.time.getMonth() === d.getMonth()
      );
      const temps = hours.map((h: any) => h.temperature).filter((t: any) => t != null);
      const delta = temps.length > 0 ? Math.round(Math.max(...temps) - Math.min(...temps)) : 0;
      return { ...day, thermalDelta: delta };
    });
  }, [meteoData]);

  const dateLabels = enrichedDaily.map((d: any) => {
    return d.date.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' });
  });

  // Indice di stabilità
  const stabilityIndex = useMemo(() => {
    if (!currentData) return { label: '--', color: '#888' };
    const temp = currentData.temperature;
    const hum = currentData.humidity;
    const cloud = currentData.cloudCover;
    const cape = Math.max(0, (temp - 15) * 50 + (50 - hum) * 10 - cloud * 2);
    if (cape > 1500) return { label: 'Instabile ⚠️', color: '#ff1744' };
    if (cape > 800) return { label: 'Moderato 🟡', color: '#ff9800' };
    if (cape > 300) return { label: 'Stabile 🟢', color: '#4caf50' };
    return { label: 'Molto stabile ✅', color: '#4fc3f7' };
  }, [currentData]);

  const thermalStrength = useMemo(() => {
    if (!currentData) return { label: '--', color: '#888' };
    const temp = currentData.temperature;
    const cloud = currentData.cloudCover;
    const hum = currentData.humidity;
    const score = (temp > 22 ? 2 : temp > 18 ? 1 : 0) +
                  (cloud < 30 ? 2 : cloud < 50 ? 1 : 0) +
                  (hum < 50 ? 1 : 0) +
                  (thermalDelta > 10 ? 2 : thermalDelta > 6 ? 1 : 0);
    if (score >= 6) return { label: 'Forte 🔥', color: '#ff1744' };
    if (score >= 4) return { label: 'Media 💪', color: '#ff6d00' };
    if (score >= 2) return { label: 'Debole 🫤', color: '#ffd600' };
    return { label: 'Assente ❄️', color: '#4fc3f7' };
  }, [currentData, thermalDelta]);

  // Allerta meteo
  const weatherAlert = useMemo(() => {
    if (!currentData) return { level: 'info' as const, message: 'Caricamento...', icon: 'ℹ️' };
    const alerts: string[] = [];
    if (currentData.windSpeed > 25) alerts.push('💨 VENTO FORTE');
    if (currentData.windGust > 35) alerts.push('💨 RAFFICHE PERICOLOSE');
    if (currentData.precipitation > 0.5) alerts.push('🌧️ PIOGGIA');
    if (currentData.cloudCover > 80) alerts.push('☁️ CIELO COPERTISSIMO');
    if (currentData.weatherCode >= 95) alerts.push('⛈️ TEMPORALE');
    if (thermalDelta > 12) alerts.push('🔥 FORTI TERMICHE');
    if (currentData.windSpeed < 5) alerts.push('🍃 VENTO DEBOLE');

    if (alerts.length === 0) return { level: 'success' as const, message: '✅ Condizioni ottimali per volare!', icon: '🪂' };
    if (alerts.some(a => a.includes('TEMPORALE') || a.includes('PIOGGIA') || a.includes('VENTO FORTE'))) {
      return { level: 'danger' as const, message: '⚠️ ' + alerts.join(' • '), icon: '🚨' };
    }
    return { level: 'warning' as const, message: '⚠️ ' + alerts.join(' • '), icon: '⚡' };
  }, [currentData, thermalDelta]);

  const windProfile = useMemo(() => {
    if (!currentData) return [];
    return getWindProfile(currentData.windSpeed, currentData.windDir);
  }, [currentData]);

  // Se caricamento iniziale
  if (loading && !meteoData) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh', background: 'linear-gradient(145deg, #1a2a3a, #0d1b2a)'
      }}>
        <div style={{
          width: '48px', height: '48px',
          border: '4px solid rgba(76, 175, 80, 0.2)',
          borderTopColor: '#4caf50',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }} />
        <p style={{ marginTop: '16px', fontSize: '1.2rem', color: '#e8f0f8' }}>🪂 Caricamento previsioni meteo...</p>
        <p style={{ fontSize: '0.9rem', color: '#8899aa' }}>Sto cercando le migliori fonti per te</p>
      </div>
    );
  }

  if (error && !meteoData) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh', padding: '20px', background: 'linear-gradient(145deg, #1a2a3a, #0d1b2a)'
      }}>
        <p style={{ color: '#ff6b6b', fontSize: '1.1rem', marginBottom: '16px', textAlign: 'center' }}>❌ {error}</p>
        <button
          onClick={loadWeather}
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

  // ----------------------------------------------------------------
  // RENDER PRINCIPALE
  // ----------------------------------------------------------------
  return (
    <div style={{
      background: 'linear-gradient(145deg, #1a2a3a 0%, #0d1b2a 100%)',
      color: '#e8f0f8', minHeight: '100vh', padding: '16px',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
    }}>
      <header style={{ textAlign: 'center', padding: '16px 0', borderBottom: '2px solid rgba(76, 175, 80, 0.3)', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '2.8rem', display: 'inline-block', animation: 'hop 1.2s ease-in-out infinite' }}>🐰</span>
          <span style={{ fontSize: '2.2rem', display: 'inline-block', animation: 'float 2.5s ease-in-out infinite' }}>🪂</span>
          <span style={{
            fontSize: '2.2rem', fontWeight: 800,
            background: 'linear-gradient(135deg, #4caf50, #8bc34a)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            letterSpacing: '-0.5px',
          }}>
            Meteo dei Conigli
          </span>
        </div>
        <p style={{ fontSize: '0.9rem', color: '#8899aa', marginTop: '4px' }}>Previsioni per volo libero • Dati in tempo reale da Open-Meteo</p>
        <p style={{ fontSize: '0.75rem', color: '#667788', marginTop: '2px' }}>🔄 Aggiornato: {lastUpdate.toLocaleTimeString('it-IT')}</p>
      </header>

      {/* GRIGLIA PRINCIPALE */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(260px, 320px) 1fr',
        gap: '16px',
        maxWidth: '1440px',
        margin: '0 auto',
      }}>
        {/* COLONNA SINISTRA: LISTA DECOLLI */}
        <div style={{
          background: 'rgba(255,255,255,0.04)', borderRadius: '16px',
          border: '2px solid rgba(76, 175, 80, 0.25)', padding: '12px',
          height: 'calc(100vh - 200px)', overflow: 'hidden',
          backdropFilter: 'blur(8px)',
        }}>
          <h2 style={{ fontSize: '1.1rem', color: '#4caf50', marginBottom: '12px', fontWeight: 600 }}>📍 Decolli</h2>
          <div style={{ overflowY: 'auto', height: 'calc(100% - 44px)', paddingRight: '4px' }}>
            {DECOLLI.map((d) => {
              const isSelected = d.id === selectedId;
              let weatherIcon = '☁️';
              if (isSelected && currentData) {
                weatherIcon = getWeatherIcon(currentData.weatherCode || 0, currentData.isDay || 1);
              }
              return (
                <button
                  key={d.id}
                  onClick={() => setSelectedId(d.id)}
                  style={{
                    width: '100%', textAlign: 'left',
                    background: isSelected ? 'rgba(76, 175, 80, 0.15)' : 'rgba(255,255,255,0.03)',
                    border: `2px solid ${isSelected ? '#4caf50' : 'rgba(255,255,255,0.1)'}`,
                    borderRadius: '12px', padding: '10px 12px', marginBottom: '8px',
                    cursor: 'pointer', transition: 'all 0.2s ease',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.95rem', fontWeight: 600, color: '#e8f0f8' }}>{d.name}</span>
                    <span style={{ fontSize: '1.3rem' }}>{weatherIcon}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#8899aa', marginTop: '2px' }}>
                    <span>{d.valley}</span>
                    <span>{d.exposure} • {d.alt}m</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* COLONNA DESTRA: DETTAGLI */}
        <div style={{
          background: 'rgba(255,255,255,0.04)', borderRadius: '16px',
          border: '2px solid rgba(76, 175, 80, 0.25)', padding: '16px',
          maxHeight: 'calc(100vh - 200px)', overflowY: 'auto',
          backdropFilter: 'blur(8px)',
        }}>
          {/* Header sito */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            flexWrap: 'wrap', marginBottom: '12px', paddingBottom: '12px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}>
            <div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#e8f0f8' }}>{site.name}</h2>
              <span style={{ fontSize: '0.8rem', color: '#8899aa' }}>{site.exposure} • {site.valley} • {site.alt}m</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(76, 175, 80, 0.12)', padding: '6px 14px', borderRadius: '30px' }}>
              <span style={{ fontSize: '2rem' }}>{currentData ? getWeatherIcon(currentData.weatherCode || 0, currentData.isDay || 1) : '☁️'}</span>
              <span style={{ fontSize: '1.4rem', fontWeight: 'bold' }}>{currentData ? Math.round(currentData.temperature) : '--'}°C</span>
            </div>
          </div>

          {/* Banner allerta */}
          {currentData && (
            <div style={{
              padding: '10px 14px', borderRadius: '10px', border: '2px solid',
              marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '10px',
              background: weatherAlert.level === 'danger' ? 'rgba(255, 23, 68, 0.2)' :
                          weatherAlert.level === 'warning' ? 'rgba(255, 152, 0, 0.2)' : 'rgba(76, 175, 80, 0.15)',
              borderColor: weatherAlert.level === 'danger' ? '#ff1744' :
                          weatherAlert.level === 'warning' ? '#ff9800' : '#4caf50',
            }}>
              <span style={{ fontSize: '1.4rem' }}>{weatherAlert.icon}</span>
              <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{weatherAlert.message}</span>
            </div>
          )}

          {/* Tab navigazione */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px', marginBottom: '12px' }}>
            {(['meteo', 'venti', 'termiche', 'analisi'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '8px 4px', borderRadius: '8px 8px 0 0',
                  border: 'none', color: '#e8f0f8', cursor: 'pointer',
                  fontSize: '0.8rem', fontWeight: 500, textAlign: 'center',
                  background: activeTab === tab ? 'rgba(76, 175, 80, 0.2)' : 'transparent',
                  borderBottom: activeTab === tab ? '2px solid #4caf50' : '2px solid transparent',
                }}
              >
                {tab === 'meteo' && '🌤️ Meteo'}
                {tab === 'venti' && '💨 Venti'}
                {tab === 'termiche' && '🔥 Termiche'}
                {tab === 'analisi' && '🤖 Analisi'}
              </button>
            ))}
          </div>

          {/* Selezione giorno */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '12px' }}>
            {enrichedDaily.map((day: any, idx: number) => (
              <button
                key={idx}
                onClick={() => { setSelectedDay(idx); setSelectedHour(12); }}
                style={{
                  border: `2px solid ${selectedDay === idx ? '#4caf50' : 'rgba(255,255,255,0.1)'}`,
                  borderRadius: '12px', padding: '8px', cursor: 'pointer', textAlign: 'center',
                  background: selectedDay === idx ? 'rgba(76, 175, 80, 0.2)' : 'rgba(255,255,255,0.03)',
                }}
              >
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#e8f0f8' }}>{dateLabels[idx]}</div>
                <div style={{ fontSize: '1.6rem', marginTop: '2px' }}>{getWeatherIcon(day.weatherCode, 1)}</div>
                <div style={{ fontSize: '0.95rem', color: '#4caf50', fontWeight: 600 }}>{Math.round(day.tempMax)}°/{Math.round(day.tempMin)}°</div>
                <div style={{ fontSize: '0.7rem', color: '#8899aa' }}>Δ{day.thermalDelta}°C</div>
                <div style={{ fontSize: '0.7rem', color: '#4fc3f7' }}>{day.precipitationSum > 0 ? `🌧️${Math.round(day.precipitationSum)}mm` : '☀️'}</div>
              </button>
            ))}
          </div>

          {/* Selettore ora */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '12px',
            padding: '8px 12px', background: 'rgba(255,255,255,0.04)',
            borderRadius: '10px', marginBottom: '12px',
          }}>
            <span style={{ fontSize: '0.85rem', color: '#8899aa' }}>⏰ Ora:</span>
            <input
              type="range"
              min="0"
              max="23"
              value={selectedHour}
              onChange={(e) => setSelectedHour(parseInt(e.target.value))}
              style```tsx
              style={{ flex: 1, accentColor: '#4caf50', height: '4px' }}
            />
            <span style={{ fontSize: '0.85rem', fontWeight: 'bold', minWidth: '44px', textAlign: 'center' }}>
              {String(selectedHour).padStart(2, '0')}:00
            </span>
          </div>

          {/* CONTENUTO TAB: METEO */}
          {activeTab === 'meteo' && currentData && (
            <div style={{ animation: 'fadeIn 0.3s ease' }}>
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                gap: '8px', marginBottom: '12px',
              }}>
                {[
                  { label: '🌡️ Temperatura', value: `${Math.round(currentData.temperature)}°C`, sub: `Δ ${thermalDelta}°C` },
                  { label: '💧 Umidità', value: `${Math.round(currentData.humidity)}%`, sub: `Rugiada ${Math.round(currentData.dewPoint)}°C` },
                  { label: '☁️ Nuvolosità', value: `${Math.round(currentData.cloudCover)}%`, sub: `${getCloudCondition(currentData.cloudCover).icon} ${getCloudCondition(currentData.cloudCover).text}` },
                  { label: '🌧️ Precipitazioni', value: currentData.precipitation === 0 ? '✅ Assenti' : `${currentData.precipitation} mm`, sub: currentData.precipitation === 0 ? 'Ideale' : '⚠️ Pioggia' },
                  { label: '🏔️ Base Nuvole', value: `${Math.round((currentData.temperature - currentData.dewPoint) * 120 + site.alt)}m`, sub: 'Cloud Base' },
                  { label: '📈 Plafond', value: `${Math.round(site.alt + (thermalDelta * 100))}m`, sub: 'Thermal Top' },
                  { label: '🪂 Galleggiamento', value: thermalDelta > 10 ? 'Eccellente ⭐' : thermalDelta > 6 ? 'Buono 👍' : 'Limitato 🫤', sub: `Delta ${thermalDelta}°C` },
                  { label: '💨 Vento', value: `${getWindArrow(currentData.windDir)} ${Math.round(currentData.windSpeed)} km/h`, sub: `${getWindDirection(currentData.windDir)} • ⚡${Math.round(currentData.windGust)} km/h` },
                ].map((card, i) => (
                  <div key={i} style={{
                    background: 'rgba(0,0,0,0.25)', padding: '10px', borderRadius: '10px',
                    border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center',
                  }}>
                    <div style={{ fontSize: '0.7rem', color: '#8899aa', marginBottom: '2px' }}>{card.label}</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#e8f0f8' }}>{card.value}</div>
                    <div style={{ fontSize: '0.65rem', color: '#667788', marginTop: '2px' }}>{card.sub}</div>
                  </div>
                ))}
              </div>

              {/* Pressione e gradiente */}
              <div style={{
                background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '10px',
                border: '1px solid rgba(255,255,255,0.05)', marginBottom: '12px',
              }}>
                <h4 style={{ fontSize: '0.95rem', color: '#4caf50', marginBottom: '10px', fontWeight: 600 }}>📊 Pressione e Gradiente</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '8px' }}>
                  <div style={{ textAlign: 'center', padding: '8px', background: 'rgba(255,255,255,0.04)', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.7rem', color: '#8899aa' }}>Pressione attuale</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#e8f0f8' }}>{Math.round(currentData.pressure)} hPa</div>
                  </div>
                  <div style={{ textAlign: 'center', padding: '8px', background: 'rgba(255,255,255,0.04)', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.7rem', color: '#8899aa' }}>Gradiente</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#4caf50' }}>
                      {(() => {
                        const first = dayData[0]?.pressure;
                        const last = dayData[dayData.length - 1]?.pressure;
                        if (first == null || last == null) return '--';
                        const diff = last - first;
                        return diff > 0 ? `⬆️ +${Math.round(diff)} hPa` : diff < 0 ? `⬇️ ${Math.round(diff)} hPa` : '➡️ Stabile';
                      })()}
                    </div>
                  </div>
                  <div style={{ textAlign: 'center', padding: '8px', background: 'rgba(255,255,255,0.04)', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.7rem', color: '#8899aa' }}>Stabilità</div>
                    <div style={{ fontSize: '1rem', fontWeight: 'bold', color: stabilityIndex.color }}>{stabilityIndex.label}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* CONTENUTO TAB: VENTI */}
          {activeTab === 'venti' && currentData && (
            <div style={{ animation: 'fadeIn 0.3s ease' }}>
              <div style={{ marginBottom: '12px' }}>
                <h4 style={{ fontSize: '0.95rem', color: '#4caf50', marginBottom: '10px', fontWeight: 600 }}>💨 Vento a differenti quote</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  {[
                    { label: '10 m (superficie)', speed: currentData.windSpeed, dir: currentData.windDir, gust: currentData.windGust, full: true },
                    { label: '80 m (quota termica)', speed: currentData.wind80m, dir: currentData.windDir80m, gust: currentData.wind80m ? currentData.wind80m * 1.3 : null, full: !!currentData.wind80m },
                    { label: '120 m (alta quota)', speed: currentData.wind120m, dir: currentData.windDir120m, gust: currentData.wind120m ? currentData.wind120m * 1.35 : null, full: !!currentData.wind120m },
                  ].map((w, i) => (
                    <div key={i} style={{ textAlign: 'center', padding: '10px', background: 'rgba(0,0,0,0.2)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ fontSize: '0.7rem', color: '#8899aa' }}>{w.label}</div>
                      <div style={{ fontSize: '1rem', fontWeight: 'bold', color: '#e8f0f8' }}>
                        {w.full ? `${getWindArrow(w.dir)} ${Math.round(w.speed)} km/h` : 'N/D'}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#8899aa' }}>{w.full ? getWindDirection(w.dir) : '--'}</div>
                      <div style={{ fontSize: '0.7rem', color: '#ff6b6b' }}>⚡ {w.gust ? `${Math.round(w.gust)} km/h` : '--'}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Profilo vento */}
              <div style={{ marginBottom: '12px' }}>
                <h4 style={{ fontSize: '0.95rem', color: '#4caf50', marginBottom: '10px', fontWeight: 600 }}>📊 Profilo Vento (400m - 4000m)</h4>
                <div style={{
                  background: 'rgba(0,0,0,0.2)', padding: '8px', borderRadius: '10px',
                  maxHeight: '200px', overflowY: 'auto',
                }}>
                  {windProfile.map((level, idx) => {
                    const maxSpeed = currentData.windSpeed * 3.5;
                    const width = Math.min(100, (level.speed / maxSpeed) * 100);
                    const barColor = width < 30 ? '#4caf50' : width < 50 ? '#8bc34a' : width < 70 ? '#ff9800' : width < 90 ? '#ff5722' : '#f44336';
                    return (
                      <div key={idx} style={{ display: 'grid', gridTemplateColumns: '50px 1fr 50px', gap: '6px', alignItems: 'center', padding: '2px 4px', fontSize: '0.7rem' }}>
                        <span style={{ color: '#8899aa' }}>{level.alt}m</span>
                        <div style={{ height: '16px', background: 'rgba(255,255,255,0.06)', borderRadius: '10px', overflow: 'hidden' }}>
                          <div style={{
                            height: '100%', borderRadius: '10px', display: 'flex', alignItems: 'center',
                            justifyContent: 'flex-end', paddingRight: '4px', minWidth: '30px',
                            width: `${width}%`, background: barColor,
                          }}>
                            <span style={{ fontSize: '0.55rem', color: '#fff', fontWeight: 'bold', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
                              {level.speed} km/h
                            </span>
                          </div>
                        </div>
                        <span style={{ color: '#8899aa', textAlign: 'center' }}>{getWindArrow(level.dir)} {level.dirName}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Vento orario */}
              <div style={{ marginBottom: '12px' }}>
                <h4 style={{ fontSize: '0.95rem', color: '#4caf50', marginBottom: '10px', fontWeight: 600 }}>📊 Vento orario (9:00 - 19:00)</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(11, 1fr)', gap: '2px', overflowX: 'auto' }}>
                  {Array.from({ length: 11 }, (_, i) => i + 9).map(hour => {
                    const hData = dayData?.find((h: any) => h.time.getHours() === hour);
                    if (!hData) return <div key={hour} style={{ textAlign: 'center', padding: '6px 2px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', minWidth: '40px' }}>--</div>;
                    return (
                      <div key={hour} style={{ textAlign: 'center', padding: '6px 2px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', minWidth: '40px' }}>
                        <div style={{ fontSize: '0.55rem', color: '#8899aa' }}>{String(hour).padStart(2, '0')}:00</div>
                        <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#e8f0f8' }}>{getWindArrow(hData.windDir)} {Math.round(hData.windSpeed)}</div>
                        <div style={{ fontSize: '0.5rem', color: '#667788' }}>{getWindDirection(hData.windDir)}</div>
                        <div style={{ fontSize: '0.7rem' }}>{getWeatherIcon(hData.weatherCode || 0, hData.isDay || 1)}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* CONTENUTO TAB: TERMICHE */}
          {activeTab === 'termiche' && currentData && (
            <div style={{ animation: 'fadeIn 0.3s ease' }}>
              <div style={{ marginBottom: '12px' }}>
                <h4 style={{ fontSize: '0.95rem', color: '#4caf50', marginBottom: '10px', fontWeight: 600 }}>🔥 Analisi Termiche</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
                  {[
                    { label: 'Temperatura media', value: `${Math.round(currentData.temperature)}°C` },
                    { label: 'Delta termico', value: `${thermalDelta}°C` },
                    { label: 'Nuvolosità media', value: `${Math.round(currentData.cloudCover)}%` },
                    { label: 'Umidità media', value: `${Math.round(currentData.humidity)}%` },
                    { label: 'Base nuvole', value: `${Math.round((currentData.temperature - currentData.dewPoint) * 120 + site.alt)}m` },
                    { label: 'Plafond', value: `${Math.round(site.alt + (thermalDelta * 100))}m` },
                    { label: 'Galleggiamento', value: thermalDelta > 10 ? 'Eccellente ⭐' : thermalDelta > 6 ? 'Buono 👍' : 'Limitato 🫤' },
                    { label: 'Cross Country', value: thermalDelta > 10 && currentData.windSpeed < 20 ? '✅ Favorevole' : '🫤 Valutare', valueColor: thermalDelta > 10 && currentData.windSpeed < 20 ? '#4caf50' : '#ff9800' },
                  ].map((card, i) => (
                    <div key={i} style={{ background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '10px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ fontSize: '0.7rem', color: '#8899aa' }}>{card.label}</div>
                      <div style={{ fontSize: '1rem', fontWeight: 'bold', color: (card as any).valueColor || '#e8f0f8' }}>{card.value}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <h4 style={{ fontSize: '0.95rem', color: '#4caf50', marginBottom: '10px', fontWeight: 600 }}>⏰ Sviluppo orario termiche (10:00 - 18:00)</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(9, 1fr)', gap: '4px', overflowX: 'auto' }}>
                  {Array.from({ length: 9 }, (_, i) => i + 10).map(hour => {
                    const hData = dayData?.find((h: any) => h.time.getHours() === hour);
                    if (!hData) return <div key={hour} style={{ textAlign: 'center', padding: '6px 2px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', minWidth: '50px' }}>--</div>;
                    const temp = hData.temperature;
                    const cloud = hData.cloudCover;
                    const hum = hData.humidity;
                    const score = (temp > 22 ? 2 : temp > 18 ? 1 : 0) +
                                  (cloud < 30 ? 2 : cloud < 50 ? 1 : 0) +
                                  (hum < 50 ? 1 : 0);
                    const label = score >= 5 ? 'Forte 🔥' : score >= 3 ? 'Media 💪' : score >= 1 ? 'Debole 🫤' : 'Assente ❄️';
                    const color = score >= 5 ? '#ff1744' : score >= 3 ? '#ff6d00' : score >= 1 ? '#ffd600' : '#4fc3f7';
                    return (
                      <div key={hour} style={{ textAlign: 'center', padding: '6px 2px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', minWidth: '50px' }}>
                        <div style={{ fontSize: '0.55rem', color: '#8899aa' }}>{String(hour).padStart(2, '0')}:00</div>
                        <div style={{ fontSize: '0.7rem', fontWeight: 'bold', color }}>{label}</div>
                        <div style={{ fontSize: '0.55rem', color: '#667788' }}>{Math.round(temp)}°C • {Math.round(cloud)}%</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* CONTENUTO TAB: ANALISI */}
          {activeTab === 'analisi' && currentData && (
            <div style={{ animation: 'fadeIn 0.3s ease' }}>
              {[
                {
                  title: '📋 Panoramica Generale',
                  text: `🌅 La giornata al decollo di ${site.name} si presenta con temperatura di ${Math.round(currentData.temperature)}°C, umidità al ${Math.round(currentData.humidity)}% e nuvolosità al ${Math.round(currentData.cloudCover)}%.${currentData.windSpeed > 20 ? ` 💨 Vento sostenuto a ${Math.round(currentData.windSpeed)} km/h.` : ` 🍃 Vento leggero a ${Math.round(currentData.windSpeed)} km/h.`}${currentData.precipitation > 0 ? ` 🌧️ Possibili precipitazioni (${currentData.precipitation} mm).` : ' ✅ Nessuna precipitazione prevista.'}${thermalDelta > 8 ? ' 🔥 Buon delta termico, condizioni favorevoli per il volo.' : ' 🫤 Delta termico ridotto, volo locale.'}`
                },
                {
                  title: '💡 Consigli per il Volo',
                  text: `<strong>Valutazione del rischio:</strong> ${currentData.windSpeed > 25 || currentData.precipitation > 0.5 ? '🔴 ALTO - Condizioni pericolose, sconsigliato volare.' : currentData.windSpeed > 18 ? '🟡 MEDIO - Condizioni impegnative, richiesta esperienza.' : '🟢 BASSO - Condizioni favorevoli.'}\n<strong>Vento:</strong> ${currentData.windSpeed < 8 ? '💨 Vento debole, possibili difficoltà di decollo.' : currentData.windSpeed < 20 ? '✅ Vento ideale (5-18 km/h).' : '⚠️ Vento sostenuto, attenzione.'}\n<strong>Termiche:</strong> ${thermalStrength.label}\n<strong>Momento migliore:</strong> ${currentData.windSpeed < 20 && currentData.cloudCover < 60 ? '🕐 Condizioni ottimali per volare ora!' : '⚠️ Valutare le condizioni prima di volare.'}`
                },
                {
                  title: '🏔️ Quote e Plafond',
                  text: `<strong>Base decollo:</strong> ${site.alt}m\n<strong>Base delle nuvole:</strong> ${Math.round((currentData.temperature - currentData.dewPoint) * 120 + site.alt)}m\n<strong>Plafond termico massimo:</strong> ${Math.round(site.alt + (thermalDelta * 100))}m\n<strong>Delta termico:</strong> ${thermalDelta}°C\n${thermalDelta > 8 && currentData.windSpeed < 20 ? '✅ Condizioni favorevoli per cross country.' : '🫤 Condizioni limitate per cross country.'}`
                },
                {
                  title: '⛈️ Allerta Temporali',
                  text: currentData.weatherCode >= 95 ? '🔴 ALLERTA TEMPORALI IN CORSO! Volo sconsigliato.' : currentData.weatherCode >= 80 ? '🟡 ATTENZIONE: Possibili rovesci. Monitorare l\'evoluzione.' : '✅ Nessun temporale previsto. Cielo sereno o poco nuvoloso.'
                },
              ].map((section, i) => (
                <div key={i} style={{
                  background: 'rgba(0,0,0,0.2)', padding: '12px 14px', borderRadius: '10px',
                  border: '1px solid rgba(255,255,255,0.05)', marginBottom: '10px',
                }}>
                  <h4 style={{ fontSize: '0.95rem', color: '#4caf50', marginBottom: '8px', fontWeight: 600 }}>{section.title}</h4>
                  <p style={{ fontSize: '0.85rem', lineHeight: '1.6', color: '#d0d8e0', whiteSpace: 'pre-wrap' }}
                    dangerouslySetInnerHTML={{ __html: section.text }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <footer style={{ textAlign: 'center', marginTop: '20px', padding: '12px 0', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <p style={{ fontSize: '0.75rem', color: '#667788' }}>🐰 Vola sicuro e divertiti! 🪂 • Dati da Open-Meteo • Aggiornamento automatico ogni 30 min</p>
      </footer>
    </div>
  );
}

// ----------------------------------------------------------------
// 5. INIEZIONE ANIMAZIONI CSS GLOBALI
// ----------------------------------------------------------------
if (typeof document !== 'undefined') {
  const styleEl = document.createElement('style');
  styleEl.textContent = `
    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes hop {
      0%, 100% { transform: translateY(0px) scale(1); }
      50% { transform: translateY(-8px) scale(1.05); }
    }
    @keyframes float {
      0%, 100% { transform: translateY(0px) rotate(-2deg); }
      50% { transform: translateY(-6px) rotate(2deg); }
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(6px); }
      to { opacity: 1; transform: translateY(0); }
    }
    ::-webkit-scrollbar { width: 4px; }
    ::-webkit-scrollbar-track { background: rgba(255,255,255,0.04); border-radius: 4px; }
    ::-webkit-scrollbar-thumb { background: rgba(76, 175, 80, 0.3); border-radius: 4px; }
    * { scrollbar-width: thin; scrollbar-color: rgba(76, 175, 80, 0.3) transparent; }
    @media (max-width: 768px) {
      .mainGrid { grid-template-columns: 1fr !important; }
    }
  `;
  document.head.appendChild(styleEl);
}