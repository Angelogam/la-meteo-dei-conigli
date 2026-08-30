import axios from "axios";

export interface OpenMeteoHourly {
  time: string[];
  temperature: number[];
  humidity: number[];
  dewPoint: number[];
  cloudCover: number[];
  precipitation: number[];
  windSpeed: number[];
  windDir: number[];
  windSpeed80m?: number[];
  windDirection80m?: number[];
  windGusts?: number[];
  pressure: number[];
  cape?: number[];
  liftedIndex?: number[];
  cin?: number[];
  freezingLevel?: number[];
  shortwaveRadiation?: number[];
  weatherCode?: number[];
}

export interface OpenMeteoResponse {
  latitude: number;
  longitude: number;
  generationtime_ms: number;
  utc_offset_seconds: number;
  timezone: string;
  timezone_abbreviation: string;
  elevation: number;
  hourly: OpenMeteoHourly;
}

export interface WindProfileLevel {
  alt: number;
  speed: number;
  dir: number;
  hpa: string;
}

export interface WindProfileHour {
  levels: WindProfileLevel[];
}

export async function fetchWindProfile(
  latitude: number,
  longitude: number,
  altitude: number,
  selectedDay: number = 0
): Promise<Map<number, WindProfileHour>> {
  const result = new Map<number, WindProfileHour>();
  
  try {
    // Fetch wind profile from Open-Meteo
    const response = await axios.get<OpenMeteoResponse>(
      `https://api.open-meteo.com/v1/forecast`,
      {
        params: {
          latitude,
          longitude,
          hourly: "wind_speed_10m,wind_direction_10m,wind_speed_80m,wind_direction_80m,wind_speed_120m,wind_direction_120m,wind_speed_180m,wind_direction_180m,wind_speed_240m,wind_direction_240m,wind_speed_300m,wind_direction_300m,wind_speed_400m,wind_direction_400m,wind_speed_500m,wind_direction_500m,wind_speed_600m,wind_direction_600m,wind_speed_700m,wind_direction_700m,wind_speed_800m,wind_direction_800m,wind_speed_900m,wind_direction_900m,wind_speed_1000m,wind_direction_1000m,wind_speed_1200m,wind_direction_1200m,wind_speed_1400m,wind_direction_1400m,wind_speed_1600m,wind_direction_1600m,wind_speed_1800m,wind_direction_1800m,wind_speed_2000m,wind_direction_2000m,wind_speed_2500m,wind_direction_2500m,wind_speed_3000m,wind_direction_3000m,wind_speed_3500m,wind_direction_3500m,wind_speed_4000m,wind_direction_4000m",
          start_date: new Date(Date.now() + selectedDay * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          end_date: new Date(Date.now() + (selectedDay + 1) * 24 * 60 * 60 * 1000 - 1).toISOString().split("T")[0],
          timezone: "Europe/Rome",
        },
        timeout: 10000,
      }
    );

    const data = response.data;
    const times = data.hourly.time;
    
    // Build wind profiles for each hour
    for (let i = 0; i < times.length; i++) {
      const date = new Date(times[i]);
      const hour = date.getHours();
      
      // Only include display hours
      const DISPLAY_HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];
      if (!DISPLAY_HOURS.includes(hour)) continue;
      
      const levels: WindProfileLevel[] = [];
      
      // 10m level
      if (data.hourly.windSpeed && data.hourly.windSpeed[i] != null) {
        levels.push({
          alt: 10,
          speed: data.hourly.windSpeed[i],
          dir: data.hourly.windDir?.[i] ?? 0,
          hpa: "10m",
        });
      }
      
      // 80m level
      if (data.hourly.windSpeed80m && data.hourly.windSpeed80m[i] != null) {
        levels.push({
          alt: 80,
          speed: data.hourly.windSpeed80m[i],
          dir: data.hourly.windDirection80m?.[i] ?? 0,
          hpa: "80m",
        });
      }
      
      // 120m level
      if (data.hourly.windSpeed_120m && data.hourly.windSpeed_120m[i] != null) {
        levels.push({
          alt: 120,
          speed: data.hourly.windSpeed_120m[i],
          dir: data.hourly.windDirection_120m?.[i] ?? 0,
          hpa: "120m",
        });
      }
      
      // 180m level
      if (data.hourly.windSpeed_180m && data.hourly.windSpeed_180m[i] != null) {
        levels.push({
          alt: 180,
          speed: data.hourly.windSpeed_180m[i],
          dir: data.hourly.windDirection_180m?.[i] ?? 0,
          hpa: "180m",
        });
      }
      
      // 300m level
      if (data.hourly.windSpeed_300m && data.hourly.windSpeed_300m[i] != null) {
        levels.push({
          alt: 300,
          speed: data.hourly.windSpeed_300m[i],
          dir: data.hourly.windDirection_300m?.[i] ?? 0,
          hpa: "300m",
        });
      }
      
      // 500m level
      if (data.hourly.windSpeed_500m && data.hourly.windSpeed_500m[i] != null) {
        levels.push({
          alt: 500,
          speed: data.hourly.windSpeed_500m[i],
          dir: data.hourly.windDirection_500m?.[i] ?? 0,
          hpa: "500m",
        });
      }
      
      // 1000m level
      if (data.hourly.windSpeed_1000m && data.hourly.windSpeed_1000m[i] != null) {
        levels.push({
          alt: 1000,
          speed: data.hourly.windSpeed_1000m[i],
          dir: data.hourly.windDirection_1000m?.[i] ?? 0,
          hpa: "1000m",
        });
      }
      
      // 2000m level
      if (data.hourly.windSpeed_2000m && data.hourly.windSpeed_2000m[i] != null) {
        levels.push({
          alt: 2000,
          speed: data.hourly.windSpeed_2000m[i],
          dir: data.hourly.windDirection_2000m?.[i] ?? 0,
          hpa: "2000m",
        });
      }
      
      // 3000m level
      if (data.hourly.windSpeed_3000m && data.hourly.windSpeed_3000m[i] != null) {
        levels.push({
          alt: 3000,
          speed: data.hourly.windSpeed_3000m[i],
          dir: data.hourly.windDirection_3000m?.[i] ?? 0,
          hpa: "3000m",
        });
      }
      
      // 4000m level
      if (data.hourly.windSpeed_4000m && data.hourly.windSpeed_4000m[i] != null) {
        levels.push({
          alt: 4000,
          speed: data.hourly.windSpeed_4000m[i],
          dir: data.hourly.windDirection_4000m?.[i] ?? 0,
          hpa: "4000m",
        });
      }
      
      if (levels.length > 0) {
        result.set(hour, { levels });
      }
    }
    
    return result;
  } catch (error) {
    console.error("Error fetching wind profile:", error);
    return result;
  }
}

