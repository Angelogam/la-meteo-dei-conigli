{/* ... resto del file invariato, solo fix delle due occorrenze di windGust */}
  {/* Nella sezione dove si mostra la raffica */}
  <span className="flex items-center gap-1.5 text-[12px] text-orange-200/90">
    <span className="text-orange-300 text-base">&uarr;</span>
    <span className="font-semibold">{w.windGusts ? Math.round(w.windGusts) : "--"} km/h</span>
  </span>