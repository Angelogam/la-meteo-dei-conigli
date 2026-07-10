"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { DECOLLI, type Decollo } from "@/data/decolli";
import { 
  fetchMeteoCompleta, 
  getWeatherIcon, 
  getWeatherDescription, 
  getWindDirection, 
  getWindArrow, 
  getCloudCondition, 
  getThermalIndex,
  getWindAtAltitude,
  getWindProfile,
  calculateWindShear,
  getWindColor,
  calculateThermalProfile
} from "@/utils/meteoUtils";
import { generateAIAnalysis } from "@/utils/meteoAnalisi";

/* ============================
   APP PRINCIPALE
   ============================ */

export default function Index() {
  const [selected, setSelected] = useState<string>(DECOLLI[0].id);
  const [meteoData, setMeteoData] = useState<{
    hourly: Array<{
      time: Date;
      temperature: number;
      dewPoint: number;
      humidity: number;
      cloudCover: number;
      precipitation: number;
      visibility: number;
      windSpeed: number;
      windGust: number;
      windDir: number;
      wind80m: number | null;
      windDir80m: number | null;
      wind120m: number | null;
      windDir120m: number | null;
      uvIndex: number;
      isDay: number;
      weatherCode: number;
      pressure: number;
    }>;
    daily: Array<{
      date: Date;
      weatherCode: number;
      tempMax: number;
      tempMin: number;
      sunrise: Date;
      sunset: Date;
      uvMax: number;
      precipitationSum: number;
      precipitationHours: number;
      windMax: number;
      windDirDominant: number;
    }>;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState(0);
  const [selectedHour, setSelectedHour] = useState(12);
  const [aiAnalysis, setAiAnalysis] = useState<Record<string, string> | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState<'meteo' | 'venti' | 'termiche' | 'analisi'>('meteo');
  
  const site = DECOLLI.find((x) => x.id === selected) as Decollo;

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchMeteoCompleta(site.lat, site.lon);
        setMeteoData(data as typeof meteoData);
      } catch (err) {
        setError("Errore nel caricamento dei dati meteo");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selected, site.lat, site.lon]);

  const getDayData = useCallback(() => {
    if (!meteoData) return [];
    const today = new Date();
    const dayStart = new Date(today);
    dayStart.setDate(today.getDate() + selectedDay);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);
    return meteoData.hourly.filter(h => h.time >= dayStart && h.time < dayEnd);
  }, [meteoData, selectedDay]);

  const dayData = getDayData();
  
  const thermalProfile = useMemo(() => {
    if (!dayData || dayData.length === 0) return null;
    return calculateThermalProfile(dayData, site.altitude || 1500);
  }, [dayData, site.altitude]);

  const currentData = useMemo(() => {
    if (!dayData || dayData.length === 0) return null;
    return dayData[Math.min(selectedHour, dayData.length - 1)];
  }, [dayData, selectedHour]);

  const windProfileData = useMemo(() => {
    if (!currentData) return null;
    return getWindProfile(currentData.windSpeed, currentData.windDir, 400, 4000, 250);
  }, [currentData]);

  useEffect(() => {
    if (meteoData && dayData && dayData.length > 0) {
      setIsAnalyzing(true);
      const timer = setTimeout(() => {
        const analysis = generateAIAnalysis(meteoData as any, site, dayData as any, thermalProfile as any, windProfileData as any);
        setAiAnalysis(analysis as Record<string, string>);
        setIsAnalyzing(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [meteoData, dayData, thermalProfile, windProfileData, site]);

  const enrichedDailyData = useMemo(() => {
    if (!meteoData || !meteoData.daily) return [];
    return meteoData.daily.map((day, index) => {
      const dayHours = meteoData.hourly.filter(h => 
        h.time.getDate() === day.date.getDate() &&
        h.time.getMonth() === day.date.getMonth()
      );
      const temps = dayHours.map(h => h.temperature).filter(t => t !== undefined && t !== null);
      const delta = temps.length > 0 ? Math.round(Math.max(...temps) - Math.min(...temps)) : 0;
      return { ...day, thermalDelta: delta, dayIndex: index };
    });
  }, [meteoData]);

  const dateLabels = enrichedDailyData.map(d => 
    d.date.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })
  );

  const hoursRange = Array.from({ length: 11 }, (_, i) => i + 9);

  // Funzione per generare il gradiente di pressione
  const getPressureGradient = () => {
    if (!dayData || dayData.length < 2) return { gradient: 0, description: 'Dati insufficienti' };
    const first = dayData[0].pressure;
    const last = dayData[dayData.length - 1].pressure;
    const gradient = last - first;
    let description = '';
    if (gradient > 3) description = '⬆️ Pressione in aumento - miglioramento';
    else if (gradient < -3) description = '⬇️ Pressione in diminuzione - peggioramento';
    else description = '➡️ Pressione stabile';
    return { gradient: Math.round(gradient * 10) / 10, description };
  };

  if (loading) {
    return (
      <div style={styles.loadingFull}>
        <div style={styles.spinner}></div>
        <p style={styles.loadingText}>🪂 Caricamento previsioni meteo...</p>
        <p style={styles.loadingSub}>Open-Meteo • Free Flight Forecast</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.errorFull}>
        <p style={styles.errorText}>❌ {error}</p>
        <button style={styles.retryButton} onClick={() => window.location.reload()}>
          🔄 Riprova
        </button>
      </div>
    );
  }

  return (
    <div style={styles.app}>
      <header style={styles.header}>
        <div style={styles.logoContainer}>
          <span style={styles.logoRabbit}>🐰</span>
          <span style={styles.logoParaglider}>🪂</span>
          <span style={styles.logoText}>Meteo dei Conigli</span>
        </div>
        <p style={styles.subtitle}>Previsioni per volo libero • Dati da Open-Meteo • Stile SHV FSVL</p>
      </header>

      <div style={styles.grid}>
        <div style={styles.left}>
          <h2 style={styles.sectionTitle}>📍 Decolli</h2>
          <div style={styles.cardList}>
            {DECOLLI.map((d) => (
              <button
                key={d.id}
                onClick={() => setSelected(d.id)}
                style={{
                  ...styles.card,
                  borderColor: d.id === selected ? '#ff6b6b' : 'rgba(255,255,255,0.08)',
                  background: d.id === selected ? 'rgba(255,107,107,0.15)' : 'rgba(255,255,255,0.03)',
                }}
              >
                <div style={styles.cardTop}>
                  <div style={styles.cardTitle}>{d.name}</div>
                  <div style={styles.cardWeather}>
                    {currentData && d.id === selected ? (
                      getWeatherIcon(currentData.weatherCode || 0, currentData.isDay)
                    ) : (
                      <span style={styles.cardWeatherPlaceholder}>☁️</span>
                    )}
                  </div>
                </div>
                <div style={styles.cardDetails}>
                  <span style={styles.cardSmall}>{d.valley}</span>
                  <span style={styles.cardSmall}>{d.exposure}</span>
                </div>
                <div style={styles.cardBadges}>
                  <span style={{
                    ...styles.badge,
                    background: d.difficulty <= 2 ? '#4caf50' : d.difficulty <= 3 ? '#ff9800' : '#f44336'
                  }}>
                    {d.difficulty <= 2 ? '🟢 Facile' : d.difficulty <= 3 ? '🟡 Medio' : '🔴 Difficile'}
                  </span>
                  <span style={{
                    ...styles.badge,
                    background: d.altitude > 2000 ? '#2196f3' : '#78909c'
                  }}>
                    {d.altitude || 'N/D'}m
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div style={styles.right}>
          {currentData && site && (
            <>
              <div style={styles.siteHeader}>
                <div>
                  <h2 style={styles.siteName}>{site.name}</h2>
                  <span style={styles.siteInfo}>{site.exposure} • {site.valley} • {site.altitude || 'N/D'}m</span>
                </div>
                <div style={styles.weatherNow}>
                  <span style={styles.weatherIcon}>
                    {getWeatherIcon(currentData.weatherCode || 0, currentData.isDay)}
                  </span>
                  <span style={styles.tempNow}>{Math.round(currentData.temperature)}°C</span>
                </div>
              </div>

              {/* TABS */}
              <div style={styles.tabContainer}>
                <button 
                  style={{...styles.tab, background: activeTab === 'meteo' ? 'rgba(255,107,107,0.2)' : 'transparent'}}
                  onClick={() => setActiveTab('meteo')}
                >
                  🌤️ Meteo
                </button>
                <button 
                  style={{...styles.tab, background: activeTab === 'venti' ? 'rgba(255,107,107,0.2)' : 'transparent'}}
                  onClick={() => setActiveTab('venti')}
                >
                  💨 Venti
                </button>
                <button 
                  style={{...styles.tab, background: activeTab === 'termiche' ? 'rgba(255,107,107,0.2)' : 'transparent'}}
                  onClick={() => setActiveTab('termiche')}
                >
                  🔥 Termiche
                </button>
                <button 
                  style={{...styles.tab, background: activeTab === 'analisi' ? 'rgba(255,107,107,0.2)' : 'transparent'}}
                  onClick={() => setActiveTab('analisi')}
                >
                  🤖 Analisi
                </button>
              </div>

              {/* TAB METEO */}
              {activeTab === 'meteo' && (
                <>
                  <div style={styles.daySelector}>
                    {enrichedDailyData.map((day, index) => (
                      <button
                        key={index}
                        onClick={() => { setSelectedDay(index); setSelectedHour(12); }}
                        style={{
                          ...styles.dayButton,
                          background: selectedDay === index ? 'rgba(255,107,107,0.2)' : 'rgba(255,255,255,0.05)',
                          borderColor: selectedDay === index ? '#ff6b6b' : 'rgba(255,255,255,0.1)',
                        }}
                      >
                        <<div style={styles.dayName}>{dateLabels[index]}</div>
                        <div style={styles.dayWeatherIcon}>{getWeatherIcon(day.weatherCode, 1)}</div>
                        <div style={styles.dayTemp}>{Math.round(day.tempMax)}°/{Math.round(day.tempMin)}°</div>
                        <div style={styles.dayDelta}>Δ{day.thermalDelta}°C</div>
                        <div style={styles.dayRain}>{day.precipitationSum > 0 ? `🌧️${Math.round(day.precipitationSum)}mm` : '☀️'}</div>
                      </button>
                    ))}
                  </div>

                  <div style={styles.hourSelector}>
                    <label style={styles.hourLabel}>⏰ Ora:</label>
                    <input
                      type="range"
                      min="0"
                      max="23"
                      value={selectedHour}
                      onChange={(e) => setSelectedHour(parseInt(e.target.value))}
                      style={styles.hourSlider}
                    />
                    <span style={styles.hourValue}>{String(selectedHour).padStart(2, '0')}:00</span>
                  </div>

                  {/* METEO GRID */}
                  <div style={styles.meteoGrid}>
                    <div style={styles.meteoCard}>
                      <div style={styles.meteoLabel}>🌡️ Temperatura</div>
                      <div style={styles.meteoValue}>{Math.round(currentData.temperature)}°C</div>
                      <div style={styles.meteoSub}>Δ {thermalProfile?.thermalDelta || 0}°C</div>
                    </div>
                    <div style={styles.meteoCard}>
                      <div style={styles.meteoLabel}>💧 Umidità</div>
                      <div style={styles.meteoValue}>{Math.round(currentData.humidity)}%</div>
                      <div style={styles.meteoSub}>Rugiada {Math.round(currentData.dewPoint)}°C</div>
                    </div>
                    <div style={styles.meteoCard}>
                      <div style={styles.meteoLabel}>☁️ Nuvolosità</div>
                      <div style={styles.meteoValue}>{Math.round(currentData.cloudCover)}%</div>
                      <div style={styles.meteoSub}>
                        {getCloudCondition(currentData.cloudCover).icon} {getCloudCondition(currentData.cloudCover).text}
                      </div>
                    </div>
                    <div style={styles.meteoCard}>
                      <div style={styles.meteoLabel}>🌧️ Precipitazioni</div>
                      <div style={styles.meteoValue}>
                        {currentData.precipitation === 0 ? '✅ Assenti' : `${currentData.precipitation} mm`}
                      </div>
                      <div style={styles.meteoSub}>
                        {currentData.precipitation === 0 ? 'Ideale' : '⚠️ Pioggia'}
                      </div>
                    </div>
                    <div style={styles.meteoCard}>
                      <div style={styles.meteoLabel}>🏔️ Base Nuvole</div>
                      <div style={styles.meteoValue}>
                        {thermalProfile?.cloudBase ? `${thermalProfile.cloudBase}m` : '--'}
                      </div>
                      <div style={styles.meteoSub}>Cloud Base</div>
                    </div>
                    <div style={styles.meteoCard}>
                      <div style={styles.meteoLabel}>📈 Plafond</div>
                      <div style={styles.meteoValue}>
                        {thermalProfile?.thermalTop ? `${thermalProfile.thermalTop}m` : '--'}
                      </div>
                      <div style={styles.meteoSub}>Thermal Top</div>
                    </div>
                    <div style={styles.meteoCard}>
                      <div style={styles.meteoLabel}>🪂 Galleggiamento</div>
                      <div style={styles.meteoValue}>
                        {thermalProfile?.soarIndex ? `${thermalProfile.soarIndex}/10` : '--'}
                      </div>
                      <div style={styles.meteoSub}>Soaring Index</div>
                    </div>
                    <div style={styles.meteoCard}>
                      <div style={styles.meteoLabel}>💨 Vento</div>
                      <div style={styles.meteoValue}>
                        {getWindArrow(currentData.windDir)} {Math.round(currentData.windSpeed)} km/h
                      </div>
                      <div style={styles.meteoSub}>
                        {getWindDirection(currentData.windDir)} • ⚡{Math.round(currentData.windGust)} km/h
                      </div>
                    </div>
                  </div>

                  {/* Pressione e Gradiente */}
                  <div style={styles.pressureSection}>
                    <h3 style={styles.windTitle}>📊 Pressione e Gradiente</h3>
                    <div style={styles.pressureGrid}>
                      <div style={styles.pressureCard}>
                        <div style={styles.pressureLabel}>Pressione attuale</div>
                        <div style={styles.pressureValue}>{Math.round(currentData.pressure)} hPa</div>
                      </div>
                      <div style={styles.pressureCard}>
                        <div style={styles.pressureLabel}>Gradiente</div>
                        <div style={{...styles.pressureValue, color: getPressureGradient().gradient > 0 ? '#4caf50' : getPressureGradient().gradient < 0 ? '#f44336' : '#ffd93d'}}>
                          {getPressureGradient().gradient > 0 ? '⬆️' : getPressureGradient().gradient < 0 ? '⬇️' : '➡️'} {getPressureGradient().gradient} hPa
                        </div>
                        <div style={styles.pressureSub}>{getPressureGradient().description}</div>
                      </div>
                    </div>
                  </div>

                  {/* Allerta Temporali */}
                  {aiAnalysis?.thunderstorm && (
                    <div style={styles.thunderstormSection}>
                      <div style={aiAnalysis.thunderstorm.includes('ALLERTA') ? styles.thunderstormAlert : styles.thunderstormSafe}>
                        <div style={styles.aiTextWhite} dangerouslySetInnerHTML={{ 
                          __html: aiAnalysis.thunderstorm.replace(/\n/g, '<br/>') 
                        }} />
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* TAB VENTI */}
              {activeTab === 'venti' && (
                <>
                  <div style={styles.windSection}>
                    <h3 style={styles.windTitle}>💨 Vento a differenti quote</h3>
                    <div style={styles.windGrid}>
                      <div style={styles.windCard}>
                        <div style={styles.windLabel}>10 m (superficie)</div>
                        <div style={styles.windValue}>
                          {getWindArrow(currentData.windDir)} {Math.round(currentData.windSpeed)} km/h
                        </div>
                        <div style={styles.windDir}>{getWindDirection(currentData.windDir)}</div>
                        <div style={styles.windGustSmall}>⚡ {Math.round(currentData.windGust)} km/h</div>
                      </div>
                      <div style={styles.windCard}>
                        <div style={styles.windLabel}>80 m (quota termica)</div>
                        <div style={styles.windValue}>
                          {currentData.wind80m ? 
                            `${getWindArrow(currentData.windDir80m)} ${Math.round(currentData.wind80m)} km/h` : 
                            'N/D'
                          }
                        </div>
                        <div style={styles.windDir}>
                          {currentData.wind80m ? getWindDirection(currentData.windDir80m || 0) : '--'}
                        </div>
                        <div style={styles.windGustSmall}>⚡ {currentData.wind80m ? Math.round(currentData.wind80m * 1.3) : '--'} km/h</div>
                      </div>
                      <div style={styles.windCard}>
                        <div style={styles.windLabel}>120 m (alta quota)</div>
                        <div style={styles.windValue}>
                          {currentData.wind120m ? 
                            `${getWindArrow(currentData.windDir120m)} ${Math.round(currentData.wind120m)} km/h` : 
                            'N/D'
                          }
                        </div>
                        <div style={styles.windDir}>
                          {currentData.wind120m ? getWindDirection(currentData.windDir120m || 0) : '--'}
                        </div>
                        <div style={styles.windGustSmall}>⚡ {currentData.wind120m ? Math.round(currentData.wind120m * 1.35) : '--'} km/h</div>
                      </div>
                    </div>
                  </div>

                  {/* PROFILO VENTO COMPLETO 400m-4000m */}
                  <div style={styles.windProfileSection}>
                    <h3 style={styles.windTitle}>📊 Profilo Vento (400m - 4000m)</h3>
                    
                    <div style={styles.windProfileContainer}>
                      <div style={styles.windProfileLegend}>
                        <span style={styles.legendItem}>⚡ Velocità (km/h)</span>
                        <span style={styles.legendItem}>🧭 Direzione</span>
                      </div>
                      
                      <div style={styles.windProfile}>
                        {windProfileData && windProfileData.map((level, index) => {
                          const maxSpeed = currentData.windSpeed * 3.5;
                          const barWidth = Math.min(100, (level.speed / maxSpeed) * 100);
                          
                          return (
                            <div key={index} style={styles.windProfileRow}>
                              <div style={styles.windProfileAlt}>
                                {level.altitude === 10 ? 'Superficie' : `${level.altitude}m`}
                              </div>
                              <div style={styles.windProfileBarContainer}>
                                <div style={{
                                  ...styles.windProfileBar,
                                  width: `${barWidth}%`,
                                  background: `linear-gradient(to right, ${getWindColor(level.speed, maxSpeed)}, ${getWindColor(level.speed, maxSpeed)})`
                                }}>
                                  <span style={styles.windProfileSpeed}>{level.speed} km/h</span>
                                </div>
                              </div>
                              <div style={styles.windProfileDir}>
                                {getWindArrow(level.direction)} {level.directionName}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      
                      {/* Analisi Shear */}
                      {windProfileData && (
                        <div style={styles.shearAnalysis}>
                          {(() => {
                            const shear = calculateWindShear(windProfileData as any);
                            return (
                              <div style={{...styles.shearBox, borderColor: shear.risk === 'alto' ? '#f44336' : shear.risk === 'medio' ? '#ff9800' : '#4caf50'}}>
                                <div style={styles.shearTitle}>🌪️ Analisi Wind Shear</div>
                                <div style={styles.shearValue}>Shear: {shear.shear}</div>
                                <div style={styles.shearDesc}>{shear.description}</div>
                                <div style={styles.shearDetails}>
                                  <span>Superficie: {shear.surfaceSpeed} km/h ({shear.surfaceDir})</span>
                                  <span>Alta quota: {shear.highSpeed} km/h ({shear.highDir})</span>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* PREVISIONE ORARIA */}
                  <div style={styles.hourlyWindSection}>
                    <h3 style={styles.windTitle}>📊 Vento orario (9:00 - 19:00)</h3>
                    <div style={styles.hourlyWindGrid}>
                      {hoursRange.map(hour => {
                        const hourData = dayData?.find(h => h.time.getHours() === hour);
                        if (!hourData) return null;
                        return (
                          <div key={hour} style={styles.hourlyWindCard}>
                            <div style={styles.hourlyTime}>{String(hour).padStart(2, '0')}:00</div>
                            <div style={styles.hourlyWind}>
                              {getWindArrow(hourData.windDir)}
                              <span style={styles.hourlySpeed}>{Math.round(hourData.windSpeed)}</span>
                            </div>
                            <div style={styles.hourlyDir}>{getWindDirection(hourData.windDir)}</div>
                            <div style={styles.hourlyWeather}>
                              {getWeatherIcon(hourData.weatherCode || 0, hourData.isDay)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}

              {/* TAB TERMICHE */}
              {activeTab === 'termiche' && (
                <>
                  <div style={styles.thermalSection}>
                    <h3 style={styles.windTitle}>🔥 Analisi Termiche</h3>
                    <div style={styles.aiBlock}>
                      <div style={styles.aiTextWhite} dangerouslySetInnerHTML={{ 
                        __html: aiAnalysis?.thermal?.replace(/\n/g, '<br/>') || 'Dati non disponibili' 
                      }} />
                    </div>
                  </div>

                  <div style={styles.altitudeSection}>
                    <h3 style={styles.windTitle}>🏔️ Quote e Plafond</h3>
                    <div style={styles.aiBlock}>
                      <div style={styles.aiTextWhite} dangerouslySetInnerHTML={{ 
                        __html: aiAnalysis?.altitude?.replace(/\n/g, '<br/>') || 'Dati non disponibili' 
                      }} />
                    </div>
                  </div>

                  <div style={styles.hourlySection}>
                    <h3 style={styles.windTitle}>⏰ Sviluppo Orario</h3>
                    <div style={styles.aiBlock}>
                      <div style={styles.aiTextWhite} dangerouslySetInnerHTML={{ 
                        __html: aiAnalysis?.hourly?.replace(/\n/g, '<br/>') || 'Dati non disponibili' 
                      }} />
                    </div>
                  </div>
                </>
              )}

              {/* TAB ANALISI */}
              {activeTab === 'analisi' && (
                <div style={styles.aiSection}>
                  <div style={styles.aiHeader}>
                    <span style={styles.aiIcon}>🤖</span>
                    <h3 style={styles.aiTitle}>Analisi Completa della Giornata</h3>
                    {isAnalyzing && <span style={styles.aiLoading}>⏳ Analisi in corso...</span>}
                  </div>
                  
                  {aiAnalysis && !isAnalyzing && (
                    <div style={styles.aiContent}>
                      <div style={styles.aiBlock}>
                        <div style={styles.aiTextWhite} dangerouslySetInnerHTML={{ 
                          __html: aiAnalysis.general.replace(/\n/g, '<br/>') 
                        }} />
                      </div>
                      <div style={styles.aiBlock}>
                        <div style={styles.aiTextWhite} dangerouslySetInnerHTML={{ 
                          __html: aiAnalysis.advice.replace(/\n/g, '<br/>') 
                        }} />
                      </div>
                      <div style={styles.aiBlock}>
                        <div style={styles.aiTextWhite} dangerouslySetInnerHTML={{ 
                          __html: aiAnalysis.siteInfo.replace(/\n/g, '<br/>') 
                        }} />
                      </div>
                      <div style={styles.aiBlock}>
                        <div style={styles.aiTextWhite} dangerouslySetInnerHTML={{ 
                          __html: aiAnalysis.pressure.replace(/\n/g, '<br/>') 
                        }} />
                      </div>
                      {aiAnalysis.thunderstorm && (
                        <div style={styles.aiBlock}>
                          <div style={styles.aiTextWhite} dangerouslySetInnerHTML={{ 
                            __html: aiAnalysis.thunderstorm.replace(/\n/g, '<br/>') 
                          }} />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <footer style={styles.footer}>
        <p style={styles.footerText}>
          🌤️ Dati meteo forniti da Open-Meteo.com • Ispirato a SHV FSVL • Ottimizzato per volo libero
        </p>
        <p style={styles.footerSmall}>🐰 Vola sicuro e divertiti! 🪂 • Beta v2.0</p>
      </footer>
    </div>
  );
}

/* ============================
   STILI
   ============================ */

const styles: Record<string, React.CSSProperties> = {
  app: {
    background: "linear-gradient(135deg, #0a0e27 0%, #1a1a3e 30%, #16213e 60%, #0d1b2a 100%)",
    color: "#eee",
    minHeight: "100vh",
    padding: "20px",
    fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif",
    maxWidth: "100%",
    overflowX: "hidden",
  },
  loadingFull: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
    background: "linear-gradient(135deg, #0a0e27, #1a1a3e)",
    color: "#eee",
    padding: "20px",
  },
  spinner: {
    width: "60px",
    height: "60px",
    border: "4px solid rgba(255,255,255,0.1)",
    borderTopColor: "#ff6b6b",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },
  loadingText: {
    marginTop: "20px",
    fontSize: "clamp(1rem, 4vw, 1.4rem)",
    color: "#fff",
    textAlign: "center",
  },
  loadingSub: {
    marginTop: "10px",
    fontSize: "clamp(0.8rem, 3vw, 1rem)",
    color: "#888",
    textAlign: "center",
  },
  errorFull: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
    background: "linear-gradient(135deg, #0a0e27, #1a1a3e)",
    color: "#eee",
    padding: "20px",
  },
  errorText: {
    color: "#ff6b6b",
    fontSize: "clamp(1rem, 4vw, 1.2rem)",
    marginBottom: "20px",
    textAlign: "center",
  },
  retryButton: {
    background: "#ff6b6b",
    color: "#fff",
    border: "none",
    padding: "12px 30px",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "600",
    fontSize: "clamp(0.9rem, 3vw, 1rem)",
  },
  header: {
    textAlign: "center",
    marginBottom: "clamp(15px, 3vw, 30px)",
    padding: "clamp(10px, 2vw, 20px) 0",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
  },
  logoContainer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "clamp(8px, 2vw, 12px)",
    flexWrap: "wrap",
  },
  logoRabbit: {
    fontSize: "clamp(2rem, 6vw, 2.8rem)",
  },
  logoParaglider: {
    fontSize: "clamp(1.6rem, 5vw, 2.2rem)",
  },
  logoText: {
    fontSize: "clamp(1.5rem, 5vw, 2.5rem)",
    fontWeight: 800,
    background: "linear-gradient(135deg, #ff6b6b, #ffd93d)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    letterSpacing: "-0.5px",
  },
  subtitle: {
    fontSize: "clamp(0.7rem, 2vw, 1rem)",
    color: "#888",
    marginTop: "8px",
    letterSpacing: "0.3px",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "minmax(280px, 340px) 1fr",
    gap: "clamp(15px, 3vw, 20px)",
    maxWidth: "1440px",
    margin: "0 auto",
  },
  left: {
    background: "rgba(255,255,255,0.05)",
    padding: "15px",
    borderRadius: "16px",
    border: "1px solid rgba(255,255,255,0.08)",
    height: "calc(100vh - 200px)",
    overflow: "hidden",
    backdropFilter: "blur(10px)",
  },
  sectionTitle: {
    fontSize: "clamp(1rem, 3vw, 1.2rem)",
    marginBottom: "15px",
    color: "#ff6b6b",
    fontWeight: 600,
  },
  cardList: {
    overflowY: "auto",
    height: "calc(100% - 50px)",
    paddingRight: "5px",
  },
  right: {
    background: "rgba(255,255,255,0.05)",
    padding: "clamp(12px, 2vw, 20px)",
    borderRadius: "16px",
    border: "1px solid rgba(255,255,255,0.08)",
    maxHeight: "calc(100vh - 200px)",
    overflowY: "auto",
    backdropFilter: "blur(10px)",
  },
  tabContainer: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "5px",
    marginBottom: "15px",
  },
  tab: {
    padding: "8px 4px",
    borderRadius: "8px",
    border: "1px solid rgba(255,255,255,0.08)",
    color: "#fff",
    cursor: "pointer",
    fontSize: "clamp(0.6rem, 1.5vw, 0.85rem)",
    fontWeight: 500,
    textAlign: "center",
  },
  card: {
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "12px",
    padding: "clamp(10px, 1.5vw, 14px)",
    marginBottom: "10px",
    cursor: "pointer",
    textAlign: "left",
    width: "100%",
  },
  cardTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "4px",
  },
  cardTitle: {
    fontSize: "clamp(0.85rem, 2vw, 1rem)",
    fontWeight: "bold",
    color: "#fff",
  },
  cardWeather: {
    fontSize: "clamp(1rem, 2.5vw, 1.4rem)",
  },
  cardWeatherPlaceholder: {
    fontSize: "clamp(0.8rem, 2vw, 1.2rem)",
    opacity: 0.3,
  },
  cardDetails: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "4px",
    flexWrap: "wrap",
    gap: "4px",
  },
  cardSmall: {
    fontSize: "clamp(0.65rem, 1.5vw, 0.8rem)",
    color: "#888",
  },
  cardBadges: {
    display: "flex",
    gap: "5px",
    marginTop: "4px",
    flexWrap: "wrap",
  },
  badge: {
    fontSize: "clamp(0.55rem, 1.2vw, 0.7rem)",
    padding: "2px 8px",
    borderRadius: "12px",
    color: "#fff",
    fontWeight: 600,
  },
  siteHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "15px",
    paddingBottom: "15px",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    flexWrap: "wrap",
    gap: "10px",
  },
  siteName: {
    fontSize: "clamp(1.2rem, 4vw, 1.8rem)",
    marginBottom: "2px",
    color: "#fff",
    fontWeight: 700,
  },
  siteInfo: {
    fontSize: "clamp(0.7rem, 2vw, 0.9rem)",
    color: "#888",
  },
  weatherNow: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    background: "rgba(255,255,255,0.08)",
    padding: "6px 14px",
    borderRadius: "30px",
  },
  weatherIcon: {
    fontSize: "clamp(1.6rem, 4vw, 2.2rem)",
  },
  tempNow: {
    fontSize: "clamp(1.2rem, 3vw, 1.6rem)",
    fontWeight: "bold",
  },
  daySelector: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "8px",
    marginBottom: "15px",
  },
  dayButton: {
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "12px",
    padding: "clamp(8px, 1.5vw, 12px)",
    cursor: "pointer",
    textAlign: "center",
    color: "#fff",
  },
  dayName: {
    fontSize: "clamp(0.7rem, 1.8vw, 0.9rem)",
    fontWeight: "bold",
    color: "#fff",
  },
  dayWeatherIcon: {
    fontSize: "clamp(1.2rem, 3vw, 1.8rem)",
    marginTop: "2px",
  },
  dayTemp: {
    fontSize: "clamp(0.9rem, 2vw, 1.1rem)",
    color: "#ff6b6b",
    marginTop: "2px",
    fontWeight: 600,
  },
  dayDelta: {
    fontSize: "clamp(0.6rem, 1.5vw, 0.75rem)",
    color: "#888",
    marginTop: "2px",
  },
  dayRain: {
    fontSize: "clamp(0.6rem, 1.5vw, 0.75rem)",
    color: "#4fc3f7",
    marginTop: "2px",
  },
  hourSelector: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "15px",
    padding: "8px 12px",
    background: "rgba(255,255,255,0.05)",
    borderRadius: "12px",
    flexWrap: "wrap",
  },
  hourLabel: {
    fontSize: "clamp(0.7rem, 2vw, 0.9rem)",
    color: "#888",
    fontWeight: 500,
  },
  hourSlider: {
    flex: 1,
    accentColor: "#ff6b6b",
    height: "4px",
    minWidth: "80px",
  },
  hourValue: {
    fontSize: "clamp(0.7rem, 2vw, 0.9rem)",
    fontWeight: "bold",
    color: "#fff",
    minWidth: "45px",
    textAlign: "center",
  },
  meteoGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
    gap: "8px",
    marginBottom: "15px",
  },
  meteoCard: {
    background: "rgba(0,0,0,0.3)",
    padding: "clamp(8px, 1.5vw, 12px)",
    borderRadius: "10px",
    border: "1px solid rgba(255,255,255,0.05)",
  },
  meteoLabel: {
    fontSize: "clamp(0.6rem, 1.5vw, 0.75rem)",
    color: "#888",
    marginBottom: "2px",
    fontWeight: 500,
  },
  meteoValue: {
    fontSize: "clamp(0.9rem, 2.5vw, 1.2rem)",
    fontWeight: "bold",
    color: "#fff",
  },
  meteoSub: {
    fontSize: "clamp(0.55rem, 1.2vw, 0.7rem)",
    color: "#666",
    marginTop: "2px",
  },
  pressureSection: {
    marginBottom: "15px",
    padding: "clamp(10px, 2vw, 16px)",
    background: "rgba(0,0,0,0.3)",
    borderRadius: "12px",
    border: "1px solid rgba(255,255,255,0.05)",
  },
  pressureGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
    gap: "10px",
  },
  pressureCard: {
    textAlign: "center",
    padding: "8px",
    background: "rgba(255,255,255,0.05)",
    borderRadius: "8px",
  },
  pressureLabel: {
    fontSize: "clamp(0.6rem, 1.5vw, 0.75rem)",
    color: "#888",
    marginBottom: "4px",
  },
  pressureValue: {
    fontSize: "clamp(1rem, 2.5vw, 1.3rem)",
    fontWeight: "bold",
    color: "#fff",
  },
  pressureSub: {
    fontSize: "clamp(0.55rem, 1.2vw, 0.7rem)",
    color: "#888",
    marginTop: "2px",
  },
  thunderstormSection: {
    marginBottom: "15px",
  },
  thunderstormAlert: {
    padding: "12px 16px",
    borderRadius: "10px",
    background: "rgba(244,67,54,0.15)",
    border: "2px solid #f44336",
  },
  thunderstormSafe: {
    padding: "12px 16px",
    borderRadius: "10px",
    background: "rgba(76,175,80,0.1)",
    border: "1px solid rgba(76,175,80,0.3)",
  },
  windSection: {
    marginBottom: "15px",
    padding: "clamp(10px, 2vw, 16px)",
    background: "rgba(0,0,0,0.3)",
    borderRadius: "12px",
    border: "1px solid rgba(255,255,255,0.05)",
  },
  windTitle: {
    fontSize: "clamp(0.85rem, 2.5vw, 1rem)",
    color: "#4fc3f7",
    marginBottom: "12px",
    fontWeight: 600,
  },
  windGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))",
    gap: "10px",
  },
  windCard: {
    textAlign: "center",
    padding: "clamp(8px, 1.5vw, 12px)",
    background: "rgba(255,255,255,0.05)",
    borderRadius: "10px",
  },
  windLabel: {
    fontSize: "clamp(0.6rem, 1.5vw, 0.75rem)",
    color: "#888",
    marginBottom: "4px",
    fontWeight: 500,
  },
  windValue: {
    fontSize: "clamp(0.9rem, 2.5vw, 1.1rem)",
    fontWeight: "bold",
    color: "#fff",
  },
  windDir: {
    fontSize: "clamp(0.7rem, 1.8vw, 0.8rem)",
    color: "#aaa",
    marginTop: "2px",
  },
  windGustSmall: {
    fontSize: "clamp(0.6rem, 1.5vw, 0.7rem)",
    color: "#ff6b6b",
    marginTop: "2px",
  },
  windProfileSection: {
    marginBottom: "15px",
    padding: "clamp(10px, 2vw, 16px)",
    background: "rgba(0,0,0,0.3)",
    borderRadius: "12px",
    border: "1px solid rgba(255,255,255,0.05)",
  },
  windProfileContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  windProfileLegend: {
    display: "flex",
    gap: "15px",
    fontSize: "clamp(0.6rem, 1.5vw, 0.75rem)",
    color: "#888",
    padding: "4px 8px",
    borderBottom: "1px solid rgba(255,255,255,0.05)",
    flexWrap: "wrap",
  },
  legendItem: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
  },
  windProfile: {
    display: "flex",
    flexDirection: "column",
    gap: "3px",
    maxHeight: "300px",
    overflowY: "auto",
    padding: "4px",
  },
  windProfileRow: {
    display: "grid",
    gridTemplateColumns: "70px 1fr 50px",
    gap: "8px",
    alignItems: "center",
    padding: "3px 6px",
    background: "rgba(255,255,255,0.03)",
    borderRadius: "6px",
    fontSize: "clamp(0.65rem, 1.5vw, 0.8rem)",
  },
  windProfileAlt: {
    color: "#888",
    fontSize: "clamp(0.55rem, 1.2vw, 0.7rem)",
  },
  windProfileBarContainer: {
    height: "16px",
    background: "rgba(255,255,255,0.05)",
    borderRadius: "10px",
    overflow: "hidden",
    position: "relative",
  },
  windProfileBar: {
    height: "100%",
    borderRadius: "10px",
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingRight: "4px",
    minWidth: "30px",
  },
  windProfileSpeed: {
    fontSize: "clamp(0.5rem, 1vw, 0.6rem)",
    color: "#fff",
    fontWeight: "bold",
    textShadow: "0 1px 2px rgba(0,0,0,0.5)",
  },
  windProfileDir: {
    fontSize: "clamp(0.65rem, 1.5vw, 0.8rem)",
    color: "#aaa",
    textAlign: "center",
  },
  shearAnalysis: {
    marginTop: "8px",
    padding: "8px",
    background: "rgba(255,255,255,0.03)",
    borderRadius: "8px",
  },
  shearBox: {
    padding: "10px",
    borderRadius: "8px",
    border: "2px solid",
    background: "rgba(0,0,0,0.2)",
  },
<dyad-write path="src/pages/Index.tsx" description="Completamento stili Shear e sezioni successive">
  shearTitle: {
    fontSize: "clamp(0.7rem, 1.8vw, 0.85rem)",
    fontWeight: "bold",
    color: "#fff",
    marginBottom: "2px",
  },
  shearValue: {
    fontSize: "clamp(0.8rem, 2vw, 1rem)",
    fontWeight: "bold",
    color: "#fff",
  },
  shearDesc: {
    fontSize: "clamp(0.65rem, 1.5vw, 0.8rem)",
    color: "#ddd",
    marginTop: "2px",
  },
  shearDetails: {
    display: "flex",
    gap: "10px",
    fontSize: "clamp(0.55rem, 1.2vw, 0.7rem)",
    color: "#888",
    marginTop: "4px",
    flexWrap: "wrap",
  },
  hourlyWindSection: {
    marginBottom: "15px",
    padding: "clamp(10px, 2vw, 16px)",
    background: "rgba(0,0,0,0.3)",
    borderRadius: "12px",
    border: "1px solid rgba(255,255,255,0.05)",
  },
  hourlyWindGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(45px, 1fr))",
    gap: "3px",
    overflowX: "auto",
  },
  hourlyWindCard: {
    textAlign: "center",
    padding: "6px 4px",
    background: "rgba(255,255,255,0.03)",
    borderRadius: "6px",
    minWidth: "40px",
  },
  hourlyTime: {
    fontSize: "clamp(0.5rem, 1.2vw, 0.65rem)",
    color: "#888",
    marginBottom: "2px",
    fontWeight: 500,
  },
  hourlyWind: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "1px",
  },
  hourlySpeed: {
    fontSize: "clamp(0.7rem, 1.8vw, 0.9rem)",
    fontWeight: "bold",
    color: "#fff",
  },
  hourlyDir: {
    fontSize: "clamp(0.5rem, 1vw, 0.6rem)",
    color: "#666",
  },
  hourlyWeather: {
    fontSize: "clamp(0.6rem, 1.5vw, 0.8rem)",
    marginTop: "1px",
  },
  thermalSection: {
    marginBottom: "15px",
  },
  altitudeSection: {
    marginBottom: "15px",
  },
  hourlySection: {
    marginBottom: "15px",
  },
  aiSection: {
    marginBottom: "20px",
    background: "rgba(0,0,0,0.4)",
    borderRadius: "14px",
    border: "1px solid rgba(255,107,107,0.15)",
    overflow: "hidden",
  },
  aiHeader: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "clamp(10px, 2vw, 14px) clamp(12px, 2vw, 18px)",
    background: "rgba(255,107,107,0.08)",
    borderBottom: "1px solid rgba(255,107,107,0.1)",
    flexWrap: "wrap",
  },
  aiIcon: {
    fontSize: "clamp(1.2rem, 3vw, 1.6rem)",
  },
  aiTitle: {
    fontSize: "clamp(0.9rem, 2.5vw, 1.1rem)",
    color: "#ff6b6b",
    margin: 0,
    fontWeight: 600,
  },
  aiLoading: {
    marginLeft: "auto",
    fontSize: "clamp(0.7rem, 2vw, 0.85rem)",
    color: "#ffd93d",
  },
  aiContent: {
    padding: "clamp(10px, 2vw, 16px)",
    maxHeight: "500px",
    overflowY: "auto",
  },
  aiBlock: {
    marginBottom: "10px",
    padding: "clamp(8px, 1.5vw, 12px) clamp(10px, 2vw, 16px)",
    background: "rgba(255,255,255,0.03)",
    borderRadius: "10px",
    border: "1px solid rgba(255,255,255,0.05)",
  },
  aiTextWhite: {
    fontSize: "clamp(0.75rem, 2vw, 0.9rem)",
    color: "#e0e0e0",
    lineHeight: "1.7",
    whiteSpace: "pre-wrap",
    fontWeight: 400,
  },
  footer: {
    textAlign: "center",
    marginTop: "30px",
    padding: "20px 0",
    borderTop: "1px solid rgba(255,255,255,0.08)",
  },
  footerText: {
    fontSize: "clamp(0.65rem, 1.5vw, 0.8rem)",
    color: "#666",
  },
  footerSmall: {
    fontSize: "clamp(0.55rem, 1.2vw, 0.7rem)",
    color: "#444",
    marginTop: "5px",
  },
};