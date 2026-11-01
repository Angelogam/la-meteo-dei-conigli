"use client";

import { weatherService } from "./weatherService";

export const fetchMeteo = async (lat: number, lon: number) => {
  return weatherService.fetchWeather(lat, lon);
};