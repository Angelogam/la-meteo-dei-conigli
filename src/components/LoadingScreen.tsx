"use client";

export const LoadingScreen = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white">
      <div className="text-6xl mb-4 animate-bounce">&#x1F430;</div>
      <div className="text-xl font-bold text-gray-800 animate-pulse">
        Caricamento meteo in corso...
      </div>
      <div className="text-sm text-gray-500 mt-2">
        Recupero dati dai server Open-Meteo
      </div>
    </div>
  );
};