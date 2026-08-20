<div className="diff">
    <h3>Changes in PrevisioniGiornaliere.tsx</h3>
    <p>Added red text for rainy days and improved flight score logic</p>
  </div>
  <div className="code">
    <pre><code>
      // In the button component (dayButtons.push)
      dayButtons.push(
        <button
          key={idx}
          onClick={() => onSelectDay(idx)}
          className={`text-left transition-all border-2 cursor-pointer p-4 rounded-xl flex-1 min-w-[140px] ${
            isActive
              ? "border-emerald-400 bg-emerald-900/40 shadow-lg"
              : "border-slate-700/50 bg-slate-800/40 hover:border-slate-600"
          } ${
            dayData[idx]?.precipitation > 0.5  // Rain check
              ? "text-red-400"  // Red text for rain
              : ""
          }`}
        >
          {/* Existing content */}
        </button>
      </div>
    </code>
  </div>