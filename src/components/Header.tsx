"use client";

export const Header = () => {
  return (
    <header className="relative bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border-b border-orange-800/20 overflow-hidden">
      {/* Bagliore sottile in alto */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-px bg-gradient-to-r from-transparent via-orange-400/40 to-transparent" />
      
      {/* Decorazioni laterali */}
      <div className="absolute -right-12 -top-12 w-40 h-40 rounded-full bg-orange-500/5 blur-3xl" />
      <div className="absolute -left-12 -bottom-12 w-40 h-40 rounded-full bg-sky-500/5 blur-3xl" />

      <div className="relative max-w-7xl mx-auto px-4 md:px-6 py-4 md:py-5">
        <div className="flex items-center justify-center gap-3 md:gap-8">
          {/* Decorazione sinistra - coniglio + parapendio */}
          <div className="hidden sm:flex flex-col items-center gap-1.5">
            <div className="relative">
              <div className="w-10 h-10 md:w-14 md:h-14 rounded-full bg-gradient-to-br from-orange-500/20 to-amber-500/10 border border-orange-400/30 flex items-center justify-center animate-hop subtle-shadow">
                <span className="text-xl md:text-2xl drop-shadow-md">🐰</span>
              </div>
            </div>
            <span className="text-lg md:text-xl animate-float drop-shadow-md">🪂</span>
          </div>

          {/* Titolo centrale */}
          <div className="flex flex-col items-center text-center">
            <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight">
              <span className="bg-gradient-to-r from-orange-300 via-amber-400 to-yellow-300 bg-clip-text text-transparent drop-shadow-lg">
                Meteo dei Conigli
              </span>
            </h1>
            <p className="text-xs md:text-sm font-medium text-slate-500 mt-1 tracking-wide">
              Previsioni per volo libero · Open-Meteo
            </p>
          </div>

          {/* Decorazione destra - coniglio + parapendio */}
          <div className="hidden sm:flex flex-col items-center gap-1.5">
            <div className="relative">
              <div className="w-10 h-10 md:w-14 md:h-14 rounded-full bg-gradient-to-br from-sky-500/20 to-emerald-500/10 border border-sky-400/30 flex items-center justify-center animate-hop subtle-shadow" style={{ animationDelay: '0.3s' }}>
                <span className="text-xl md:text-2xl drop-shadow-md">🐰</span>
              </div>
            </div>
            <span className="text-lg md:text-xl animate-float drop-shadow-md" style={{ animationDelay: '0.5s' }}>🪂</span>
          </div>
        </div>
      </div>
    </header>
  );
};