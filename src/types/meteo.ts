"use client";

export interface HourData {
  time: Date;
  // MODEL_FORECAST — forniti dal modello numerico Open-Meteo
  temperature: number | null;
  feelsLike: number | null;
  humidity: number | null;
  dewPoint: number | null;
  pressure: number | null;
  surfacePressure: number | null;
  precipitation: number | null;
  rain: number | null;
  snowfall: number | null;
  weatherCode: number | null;
  cloudCover: number | null;
  cloudCoverLow: number | null;
  cloudCoverMid: number | null;
  cloudCoverHigh: number | null;
  windSpeed: number | null;
  windDir: number | null;
  windGusts: number | null;
  radiation: number | null;
  directRadiation: number | null;
  uvIndex: number | null;
  visibility: number | null;
  // DERIVED / STIMATED / FILLER — mai dati reali
  vapourPressureDeficit: number | null;
  isDay: boolean | null;
  freezingLevel: number | null;
  sunshineDuration: number | null;
  // MODEL_FORECAST — instabilità convettiva
  cape: number | null;
  cin: number | null;
  liftedIndex: number | null;
  mixingRatio: number | null;
  virtualTemp: number | null;
  windProfile?: { height: number; speed: number; dir: number }[];
  temp80m?: number | null;
  temp120m?: number | null;
  temperature180m?: number | null;
  boundaryLayerHeight?: number | null;
  apparentTemp?: number | null;
  precipitationProba?: number | null;
  evapotranspiration?: number | null;
  et0?: number | null;
  soilTemp?: number | null;
  soilMoisture?: number | null;
  diffuseRadiation?: number | null;
  directNormalIrradiance?: number | null;
  terrestrialRadiation?: number | null;
  // Pressure level wind data (real altitude winds from Open-Meteo)
  windSpeed925?: number | null;
  windDir925?: number | null;
  windSpeed850?: number | null;
  windDir850?: number | null;
  windSpeed700?: number | null;
  windDir700?: number | null;
  windSpeed500?: number | null;
  windDir500?: number | null;
  windSpeed600?: number | null;
  windDir600?: number | null;
  // Legacy aliases for compatibility
  windSpeed300?: number | null;
  windDir300?: number | null;
  windSpeed250?: number | null;
  windDir250?: number | null;
  windSpeed200?: number | null;
  windDir200?: number | null;
  windSpeed1000?: number | null;
  windDir1000?: number | null;
  windSpeed1500?: number | null;
  windDir1500?: number | null;
  windSpeed2000?: number | null;
  windDir2000?: number | null;
  windSpeed2500?: number | null;
  windDir2500?: number | null;
  windSpeed3000?: number | null;
  windDir3000?: number | null;
  // Multi-level data for report generation
  shortwaveRadiation?: number | null;
  temperature80m?: number | null;
  temperature120m?: number | null;
  windSpeed80m?: number | null;
  windDir80m?: number | null;
  windSpeed120m?: number | null;
  windDir120m?: number | null;
  windSpeed180m?: number | null;
  windDir180m?: number | null;
  windSpeed925hPa?: number | null;
  windDir925hPa?: number | null;
  windSpeed850hPa?: number | null;
  windDir850hPa?: number | null;
  windSpeed700hPa?: number | null;
  windDir700hPa?: number | null;
  windSpeed600hPa?: number | null;
  windDir600hPa?: number | null;
  windSpeed500hPa?: number | null;
  windDir500hPa?: number | null;
}

/** Serie numerica grezza di Open-Meteo (valori possibilmente mancanti). */
export type RawSeries = (number | null)[];

/**
 * Blocco `hourly` della risposta grezza di Open-Meteo.
 * I campi sono opzionali perché il payload dipende dai parametri richiesti.
 */
