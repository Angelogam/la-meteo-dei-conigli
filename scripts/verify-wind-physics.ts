/* Verifica numerica della fisica del flusso vento (blendFlow + onda unica).
   Eseguita in Node: winds.ts non dipende da runtime Cesium (solo tipi). */
import { blendFlow } from "../src/components/cartina3d/winds";

let fails = 0;
const ok = (cond: boolean, msg: string) => {
  console.log((cond ? "  ✓ " : "  ✗ ") + msg);
  if (!cond) fails++;
};

/* --- 1. VENTURI: cresta vs conca --- */
const base = { fE: 0.3, fN: 0.2, ws: 8, uE: 0.7, uN: 0.7, s: 0.25, rE: -0.7, rN: 0.7, sunAz: 180, sunAlt: 40 };
const crest = blendFlow({ ...base, conv: 300 });
const flat = blendFlow({ ...base, conv: 0 });
const basin = blendFlow({ ...base, conv: -300 });
console.log("1. VENTURI (stesso vento meteo/pendio, ora piena):");
ok(crest.sp > flat.sp, `cresta accelera: ${crest.sp.toFixed(1)} > ${flat.sp.toFixed(1)} km/h`);
ok(basin.sp < flat.sp, `conca rallenta: ${basin.sp.toFixed(1)} < ${flat.sp.toFixed(1)} km/h`);
ok(crest.sp / flat.sp <= 1.24, `maggiorazione crinale sottile (≤+22%): +${((crest.sp / flat.sp - 1) * 100).toFixed(0)}%`);

/* --- 2. ONDA UNICA: banda velocità visiva stretta --- */
const visSpeedOf = (sp: number) => Math.min(380, Math.max(285, 262 + 4.8 * sp)); // v13: rallentata ~30%
const speeds = [0, 5, 10, 15, 20, 30, 45].map(visSpeedOf);
const ratio = Math.max(...speeds) / Math.min(...speeds);
console.log("2. ONDA UNICA (corsa visiva):");
ok(ratio < 1.35, `rapporto corsa max/min = ${ratio.toFixed(2)} (prima ≈ 8.8) — banda ${Math.min(...speeds).toFixed(0)}-${Math.max(...speeds).toFixed(0)} m/s`);

/* --- 3. ANABATICA: sale SOLO dove il versante guarda il sole ---
   uE/uN = VERSO SU il pendio: un versante che GUARDA a sud ha la montagna a
   nord → gradiente verso nord (uN=+1); quello in ombra guarda nord (uN=−1). */
const sunny = blendFlow({ ...base, uE: 0, uN: 1, s: 0.3, sunAz: 180, sunAlt: 45 }); // guarda S, sole a S
const shady = blendFlow({ ...base, uE: 0, uN: -1, s: 0.3, sunAz: 180, sunAlt: 45 }); // guarda N, in ombra
console.log("3. ANABATICA sensibile al sole (pendio forte, meteo debole 8 km/h):");
ok(sunny.up > shady.up, `versante al sole risale (up=${sunny.up.toFixed(2)}) più dell'ombra (up=${shady.up.toFixed(2)})`);
ok(sunny.up > 0.2, `sul versante a sud l'aria SALE (up=${sunny.up.toFixed(2)} > 0.2)`);

/* --- 4. CATABATICA notturna: drena a valle --- */
const night = blendFlow({ ...base, ws: 4, sunAz: 0, sunAlt: -15 });
console.log("4. CATABATICA notturna (meteo debole 4 km/h):");
ok(night.up < 0, `di notte l'aria scende lungo il pendio (up=${night.up.toFixed(2)} < 0)`);

/* --- 5. DEFLESSIONE: parete ripida frontale → il flusso contorna ---
   meteo spinge verso Est (fE=1) contro una montagna a Est: gradiente verso
   Est (uE=+1), muro ripido s=0.5 → il flusso deve ruotare lungo il contorno. */
const wall = blendFlow({ ...base, fE: 1, fN: 0, ws: 20, uE: 1, uN: 0, s: 0.5, rE: 0, rN: 1, sunAz: 180, sunAlt: 10 });
console.log("5. DEFLESSIONE orografica (meteo 20 km/h contro muro ripido):");
ok(Math.abs(wall.dN) > 0.4, `il flusso devia lungo il contorno (dN=${wall.dN.toFixed(2)}, non buca la montagna)`);

