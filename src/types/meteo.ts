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
  // precipSum removed - was causing TypeScript error
}