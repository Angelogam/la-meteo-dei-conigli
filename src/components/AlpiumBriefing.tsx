{/* Fixed: changed `</g` to `</g>` to properly close the SVG group tag */}
{forecasts.map((h, i) => {
              const cloudY = yFromAlt(h.thermalBase + 200);
              return (
                <g key={`cu-${h.hour}`} transform={`translate(${xFromHour(i)}, ${cloudY})`}>
                  <path d="M -14,1 A 5,5 0 0,1 -6,-4 A 8,8 0 0,1 6,-5 A 5,5 0 0,1 6,-5 A 5,5 0 0,1 14,0 A 4,4 0 0,1 11,5 L -11,5 A 4,4 0 0,1 -14,1 Z" 
                    fill={isRain ? "#94a3b8" : "white"} stroke="#475569" strokeWidth="1.2" filter="drop-shadow(0 1px 2px rgba(0,0,0,0.1))"/>
                  <text x="0" y="3" fill={isRain ? "#0284c7" : "#1e293b"} fontSize="8" fontWeight="800" textAnchor="middle" fontFamily="monospace">
                    {isRain ? "🌧" : `${h.cloudCover}%`}
                  </text>
                </g>
              );
            })}