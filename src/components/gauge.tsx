"use client";

/**
 * Gauge stile dashboard: anelli di progresso, semicircolare per la pressione
 * e rosa dei venti animata per la direzione del vento al decollo.
 */

/** anello di progresso con valore al centro */
export function RingGauge({
  value, min, max, size = 74, width = 9, from, to, track = "rgba(255,255,255,.12)", gradientId,
}: {
  value: number | null;
  min: number;
  max: number;
  size?: number;
  width?: number;
  from: string;
  to: string;
  track?: string;
  gradientId?: string;
}) {
  const uid = gradientId ?? `rg-${Math.round(min)}-${Math.round(max)}`.replace(/\W/g, "");
  const r = (size - width) / 2 - 1;
  const c = 2 * Math.PI * r;
  const frac = value == null ? 0 : Math.max(0, Math.min(1, (value - min) / (max - min || 1)));
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true" className="gg-ring">
      <defs>
        <linearGradient id={uid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={from} />
          <stop offset="1" stopColor={to} />
        </linearGradient>
      </defs>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={width} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={`url(#${uid})`} strokeWidth={width} strokeLinecap="round"
        strokeDasharray={`${(c * frac).toFixed(2)} ${c.toFixed(2)}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </svg>
  );
}

/** semicircolare con ago per la pressione */
export function SemiGauge({ value, min = 970, max = 1050, size = 132 }: { value: number | null; min?: number; max?: number; size?: number }) {
  const h = Math.round(size / 2 + 14);
  const cx = size / 2, cy = size / 2 + 4, r = size / 2 - 14;
  const arc = (a0: number, a1: number, radius: number): string => {
    const p = (a: number): [number, number] => [cx + radius * Math.cos((a * Math.PI) / 180), cy - radius * Math.sin((a * Math.PI) / 180)];
    const [x0, y0] = p(a0), [x1, y1] = p(a1);
    return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${radius} ${radius} 0 0 0 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
  };
  const frac = value == null ? null : Math.max(0, Math.min(1, (value - min) / (max - min || 1)));
  // angoli: 180° (sinistra) → 0° (destra)
  const angle = frac == null ? 180 : 180 - frac * 180;
  const needle = (a: number, radius: number): string => {
    const x = cx + radius * Math.cos((a * Math.PI) / 180), y = cy - radius * Math.sin((a * Math.PI) / 180);
    return `${x.toFixed(2)} ${y.toFixed(2)}`;
  };
  return (
    <svg width={size} height={h} viewBox={`0 0 ${size} ${h}`} aria-hidden="true" className="gg-semi">
      <defs>
        <linearGradient id="gg-pressure" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#7dd3fc" />
          <stop offset="0.55" stopColor="#a5f3a0" />
          <stop offset="1" stopColor="#fbbf24" />
        </linearGradient>
      </defs>
      <path d={arc(180, 0, r)} fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="9" strokeLinecap="round" />
      {frac != null && <path d={arc(180, angle, r)} fill="none" stroke="url(#gg-pressure)" strokeWidth="9" strokeLinecap="round" />}
      {frac != null && (
        <g style={{ transform: `rotate(${-(180 - angle)}deg)`, transformOrigin: `${cx}px ${cy}px`, transition: "transform .5s ease" }}>
          <polygon points={`${needle(180, r - 4)} ${needle(176, r - 18)} ${needle(184, r - 18)}`} fill="#fbbf24" />
        </g>
      )}
      <circle cx={cx} cy={cy} r="4" fill="#fbbf24" />
    </svg>
  );
}

/** rosa dei venti con ago che ruota verso la provenienza del vento */
export function WindRose({ dir, size = 78 }: { dir: number | null; size?: number }) {
  const safe = dir == null ? 0 : ((dir % 360) + 360) % 360;
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" aria-hidden="true" className="gg-rose">
      <circle cx="40" cy="40" r="34" fill="rgba(10,22,38,.5)" stroke="rgba(255,255,255,.14)" strokeWidth="1.5" />
      <circle cx="40" cy="40" r="26" fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="1" />
      {[["N", 40, 14], ["O", 12, 44], ["E", 68, 44], ["S", 40, 74]].map(([t, x, y]) => (
        <text key={t as string} x={x as number} y={y as number} fontSize="9.5" fontWeight="800" fill="rgba(226,240,252,.75)" textAnchor="middle" fontFamily="inherit">{t}</text>
      ))}
      <g style={{ transform: `rotate(${safe}deg)`, transformOrigin: "40px 40px", transition: "transform .6s ease" }}>
        <polygon points="40,12 45.5,40 40,34 34.5,40" fill="#f87171" />
        <polygon points="40,68 45.5,40 34.5,40" fill="rgba(255,255,255,.85)" />
      </g>
      <circle cx="40" cy="40" r="3.2" fill="#fff" />
    </svg>
  );
}
