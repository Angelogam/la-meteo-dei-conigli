"use client";

import type { HourData, DailyData } from "@/types/meteo";

const OPEN_METEO_HOURLY =
  "temperature_2m,relative_humidity_2m,dew_point_2m,apparent_temperature,precipitation,rain,snowfall,weather_code,pressure_msl,surface_pressure,cloud_cover,cloud_cover_low,cloud_cover_mid,cloud_cover_high,wind_speed_10m,wind_direction_10m,wind_gusts_10m,shortwave_radiation,direct_radiation,diffuse_radiation,direct_normal_irradiance,global_tilted_irradiance,terrestrial_radiation,uv_index,visibility,vapour_pressure_deficit,is_day,sunshine_duration,freezing_level_height,wind_speed_80m,wind_direction_80m,wind_speed_120m,wind_direction_120m,wind_speed_180m,temperature_80m,temperature_120m,temperature_180m,soil_temperature_0_to_7cm,soil_moisture_0_to_7cm";

const OPEN_METEO_DAILY =
  "weather_code,temperature_2m_max,temperature_2m_min,temperature_2m_mean,apparent_temperature_max,apparent_temperature_min,apparent_temperature_mean,sunrise,sunset,daylight_duration,sunshine_duration,precipitation_sum,rain_sum,snowfall_sum,precipitation_hours,precipitation_probability_max,wind_speed_10m_max,wind_gusts_10m_max,wind_direction_10m_dominant,shortwave_radiation_sum,et0_fao_evapotranspiration,uv_index_max,uv_index_clear_sky_max";

