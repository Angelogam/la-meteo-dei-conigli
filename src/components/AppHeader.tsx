"use client";

export const AppHeader = () => {
  return (
    <header className="relative z-10 px-4 py-5 border-b-2 border-green-500/40 bg-gradient-to-r from-slate-800/95 via-green-900/20 to-slate-800/95 backdrop-blur-md shadow-lg">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-center gap-3">
          <span className="text-3xl md:text-4xl drop-shadow-lg animate-bounce">🐰</span>
          <div className="border-2 border-green-500/40 rounded-xl px-4 py-3 bg-slate-800/60 backdrop-blur-sm shadow-inner">
            <h1 className="text-2xl md:text-3xl font-extrabold text-green-400 tracking-tight text-center drop-shadow-sm">
              Meteo dei <span className="text-green-300">Conigli</span>
            </h1>
            <p className="text-sm md:text-base text-green-200/90 font-medium text-center tracking-wide mt-0.5">
              🪂 Previsioni per volo libero · 9:00–19:00 · aggiornato ogni minuto
            </p>
          </div>
          <span
            className="text-3xl md:text-4xl drop-shadow-lg md:block hidden animate-bounce"
            style={{ animationDelay: "150ms" }}
          >
            🐰
          </span>
        </div>
      </div>
    </header>
  );
};