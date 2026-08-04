import { HourData, DailyData } from "../hooks/useWeatherData";

export const fetchWeatherData = async (lat: number, lon: number): Promise<{ hourly: HourData[]; daily: DailyData[] }> => {
  return {
    hourly: [],
    daily: []
  };
};

export default fetchWeatherData;