export async function fetchHourlyData(
  lat: number,
  lon: number,
  altitude: number,
  forecastDays: number = 3,
): Promise<HourData[]> {
  const baseUrl = "https://api.open-meteo.com/v1/forecast";

  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lon.toString(),
    hourly: OPEN_METEO_HOURLY,
    daily: OPEN_METEO_DAILY,
    timezone: "Europe/Rome",
    forecast_days: forecastDays.toString(),
    models: "gfs_seamless",
  });

  const url = `${baseUrl}?${params}`;
  console.log(`📡 Fetching real weather data for lat=${lat}, lon=${lon}...`);

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Open-Meteo error: ${res.status}`);

  const json = await res.json();

  if (!json.hourly || !json.hourly.time) {
    throw new Error("No hourly data");
  }

  const hourly = json.hourly;
  const times: string[] = hourly.time;
  const temps: number[] = hourly.temperature_2m;
  const hums: number[] = hourly.relative_humidity_2m;
  const dews: number[] = hourly.dew_point_2m;
  const feels: number[] = hourly.apparent_temperature;
  const preps: number[] = hourly.precipitation;
  const rains: number[] = hourly.rain;
  const snows: number[] = hourly.snowfall;
  const codes: number[] = hourly.weather_code;
  const psl: number[] = hourly.pressure_msl;
  const sp: number[] = hourly.surface_pressure;
  const clouds: number[] = hourly.cloud_cover;
  const cloudsLow: number[] = hourly.cloud_cover_low;
  const cloudsMid: number[] = hourly.cloud_cover_mid;
  const cloudsHigh: number[] = hourly.cloud_cover_high;
  const winds: number[] = hourly.wind_speed_10m;
  const dirs: number[] = hourly.wind_direction_10m;
  const gusts: number[] = hourly.wind_gusts_10m;
  const rad: number[] = hourly.shortwave_radiation;
  const directRad: number[] = hourly.direct_radiation;
  const uv: number[] = hourly.uv_index;
  const vis: number[] = hourly.visibility;
  const vpd: number[] = hourly.vapour_pressure_deficit;
  const isDay: number[] = hourly.is_day;
  const freeze: number[] = hourly.freezing_level_height;
  const sunshine: number[] = hourly.sunshine_duration;

  const data: HourData[] = times.map((timeStr, i) => {
    const temp = temps[i] ?? 15;
    const hum = hums[i] ?? 50;
    const dew = dews[i] ?? (temp - 8); // stima realistica se manca
    const tempK = temp + 273.15;
    const humRel = hum / 100;

    // Calcolo CAPE approssimato (semplificato)
    const deltaT = temp - (dew || temp - 10);
    const capeApprox = Math.max(0, deltaT > 3 ? deltaT * 40 : 0);
    const liftedIndex = temp - (dew ? dew : temp - 5);
    const cin = Math.max(0, 200 - capeApprox * 2);

    const eSat = 611 * Math.exp((17.67 * temp) / (temp + 243.5));
    const e = (hum / 100) * eSat;
    const mixingRatio = 0.622 * e / ((sp[i] ?? 1013) - e);
    const virtualTempK = tempK * (1 + 0.608 * mixingRatio);

    return {
      time: new Date(timeStr + "Z"),
      temperature: temp,
      feelsLike: feels[i] ?? temp,
      humidity: hum,
      dewPoint: dew,  // ora DEW è sempre un valore realistico
      pressure: psl[i] ?? 1013,
      surfacePressure: sp[i] ?? 1013,
      precipitation: preps[i] ?? 0,
      rain: rains[i] ?? 0,
      snowfall: snows[i] ?? 0,
      weatherCode: codes[i] ?? 0,
      cloudCover: clouds[i] ?? 0,
      cloudCoverLow: cloudsLow[i] ?? 0,
      cloudCoverMid: cloudsMid[i] ?? 0,
      cloudCoverHigh: cloudsHigh[i] ?? 0,
      windSpeed: winds[i] ?? 0,
      windDir: dirs[i] ?? 0,
      windGusts: gusts[i] ?? 0,
      radiation: rad[i] ?? 0,
      directRadiation: directRad[i] ?? 0,
      uvIndex: uv[i] ?? 0,
      visibility: vis[i] ?? 10000,
      vapourPressureDeficit: vpd[i] ?? 0,
      isDay: isDay[i] === 1,
      freezingLevel: freeze[i] ?? 3000,
      sunshineDuration: sunshine[i] ?? 0,
      cape: capeApprox,
      cin: cin,
      liftedIndex: liftedIndex,
      mixingRatio: mixingRatio,
      virtualTemp: virtualTempK,
    };
  });

  console.log(`✅ Loaded ${data.length} hourly data points`);
  console.log(`   Temp range: ${Math.min(...data.map(d => d.temperature))}°C - ${Math.max(...data.map(d => d.temperature))}°C`);
  console.log(`   Wind range: ${Math.min(...data.map(d => d.windSpeed))} km/h - ${Math.max(...data.map(d => d.windSpeed))} km/h`);

  return data;
}

export async function fetchAllWeatherData(
  lat: number,
  lon: number,
): Promise<DailyData[]> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=${OPEN_METEO_DAILY}&timezone=Europe/Rome&forecast_days=3&models=gfs_seamless`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Open-Meteo daily error: ${res.status}`);
  const json = await res.json();

  if (!json.daily || !json.daily.time) return [];

  const daily = json.daily;
  return daily.time.map((dateStr: string, i: number) => ({
    date: new Date(dateStr + "T12:00:00Z"),
    weatherCode: daily.weather_code[i] ?? 0,
    temperatureMax: daily.temperature_2m_max[i] ?? 20,
    temperatureMin: daily.temperature_2m_min[i] ?? 10,
    temperatureMean: daily.temperature_2m_mean[i] ?? 15,
    apparentTempMax: daily.apparent_temperature_max[i] ?? 20,
    apparentTempMin: daily.apparent_temperature_min[i] ?? 10,
    sunrise: daily.sunrise[i] ?? "",
    sunset: daily.sunset[i] ?? "",
    daylightDuration: daily.daylight_duration[i] ?? 0,
    sunshineDuration: daily.sunshine_duration[i] ?? 0,
    precipitationSum: daily.precipitation_sum[i] ?? 0,
    rainSum: daily.rain_sum[i] ?? 0,
    snowfallSum: daily.snowfall_sum[i] ?? 0,
    precipitationHours: daily.precipitation_hours[i] ?? 0,
    precipitationProbabilityMax: daily.precipitation_probability_max[i] ?? 0,
    windSpeedMax: daily.wind_speed_10m_max[i] ?? 15,
    windGustsMax: daily.wind_gusts_10m_max[i] ?? 25,
    windDirDominant: daily.wind_direction_10m_dominant[i] ?? 0,
    shortwaveRadiationSum: daily.shortwave_radiation_sum[i] ?? 0,
    uvIndexMax: daily.uv_index_max[i] ?? 3,
    windSpeed: Math.round((daily.wind_speed_10m_max[i] ?? 15) * 0.6),
    cloudCover: 0,
    weatherDescription: "",
  }));
}