export async function fetchPrevisioniGiornaliere(
  latitude: number,
  longitude: number,
  altitude: number = 0
): Promise<any[]> {
  try {
    const response = await axios.get<OpenMeteoResponse>(
      `https://api.open-meteo.com/v1/forecast`,
      {
        params: {
          latitude,
          longitude,
          hourly: "temperature_2m,relative_humidity_2m,dew_point_2m,cloud_cover,precipitation,wind_speed_10m,wind_direction_10m,wind_speed_80m,wind_direction_80m,wind_gusts_10m,pressure_msl,cape,lifted_index,convective_inhibition,freezing_level_height,shortwave_radiation",
          timezone: "Europe/Rome",
          forecast_days: "1",
        },
      }
    );

    const data = response.data;
    const hourly = data.hourly;
    const len = hourly.time.length;
    const result: any[] = [];

    for (let i = 0; i < len; i++) {
      result.push({
        time: new Date(hourly.time[i]),
        temperature: hourly.temperature_2m?.[i] ?? 0,
        humidity: hourly.relative_humidity_2m?.[i] ?? 0,
        dewPoint: hourly.dew_point_2m?.[i] ?? 0,
        cloudCover: hourly.cloud_cover?.[i] ?? 0,
        precipitation: hourly.precipitation?.[i] ?? 0,
        windSpeed10m: hourly.wind_speed_10m?.[i] ?? 0,
        windDirection10m: hourly.wind_direction_10m?.[i] ?? 0,
        windSpeed80m: hourly.wind_speed_80m?.[i] ?? 0,
        windDirection80m: hourly.wind_direction_80m?.[i] ?? 0,
        windGusts: hourly.wind_gusts_10m?.[i] ?? 0,
        pressure: hourly.pressure_msl?.[i] ?? 0,
        cape: hourly.cape?.[i] ?? 0,
        liftedIndex: hourly.lifted_index?.[i] ?? 0,
        cin: hourly.convective_inhibition?.[i] ?? 0,
        freezingLevel: hourly.freezing_level_height?.[i] ?? 0,
        shortwaveRadiation: hourly.shortwave_radiation?.[i] ?? 0,
      });
    }

    return result;
  } catch (error) {
    console.error("Error fetching previsioni giornaliere:", error);
    return [];
  }
}
</dyad-file><dyad-write path="src/services/openMeteoService.ts">
import axios from "axios";

