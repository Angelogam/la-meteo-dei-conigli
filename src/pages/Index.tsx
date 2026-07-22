{activeTab === "meteo" && (
              <div className="space-y-4">
                <MeteoTab
                  currentData={currentData}
                  dayData={dayData}
                  site={{ alt: site.altitude, name: site.name }}
                  thermalDelta={thermalDelta}
                  stabilityIndex={stabilityIndex}
                  modelName={activeModel}
                  cape={currentCape?.cape}
                  liftedIndex={currentCape?.liftedIndex}
                  cin={currentCape?.cin}
                />
                <MeteoAnalisi
                  data={{
                    giorno: "Martedì",
                    data: "21 Luglio 2026",
                    decollo: site.name,
                    meteo: "nuvoloso",
                    ventoDecollo: currentData?.windSpeed ?? 9,
                    ventoAtterraggio: Math.round((currentData?.windSpeed ?? 9) * 0.7),
                    raffiche: currentData?.windGusts ?? 46.1,
                    baseNuvole: 250,
                    topTermiche: 1500,
                    forzaTermica: 5.0,
                    turbolenza: "Forte",
                    cape: 2930,
                    liftedIndex: -7.4,
                    umidita: currentData?.humidity ?? 88,
                    pressione: currentData?.pressure ?? 1013,
                    nuvolosita: currentData?.cloudCover ?? 85,
                    uvIndex: 7.3,
                    deltaT: 6,
                    gradiente: 0.98,
                    zeroTermico: 3400,
                  }}
                />
              </div>
            )}