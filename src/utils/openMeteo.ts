import type { HourData } from "@/types/meteo";

export const fetchDecolloMeteo = async (lat: number, lon: number): Promise<{ hourly: HourData[] }> => {
  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lon.toString(),
    hourly: "temperature_2m,apparent_temperature,relative_humidity_2m,dew_point_2m,precipitation,weather_code,cloud_cover,pressure_msl,wind_speed_10m,wind_direction_10m,wind_gusts_10m,uv_index,is_day",
    daily: "temperature_2m_max,temperature_2m_min,weather_code,precipitation_sum,sunrise,sunset,uv_index_max,precipitation_hours,wind_speed_10m_max,wind_direction_10m_dominant",
    timezone: "Europe/Rome",
    forecast_days: "4",
  });

  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
  if (!res.ok) throw new Error(`Errore HTTP ${res.status}`);
  const raw = await res.json();

  const hourly: HourData[] = raw.hourly.time.map((t: string, i: number) => ({
    time: new Date(t),
    temperature: raw.hourly.temperature_2m[i],
    feelsLike: raw.hourly.apparent_temperature[i],
    humidity: raw.hourly.relative_humidity_2m[i],
    dewPoint: raw.hourly.dew_point_2m[i],
    precipitation: raw.hourly.precipitation[i],
    weatherCode: raw.hourly.weather_code[i],
    cloudCover: raw.hourly.cloud_cover[i],
    pressure: raw.hourly.pressure_msl[i] ?? null,
    windSpeed: raw.hourly.wind_speed_10m[i],
    windDir: raw.hourly.wind_direction_10m[i],
    windGust: raw.hourly.wind_gusts_10m[i] ?? null,
    soilTemp: null,
    soilMoisture: null,
    uvIndex: raw.hourly.uv_index[i] ?? null,
    isDay: raw.hourly.is_day[i] === 1,
  }));

  return { hourly };
};