export interface OpenMeteoHourly {
  time: string[];
  temperature: number[];
  humidity: number[];
  dewPoint: number[];
  cloudCover: number[];
  precipitation: number[];
  windSpeed: number[];
  windDir: number[];
  windSpeed80m?: number[];
  windDirection80m?: number[];
  windGusts?: number[];
  pressure: number[];
  cape?: number[];
  liftedIndex?: number[];
  cin?: number[];
  freezingLevel?: number[];
  shortwaveRadiation?: number[];
  weatherCode?: number[];
}

export interface OpenMeteoResponse {
  latitude: number;
  longitude: number;
  generationtime_ms: number;
  utc_offset_seconds: number;
  timezone: string;
  timezone_abbreviation: string;
  elevation: number;
  hourly: OpenMeteoHourly;
}

export interface WindProfileLevel {
  alt: number;
  speed: number;
  dir: number;
  hpa: string;
}

export interface WindProfileHour {
  levels: WindProfileLevel[];
}

export async function fetchWindProfile(
  latitude: number,
  longitude: number,
  altitude: number,
  selectedDay: number = 0
): Promise<Map<number, WindProfileHour>> {
  const result = new Map<number, WindProfileHour>();
  
  try {
    // Fetch wind profile from Open-Meteo
    const response = await axios.get<OpenMeteoResponse>(
      `https://api.open-meteo.com/v1/forecast`,
      {
        params: {
          latitude,
          longitude,
          hourly: "wind_speed_10m,wind_direction_10m,wind_speed_80m,wind_direction_80m,wind_speed_120m,wind_direction_120m,wind_speed_180m,wind_direction_180m,wind_speed_240m,wind_direction_240m,wind_speed_300m,wind_direction_300m,wind_speed_400m,wind_direction_400m,wind_speed_500m,wind_direction_500m,wind_speed_600m,wind_direction_600m,wind_speed_700m,wind_direction_700m,wind_speed_800m,wind_direction_800m,wind_speed_900m,wind_direction_900m,wind_speed_1000m,wind_direction_1000m,wind_speed_1200m,wind_direction_1200m,wind_speed_1400m,wind_direction_1400m,wind_speed_1600m,wind_direction_1600m,wind_speed_1800m,wind_direction_1800m,wind_speed_2000m,wind_direction_2000m,wind_speed_2500m,wind_direction_2500m,wind_speed_3000m,wind_direction_3000m,wind_speed_3500m,wind_direction_3500m,wind_speed_4000m,wind_direction_4000m",
          start_date: new Date(Date.now() + selectedDay * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          end_date: new Date(Date.now() + (selectedDay + 1) * 24 * 60 * 60 * 1000 - 1).toISOString().split("T")[0],
          timezone: "Europe/Rome",
        },
        timeout: 10000,
      }
    );

    const data = response.data;
    const times = data.hourly.time;
    
    // Build wind profiles for each hour
    for (let i = 0; i < times.length; i++) {
      const date = new Date(times[i]);
      const hour = date.getHours();
      
      // Only include display hours
      const DISPLAY_HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];
      if (!DISPLAY_HOURS.includes(hour)) continue;
      
      const levels: WindProfileLevel[] = [];
      
      // 10m level
      if (data.hourly.windSpeed && data.hourly.windSpeed[i] != null) {
        levels.push({
          alt: 10,
          speed: data.hourly.windSpeed[i],
          dir: data.hourly.windDir?.[i] ?? 0,
          hpa: "10m",
        });
      }
      
      // 80m level
      if (data.hourly.windSpeed80m && data.hourly.windSpeed80m[i] != null) {
        levels.push({
          alt: 80,
          speed: data.hourly.windSpeed80m[i],
          dir: data.hourly.windDirection80m?.[i] ?? 0,
          hpa: "80m",
        });
      }
      
      // 120m level
      if (data.hourly.windSpeed_120m && data.hourly.windSpeed_120m[i] != null) {
        levels.push({
          alt: 120,
          speed: data.hourly.windSpeed_120m[i],
          dir: data.hourly.windDirection_120m?.[i] ?? 0,
          hpa: "120m",
        });
      }
      
      // 180m level
      if (data.hourly.windSpeed_180m && data.hourly.windSpeed_180m[i] != null) {
        levels.push({
          alt: 180,
          speed: data.hourly.windSpeed_180m[i],
          dir: data.hourly.windDirection_180m?.[i] ?? 0,
          hpa: "180m",
        });
      }
      
      // 300m level
      if (data.hourly.windSpeed_300m && data.hourly.windSpeed_300m[i] != null) {
        levels.push({
          alt: 300,
          speed: data.hourly.windSpeed_300m[i],
          dir: data.hourly.windDirection_300m?.[i] ?? 0,
          hpa: "300m",
        });
      }
      
      // 500m level
      if (data.hourly.windSpeed_500m && data.hourly.windSpeed_500m[i] != null) {
        levels.push({
          alt: 500,
          speed: data.hourly.windSpeed_500m[i],
          dir: data.hourly.windDirection_500m?.[i] ?? 0,
          hpa: "500m",
        });
      }
      
      // 1000m level
      if (data.hourly.windSpeed_1000m && data.hourly.windSpeed_1000m[i] != null) {
        levels.push({
          alt: 1000,
          speed: data.hourly.windSpeed_1000m[i],
          dir: data.hourly.windDirection_1000m?.[i] ?? 0,
          hpa: "1000m",
        });
      }
      
      // 2000m level
      if (data.hourly.windSpeed_2000m && data.hourly.windSpeed_2000m[i] != null) {
        levels.push({
          alt: 2000,
          speed: data.hourly.windSpeed_2000m[i],
          dir: data.hourly.windDirection_2000m?.[i] ?? 0,
          hpa: "2000m",
        });
      }
      
      // 3000m level
      if (data.hourly.windSpeed_3000m && data.hourly.windSpeed_3000m[i] != null) {
        levels.push({
          alt: 3000,
          speed: data.hourly.windSpeed_3000m[i],
          dir: data.hourly.windDirection_3000m?.[i] ?? 0,
          hpa: "3000m",
        });
      }
      
      // 4000m level
      if (data.hourly.windSpeed_4000m && data.hourly.windSpeed_4000m[i] != null) {
        levels.push({
          alt: 4000,
          speed: data.hourly.windSpeed_4000m[i],
          dir: data.hourly.windDirection_4000m?.[i] ?? 0,
          hpa: "4000m",
        });
      }
      
      if (levels.length > 0) {
        result.set(hour, { levels });
      }
    }
    
    return result;
  } catch (error) {
    console.error("Error fetching wind profile:", error);
    return result;
  }
}

