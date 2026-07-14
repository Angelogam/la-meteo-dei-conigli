"use client";

export const Footer = () => {
  return (
    <footer className="text-center py-3 border-t border-gray-200 mt-auto">
      <p className="text-xs text-gray-400">
        Basato su dati Open-Meteo &copy; {new Date().getFullYear()} - Meteo dei Conigli
      </p>
    </footer>
  );
};