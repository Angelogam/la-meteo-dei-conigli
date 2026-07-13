"use client";

export const Header = () => {
  return (
    <header className="text-center mb-6 py-4 border-b border-gray-200 relative overflow-hidden">
      <div className="flex items-center justify-center gap-4 md:gap-8">
        {/* Coniglio sinistro con parapendio */}
        <div className="hidden sm:flex flex-col items-center animate-float-left">
          <div className="relative">
            {/* Parapendio */}
            <svg className="w-16 h-16 text-orange-400" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M32 8C16 8 4 16 4 28h8c0-8 8-14 20-14s20 6 20 14h8c0-12-12-20-28-20z" fill="currentColor" opacity="0.6"/>
              <path d="M8 28h48" stroke="currentColor" strokeWidth="2" opacity="0.4"/>
              <line x1="32" y1="28" x2="32" y2="44" stroke="currentColor" strokeWidth="2" opacity="0.5"/>
              <circle cx="32" cy="48" r="4" fill="#f97316" opacity="0.8"/>
            </svg>
            {/* Coniglio */}
            <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/3 text-2xl animate-hop">
              🐰
            </span>
          </div>
        </div>

        {/* Titolo */}
        <div className="flex flex-col items-center justify-center gap-1">
          <div className="flex items-center justify-center gap-2.5">
            <span className="text-3xl md:text-4xl animate-bounce">🪂</span>
            <span className="text-2xl md:text-4xl font-extrabold bg-gradient-to-r from-orange-400 via-orange-500 to-amber-500 bg-clip-text text-transparent drop-shadow-lg">
              Meteo dei Conigli
            </span>
            <span className="text-2xl md:text-3xl animate-pulse">🪂</span>
          </div>
          <p className="text-sm md:text-base font-medium text-gray-500">
            Previsioni per volo libero - Open-Meteo - SHV FSVL Style
          </p>
        </div>

        {/* Coniglio destro con parapendio */}
        <div className="hidden sm:flex flex-col items-center animate-float-right">
          <div className="relative">
            {/* Parapendio */}
            <svg className="w-16 h-16 text-orange-400" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M32 8C16 8 4 16 4 28h8c0-8 8-14 20-14s20 6 20 14h8c0-12-12-20-28-20z" fill="currentColor" opacity="0.6"/>
              <path d="M8 28h48" stroke="currentColor" strokeWidth="2" opacity="0.4"/>
              <line x1="32" y1="28" x2="32" y2="44" stroke="currentColor" strokeWidth="2" opacity="0.5"/>
              <circle cx="32" cy="48" r="4" fill="#f97316" opacity="0.8"/>
            </svg>
            {/* Coniglio */}
            <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/3 text-2xl animate-hop" style={{ animationDelay: '0.3s' }}>
              🐰
            </span>
          </div>
        </div>
      </div>

      {/* Animazioni mobile */}
      <div className="flex sm:hidden items-center justify-center gap-2 mt-2">
        <span className="text-xl animate-hop">🐰</span>
        <span className="text-lg text-orange-400 font-bold">🪂</span>
        <span className="text-xl animate-hop" style={{ animationDelay: '0.3s' }}>🐰</span>
      </div>
    </header>
  );
};