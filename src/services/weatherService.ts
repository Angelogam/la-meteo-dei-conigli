"use client";

const BASE_URL = "https://api.open-meteo.com/v1/forecast";

export class WeatherService {
  private buildUrl(lat: number, lon: number): string {
    const params = new URLSearchParams({
      latitude: lat.toString(),
      longitude: lon.toString(),
      hourly: "temperature_2m,relative_humidity_2m,dew_point_2m,apparent_temperature,precipitation_probability,precipitation,rain,showers,snowfall,weather_code,pressure_msl,surface_pressure,cloud_cover,cloud_cover_low,cloud_cover_mid,cloud_cover_high,evapotranspiration,et0_fao_evapotranspiration,vapour_pressure_deficit,wind_speed_10m,wind_direction_10m,wind_gusts_10m,soil_temperature_0cm,soil_moisture_0_to_1cm,uv_index,temperature_80m,temperature_120m,shortwave_radiation,direct_radiation,diffuse_radiation,direct_normal_irradiance,terrestrial_radiation,sunshine_duration",
      daily: "temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,sunrise,sunset,daylight_duration,sunshine_duration,uv_index_max,uv_index_clear_sky_max,precipitation_sum,rain_sum,showers_sum,snowfall_sum,precipitation_hours,precipitation_probability_max,weather_code,wind_speed_10m_max,wind_gusts_10m_max,wind_direction_10m_dominant,shortwave_radiation_sum,et0_fao_evapotranspiration",
      current: "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,showers,snowfall,weather_code,cloud_cover,pressure_msl,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m",
      timezone: "auto",
      forecast_days: "7",
      models: "best_match",
    });
    return `${BASE_URL}?${params.toString()}`;
  }

  private parseData(data: any): any {
    if (!data?.hourly?.time?.length) throw new Error("Dati non validi");
    
    const hourly = data.hourly.time.map((t: string, i: number) => ({
      time: new Date(t),
      temperature: data.hourly.temperature_2m[i],
      humidity: data.hourly.relative_humidity_2m[i],
      dewPoint: data.hourly.dew_point_2m?.[i] ?? 10,
      apparentTemp: data.hourly.apparent_temperature[i],
      precipitationProba: data.hourly.precipitation_probability?.[i] ?? 0,
      precipitation: data.hourly.precipitation[i] ?? 0,
      rain: data.hourly.rain?.[i] ?? 0,
      showers: data.hourly.showers?.[i] ?? 0,
      snowfall: data.hourly.snowfall?.[i] ?? 0,
      weatherCode: data.hourly.weather_code[i] ?? 0,
      pressure: data.hourly.pressure_msl[i] ?? 1013,
      surfacePressure: data.hourly.surface_pressure?.[i] ?? 1013,
      cloudCover: data.hourly.cloud_cover[i] ?? 0,
      cloudCoverLow: data.hourly.cloud_cover_low?.[i] ?? 0,
      cloudCoverMid: data.hourly.cloud_cover_mid?.[i] ?? 0,
      cloudCoverHigh: data.hourly.cloud_cover_high?.[i] ?? 0,
      evapotranspiration: data.hourly.evapotranspiration?.[i] ?? 0,
      et0: data.hourly.et0_fao_evapotranspiration?.[i] ?? 0,
      vapourPressureDeficit: data.hourly.vapour_pressure_deficit?.[i] ?? 0,
      windSpeed: data.hourly.wind_speed_10m[i] ?? 0,
      windDir: data.hourly.wind_direction_10m[i] ?? 0,
      windGusts: data.hourly.wind_gusts_10m?.[i] ?? 0,
      soilTemp: data.hourly.soil_temperature_0cm?.[i] ?? 15,
      soilMoisture: data.hourly.soil_moisture_0_to_1cm?.[i] ?? 0.3,
      uvIndex: data.hourly.uv_index?.[i] ?? 0,
      temp80m: data.hourly.temperature_80m?.[i] ?? null,
      temp120m: data.hourly.temperature_120m?.[i] ?? null,
      shortwaveRadiation: data.hourly.shortwave_radiation?.[i] ?? 0,
      directRadiation: data.hourly.direct_radiation?.[i] ?? 0,
      diffuseRadiation: data.hourly.diffuse_radiation?.[i] ?? 0,
      directNormalIrradiance: data.hourly.direct_normal_irradiance?.[i] ?? 0,
      terrestrialRadiation: data.hourly.terrestrial_radiation?.[i] ?? 0,
      sunshineDuration: data.hourly.sunshine_duration?.[i] ?? 0,
    }));

    const daily = data.daily.time.map((t: string, i: number) => ({
      date: new Date(t),
      tempMax: data.daily.temperature_2m_max[i],
      tempMin: data.daily.temperature_2m_min[i],
      apparentTempMax: data.daily.apparent_temperature_max[i],
      apparentTempMin: data.daily.apparent_temperature_min[i],
      sunrise: data.daily.sunrise[i],
      sunset: data.daily.sunset[i],
      daylightDuration: data.daily.daylight_duration[i],
      sunshineDuration: data.daily.sunshine_duration[i],
      uvIndexMax: data.daily.uv_index_max[i],
      uvIndexClearSkyMax: data.daily.uv_index_clear_sky_max[i],
      precipitationSum: data.daily.precipitation_sum[i],
      rainSum: data.daily.rain_sum[i],
      showersSum: data.daily.showers_sum[i],
      snowfallSum: data.daily.snowfall_sum[i],
      precipitationHours: data.daily.precipitation_hours[i],
      precipitationProbaMax: data.daily.precipitation_probability_max[i],
      weatherCode: data.daily.weather_code[i],
      windSpeedMax: data.daily.wind_speed_10m_max[i],
      windGustsMax: data.daily.wind_gusts_10m_max[i],
      windDirDominant: data.daily.wind_direction_10m_dominant[i],
      shortwaveRadiationSum: data.daily.shortwave_radiation_sum[i],
      et0Sum: data.daily.et0_fao_evapotranspiration[i],
    }));

    const current = data.current ? {
      time: new Date(data.current.time),
      temperature: data.current.temperature_2m,
      humidity: data.current.relative_humidity_2m,
      apparentTemp: data.current.apparent_temperature,
      isDay: data.current.is_day,
      precipitation: data.current.precipitation,
      rain: data.current.rain,
      showers: data.current.showers,
      snowfall: data.current.snowfall,
      weatherCode: data.current.weather_code,
      cloudCover: data.current.cloud_cover,
      pressure: data.current.pressure_msl,
      surfacePressure: data.current.surface_pressure,
      windSpeed: data.current.wind_speed_10m,
      windDir: data.current.wind_direction_10m,
      windGusts: data.current.wind_gusts_10m,
    } : null;

    return { hourly, daily, current };
  }

  async fetchWithFallback(lat: number, lon: number): Promise<any> {
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        const url = this.buildUrl(lat, lon);
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);
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
}

export const weatherService = new WeatherService();