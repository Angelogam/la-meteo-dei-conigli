"use client";

import { Sun, Moon, Cloud, CloudSun, CloudFog, CloudDrizzle, CloudRain, CloudSnow, CloudLightning, Haze } from "lucide-react";

interface WeatherIconProps {
  code: number;
  size?: number;
}

export const WeatherIcon = ({ code, size = 24 }: WeatherIconProps) => {
  // WMO Weather codes
  // 0: clear sky
  // 1-3: mainly clear, partly cloudy, overcast
  // 45-48: fog
  // 51-57: drizzle
  // 61-67: rain
  // 71-77: snow
  // 80-82: rain showers
  // 95-99: thunderstorm

  const isDay = true; // semplificato

  const props = { size, className: "text-blue-600" };

  if (code === 0) {
    return isDay ? <Sun {...props} /> : <Moon {...props} />;
  }
  if (code <= 3) {
    return <CloudSun {...props} />;
  }
  if (code <= 48) {
    return <CloudFog {...props} />;
  }
  if (code <= 57) {
    return <CloudDrizzle {...props} />;
  }
  if (code <= 67) {
    return <CloudRain {...props} />;
  }
  if (code <= 77) {
    return <CloudSnow {...props} />;
  }
  if (code <= 82) {
    return <CloudRain {...props} />;
  }
  // thunderstorm
  return <CloudLightning {...props} />;
};