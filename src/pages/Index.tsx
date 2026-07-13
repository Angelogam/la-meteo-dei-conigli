{/* Coniglio sinistro con paracadute — accanto al titolo */}
  <div className="flex flex-col items-center mr-2 animate-float-left">
    <div className="relative w-14 h-16 flex items-center justify-center">
      {/* Paracadute realistico a strisce rosse, gialle, verdi */}
      <svg viewBox="0 0 60 70" className="w-12 h-14" xmlns="http://www.w3.org/2000/svg">
        {/* Cupola principale con strisce */}
        {/* Striscia rossa superiore */}
        <path d="M 5 28 Q 30 0 55 28 L 5 28 Z" fill="#dc2626" stroke="#b91c1c" strokeWidth="0.5" />
        {/* Striscia gialla centrale */}
        <path d="M 10 32 Q 30 12 50 32 L 48 28 Q 30 10 12 28 Z" fill="#facc15" stroke="#ca8a04" strokeWidth="0.5" />
        {/* Striscia verde inferiore */}
        <path d="M 15 38 Q 30 25 45 38 L 43 34 Q 30 22 17 34 Z" fill="#22c55e" stroke="#16a34a" strokeWidth="0.5" />
        {/* Fettucce — dalla vela al coniglio */}
        <line x1="30" y1="28" x2="30" y2="52" stroke="#a3a3a3" strokeWidth="1.8" />
        <line x1="16" y1="32" x2="30" y2="52" stroke="#a3a3a3" strokeWidth="1.5" />
        <line x1="44" y1="32" x2="30" y2="52" stroke="#a3a3a3" strokeWidth="1.5" />
        {/* Anello di raccordo */}
        <circle cx="30" cy="50" r="3" fill="#a3a3a3" opacity="0.6" />
        {/* Coniglio appeso */}
        <text x="30" y="61" textAnchor="middle" fontSize="13">🐰</text>
      </svg>
    </div>
  </div>

  {/* Titolo centrale */}
  <div className="flex flex-col items-center justify-center">
    <div className="flex items-center gap-2">
      <CloudSun className="w-6 h-6 text-emerald-300" />
      <h1 className="text-xl md:text-2xl font-extrabold bg-gradient-to-r from-emerald-200 to-lime-200 bg-clip-text text-transparent tracking-tight">
        Meteo dei Conigli
      </h1>
    </div>
    <p className="text-xs text-slate-400 font-medium">Previsioni per volo libero</p>
  </div>

  {/* Coniglio destro con paracadute — accanto al titolo */}
  <div className="flex flex-col items-center ml-2 animate-float-right">
    <div className="relative w-14 h-16 flex items-center justify-center">
      {/* Paracadute realistico a strisce rosse, gialle, verdi */}
      <svg viewBox="0 0 60 70" className="w-12 h-14" xmlns="http://www.w3.org/2000/svg">
        {/* Cupola principale con strisce */}
        {/* Striscia rossa superiore */}
        <path d="M 5 28 Q 30 0 55 28 L 5 28 Z" fill="#dc2626" stroke="#b91c1c" strokeWidth="0.5" />
        {/* Striscia gialla centrale */}
        <path d="M 10 32 Q 30 12 50 32 L 48 28 Q 30 10 12 28 Z" fill="#facc15" stroke="#ca8a04" strokeWidth="0.5" />
        {/* Striscia verde inferiore */}
        <path d="M 15 38 Q 30 25 45 38 L 43 34 Q 30 22 17 34 Z" fill="#22c55e" stroke="#16a34a" strokeWidth="0.5" />
        {/* Fettucce — dalla vela al coniglio */}
        <line x1="30" y1="28" x2="30" y2="52" stroke="#a3a3a3" strokeWidth="1.8" />
        <line x1="16" y1="32" x2="30" y2="52" stroke="#a3a3a3" strokeWidth="1.5" />
        <line x1="44" y1="32" x2="30" y2="52" stroke="#a3a3a3" strokeWidth="1.5" />
        {/* Anello di raccordo */}
        <circle cx="30" cy="50" r="3" fill="#a3a3a3" opacity="0.6" />
        {/* Coniglio appeso */}
        <text x="30" y="61" textAnchor="middle" fontSize="13">🐰</text>
      </svg>
    </div>
  </div>