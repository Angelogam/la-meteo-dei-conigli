"use client";

export const Footer = () => {
  return (
    <footer className="text-center py-3 border-t border-slate-800/50 mt-auto">
      <p className="text-xs text-slate-600">
        Dati Open-Meteo &copy; {new Date().getFullYear()} — Previsioni per volo libero
      </p>
    </footer>
  );
};
