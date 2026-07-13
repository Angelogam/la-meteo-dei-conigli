{activeTab === "termiche" && (
              <>
                <HourSlider selectedHour={selectedHour} onChange={setSelectedHour} />
                <WeatherDashboard
                  dayData={dayData}
                  altitude={site.altitude}
                  selectedHour={selectedHour}
                  onHourSelect={setSelectedHour}
                  windProfile={windProfileForWeatherDashboard}
                  groundSpeed={currentData?.windSpeed}
                  groundDir={currentData?.windDir}
                />
              </>
            )}