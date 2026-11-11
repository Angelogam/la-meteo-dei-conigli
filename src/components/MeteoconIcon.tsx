"use client";

/* Icone meteo REALISTICHE e ANIMATE (Meteocons di Bas Milius, MIT — vedi
   public/meteocons/ATTRIBUTION.txt): SVG animati auto-ospitati, quindi
   funzionano sempre, senza CDN e senza JS. */
import { meteoconFile } from "./meteocon-code";
import "./meteocon-icon.css";

interface MeteoconIconProps {
  code: number | null;
  size?: "compact" | "hero";
}

export default function MeteoconIcon({ code, size = "compact" }: MeteoconIconProps) {
  const { file, label } = meteoconFile(code);
  return (
    <img
      className={`meteocon meteocon--${size}`}
      src={`/meteocons/${file}.svg`}
      alt=""
      aria-hidden="true"
      title={label}
      loading="lazy"
      decoding="async"
      draggable={false}
    />
  );
}
