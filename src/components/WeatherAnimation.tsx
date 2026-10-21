"use client";

import "./weather-animation.css";
import { Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudRain, CloudSnow, CloudSun, Moon, Snowflake, Sun } from "lucide-react";

type WeatherAnimationProps = {
  code: number | null;
};

function weatherKind(code: number | null) {
  if (code === null) return "unknown";
  if (code === 0) return "clear";
  if (code === 1 || code === 2) return "partly";
  if (code === 3) return "cloudy";
  if (code === 45 || code === 48) return "fog";
  if ([51, 53, 55, 56, 57].includes(code)) return "drizzle";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "rain";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "snow";
  if ([95, 96, 99].includes(code)) return "storm";
  return "unknown";
}

export default function WeatherAnimation({ code }: WeatherAnimationProps) {
  const kind = weatherKind(code);
  const label = kind === "clear" ? "Sereno"
    : kind === "partly" ? "Parzialmente nuvoloso"
    : kind === "cloudy" ? "Coperto"
    : kind === "fog" ? "Nebbia"
    : kind === "drizzle" ? "Pioviggine"
    : kind === "rain" ? "Pioggia"
    : kind === "snow" ? "Neve"
    : kind === "storm" ? "Temporale"
    : "Condizione non disponibile";

  return (
    <span className={`weather-scene weather-scene--${kind}`} role="img" aria-label={label}>
      <span className="weather-scene-sky" aria-hidden="true" />
      {(kind === "clear" || kind === "partly" || kind === "unknown") && (
        <Sun className="weather-scene-sun" aria-hidden="true" />
      )}
      {kind === "partly" && <CloudSun className="weather-scene-cloud weather-scene-cloud--front" aria-hidden="true" />}
      {(kind === "cloudy" || kind === "fog" || kind === "drizzle" || kind === "rain" || kind === "snow" || kind === "storm") && (
        <>
          <Cloud className="weather-scene-cloud weather-scene-cloud--back" aria-hidden="true" />
          {kind === "fog" ? <CloudFog className="weather-scene-cloud weather-scene-cloud--front" aria-hidden="true" />
            : kind === "drizzle" ? <CloudDrizzle className="weather-scene-cloud weather-scene-cloud--front" aria-hidden="true" />
            : kind === "rain" ? <CloudRain className="weather-scene-cloud weather-scene-cloud--front" aria-hidden="true" />
            : kind === "snow" ? <CloudSnow className="weather-scene-cloud weather-scene-cloud--front" aria-hidden="true" />
            : kind === "storm" ? <CloudLightning className="weather-scene-cloud weather-scene-cloud--front" aria-hidden="true" />
            : <Cloud className="weather-scene-cloud weather-scene-cloud--front" aria-hidden="true" />}
        </>
      )}
      {(kind === "drizzle" || kind === "rain") && <span className="weather-scene-rain" aria-hidden="true"><i /><i /><i /></span>}
      {kind === "snow" && <span className="weather-scene-snow" aria-hidden="true"><Snowflake /><Snowflake /><Snowflake /></span>}
      {kind === "storm" && <span className="weather-scene-flash" aria-hidden="true" />}
      {kind === "fog" && <span className="weather-scene-fog" aria-hidden="true"><i /><i /><i /></span>}
      {kind === "unknown" && <Moon className="weather-scene-moon" aria-hidden="true" />}
    </span>
  );
}
