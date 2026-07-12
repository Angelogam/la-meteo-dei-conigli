</dyad-delete>

<dyad-write path="src/pages/Index.tsx" description="File completamente pulito senza residui di markdown">
"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";

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

function getWeatherIcon(code: number, isDay: number): string {
  const icons: Record<number, string> = {
    0: isDay ? '☀️' : '🌙', 1: isDay ? '🌤️' : '🌤️', 2: isDay ? '⛅' : '☁️', 3: '☁️', 45: '🌫️', 48: '🌫️',
    51: '🌦️', 53: '🌧️', 55: '🌧️', 61: '🌧️', 63: '🌧️', 65: '🌧️', 71: '❄️', 73: '❄️', 75: '❄️',
    80: '🌧️', 81: '🌧️', 82: '⛈️', 95: '⛈️', 96: '⛈️', 99: '⛈️',
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

export default function Home() {
  const [selectedId, setSelectedId] = useState(DECOLLI[0].id);
  const [meteoData, setMeteoData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState(0);
  const [selectedHour, setSelectedHour] = useState(12);
  const [activeTab, setActiveTab] = useState('meteo');
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const site = DECOLLI.find(d => d.id === selectedId)!;

  const loadWeather = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        latitude: site.lat.toString(),
        longitude: site.lon.toString(),
        hourly: [
          'temperature_2m', 'dewpoint_2m', 'relativehumidity_2m',
          'cloudcover', 'precipitation',
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
        forecast_days: '3'
      });

      const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, {
        signal: AbortSignal.timeout(10000)
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const raw = await response.json();

      const result = {
        hourly: raw.hourly.time.map((t: string, i: number) => ({
          time: new Date(t),
          temperature: raw.hourly.temperature_2m[i],
          dewPoint: raw.hourly.dewpoint_2m[i],
          humidity: raw.hourly.relativehumidity_2m[i],
          cloudCover: raw.hourly.cloudcover[i],
          precipitation: raw.hourly.precipitation[i] || 0,
          windSpeed: raw.hourly.wind_speed_10m[i],
          windGust: raw.hourly.wind_gusts_10m ? raw.hourly.wind_gusts_10m[i] : raw.hourly.wind_speed_10m[i] + 8,
          windDir: raw.hourly.wind_direction_10m[i],
          wind80m: raw.hourly.wind_speed_80m ? raw.hourly.wind_speed_80m[i] : null,
          windDir80m: raw.hourly.wind_direction_80m ? raw.hourly.wind_direction_80m[i] : null,
          wind120m: raw.hourly.wind_speed_120m ? raw.hourly.wind_speed_120m[i] : null,
          windDir120m: raw.hourly.wind_direction_120m ? raw.hourly.wind_direction_120m[i] : null,
          uvIndex: raw.hourly.uv_index ? raw.hourly.uv_index[i] : 0,
          isDay: raw.hourly.is_day ? raw.hourly.is_day[i] : 1,
          weatherCode: raw.hourly.weathercode ? raw.hourly.weathercode[i] : 0,
          pressure: raw.hourly.pressure_msl ? raw.hourly.pressure_msl[i] : 1013,
        })),
        daily: raw.daily.time.map((d: string, i: number) => ({
          date: new Date(d),
          weatherCode: raw.daily.weathercode[i],
          tempMax: raw.daily.temperature_2m_max[i],
          tempMin: raw.daily.temperature_2m_min[i],
          sunrise: new Date(raw.daily.sunrise[i]),
          sunset: new Date(raw.daily.sunset[i]),
          uvMax: raw.daily.uv_index_max[i],
          precipitationSum: raw.daily.precipitation_sum[i],
          precipitationHours: raw.daily.precipitation_hours[i],
          windMax: raw.daily.wind_speed_10m_max[i],
          windDirDominant: raw.daily.wind_direction_10m_dominant[i],
        }))
      };

      setMeteoData(result);
      setLastUpdate(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore sconosciuto');
    } finally {
      setLoading(false);
    }
  }, [site]);

  useEffect(() => {
    loadWeather();
    const interval = setInterval(loadWeather, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [loadWeather]);

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
    return dayData[Math.min(selectedHour, dayData.length - 1)];
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
      const hours = meteoData.hourly.filter((h: any) =>
        h.time.getDate() === day.date.getDate() &&
        h.time.getMonth() === day.date.getMonth()
      );
      const temps = hours.map((h: any) => h.temperature).filter((t: any) => t != null);
      const delta = temps.length > 0 ? Math.round(Math.max(...temps) - Math.min(...temps)) : 0;
      return { ...day, thermalDelta: delta };
    });
  }, [meteoData]);

  const dateLabels = enrichedDaily.map((d: any) =>
    d.date.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })
  );

  const thermalStrength = useMemo(() => {
    if (!currentData) return { label: '--', color: '#888' };
    const temp = currentData.temperature;
    const cloud = currentData.cloudCover;
    const humidity = currentData.humidity;
    const score = (temp > 22 ? 2 : temp > 18 ? 1 : 0) +
                  (cloud < 30 ? 2 : cloud < 50 ? 1 : 0) +
                  (humidity < 50 ? 1 : 0) +
                  (thermalDelta > 10 ? 2 : thermalDelta > 6 ? 1 : 0);
    if (score >= 6) return { label: 'Forte 🔥', color: '#ff1744' };
    if (score >= 4) return { label: 'Media 💪', color: '#ff6d00' };
    if (score >= 2) return { label: 'Debole 🫤', color: '#ffd600' };
    return { label: 'Assente ❄️', color: '#4fc3f7' };
  }, [currentData, thermalDelta]);

  const weatherAlert = useMemo(() => {
    if (!currentData) return { level: 'info', message: 'Caricamento...', icon: 'ℹ️' };
    const alerts: string[] = [];
    if (currentData.windSpeed > 25) alerts.push('💨 VENTO FORTE');
    if (currentData.windGust > 35) alerts.push('💨 RAFFICHE PERICOLOSE');
    if (currentData.precipitation > 0.5) alerts.push('🌧️ PIOGGIA IN CORSO');
    if (currentData.cloudCover > 80) alerts.push('☁️ CIELO COPERTISSIMO');
    if (currentData.weatherCode >= 95) alerts.push('⛈️ TEMPORALE IN CORSO');
    if (thermalDelta > 12) alerts.push('🔥 FORTI TERMICHE');
    if (currentData.windSpeed < 5) alerts.push('🍃 VENTO DEBOLE');
    if (alerts.length === 0) return { level: 'success', message: '✅ Condizioni ottimali per volare!', icon: '🪂' };
    if (alerts.some(a => a.includes('TEMPORALE') || a.includes('PIOGGIA') || a.includes('VENTO FORTE')))
      return { level: 'danger', message: '⚠️ ' + alerts.join(' • '), icon: '🚨' };
    return { level: 'warning', message: '⚠️ ' + alerts.join(' • '), icon: '⚡' };
  }, [currentData, thermalDelta]);

  if (loading && !meteoData) {
    return (
      <div style={s.loadingContainer}>
        <div style={s.spinner}></div>
        <p style={s.loadingText}>🪂 Caricamento previsioni meteo...</p>
        <p style={s.loadingSub}>Sto cercando le migliori fonti per te</p>
      </div>
    );
  }

  if (error && !meteoData) {
    return (
      <div style={s.errorContainer}>
        <p style={s.errorText}>❌ {error}</p>
        <button style={s.retryButton} onClick={loadWeather}>🔄 Riprova</button>
      </div>
    );
  }

  return (
    <div style={s.app}>
      <header style={s.header}>
        <div style={s.logoContainer}>
          <span style={s.rabbitHop}>🐰</span>
          <span style={s.paragliderFloat}>🪂</span>
          <span style={s.logoText}>Meteo dei Conigli</span>
        </div>
        <p style={s.subtitle}>Previsioni per volo libero • Dati in tempo reale da Open-Meteo</p>
        <p style={s.updateInfo}>🔄 Aggiornato: {lastUpdate.toLocaleTimeString('it-IT')}</p>
      </header>

      <div style={s.mainGrid}>
        <div style={s.leftPanel}>
          <h2 style={s.sectionTitle}>📍 Decolli</h2>
          <div style={s.scrollList}>
            {DECOLLI.map((d) => {
              const isSelected = d.id === selectedId;
              let weatherIcon = '☁️';
              if (isSelected && currentData) weatherIcon = getWeatherIcon(currentData.weatherCode || 0, currentData.isDay || 1);
              return (
                <button key={d.id} onClick={() => setSelectedId(d.id)}
                  style={{ ...s.siteCard, borderColor: isSelected ? '#4caf50' : 'rgba(255,255,255,0.1)', background: isSelected ? 'rgba(76, 175, 80, 0.15)' : 'rgba(255,255,255,0.03)' }}>
                  <div style={s.siteCardTop}>
                    <span style={s.siteCardName}>{d.name}</span>
                    <span style={s.siteCardWeather}>{weatherIcon}</span>
                  </div>
                  <div style={s.siteCardDetails}><span>{d.valley}</span><span>{d.exposure} • {d.alt}m</span></div>
                </button>
              );
            })}
          </div>
        </div>

        <div style={s.rightPanel}>
          <div style={s.siteHeader}>
            <div>
              <h2 style={s.siteName}>{site.name}</h2>
              <span style={s.siteInfo}>{site.exposure} • {site.valley} • {site.alt}m</span>
            </div>
            <div style={s.weatherNow}>
              <span style={s.weatherIconLarge}>{currentData ? getWeatherIcon(currentData.weatherCode || 0, currentData.isDay || 1) : '☁️'}</span>
              <span style={s.tempNow}>{currentData ? Math.round(currentData.temperature) : '--'}°C</span>
            </div>
          </div>

          {currentData && (
            <div style={{
              ...s.alertBanner,
              background: weatherAlert.level === 'danger' ? 'rgba(255, 23, 68, 0.2)' : weatherAlert.level === 'warning' ? 'rgba(255, 152, 0, 0.2)' : 'rgba(76, 175, 80, 0.15)',
              borderColor: weatherAlert.level === 'danger' ? '#ff1744' : weatherAlert.level === 'warning' ? '#ff9800' : '#4caf50'
            }}>
              <span style={s.alertIcon}>{weatherAlert.icon}</span>
              <span style={s.alertMessage}>{weatherAlert.message}</span>
            </div>
          )}

          <div style={s.tabContainer}>
            {['meteo', 'venti', 'termiche', 'analisi'].map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                style={{ ...s.tabButton, background: activeTab === tab ? 'rgba(76, 175, 80, 0.2)' : 'transparent', borderBottom: activeTab === tab ? '2px solid #4caf50' : '2px solid transparent' }}>
                {tab === 'meteo' && '🌤️ Meteo'}{tab === 'venti' && '💨 Venti'}{tab === 'termiche' && '🔥 Termiche'}{tab === 'analisi' && '🤖 Analisi'}
              </button>
            ))}
          </div>

          <div style={s.daySelector}>
            {enrichedDaily.map((day: any, idx: number) => (
              <button key={idx} onClick={() => { setSelectedDay(idx); setSelectedHour(12); }}
                style={{ ...s.dayButton, background: selectedDay === idx ? 'rgba(76, 175, 80, 0.2)' : 'rgba(255,255,255,0.05)', borderColor: selectedDay === idx ? '#4caf50' : 'rgba(255,255,255,0.1)' }}>
                <div style={s.dayName}>{dateLabels[idx]}</div>
                <div style={s.dayWeatherIcon}>{getWeatherIcon(day.weatherCode, 1)}</div>
                <div style={s.dayTemp}>{Math.round(day.tempMax)}°/{Math.round(day.tempMin)}°</div>
                <div style={s.dayDelta}>Δ{day.thermalDelta}°C</div>
                <div style={s.dayRain}>{day.precipitationSum > 0 ? `🌧️${Math.round(day.precipitationSum)}mm` : '☀️'}</div>
              </button>
            ))}
          </div>

          <div style={s.hourSelector}>
            <span style={s.hourLabel}>⏰ Ora:</span>
            <input type="range" min="0" max="23" value={String(selectedHour)} onChange={(e) => setSelectedHour(parseInt(e.target.value))} style={s.hourSlider} />
            <span style={s.hourValue}>{String(selectedHour).padStart(2, '0')}:00</span>
          </div>

          {activeTab === 'meteo' && currentData && (
            <div style={s.tabContent}>
              <div style={s.meteoGrid}>
                <div style={s.meteoCard}><div style={s.meteoLabel}>🌡️ Temperatura</div><div style={s.meteoValue}>{Math.round(currentData.temperature)}°C</div><div style={s.meteoSub}>Δ {thermalDelta}°C</div></div>
                <div style={s.meteoCard}><div style={s.meteoLabel}>💧 Umidità</div><div style={s.meteoValue}>{Math.round(currentData.humidity)}%</div><div style={s.meteoSub}>Rugiada {Math.round(currentData.dewPoint)}°C</div></div>
                <div style={s.meteoCard}><div style={s.meteoLabel}>☁️ Nuvolosità</div><div style={s.meteoValue}>{Math.round(currentData.cloudCover)}%</div><div style={s.meteoSub}>{currentData.cloudCover < 20 ? '☀️ Sereno' : currentData.cloudCover < 50 ? '🌤️ Poco nuvoloso' : '☁️ Nuvoloso'}</div></div>
                <div style={s.meteoCard}><div style={s.meteoLabel}>🌧️ Precipitazioni</div><div style={s.meteoValue}>{currentData.precipitation === 0 ? '✅ Assenti' : `${currentData.precipitation} mm`}</div><div style={s.meteoSub}>{currentData.precipitation === 0 ? 'Ideale' : '⚠️ Pioggia'}</div></div>
                <div style={s.meteoCard}><div style={s.meteoLabel}>🏔️ Base Nuvole</div><div style={s.meteoValue}>{Math.round((currentData.temperature - currentData.dewPoint) * 120 + site.alt)}m</div><div style={s.meteoSub}>Cloud Base</div></div>
                <div style={s.meteoCard}><div style={s.meteoLabel}>📈 Plafond</div><div style={s.meteoValue}>{Math.round(site.alt + (thermalDelta * 100))}m</div><div style={s.meteoSub}>Thermal Top</div></div>
                <div style={s.meteoCard}><div style={s.meteoLabel}>🪂 Galleggiamento</div><div style={s.meteoValue}>{thermalDelta > 10 ? 'Eccellente ⭐' : thermalDelta > 6 ? 'Buono 👍' : 'Limitato 🫤'}</div><div style={s.meteoSub}>Delta {thermalDelta}°C</div></div>
                <div style={s.meteoCard}><div style={s.meteoLabel}>💨 Vento</div><div style={s.meteoValue}>{getWindArrow(currentData.windDir)} {Math.round(currentData.windSpeed)} km/h</div><div style={s.meteoSub}>{getWindDirection(currentData.windDir)} • ⚡{Math.round(currentData.windGust)} km/h</div></div>
              </div>
              <div style={s.pressureSection}>
                <h4 style={s.sectionSubtitle}>📊 Pressione e Gradiente</h4>
                <div style={s.pressureGrid}>
                  <div style={s.pressureCard}><div style={s.pressureLabel}>Pressione attuale</div><div style={s.pressureValue}>{Math.round(currentData.pressure)} hPa</div></div>
                  <div style={s.pressureCard}>
                    <div style={s.pressureLabel}>Gradiente</div>
                    <div style={{ ...s.pressureValue, color: '#4caf50' }}>
                      {(() => { const first = dayData[0]?.pressure; const last = dayData[dayData.length - 1]?.pressure; if (first == null || last == null) return '--'; const diff = last - first; return diff > 0 ? `⬆️ +${Math.round(diff)} hPa` : diff < 0 ? `⬇️ ${Math.round(diff)} hPa` : '➡️ Stabile'; })()}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'venti' && currentData && (
            <div style={s.tabContent}>
              <div style={s.windSection}>
                <h4 style={s.sectionSubtitle}>💨 Vento a differenti quote</h4>
                <div style={s.windGrid3}>
                  <div style={s.windCard}><div style={s.windLabel}>10 m (superficie)</div><div style={s.windValue}>{getWindArrow(currentData.windDir)} {Math.round(currentData.windSpeed)} km/h</div><div style={s.windDir}>{getWindDirection(currentData.windDir)}</div><div style={s.windGust}>⚡ {Math.round(currentData.windGust)} km/h</div></div>
                  <div style={s.windCard}><div style={s.windLabel}>80 m (quota termica)</div><div style={s.windValue}>{currentData.wind80m ? `${getWindArrow(currentData.windDir80m)} ${Math.round(currentData.wind80m)} km/h` : 'N/D'}</div><div style={s.windDir}>{currentData.wind80m ? getWindDirection(currentData.windDir80m) : '--'}</div><div style={s.windGust}>⚡ {currentData.wind80m ? Math.round(currentData.wind80m * 1.3) : '--'} km/h</div></div>
                  <div style={s.windCard}><div style={s.windLabel}>120 m (alta quota)</div><div style={s.windValue}>{currentData.wind120m ? `${getWindArrow(currentData.windDir120m)} ${Math.round(currentData.wind120m)} km/h` : 'N/D'}</div><div style={s.windDir}>{currentData.wind120m ? getWindDirection(currentData.windDir120m) : '--'}</div><div style={s.windGust}>⚡ {currentData.wind120m ? Math.round(currentData.wind120m * 1.35) : '--'} km/h</div></div>
                </div>
              </div>
              <div style={s.windProfileSection}>
                <h4 style={s.sectionSubtitle}>📊 Vento orario (9:00 - 19:00)</h4>
                <div style={s.hourlyWindGrid}>
                  {Array.from({ length: 11 }, (_: number, i: number) => i + 9).map((hour: number) => {
                    const hData = dayData?.find((h: any) => h.time.getHours() === hour);
                    if (!hData) return <div key={hour} style={s.hourlyWindCard}>--</div>;
                    return (
                      <div key={hour} style={s.hourlyWindCard}>
                        <div style={s.hourlyTime}>{String(hour).padStart(2, '0')}:00</div>
                        <div style={s.hourlyWind}>{getWindArrow(hData.windDir)}<span style={s.hourlySpeed}>{Math.round(hData.windSpeed)}</span></div>
                        <div style={s.hourlyDir}>{getWindDirection(hData.windDir)}</div>
                        <div style={s.hourlyWeather}>{getWeatherIcon(hData.weatherCode || 0, hData.isDay || 1)}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'termiche' && currentData && (
            <div style={s.tabContent}>
              <div style={s.thermalSection}>
                <h4 style={s.sectionSubtitle}>🔥 Analisi Termiche</h4>
                <div style={s.thermalGrid}>
                  <div style={s.thermalCard}><div style={s.thermalLabel}>Temperatura media</div><div style={s.thermalValue}>{Math.round(currentData.temperature)}°C</div></div>
                  <div style={s.thermalCard}><div style={s.thermalLabel}>Delta termico</div><div style={s.thermalValue}>{thermalDelta}°C</div></div>
                  <div style={s.thermalCard}><div style={s.thermalLabel}>Nuvolosità media</div><div style={s.thermalValue}>{Math.round(currentData.cloudCover)}%</div></div>
                  <div style={s.thermalCard}><div style={s.thermalLabel}>Umidità media</div><div style={s.thermalValue}>{Math.round(currentData.humidity)}%</div></div>
                  <div style={s.thermalCard}><div style={s.thermalLabel}>Base nuvole</div><div style={s.thermalValue}>{Math.round((currentData.temperature - currentData.dewPoint) * 120 + site.alt)}m</div></div>
                  <div style={s.thermalCard}><div style={s.thermalLabel}>Plafond</div><div style={s.thermalValue}>{Math.round(site.alt + (thermalDelta * 100))}m</div></div>
                  <div style={s.thermalCard}><div style={s.thermalLabel}>Galleggiamento</div><div style={s.thermalValue}>{thermalDelta > 10 ? 'Eccellente ⭐' : thermalDelta > 6 ? 'Buono 👍' : 'Limitato 🫤'}</div></div>
                  <div style={s.thermalCard}>
                    <div style={s.thermalLabel}>Cross Country</div>
                    <div style={{ ...s.thermalValue, color: thermalDelta > 10 && currentData.windSpeed < 20 ? '#4caf50' : '#ff9800' }}>
                      {thermalDelta > 10 && currentData.windSpeed < 20 ? '✅ Favorevole' : '🫤 Valutare'}
                    </div>
                  </div>
                </div>
              </div>
              <div style={s.hourlyThermalSection}>
                <h4 style={s.sectionSubtitle}>⏰ Sviluppo orario termiche (10:00 - 18:00)</h4>
                <div style={s.hourlyThermalGrid}>
                  {Array.from({ length: 9 }, (_: number, i: number) => i + 10).map((hour: number) => {
                    const hData = dayData?.find((h: any) => h.time.getHours() === hour);
                    if (!hData) return<div key={hour} style={s.hourlyThermalCard}>--</div>;
                    const temp = hData.temperature;
                    const cloud = hData.cloudCover;
                    const hum = hData.humidity;
                    const score = (temp > 22 ? 2 : temp > 18 ? 1 : 0) +
                                  (cloud < 30 ? 2 : cloud < 50 ? 1 : 0) +
                                  (hum < 50 ? 1 : 0);
                    const label = score >= 5 ? 'Forte 🔥' : score >= 3 ? 'Media 💪' : score >= 1 ? 'Debole 🫤' : 'Assente ❄️';
                    const color = score >= 5 ? '#ff1744' : score >= 3 ? '#ff6d00' : score >= 1 ? '#ffd600' : '#4fc3f7';
                    return (
                      <div key={hour} style={s.hourlyThermalCard}>
                        <div style={s.hourlyTime}>{String(hour).padStart(2, '0')}:00</div>
                        <div style={{ ...s.hourlyThermalValue, color }}>{label}</div>
                        <div style={s.hourlyThermalSub}>{Math.round(temp)}°C • {Math.round(cloud)}%</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'analisi' && currentData && (
            <div style={s.tabContent}>
              <div style={s.analysisSection}>
                <h4 style={s.sectionSubtitle}>📋 Panoramica Generale</h4>
                <p style={s.analysisText}>
                  🌅 La giornata al decollo di {site.name} si presenta con temperatura di {Math.round(currentData.temperature)}°C,
                  umidità al {Math.round(currentData.humidity)}% e nuvolosità al {Math.round(currentData.cloudCover)}%.
                  {currentData.windSpeed > 20 ? ` 💨 Vento sostenuto a ${Math.round(currentData.windSpeed)} km/h.` : ` 🍃 Vento leggero a ${Math.round(currentData.windSpeed)} km/h.`}
                  {currentData.precipitation > 0 ? ` 🌧️ Possibili precipitazioni (${currentData.precipitation} mm).` : ' ✅ Nessuna precipitazione prevista.'}
                  {thermalDelta > 8 ? ' 🔥 Buon delta termico, condizioni favorevoli per il volo.' : ' 🫤 Delta termico ridotto, volo locale.'}
                </p>
              </div>
              <div style={s.analysisSection}>
                <h4 style={s.sectionSubtitle}>💡 Consigli per il Volo</h4>
                <p style={s.analysisText}>
                  <strong>Valutazione del rischio:</strong>{' '}
                  {currentData.windSpeed > 25 || currentData.precipitation > 0.5 ? '🔴 ALTO - Condizioni pericolose, sconsigliato volare.' :
                   currentData.windSpeed > 18 ? '🟡 MEDIO - Condizioni impegnative, richiesta esperienza.' : '🟢 BASSO - Condizioni favorevoli.'}
                  <br /><strong>Vento:</strong> {currentData.windSpeed < 8 ? '💨 Vento debole, possibili difficoltà di decollo.' :
                   currentData.windSpeed < 20 ? '✅ Vento ideale (5-18 km/h).' : '⚠️ Vento sostenuto, attenzione.'}
                  <br /><strong>Termiche:</strong> {thermalStrength.label}
                  <br /><strong>Momento migliore:</strong> {currentData.windSpeed < 20 && currentData.cloudCover < 60 ? '🕐 Condizioni ottimali per volare ora!' : '⚠️ Valutare le condizioni prima di volare.'}
                </p>
              </div>
              <div style={s.analysisSection}>
                <h4 style={s.sectionSubtitle}>🏔️ Quote e Plafond</h4>
                <p style={s.analysisText}>
                  <strong>Base decollo:</strong> {site.alt}m<br />
                  <strong>Base delle nuvole:</strong> {Math.round((currentData.temperature - currentData.dewPoint) * 120 + site.alt)}m<br />
                  <strong>Plafond termico massimo:</strong> {Math.round(site.alt + (thermalDelta * 100))}m<br />
                  <strong>Delta termico:</strong> {thermalDelta}°C<br />
                  {thermalDelta > 8 && currentData.windSpeed < 20 ? '✅ Condizioni favorevoli per cross country.' : '🫤 Condizioni limitate per cross country.'}
                </p>
              </div>
              <div style={s.analysisSection}>
                <h4 style={s.sectionSubtitle}>⛈️ Allerta Temporali</h4>
                <p style={s.analysisText}>
                  {currentData.weatherCode >= 95 ? '🔴 ALLERTA TEMPORALI IN CORSO! Volo sconsigliato.' :
                   currentData.weatherCode >= 80 ? '🟡 ATTENZIONE: Possibili rovesci. Monitorare l\'evoluzione.' :
                   '✅ Nessun temporale previsto. Cielo sereno o poco nuvoloso.'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <footer style={s.footer}>
        <p style={s.footerText}>🐰 Vola sicuro e divertiti! 🪂 • Dati da Open-Meteo • Aggiornamento automatico ogni 30 min</p>
      </footer>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  app: {
    background: 'linear-gradient(145deg, #1a2a3a 0%, #0d1b2a 100%)',
    color: '#e8f0f8',
    minHeight: '100vh',
    padding: '16px',
    fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    background: 'linear-gradient(145deg, #1a2a3a, #0d1b2a)',
  },
  spinner: {
    width: '48px',
    height: '48px',
    border: '4px solid rgba(76, 175, 80, 0.2)',
    borderTopColor: '#4caf50',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  loadingText: { marginTop: '16px', fontSize: '1.2rem', color: '#e8f0f8' },
  loadingSub: { fontSize: '0.9rem', color: '#8899aa' },
  errorContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    background: 'linear-gradient(145deg, #1a2a3a, #0d1b2a)',
    padding: '20px',
  },
  errorText: { color: '#ff6b6b', fontSize: '1.1rem', marginBottom: '16px', textAlign: 'center' },
  retryButton: {
    background: '#4caf50',
    color: '#fff',
    border: 'none',
    padding: '10px 24px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: 600,
  },
  header: {
    textAlign: 'center',
    padding: '16px 0',
    borderBottom: '2px solid rgba(76, 175, 80, 0.3)',
    marginBottom: '20px',
  },
  logoContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    flexWrap: 'wrap',
  },
  rabbitHop: {
    fontSize: '2.8rem',
    display: 'inline-block',
    animation: 'hop 1.2s ease-in-out infinite',
  },
  paragliderFloat: {
    fontSize: '2.2rem',
    display: 'inline-block',
    animation: 'float 2.5s ease-in-out infinite',
  },
  logoText: {
    fontSize: '2.2rem',
    fontWeight: 800,
    background: 'linear-gradient(135deg, #4caf50, #8bc34a)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    letterSpacing: '-0.5px',
  },
  subtitle: { fontSize: '0.9rem', color: '#8899aa', marginTop: '4px' },
  updateInfo: { fontSize: '0.75rem', color: '#667788', marginTop: '2px' },
  mainGrid: {
    display: 'grid',
    gridTemplateColumns: 'minmax(260px, 320px) 1fr',
    gap: '16px',
    maxWidth: '1440px',
    margin: '0 auto',
  },
  leftPanel: {
    background: 'rgba(255,255,255,0.04)',
    borderRadius: '16px',
    border: '2px solid rgba(76, 175, 80, 0.25)',
    padding: '12px',
    height: 'calc(100vh - 200px)',
    overflow: 'hidden',
    backdropFilter: 'blur(8px)',
  },
  sectionTitle: { fontSize: '1.1rem', color: '#4caf50', marginBottom: '12px', fontWeight: 600 },
  scrollList: { overflowY: 'auto', height: 'calc(100% - 44px)', paddingRight: '4px' },
  siteCard: {
    background: 'rgba(255,255,255,0.03)',
    border: '2px solid rgba(255,255,255,0.1)',
    borderRadius: '12px',
    padding: '10px 12px',
    marginBottom: '8px',
    cursor: 'pointer',
    width: '100%',
    textAlign: 'left',
    transition: 'all 0.2s ease',
  },
  siteCardTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  siteCardName: { fontSize: '0.95rem', fontWeight: 600, color: '#e8f0f8' },
  siteCardWeather: { fontSize: '1.3rem' },
  siteCardDetails: { display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#8899aa', marginTop: '2px' },
  rightPanel: {
    background: 'rgba(255,255,255,0.04)',
    borderRadius: '16px',
    border: '2px solid rgba(76, 175, 80, 0.25)',
    padding: '16px',
    maxHeight: 'calc(100vh - 200px)',
    overflowY: 'auto',
    backdropFilter: 'blur(8px)',
  },
  siteHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.06)' },
  siteName: { fontSize: '1.5rem', fontWeight: 700, color: '#e8f0f8' },
  siteInfo: { fontSize: '0.8rem', color: '#8899aa' },
  weatherNow: { display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(76, 175, 80, 0.12)', padding: '6px 14px', borderRadius: '30px' },
  weatherIconLarge: { fontSize: '2rem' },
  tempNow: { fontSize: '1.4rem', fontWeight: 'bold' },
  alertBanner: { padding: '10px 14px', borderRadius: '10px', border: '2px solid', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '10px' },
  alertIcon: { fontSize: '1.4rem' },
  alertMessage: { fontSize: '0.9rem', fontWeight: 500 },
  tabContainer: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px', marginBottom: '12px' },
  tabButton: { padding: '8px 4px', borderRadius: '8px 8px 0 0', border: 'none', color: '#e8f0f8', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 500, transition: 'all 0.2s ease', textAlign: 'center' },
  daySelector: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '12px' },
  dayButton: { border: '2px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '8px', cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s ease', background: 'rgba(255,255,255,0.03)' },
  dayName: { fontSize: '0.8rem', fontWeight: 600, color: '#e8f0f8' },
  dayWeatherIcon: { fontSize: '1.6rem', marginTop: '2px' },
  dayTemp: { fontSize: '0.95rem', color: '#4caf50', fontWeight: 600 },
  dayDelta: { fontSize: '0.7rem', color: '#8899aa' },
  dayRain: { fontSize: '0.7rem', color: '#4fc3f7' },
  hourSelector: { display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: '10px', marginBottom: '12px' },
  hourLabel: { fontSize: '0.85rem', color: '#8899aa' },
  hourSlider: { flex: 1, accentColor: '#4caf50', height: '4px' },
  hourValue: { fontSize: '0.85rem', fontWeight: 'bold', minWidth: '44px', textAlign: 'center' },
  tabContent: { animation: 'fadeIn 0.3s ease' },
  meteoGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px', marginBottom: '12px' },
  meteoCard: { background: 'rgba(0,0,0,0.25)', padding: '10px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' },
  meteoLabel: { fontSize: '0.7rem', color: '#8899aa', marginBottom: '2px' },
  meteoValue: { fontSize: '1.1rem', fontWeight: 'bold', color: '#e8f0f8' },
  meteoSub: { fontSize: '0.65rem', color: '#667788', marginTop: '2px' },
  sectionSubtitle: { fontSize: '0.95rem', color: '#4caf50', marginBottom: '10px', fontWeight: 600 },
  pressureSection: { background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '12px' },
  pressureGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '8px' },
  pressureCard: { textAlign: 'center', padding: '8px', background: 'rgba(255,255,255,0.04)', borderRadius: '8px' },
  pressureLabel: { fontSize: '0.7rem', color: '#8899aa' },
  pressureValue: { fontSize: '1.1rem', fontWeight: 'bold', color: '#e8f0f8' },
  windSection: { marginBottom: '12px' },
  windGrid3: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' },
  windCard: { textAlign: 'center', padding: '10px', background: 'rgba(0,0,0,0.2)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' },
  windLabel: { fontSize: '0.7rem', color: '#8899aa' },
  windValue: { fontSize: '1rem', fontWeight: 'bold', color: '#e8f0f8' },
  windDir: { fontSize: '0.75rem', color: '#8899aa' },
  windGust: { fontSize: '0.7rem', color: '#ff6b6b' },
  windProfileSection: { marginBottom: '12px' },
  hourlyWindGrid: { display: 'grid', gridTemplateColumns: 'repeat(11, 1fr)', gap: '2px', overflowX: 'auto' },
  hourlyWindCard: { textAlign: 'center', padding: '6px 2px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', minWidth: '40px' },
  hourlyTime: { fontSize: '0.55rem', color: '#8899aa' },
  hourlyWind: { display: 'flex', flexDirection: 'column', alignItems: 'center' },
  hourlySpeed: { fontSize: '0.75rem', fontWeight: 'bold', color: '#e8f0f8' },
  hourlyDir: { fontSize: '0.5rem', color: '#667788' },
  hourlyWeather: { fontSize: '0.7rem' },
  thermalSection: { marginBottom: '12px' },
  thermalGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' },
  thermalCard: { background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '10px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.05)' },
  thermalLabel: { fontSize: '0.7rem', color: '#8899aa' },
  thermalValue: { fontSize: '1rem', fontWeight: 'bold', color: '#e8f0f8' },
  hourlyThermalSection: { marginBottom: '12px' },
  hourlyThermalGrid: { display: 'grid', gridTemplateColumns: 'repeat(9, 1fr)', gap: '4px', overflowX: 'auto' },
  hourlyThermalCard: { textAlign: 'center', padding: '6px 2px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', minWidth: '50px' },
  hourlyThermalValue: { fontSize: '0.7rem', fontWeight: 'bold' },
  hourlyThermalSub: { fontSize: '0.55rem', color: '#667788' },
  analysisSection: { background: 'rgba(0,0,0,0.2)', padding: '12px 14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '10px' },
  analysisText: { fontSize: '0.85rem', lineHeight: '1.6', color: '#d0d8e0' },
  footer: { textAlign: 'center', marginTop: '20px', padding: '12px 0', borderTop: '1px solid rgba(255,255,255,0.06)' },
  footerText: { fontSize: '0.75rem', color: '#667788' },
};

if (typeof document !== 'undefined') {
  const styleEl = document.createElement('style');
  styleEl.textContent = `
    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes hop { 0%, 100% { transform: translateY(0px) scale(1); } 50% { transform: translateY(-8px) scale(1.05); } }
    @keyframes float { 0%, 100% { transform: translateY(0px) rotate(-2deg); } 50% { transform: translateY(-6px) rotate(2deg); } }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
    ::-webkit-scrollbar { width: 4px; }
    ::-webkit-scrollbar-track { background: rgba(255,255,255,0.04); border-radius: 4px; }
    ::-webkit-scrollbar-thumb { background: rgba(76, 175, 80, 0.3); border-radius: 4px; }
    * { scrollbar-width: thin; scrollbar-color: rgba(76, 175, 80, 0.3) transparent; }
    @media (max-width: 768px) { .mainGrid { grid-template-columns: 1fr !important; } .leftPanel { height: auto !important; max-height: 260px !important; } .rightPanel { max-height: none !important; } }
  `;
  document.head.appendChild(styleEl);
}