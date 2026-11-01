"use client";

import "./paraglider-hero.css";

function Glider({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 150 82" aria-hidden="true" focusable="false">
      <path className="paraglider-wing" d="M12 27 Q75 -8 138 27 Q76 43 12 27 Z" />
      <path className="paraglider-wing-seam" d="M12 27 Q75 43 138 27 M35 20 L47 31 M58 15 L65 33 M82 15 L83 33 M105 20 L99 31" />
      <path className="paraglider-line" d="M28 29 L68 58 M122 29 L82 58 M49 34 L68 58 M101 34 L82 58" />
      <circle className="paraglider-pilot-head" cx="75" cy="57" r="4" />
      <path className="paraglider-pilot" d="M75 61 L75 70 M75 64 L67 68 M75 64 L83 68 M75 70 L69 77 M75 70 L81 77" />
    </svg>
  );
}

export default function ParagliderHero() {
  return (
    <div className="paraglider-hero-scene" aria-hidden="true">
      <div className="paraglider-sun-halo" />
      <div className="paraglider-cloud paraglider-cloud--one" />
      <div className="paraglider-cloud paraglider-cloud--two" />
      <svg className="paraglider-mountains" viewBox="0 0 1600 420" preserveAspectRatio="xMidYMax slice">
        <path className="paraglider-mountain-back" d="M0 280 L145 145 L230 218 L390 65 L530 230 L675 115 L830 260 L1000 82 L1170 235 L1325 105 L1500 235 L1600 155 L1600 420 L0 420 Z" />
        <path className="paraglider-snow" d="M340 116 L390 65 L443 128 L407 116 L390 135 L372 112 Z M950 132 L1000 82 L1051 133 L1018 120 L1001 143 L982 121 Z M1284 143 L1325 105 L1366 150 L1338 139 L1325 155 L1310 137 Z" />
        <path className="paraglider-mountain-front" d="M0 330 L185 222 L330 303 L520 185 L690 325 L875 210 L1065 328 L1235 195 L1435 315 L1540 240 L1600 275 L1600 420 L0 420 Z" />
        <path className="paraglider-ridge" d="M0 330 L185 222 L330 303 L520 185 L690 325 L875 210 L1065 328 L1235 195 L1435 315 L1540 240 L1600 275" />
      </svg>
      <Glider className="paraglider-flyer paraglider-flyer--one" />
      <Glider className="paraglider-flyer paraglider-flyer--two" />
      <Glider className="paraglider-flyer paraglider-flyer--three" />
      <div className="paraglider-foreground-ridge" />
    </div>
  );
}
