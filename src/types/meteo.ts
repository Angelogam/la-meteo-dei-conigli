export interface HourData {
  time: Date;
  temperature: number;
  feelsLike: number;
  humidity: number;
  dewPoint: number;
  pressure: number;
  surfacePressure: number;
  precipitation: number;
  rain: number;
  snowfall: number;
  weatherCode: number;
  cloudCover: number;
  cloudCoverLow: number;
  cloudCoverMid: number;
  cloudCoverHigh: number;
  windSpeed: number;
  windDir: number;
  windGusts: number;
  radiation: number;
  directRadiation: number;
  uvIndex: number;
  visibility: number;
  vapourPressureDeficit: number;
  isDay: boolean;
  freezingLevel: number;
  sunshineDuration: number;
  cape: number;
  cin: number;
  liftedIndex: number;
  mixingRatio: number;
  virtualTemp: number;
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
  // Campi arricchiti
  windSpeed: number;
  cloudCover: number;
  weatherDescription: string;
}