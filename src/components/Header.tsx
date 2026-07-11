"use client";

export const Header = () => {
  return (
    <header className="text-center mb-5 py-4 border-b border-gray-400">
      <div className="flex flex-col items-center justify-center gap-1">
        <div className="flex items-center justify-center gap-2.5">
          <span className="text-3xl md:text-4xl animate-bounce">&#x1F430;</span>
          <span className="text-2xl md:text-4xl font-bold text-center text-orange-500 drop-shadow-sm">
            Meteo dei Conigli
          </span>
          <span className="text-2xl md:text-3xl animate-pulse">&#x1FA82;</span>
        </div>
        <p className="text-sm md:text-base font-medium text-gray-100">
          Previsioni per volo libero - Open-Meteo - SHV FSVL Style
        </p>
      </div>
    </header>
  );
};