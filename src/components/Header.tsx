"use client";

export const Header = () => {
  return (
    <header className="text-center mb-5 py-4 border-b border-gray-400">
      <div className="flex flex-col items-center justify-center gap-1">
        <div className="flex items-center justify-center gap-2.5">
          <span className="text-3xl md:text-4xl animate-bounce">&#x1F430;</span>
          <span
            className="text-2xl md:text-4xl font-extrabold text-center"
            style={{
              background: "linear-gradient(to right, #e63946, #f97316)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              filter: "drop-shadow(1.5px 1.5px 0 #000) drop-shadow(-1.5px -1.5px 0 #000) drop-shadow(1.5px -1.5px 0 #000) drop-shadow(-1.5px 1.5px 0 #000)",
            }}
          >
            Meteo dei Conigli
          </span>
          <span className="text-2xl md:text-3xl animate-pulse">&#x1FA82;</span>
        </div>
        <p
          className="text-sm md:text-base font-bold text-center"
          style={{
            color: "#f97316",
            textShadow: "0.5px 0.5px 0 #000, -0.5px -0.5px 0 #000, 0.5px -0.5px 0 #000, -0.5px 0.5px 0 #000",
          }}
        >
          Previsioni per volo libero - Open-Meteo - SHV FSVL Style
        </p>
      </div>
    </header>
  );
};