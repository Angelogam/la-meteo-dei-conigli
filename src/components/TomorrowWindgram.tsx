character in legend text">
      {/* Legenda */}
      <div className="flex items-center gap-6 mt-4 text-xs text-slate-400 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ background: "linear-gradient(90deg, #2ecc71, #f1c40f, #e67e22, #e74c3c)" }} />
          <span>Vento: verde ≤5 · giallo ≤10 · arancio ≤20 · rosso >20 km/h</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-white/80 border border-slate-500" />
          <span>Bianco opaco = copertura nuvole (più opaco = più nuvole)</span>
        </div>
        <div className="flex items-center gap-2">
          <span>➤ Freccia = direzione vento (da dove viene)</span>
        </div>
        {thermalBase !== null && (
          <div className="flex items-center gap-2 text-emerald-300">
            <span className="font-bold">✈ Base termiche stimata: {thermalBase} m</span>
          </div>
        )}
      </div>