export interface OpenMeteoRawHourly {
  time?: string[];
  temperature_2m?: RawSeries;
  temperature_80m?: RawSeries;
  temperature_120m?: RawSeries;
  temperature_180m?: RawSeries;
  dew_point_2m?: RawSeries;
  relative_humidity_2m?: RawSeries;
  apparent_temperature?: RawSeries;
  precipitation?: RawSeries;
  precipitation_probability?: RawSeries;
  rain?: RawSeries;
  snowfall?: RawSeries;
  weather_code?: RawSeries;
  cloud_cover?: RawSeries;
  cloudcover?: RawSeries;
  cloud_cover_low?: RawSeries;
  cloud_cover_mid?: RawSeries;
  cloud_cover_high?: RawSeries;
  pressure_msl?: RawSeries;
  surface_pressure?: RawSeries;
  wind_speed_10m?: RawSeries;
  wind_direction_10m?: RawSeries;
  wind_gusts_10m?: RawSeries;
  wind_speed_80m?: RawSeries;
  wind_direction_80m?: RawSeries;
  wind_speed_120m?: RawSeries;
  wind_direction_120m?: RawSeries;
  wind_speed_180m?: RawSeries;
  wind_direction_180m?: RawSeries;
  wind_speed_925hPa?: RawSeries;
  wind_direction_925hPa?: RawSeries;
  wind_speed_850hPa?: RawSeries;
  wind_direction_850hPa?: RawSeries;
  wind_speed_700hPa?: RawSeries;
  wind_direction_700hPa?: RawSeries;
  wind_speed_600hPa?: RawSeries;
  wind_direction_600hPa?: RawSeries;
  wind_speed_500hPa?: RawSeries;
  wind_direction_500hPa?: RawSeries;
  freezing_level_height?: RawSeries;
  cape?: RawSeries;
  convective_inhibition?: RawSeries;
  lifted_index?: RawSeries;
  boundary_layer_height?: RawSeries;
  shortwave_radiation?: RawSeries;
  direct_radiation?: RawSeries;
  sunshine_duration?: RawSeries;
  uv_index?: RawSeries;
  visibility?: RawSeries;
  is_day?: RawSeries;
  [key: string]: RawSeries | string[] | undefined;
}

/** Blocco `daily` della risposta grezza di Open-Meteo. */
export interface OpenMeteoRawDaily {
  time?: string[];
  weather_code?: RawSeries;
  temperature_2m_max?: RawSeries;
  temperature_2m_min?: RawSeries;
  temperature_2m_mean?: RawSeries;
  apparent_temperature_max?: RawSeries;
  apparent_temperature_min?: RawSeries;
  precipitation_sum?: RawSeries;
  precipitation_probability_max?: RawSeries;
  precipitation_hours?: RawSeries;
  rain_sum?: RawSeries;
  snowfall_sum?: RawSeries;
  wind_speed_10m_max?: RawSeries;
  wind_gusts_10m_max?: RawSeries;
  wind_direction_10m_dominant?: RawSeries;
  uv_index_max?: RawSeries;
  daylight_duration?: RawSeries;
  sunshine_duration?: RawSeries;
  shortwave_radiation_sum?: RawSeries;
  freezing_level_height_max?: RawSeries;
  sunrise?: string[];
  sunset?: string[];
  [key: string]: RawSeries | string[] | undefined;
}

/** Blocco `current` della risposta grezza di Open-Meteo. */
export interface OpenMeteoRawCurrent {
  time?: string;
  temperature_2m?: number | null;
  relative_humidity_2m?: number | null;
  dew_point_2m?: number | null;
  precipitation?: number | null;
  weather_code?: number | null;
  cloud_cover?: number | null;
  cloud_cover_low?: number | null;
  cloud_cover_mid?: number | null;
  cloud_cover_high?: number | null;
  wind_speed_10m?: number | null;
  wind_direction_10m?: number | null;
  wind_gusts_10m?: number | null;
  cape?: number | null;
  convective_inhibition?: number | null;
  apparent_temperature?: number | null;
  uv_index?: number | null;
  visibility?: number | null;
  is_day?: number | null;
  [key: string]: number | string | null | undefined;
}

/** Risposta grezza di Open-Meteo condivisa tra i componenti. */
export interface OpenMeteoRawResponse {
  latitude?: number;
  longitude?: number;
  elevation?: number;
  timezone?: string;
  hourly?: OpenMeteoRawHourly;
  daily?: OpenMeteoRawDaily;
  current?: OpenMeteoRawCurrent;
}

export interface DailyData {
  date: Date;
  weatherCode: number;
  temperatureMax: number;
  temperatureMin: number;
  temperatureMean: number;
  apparentTempMax: number;
  apparentTempMin: number;
  sunrise: string;
  sunset: string;
  daylightDuration: number;
  sunshineDuration: number;
  precipitationSum: number;
  rainSum: number;
  snowfallSum: number;
  precipitationHours: number;
  precipitationProbabilityMax: number;
  windSpeedMax: number;
  windGustsMax: number;
  windDirDominant: number;
  shortwaveRadiationSum: number;
  uvIndexMax: number;
  windSpeed: number;
  cloudCover: number;
  weatherDescription: string;
}