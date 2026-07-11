"use client";

export const Header = () => {
  return (
    <header className="text-center mb-5 py-4 border-b border-gray-400">
      <div className="flex items-center justify-center gap-2.5">
        <span className="text-4xl md:text-5xl animate-bounce">&#x1F430;</span>
        <span className="text-3xl md:text-4xl animate-pulse">&#x1FA82;</span>
        <span className="text-3xl md:text-5xl font-extrabold bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">
          Meteo dei Conigli
        </span>
      </div>
      <p className="text-sm text-gray-100 mt-1.5">
        Previsioni per volo libero - Open-Meteo - SHV FSVL Style
      </p>
    </header>
  );
};