export async function fetchPrevisioniGiornaliere(
  latitude: number,
  longitude: number,
  altitude: number = 0
): Promise<any[]> {
  try {
    const response = await axios.get<OpenMeteoResponse>(
      `https://api.open-meteo.com/v1/forecast`,
      {
        params: {
          latitude,
          longitude,
          hourly: "temperature_2m,relative_humidity_2m,dew_point_2m,cloud_cover,precipitation,wind_speed_10m,wind_direction_10m,wind_speed_80m,wind_direction_80m,wind_gusts_10m,pressure_msl,cape,lifted_index,convective_inhibition,freezing_level_height,shortwave_radiation",
          timezone: "Europe/Rome",
          forecast_days: "1",
        },
      }
    );

    const data = response.data;
    const hourly = data.hourly;
    const len = hourly.time.length;
    const result: any[] = [];

    for (let i = 0; i < len; i++) {
      result.push({
        time: new Date(hourly.time[i]),
        temperature: hourly.temperature_2m?.[i] ?? 0,
        humidity: hourly.relative_humidity_2m?.[i] ?? 0,
        dewPoint: hourly.dew_point_2m?.[i] ?? 0,
        cloudCover: hourly.cloud_cover?.[i] ?? 0,
        precipitation: hourly.precipitation?.[i] ?? 0,
        windSpeed10m: hourly.wind_speed_10m?.[i] ?? 0,
        windDirection10m: hourly.wind_direction_10m?.[i] ?? 0,
        windSpeed80m: hourly.wind_speed_80m?.[i] ?? 0,
        windDirection80m: hourly.wind_direction_80m?.[i] ?? 0,
        windGusts: hourly.wind_gusts_10m?.[i] ?? 0,
        pressure: hourly.pressure_msl?.[i] ?? 0,
        cape: hourly.cape?.[i] ?? 0,
        liftedIndex: hourly.lifted_index?.[i] ?? 0,
        cin: hourly.convective_inhibition?.[i] ?? 0,
        freezingLevel: hourly.freezing_level_height?.[i] ?? 0,
        shortwaveRadiation: hourly.shortwave_radiation?.[i] ?? 0,
      });
    }

    return result;
  } catch (error) {
    console.error("Error fetching previsioni giornaliere:", error);
    return [];
  }
}