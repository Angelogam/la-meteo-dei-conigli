/* ... tutto il resto del file rimane identico fino alla fine della costante s ... */
};

// ===== COMPONENTE PRINCIPALE =====

export default function App() {
  const [selected, setSelected] = useState(DECOLLI[0].id);
  const [meteoData, setMeteoData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState(0);
  const [selectedHour, setSelectedHour] = useState(12);
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState("meteo");

  const site = DECOLLI.find((x) => x.id === selected) || DECOLLI[0];

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchMeteoCompleta(site.lat, site.lon);
        setMeteoData(data);
      } catch (err: any) {
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
    return meteoData.hourly.filter((h: any) => h.time >= dayStart && h.time < dayEnd);
  }, [meteoData, selectedDay]);

  const dayData = getDayData();

  const currentData = useMemo(() => {
    if (!dayData || dayData.length === 0) return null;
    return dayData.find((h: any) => h.time.getHours() === selectedHour) || dayData[0];
  }, [dayData, selectedHour]);

  const thermalProfile = useMemo(() => {
    if (!dayData || dayData.length === 0) return null;
    return calculateThermalProfile(dayData, site.altitude || 1500);
  }, [dayData, site.altitude]);

  const windProfileData = useMemo(() => {
    if (!currentData) return null;
    return getWindProfile(currentData.windSpeed, currentData.windDir, 400, 4000, 250);
  }, [currentData]);

  useEffect(() => {
    if (meteoData && dayData && dayData.length > 0) {
      setIsAnalyzing(true);
      const timer = setTimeout(() => {
        const analysis = generateAIAnalysis(dayData, site, thermalProfile, windProfileData);
        setAiAnalysis(analysis);
        setIsAnalyzing(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [meteoData, dayData, thermalProfile, windProfileData, site]);

  const enrichedDailyData = useMemo(() => {
    if (!meteoData || !meteoData.daily) return [];
    return meteoData.daily.map((day: any, index: number) => {
      const dayHours = meteoData.hourly.filter(
        (h: any) => h.time.getDate() === day.date.getDate() && h.time.getMonth() === day.date.getMonth()
      );
      const temps = dayHours.map((h: any) => h.temperature).filter((t: any) => t !== undefined && t !== null);
      const delta = temps.length > 0 ? Math.round(Math.max(...temps) - Math.min(...temps)) : 0;
      return { ...day, thermalDelta: delta, dayIndex: index };
    });
  }, [meteoData]);

  const dateLabels = enrichedDailyData.map((d: any) =>
    d.date.toLocaleDateString("it-IT", { weekday: "short", day: "numeric", month: "short" })
  );

  const hoursRange = Array.from({ length: 11 }, (_, i) => i + 9);

  const getPressureGradient = () => {
    if (!dayData || dayData.length < 2) return { gradient: 0, description: "Dati insufficienti" };
    const first = dayData[0].pressure;
    const last = dayData[dayData.length - 1].pressure;
    const gradient = last - first;
    let description = "";
    if (gradient > 3) description = "⬆️ Pressione in aumento - miglioramento";
    else if (gradient < -3) description = "⬇️ Pressione in diminuzione - peggioramento";
    else description = "➡️ Pressione stabile";
    return { gradient: Math.round(gradient * 10) / 10, description };
  };

  if (loading) {
    return (
      <div style={s.loadingFull}>
        <div style={s.spinner}></div>
        <p style={s.loadingText}>🪂 Caricamento previsioni meteo...</p>
        <p style={s.loadingSub}>Open-Meteo • Free Flight Forecast</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={s.errorFull}>
        <p style={s.errorText}>❌ {error}</p>
        <button style={s.retryButton} onClick={() => window.location.reload()}>
          🔄 Riprova
        </button>
      </div>
    );
  }

  return (
    <div style={s.app}>
      <header style={s.header}>
        <div style={s.logoContainer}>
          <span style={s.logoRabbit}>🐰</span>
          <span style={s.logoParaglider}>🪂</span>
          <span style={s.logoText}>Meteo dei Conigli</span>
        </div>
        <p style={s.subtitle}>Previsioni per volo libero • Dati da Open-Meteo • Stile SHV FSVL</p>
      </header>

      <div style={s.grid}>
        <div style={s.left}>
          <h2 style={s.sectionTitle}>📍 Decolli</h2>
          <div style={s.cardList}>
            {DECOLLI.map((d) => (
              <button
                key={d.id}
                onClick={() => setSelected(d.id)}
                style={{
                  ...s.card,
                  borderColor: d.id === selected ? "#ff6b6b" : "rgba(255,255,255,0.08)",
                  background: d.id === selected ? "rgba(255,107,107,0.15)" : "rgba(255,255,255,0.03)",
                }}
              >
                <div style={s.cardTop}>
                  <div style={s.cardTitle}>{d.name}</div>
                  <div style={s.cardWeather}>
                    {currentData && d.id === selected ? (
                      getWeatherIcon(currentData.weatherCode || 0, currentData.isDay)
                    ) : (
                      <span style={s.cardWeatherPlaceholder}>☁️</span>
                    )}
                  </div>
                </div>
                <div style={s.cardDetails}>
                  <span style={s.cardSmall}>{d.valley}</span>
                  <span style={s.cardSmall}>{d.exposure}</span>
                </div>
                <div style={s.cardBadges}>
                  <span
                    style={{
                      ...s.badge,
                      background: d.difficulty <= 2 ? "#4caf50" : d.difficulty <= 3 ? "#ff9800" : "#f44336",
                    }}
                  >
                    {d.difficulty <= 2 ? "🟢 Facile" : d.difficulty <= 3 ? "🟡 Medio" : "🔴 Difficile"}
                  </span>
                  <span style={{ ...s.badge, background: "#2196f3" }}>{d.altitude || "N/D"}m</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div style={s.right}>
          {currentData && site && (
            <>
              <div style={s.siteHeader}>
                <div>
                  <h2 style={s.siteName}>{site.name}</h2>
                  <span style={s.siteInfo}>
                    {site.exposure} • {site.valley} • {site.altitude || "N/D"}m
                  </span>
                </div>
                <div style={s.weatherNow}>
                  <span style={s.weatherIcon}>{getWeatherIcon(currentData.weatherCode || 0, currentData.isDay)}</span>
                  <span style={s.tempNow}>{Math.round(currentData.temperature)}°C</span>
                </div>
              </div>

              <div style={s.tabContainer}>
                <button
                  style={{
                    ...s.tab,
                    background: activeTab === "meteo" ? "rgba(255,107,107,0.2)" : "transparent",
                  }}
                  onClick={() => setActiveTab("meteo")}
                >
                  🌤️ Meteo
                </button>
                <button
                  style={{
                    ...s.tab,
                    background: activeTab === "venti" ? "rgba(255,107,107,0.2)" : "transparent",
                  }}
                  onClick={() => setActiveTab("venti")}
                >
                  💨 Venti
                </button>
                <button
                  style={{
                    ...s.tab,
                    background: activeTab === "termiche" ? "rgba(255,107,107,0.2)" : "transparent",
                  }}
                  onClick={() => setActiveTab("termiche")}
                >
                  🔥 Termiche
                </button>
                <button
                  style={{
                    ...s.tab,
                    background: activeTab === "analisi" ? "rgba(255,107,107,0.2)" : "transparent",
                  }}
                  onClick={() => setActiveTab("analisi")}
                >
                  🤖 Analisi
                </button>
              </div>

              {activeTab === "meteo" && (
                <>
                  <div style={s.daySelector}>
                    {enrichedDailyData.map((day: any, index: number) => (
                      <button
                        key={index}
                        onClick={() => {
                          setSelectedDay(index);
                          setSelectedHour(12);
                        }}
                        style={{
                          ...s.dayButton,
                          background: selectedDay === index ? "rgba(255,107,107,0.2)" : "rgba(255,255,255,0.05)",
                          borderColor: selectedDay === index ? "#ff6b6b" : "rgba(255,255,255,0.1)",
                        }}
                      >
                        <div style={s.dayName}>{dateLabels[index]}</div>
                        <div style={s.dayWeatherIcon}>{getWeatherIcon(day.weatherCode, true)}</div>
                        <div style={s.dayTemp}>
                          {Math.round(day.tempMax)}°/{Math.round(day.tempMin)}°
                        </div>
                        <div style={s.dayDelta}>Δ{day.thermalDelta}°C</div>
                        <div style={s.dayRain}>
                          {day.precipitationSum > 0 ? `🌧️${Math.round(day.precipitationSum)}mm` : "☀️"}
                        </div>
                      </button>
                    ))}
                  </div>

                  <div style={s.hourSelector}>
                    <label style={s.hourLabel}>⏰ Ora:</label>
                    <input
                      type="range"
                      min="9"
                      max="19"
                      value={selectedHour}
                      onChange={(e) => setSelectedHour(parseInt(e.target.value))}
                      style={s.hourSlider}
                    />
                    <span style={s.hourValue}>{String(selectedHour).padStart(2, "0")}:00</span>
                  </div>

                  <div style={s.meteoGrid}>
                    <div style={s.meteoCard}>
                      <div style={s.meteoLabel}>🌡️ Temperatura</div>
                      <div style={s.meteoValue}>{Math.round(currentData.temperature)}°C</div>
                      <div style={s.meteoSub}>Δ {thermalProfile?.thermalDelta || 0}°C</div>
                    </div>
                    <div style={s.meteoCard}>
                      <div style={s.meteoLabel}>💧 Umidità</div>
                      <div style={s.meteoValue}>{Math.round(currentData.humidity)}%</div>
                      <div style={s.meteoSub}>Rugiada {Math.round(currentData.dewPoint)}°C</div>
                    </div>
                    <div style={s.meteoCard}>
                      <div style={s.meteoLabel}>☁️ Nuvolosità</div>
                      <div style={s.meteoValue}>{Math.round(currentData.cloudCover)}%</div>
                      <div style={s.meteoSub}>
                        {getCloudCondition(currentData.cloudCover).icon} {getCloudCondition(currentData.cloudCover).text}
                      </div>
                    </div>
                    <div style={s.meteoCard}>
                      <div style={s.meteoLabel}>🌧️ Precipitazioni</div>
                      <div style={s.meteoValue}>
                        {currentData.precipitation === 0 ? "✅ Assenti" : `${currentData.precipitation} mm`}
                      </div>
                      <div style={s.meteoSub}>{currentData.precipitation === 0 ? "Ideale" : "⚠️ Pioggia"}</div>
                    </div>
                    <div style={s.meteoCard}>
                      <div style={s.meteoLabel}>🏔️ Base Nuvole</div>
                      <div style={s.meteoValue}>
                        {thermalProfile?.cloudBase ? `${thermalProfile.cloudBase}m` : "--"}
                      </div>
                      <div style={s.meteoSub}>Cloud Base</div>
                    </div>
                    <div style={s.meteoCard}>
                      <div style={s.meteoLabel}>📈 Plafond</div>
                      <div style={s.meteoValue}>
                        {thermalProfile?.thermalTop ? `${thermalProfile.thermalTop}m` : "--"}
                      </div>
                      <div style={s.meteoSub}>Thermal Top</div>
                    </div>
                    <div style={s.meteoCard}>
                      <div style={s.meteoLabel}>🪂 Galleggiamento</div>
                      <div style={s.meteoValue}>
                        {thermalProfile?.soarIndex ? `${thermalProfile.soarIndex}/10` : "--"}
                      </div>
                      <div style={s.meteoSub}>Soaring Index</div>
                    </div>
                    <div style={s.meteoCard}>
                      <div style={s.meteoLabel}>💨 Vento</div>
                      <div style={s.meteoValue}>
                        {getWindArrow(currentData.windDir)} {Math.round(currentData.windSpeed)} km/h
                      </div>
                      <div style={s.meteoSub}>
                        {getWindDirection(currentData.windDir)} • ⚡{Math.round(currentData.windGust)} km/h
                      </div>
                    </div>
                  </div>

                  <div style={s.pressureSection}>
                    <h3 style={s.windTitle}>📊 Pressione e Gradiente</h3>
                    <div style={s.pressureGrid}>
                      <div style={s.pressureCard}>
                        <div style={s.pressureLabel}>Pressione attuale</div>
                        <div style={s.pressureValue}>{Math.round(currentData.pressure)} hPa</div>
                      </div>
                      <div style={s.pressureCard}>
                        <div style={s.pressureLabel}>Gradiente</div>
                        <div
                          style={{
                            ...s.pressureValue,
                            color:
                              getPressureGradient().gradient > 0
                                ? "#4caf50"
                                : getPressureGradient().gradient < 0
                                ? "#f44336"
                                : "#ffd93d",
                          }}
                        >
                          {getPressureGradient().gradient > 0
                            ? "⬆️"
                            : getPressureGradient().gradient < 0
                            ? "⬇️"
                            : "➡️"}{" "}
                          {Math.abs(getPressureGradient().gradient)} hPa
                        </div>
                        <div style={s.pressureSub}>{getPressureGradient().description}</div>
                      </div>
                    </div>
                  </div>

                  {aiAnalysis?.thunderstorm && (
                    <div style={s.thunderstormSection}>
                      <div
                        style={
                          aiAnalysis.thunderstorm.includes("ALLERTA")
                            ? s.thunderstormAlert
                            : s.thunderstormSafe
                        }
                      >
                        <div
                          style={s.aiTextWhite}
                          dangerouslySetInnerHTML={{
                            __html: aiAnalysis.thunderstorm.replace(/\n/g, "<br/>"),
                          }}
                        />
                      </div>
                    </div>
                  )}
                </>
              )}

              {activeTab === "venti" && (
                <>
                  <div style={s.windSection}>
                    <h3 style={s.windTitle}>💨 Vento a differenti quote</h3>
                    <div style={s.windGrid}>
                      <div style={s.windCard}>
                        <div style={s.windLabel}>10 m (superficie)</div>
                        <div style={s.windValue}>
                          {getWindArrow(currentData.windDir)} {Math.round(currentData.windSpeed)} km/h
                        </div>
                        <div style={s.windDir}>{getWindDirection(currentData.windDir)}</div>
                        <div style={s.windGustSmall}>⚡ {Math.round(currentData.windGust)} km/h</div>
                      </div>
                      <div style={s.windCard}>
                        <div style={s.windLabel}>80 m (quota termica)</div>
                        <div style={s.windValue}>
                          {currentData.wind80m
                            ? `${getWindArrow(currentData.windDir80m)} ${Math.round(currentData.wind80m)} km/h`
                            : "N/D"}
                        </div>
                        <div style={s.windDir}>
                          {currentData.wind80m ? getWindDirection(currentData.windDir80m) : "--"}
                        </div>
                        <div style={s.windGustSmall}>
                          ⚡ {currentData.wind80m ? Math.round(currentData.wind80m * 1.3) : "--"} km/h
                        </div>
                      </div>
                      <div style={s.windCard}>
                        <div style={s.windLabel}>120 m (alta quota)</div>
                        <div style={s.windValue}>
                          {currentData.wind120m
                            ? `${getWindArrow(currentData.windDir120m)} ${Math.round(currentData.wind120m)} km/h`
                            : "N/D"}
                        </div>
                        <div style={s.windDir}>
                          {currentData.wind120m ? getWindDirection(currentData.windDir120m) : "--"}
                        </div>
                        <div style={s.windGustSmall}>
                          ⚡ {currentData.wind120m ? Math.round(currentData.wind120m * 1.35) : "--"} km/h
                        </div>
                      </div>
                    </div>
                  </div>

                  <div style={s.windProfileSection}>
                    <h3 style={s.windTitle}>📊 Profilo Vento (400m - 4000m)</h3>

                    <div style={s.windProfileContainer}>
                      <div style={s.windProfileLegend}>
                        <span style={s.legendItem}>⚡ Velocità (km/h)</span>
                        <span style={s.legendItem}>🧭 Direzione</span>
                      </div>

                      <div style={s.windProfile}>
                        {windProfileData &&
                          windProfileData.map((level: any, index: number) => {
                            const maxSpeed = currentData.windSpeed * 3.5;
                            const barWidth = Math.min(100, (level.speed / maxSpeed) * 100);

                            return (
                              <div key={index} style={s.windProfileRow}>
                                <div style={s.windProfileAlt}>
                                  {level.altitude === 10 ? "Superficie" : `${level.altitude}m`}
                                </div>
                                <div style={s.windProfileBarContainer}>
                                  <div
                                    style={{
                                      ...s.windProfileBar,
                                      width: `${barWidth}%`,
                                      background: `linear-gradient(to right, ${getWindColor(
                                        level.speed,
                                        maxSpeed
                                      )}, ${getWindColor(level.speed, maxSpeed)})`,
                                    }}
                                  >
                                    <span style={s.windProfileSpeed}>{level.speed} km/h</span>
                                  </div>
                                </div>
                                <div style={s.windProfileDir}>
                                  {getWindArrow(level.direction)} {level.directionName}
                                </div>
                              </div>
                            );
                          })}
                      </div>

                      {windProfileData && (
                        <div style={s.shearAnalysis}>
                          {(() => {
                            const shear = calculateWindShear(windProfileData);
                            return (
                              <div
                                style={{
                                  ...s.shearBox,
                                  borderColor:
                                    shear.risk === "alto"
                                      ? "#f44336"
                                      : shear.risk === "medio"
                                      ? "#ff9800"
                                      : "#4caf50",
                                }}
                              >
                                <div style={s.shearTitle}>🌪️ Analisi Wind Shear</div>
                                <div style={s.shearValue}>Shear: {shear.shear}</div>
                                <div style={s.shearDesc}>{shear.description}</div>
                                <div style={s.shearDetails}>
                                  <span>
                                    Superficie: {shear.surfaceSpeed} km/h ({shear.surfaceDir})
                                  </span>
                                  <span>
                                    Alta quota: {shear.highSpeed} km/h ({shear.highDir})
                                  </span>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={s.hourlyWindSection}>
                    <h3 style={s.windTitle}>📊 Vento orario (9:00 - 19:00)</h3>
                    <div style={s.hourlyWindGrid}>
                      {hoursRange.map((hour) => {
                        const hourData = dayData?.find((h: any) => h.time.getHours() === hour);
                        if (!hourData) return null;
                        return (
                          <div key={hour} style={s.hourlyWindCard}>
                            <div style={s.hourlyTime}>{String(hour).padStart(2, "0")}:00</div>
                            <div style={s.hourlyWind}>
                              {getWindArrow(hourData.windDir)}
                              <span style={s.hourlySpeed}>{Math.round(hourData.windSpeed)}</span>
                            </div>
                            <div style={s.hourlyDir}>{getWindDirection(hourData.windDir)}</div>
                            <div style={s.hourlyWeather}>
                              {getWeatherIcon(hourData.weatherCode || 0, hourData.isDay)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}

              {activeTab === "termiche" && (
                <>
                  <div style={s.thermalSection}>
                    <h3 style={s.windTitle}>🔥 Analisi Termiche</h3>
                    <div style={s.aiBlock}>
                      <div
                        style={s.aiTextWhite}
                        dangerouslySetInnerHTML={{
                          __html: aiAnalysis?.thermal?.replace(/\n/g, "<br/>") || "Dati non disponibili",
                        }}
                      />
                    </div>
                  </div>

                  <div style={s.altitudeSection}>
                    <h3 style={s.windTitle}>🏔️ Quote e Plafond</h3>
                    <div style={s.aiBlock}>
                      <div
                        style={s.aiTextWhite}
                        dangerouslySetInnerHTML={{
                          __html: aiAnalysis?.altitude?.replace(/\n/g, "<br/>") || "Dati non disponibili",
                        }}
                      />
                    </div>
                  </div>

                  <div style={s.hourlySection}>
                    <h3 style={s.windTitle}>⏰ Sviluppo Orario</h3>
                    <div style={s.aiBlock}>
                      <div
                        style={s.aiTextWhite}
                        dangerouslySetInnerHTML={{
                          __html: aiAnalysis?.hourly?.replace(/\n/g, "<br/>") || "Dati non disponibili",
                        }}
                      />
                    </div>
                  </div>
                </>
              )}

              {activeTab === "analisi" && (
                <div style={s.aiSection}>
                  <div style={s.aiHeader}>
                    <span style={s.aiIcon}>🤖</span>
                    <h3 style={s.aiTitle}>Analisi Completa della Giornata</h3>
                    {isAnalyzing && <span style={s.aiLoading}>⏳ Analisi in corso...</span>}
                  </div>

                  {aiAnalysis && !isAnalyzing && (
                    <div style={s.aiContent}>
                      <div style={s.aiBlock}>
                        <div
                          style={s.aiTextWhite}
                          dangerouslySetInnerHTML={{
                            __html: aiAnalysis.general.replace(/\n/g, "<br/>"),
                          }}
                        />
                      </div>
                      <div style={s.aiBlock}>
                        <div
                          style={s.aiTextWhite}
                          dangerouslySetInnerHTML={{
                            __html: aiAnalysis.advice.replace(/\n/g, "<br/>"),
                          }}
                        />
                      </div>
                      <div style={s.aiBlock}>
                        <div
                          style={s.aiTextWhite}
                          dangerouslySetInnerHTML={{
                            __html: aiAnalysis.pressure.replace(/\n/g, "<br/>"),
                          }}
                        />
                      </div>
                      {aiAnalysis.thunderstorm && (
                        <div style={s.aiBlock}>
                          <div
                            style={s.aiTextWhite}
                            dangerouslySetInnerHTML={{
                              __html: aiAnalysis.thunderstorm.replace(/\n/g, "<br/>"),
                            }}
                          />
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

      <footer style={s.footer}>
        <p style={s.footerText}>
          🌤️ Dati meteo forniti da Open-Meteo.com • Ispirato a SHV FSVL • Ottimizzato per volo libero
        </p>
        <p style={s.footerSmall}>🐰 Vola sicuro e divertiti! 🪂 • Beta v2.0</p>
      </footer>
    </div>
  );
}