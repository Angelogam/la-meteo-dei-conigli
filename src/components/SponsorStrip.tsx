"use client";

import { useMemo } from "react";
import "./sponsor-strip.css";

/* SPONSOR — banda simpatica sotto la hero: i marchi che sostengono il sito
   scorrono piano in un nastro infinito (pausa al passaggio del mouse,
   statico con movimento ridotto). Il logo rosso (ProShop Flying) apre
   il giro come «sponsor di punta». Nessun link commerciale spinto:
   solo un grazie visibile, come chiede il pilota. */

const SPONSORS: Array<{ src: string; name: string; top?: boolean; small?: boolean }> = [
  { src: "/sponsor/proshop-flying.png", name: "ProShop Flying", top: true },
  /* badge rotondo SKY Paragliders: quadrato, senza il ridimensionamento
     riempirebbe tutta la targhetta — «small» lo tiene dentro la cornice bianca */
  { src: "/sponsor/shy-paragliders.png", name: "SKY Paragliders", small: true },
  { src: "/sponsor/kortel-design.png", name: "Kortel Design" },
  { src: "/sponsor/up-airborne.png", name: "UP Airborne Sensations" },
];

export default function SponsorStrip() {
  /* doppia copia del giro per lo scorrimento continuo senza salti */
  const loop = useMemo(() => [...SPONSORS, ...SPONSORS], []);

  return (
    <aside className="sponsor-strip" aria-label="Sponsor che sostengono il sito">
      <p className="sponsor-strip__title">
        <span aria-hidden="true">🪂</span>
        Con il sostegno di
        <span className="sponsor-strip__heart" aria-hidden="true">❤</span>
      </p>
      <div className="sponsor-strip__viewport">
        <div className="sponsor-strip__track">
          {loop.map((s, i) => (
            <span
              key={`${s.name}-${i}`}
              className={`sponsor-strip__card${s.top && i < SPONSORS.length ? " sponsor-strip__card--top" : ""}${s.small ? " sponsor-strip__card--small" : ""}`}
              title={s.top ? `${s.name} — sponsor di punta` : s.name}
            >
              {s.top && i < SPONSORS.length && <em className="sponsor-strip__ribbon">SPONSOR</em>}
              <img src={s.src} alt={s.name} loading="lazy" decoding="async" draggable={false} />
            </span>
          ))}
        </div>
      </div>
    </aside>
  );
}