/* --- 6. ARIA FERMA: minimo di plausibilità --- */
const calm = blendFlow({ ...base, ws: 0, s: 0.01, uE: 0, uN: 0, rE: 0, rN: 0, sunAlt: -15 });
console.log("6. ARIA FERMA:");
ok(calm.sp >= 2.2, `campo mai nullo (${calm.sp.toFixed(1)} km/h ≥ 2.2: le scie non muoiono)`);

/* --- 7. VENTURI ROBUSTO (suggerimento @gemini-cli, recensione v12): un DEM
   rumoroso può produrre convessità estreme (picchi di raster, salti di
   gradiente): il moltiplicatore deve restare clampato (≤+22% / ≥−12%) e
   continuità con conv=0, mai discontinuità né velocità inverse. --- */
const spikeUp = blendFlow({ ...base, conv: 5000 }); // picco anomalo positivo
const spikeDown = blendFlow({ ...base, conv: -5000 }); // picco anomalo negativo
const nearZero = blendFlow({ ...base, conv: 5 });
console.log("7. VENTURI robusto su DEM rumoroso (suggerimento @gemini-cli):");
ok(spikeUp.sp / flat.sp <= 1.24, `picco +5000 m clampato: +${((spikeUp.sp / flat.sp - 1) * 100).toFixed(0)}% (≤+24%)`);
ok(spikeDown.sp / flat.sp >= 0.86, `conca −5000 m clampata: −${((1 - spikeDown.sp / flat.sp) * 100).toFixed(0)}% (≤−14%)`);
ok(Math.abs(nearZero.sp / flat.sp - 1) < 0.02, `continuità a conv≈0: ${(nearZero.sp / flat.sp).toFixed(3)} ≈ 1`);

/* --- 8. RADIAZIONE DELL'ORA RICHIESTA (open-meteo, «intreccio dei dati»):
   stessa geometria, ore diverse → la brezza segue i W/m² simulati:
   700 W/m² (pieno sole) molto più debole a 120 W/m² (nubi dense). --- */
const radFull = blendFlow({ ...base, rad: 700 });
const radLow = blendFlow({ ...base, rad: 120 });
console.log("8. RADIAZIONE dell'ora (open-meteo W/m²):");
ok(radFull.sp > radLow.sp * 1.25, `700 W/m² spinge (${radFull.sp.toFixed(1)}) molto più di 120 W/m² (${radLow.sp.toFixed(1)})`);
const cloudHeavy = blendFlow({ ...base, cloudPct: 95 });
ok(cloudHeavy.sp < flat.sp, `nubi 95% indeboliscono (${cloudHeavy.sp.toFixed(1)} < ${flat.sp.toFixed(1)})`);

/* --- 9. INERCIA TERMICA (manuali: la brezza matura 2-3 h dopo l'alba):
   a sole basso (8°) l'anabatica è ancora debole, a 35° piena. Si legge sulla
   VELOCITÀ (sp), la direzione sale già in entrambi i casi. --- */
const early = blendFlow({ ...base, uE: 0, uN: 1, s: 0.3, sunAz: 180, sunAlt: 8 });
const late = blendFlow({ ...base, uE: 0, uN: 1, s: 0.3, sunAz: 180, sunAlt: 35 });
console.log("9. INERCIA termica (lag dopo l'alba):");
ok(late.sp > early.sp * 1.15, `sole 35° → ${late.sp.toFixed(1)} km/h spinge più di 8° → ${early.sp.toFixed(1)} km/h`);
ok(late.up > 0.2 && early.up > 0.2, `in entrambi i casi l'aria sale (up ${early.up.toFixed(2)} → ${late.up.toFixed(2)})`);

/* --- 10. CATABATICA che CEDE nella notte profonda (Springer BLM 2023):
   dopo il tramonto piena (sole −8°), verso le 3 di notte indebolisce (−20°):
   meno drenaggio lungo il pendio (up×sp), ma SEMPRE drenaggio (<0). --- */
const dusk = blendFlow({ ...base, ws: 4, sunAlt: -8 });
const deepNight = blendFlow({ ...base, ws: 4, sunAlt: -20 });
const downDusk = -dusk.up * dusk.sp;
const downDeep = -deepNight.up * deepNight.sp;
console.log("10. CATABATICA profonda notte:");
ok(downDeep < downDusk * 0.95, `a −20° drena ${downDeep.toFixed(1)} km/h < a −8° ${downDusk.toFixed(1)} km/h`);
ok(deepNight.up < 0, `resta drenaggio (up=${deepNight.up.toFixed(2)} < 0)`);

console.log(fails === 0 ? "\nTUTTI I TEST FISICA PASSATI ✓" : `\n${fails} TEST FALLITI ✗`);
process.exit(fails === 0 ? 0 : 1);
