"use client";

// ... existing code ...

// Aggiungo alla fine della classe/oggetto weatherService
  /**
   * Fetch meteo corrente per un singolo punto (lat, lon).
   * Usa l'endpoint current di Open-Meteo.
   */
  async fetchCurrent(lat: number, lon: number): Promise<{ data: HourData | null; ok: boolean }> {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,showers,snowfall,weather_code,cloud_cover,pressure_msl,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m&timezone=auto&forecast_days=1`;

    try {
      const res = await fetch(url);
      if (!res.ok) return { data: null, ok: false };
      const json = await res.json();
      const c = json.current;
      if (!c) return { data: null, ok: false };

      const data: HourData = {
        time: new Date(c.time),
        temperature: c.temperature_2m,
        humidity: c.relative_humidity_2m,
        apparentTemp: c.apparent_temperature,
        precipitation: c.precipitation,
        rain: c.rain,
        showers: c.showers,
        snowfall: c.snowfall,
        weatherCode: c.weather_code,
        pressure: c.pressure_msl,
        surfacePressure: c.surface_pressure,
        cloudCover: c.cloud_cover,
        windSpeed: c.wind_speed_10m,
        windDir: c.wind_direction_10m,
        windGusts: c.wind_gusts_10m,
        dewPoint: 0, // non fornito da /current
        precipitationProba: 0,
        cloudCoverLow: 0, cloudCoverMid: 0, cloudCoverHigh: 0,
        evapotranspiration: 0, et0: 0,
        vapourPressureDeficit: 0,
        soilTemp: 0, soilMoisture: 0,
        uvIndex: 0,
        shortwaveRadiation: 0, directRadiation: 0, diffuseRadiation: 0,
        directNormalIrradiance: 0,
        terrestrialRadiation: 0,
        sunshineDuration: 0,
        windProfile: undefined,
        temp80m: undefined,
        temp120m: undefined,
      };
      return { data, ok: true };
    } catch {
      return { data: null, ok: false };
    }
  }