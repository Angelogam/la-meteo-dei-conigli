"use client";

export const AppFooter = () => {
  return (
    <footer className="relative z-10 fixed bottom-0 left-0 right-0 text-center py-3 border-t border-green-500/30 bg-slate-800/80 backdrop-blur-md shadow-lg">
      <div className="max-w-5xl mx-auto px-4 flex items-center justify-center gap-8">
        <p className="text-xs text-slate-300">
          Basato su dati Open-Meteo · previsioni 9:00–19:00
        </p>
        <p className="text-xs text-slate-300">
          © {new Date().getFullYear()} Meteo dei Conigli
        </p>
      </div>
    </footer>
  );
};