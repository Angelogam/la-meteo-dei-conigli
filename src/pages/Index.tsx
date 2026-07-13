{activeTab === "termiche" && (
              <>
                <HourSlider selectedHour={selectedHour} onChange={setSelectedHour} />
                <WeatherDashboard
                  dayData={dayData}
                  altitude={site.altitude}
                  selectedHour={selectedHour}
                  onHourSelect={setSelectedHour}
                  windProfile={windProfile.map(w => ({ height: w.alt, speed: w.speed, dir: w.dir }))}
                  groundSpeed={currentData?.windSpeed}
                  groundDir={currentData?.windDir}
                />
              </>
            )}