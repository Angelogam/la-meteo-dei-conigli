"use client";

interface FinestreVolabilitaProps {
  temperature: number;
  humidity: number;
  cloudCover: number;
  precipitation: number;
  cloudBase: number | null;
  thermalTop: number | null;
  soarIdx: number | null;
  windDir: string;
  windSpeed: number;
}

export const FinestreVolabilita = ({
  temperature,
  humidity,
  cloudCover,
  precipitation,
  cloudBase,
  thermalTop,
  soarIdx,
  windDir,
  windSpeed,
}: FinestreVolabilitaProps) => {
  const cards = [
    { label: "🌡️ Temperatura", value: `${Math.round(temperature)}°C`, color: "text-orange-600" },
    { label: "💧 Umidità", value: `${Math.round(humidity)}%`, color: "text-blue-600" },
    { label: "☁️ Nuvolosità", value: `${Math.round(cloudCover)}%`, color: "text-gray-700" },
    { label: "🌧️ Precipitazioni", value: precipitation === 0 ? "Assenti" : `${precipitation} mm`, color: "text-sky-600" },
    { label: "☁️ Base Nuvole", value: cloudBase ? `${cloudBase}m` : "--", color: "text-gray-700" },
    { label: "⬆️ Plafond", value: thermalTop ? `${thermalTop}m` : "--", color: "text-gray-700" },
    { label: "🪁 Galleggiamento", value: soarIdx ? `${soarIdx}/10` : "--", color: "text-amber-600" },
    { label: "💨 Vento", value: `${windDir} ${Math.round(windSpeed)} km/h`, color: "text-indigo-600" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
      {cards.map((c) => (
        <div key={c.label} className="bg-white p-2.5 rounded-xl border border-gray-200 shadow-sm">
          <div className="text-xs font-bold text-gray-500 mb-0.5">{c.label}</div>
          <div className={`text-base font-extrabold ${c.color}`}>{c.value}</div>
        </div>
      ))}
    </div>
  );
};