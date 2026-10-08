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