"use client";

export class WeatherService {
  private baseUrl = 'https://api.open-meteo.com/v1/forecast';

  async fetchWithFallback(lat: number, lon: number): Promise<any> {
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const url = this.buildUrl(lat, lon);
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

  private buildUrl(lat: number, lon: number): string {
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
    return `${this.baseUrl}?${params.toString()}`;
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

export const weatherService = new WeatherService();