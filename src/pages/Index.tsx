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
                          dangerouslySetInnerHTML={{ __html: aiAnalysis.general.replace(/\n/g, "<br/>") }}
                        />
                      </div>
                      <div style={s.aiBlock}>
                        <div
                          style={s.aiTextWhite}
                          dangerouslySetInnerHTML={{ __html: aiAnalysis.advice.replace(/\n/g, "<br/>") }}
                        />
                      </div>
                      <div style={s.aiBlock}>
                        <div
                          style={s.aiTextWhite}
                          dangerouslySetInnerHTML={{ __html: aiAnalysis.pressure.replace(/\n/g, "<br/>") }}
                        />
                      </div>
                      {aiAnalysis.thunderstorm && (
                        <div style={s.aiBlock}>
                          <div
                            style={s.aiTextWhite}
                            dangerouslySetInnerHTML={{ __html: aiAnalysis.thunderstorm.replace(/\n/g, "<br/>") }}
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