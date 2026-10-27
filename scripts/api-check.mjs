// Standalone API diagnostic - checks live Open-Meteo endpoints used by the app
const DECOLLI = [
  { id: "malanotte", name: "Malanotte", lat: 44.25874571728482, lon: 7.794304664370852, alt: 1740 },
  { id: "colle-di-tenda", name: "Colle di Tenda", lat: 44.15093973937469, lon: 7.569262924652476, alt: 1990 },
  { id: "boves", name: "Boves", lat: 44.32113720462757, lon: 7.544697617792515, alt: 900 },
  { id: "monte-male-dronero", name: "Monte Male – Dronero", lat: 44.43163071064606, lon: 7.362886778152897, alt: 950 },
  { id: "iretta", name: "Iretta", lat: 44.49893744007536, lon: 7.382036612070795, alt: 1050 },
  { id: "pratoni-di-val-mala", name: "Pratoni di Val Mala", lat: 44.50780117336976, lon: 7.346618978966227, alt: 1400 },
  { id: "monte-birrone", name: "Monte Birrone", lat: 44.5398927839592, lon: 7.25293945830122, alt: 2131 },
  { id: "colle-dell-agnello", name: "Colle dell'Agnello", lat: 44.68282592463814, lon: 6.978200601250462, alt: 2748 },
  { id: "pian-mune-seggiovia", name: "Pian Munè – Seggiovia", lat: 44.63861029121272, lon: 7.230889474766025, alt: 1870 },
  { id: "pian-mune-bric-lombatera", name: "Pian Munè – Bric Lombatera", lat: 44.65736521807557, lon: 7.260017009542715, alt: 1350 },
  { id: "martiniana-po", name: "Martiniana Po", lat: 44.60695265332723, lon: 7.38322612877631, alt: 1400 },
  { id: "rucas-alto", name: "Rucas alto", lat: 44.74213930591463, lon: 7.220118689737356, alt: 1500 },
  { id: "montoso-decollo-basso", name: "Montoso – decollo basso", lat: 44.7643723437882, lon: 7.249757926713178, alt: 1250 },
  { id: "monte-vandalino", name: "Monte Vandalino", lat: 44.83671231480542, lon: 7.173866924055591, alt: 2120 },
  { id: "pian-dell-alpe", name: "Pian dell'Alpe", lat: 45.06396153999711, lon: 7.028266530872771, alt: 1990 },
  { id: "roletto-piggi", name: "Roletto – Piggi", lat: 44.93249288285819, lon: 7.310959031722244, alt: 820 },
  { id: "piossasco-monte-s-giorgio", name: "Piossasco – Monte S. Giorgio", lat: 44.99671840144012, lon: 7.44800217882953, alt: 673 },
  { id: "truccetti", name: "Truccetti", lat: 45.07973511679036, lon: 7.342018342463826, alt: 900 },
  { id: "val-della-torre", name: "Val della Torre", lat: 45.16262748864921, lon: 7.463716167415302, alt: 970 },
  { id: "rocca-canavese-m-della-neve", name: "Rocca Canavese – M. della Neve", lat: 45.32757754837493, lon: 7.572793582322621, alt: 1100 },
  { id: "santa-elisabetta", name: "Santa Elisabetta", lat: 45.4182733880574, lon: 7.641945041749434, alt: 1000 },
  { id: "santa-elisabetta-alto", name: "Santa Elisabetta alto", lat: 45.44019393073506, lon: 7.648025947229948, alt: 1400 },
  { id: "monte-cavallaria", name: "Monte Cavallaria", lat: 45.51729363773779, lon: 7.798808327293107, alt: 1430 },
  { id: "andrate", name: "Andrate", lat: 45.55063933418272, lon: 7.880775591143394, alt: 1000 },
];

const BASE = "https://api.open-meteo.com/v1/forecast";

// Params copied from weatherService.ts
const HOURLY_PARAMS = [
  "temperature_2m","relative_humidity_2m","dew_point_2m","apparent_temperature","precipitation","precipitation_probability","weather_code","pressure_msl","surface_pressure","cloud_cover","cloud_cover_low","cloud_cover_mid","cloud_cover_high","wind_speed_10m","wind_direction_10m","wind_gusts_10m","uv_index","shortwave_radiation","direct_radiation","sunshine_duration","temperature_80m","temperature_120m","wind_speed_80m","wind_direction_80m","wind_speed_120m","wind_direction_120m","wind_speed_180m","wind_direction_180m","wind_speed_300m","wind_direction_300m","wind_speed_600m","wind_direction_600m","wind_speed_1000m","wind_direction_1000m","wind_speed_1500m","wind_direction_1500m","wind_speed_2000m","wind_direction_2000m","wind_speed_2500m","wind_direction_2500m","wind_speed_3000m","wind_direction_3000m","cape","convective_inhibition","lifted_index",
].join(",");

const DAILY_PARAMS = [
  "weather_code","temperature_2m_max","temperature_2m_min","temperature_2m_mean","apparent_temperature_max","apparent_temperature_min","sunrise","sunset","daylight_duration","sunshine_duration","precipitation_sum","rain_sum","snowfall_sum","precipitation_hours","precipitation_probability_max","wind_speed_10m_max","wind_gusts_10m_max","wind_direction_10m_dominant","shortwave_radiation_sum","uv_index_max",
].join(",");

const CURRENT = "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,showers,snowfall,weather_code,cloud_cover,pressure_msl,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m";

function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }

async function checkService(lat, lon) {
  const url = `${BASE}?latitude=${lat}&longitude=${lon}&hourly=${HOURLY_PARAMS}&daily=${DAILY_PARAMS}&current=${CURRENT}&timezone=Europe/Rome&forecast_days=3`;
  const t0 = Date.now();
  const res = await fetch(url);
  const ms = Date.now() - t0;
  const json = await res.json();
  return { res, json, ms, url };
}

// VentiInterpolati endpoint
async function checkVenti(lat, lon, day) {
  const url = `${BASE}?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,wind_speed_10m,wind_direction_10m,wind_gusts_10m,wind_speed_925hPa,wind_direction_925hPa,wind_speed_850hPa,wind_direction_850hPa,wind_speed_700hPa,wind_direction_700hPa,wind_speed_600hPa,wind_direction_600hPa&timezone=Europe/Rome&start_date=${day}&end_date=${day}`;
  const res = await fetch(url);
  return res.ok;
}

// Windgram endpoint (historical style)
async function checkWindgram(lat, lon, day) {
  const hp = ["temperature_2m","relative_humidity_2m","dew_point_2m","precipitation","cloud_cover","cloud_cover_low","cloud_cover_mid","cloud_cover_high","wind_speed_10m","wind_direction_10m","wind_gusts_10m","wind_speed_80m","wind_direction_80m","wind_speed_120m","wind_direction_120m","wind_speed_180m","wind_direction_180m","wind_speed_925hPa","wind_direction_925hPa","wind_speed_850hPa","wind_direction_850hPa","wind_speed_700hPa","wind_direction_700hPa","wind_speed_600hPa","wind_direction_600hPa","wind_speed_500hPa","wind_direction_500hPa","temperature_80m","temperature_120m","surface_pressure","shortwave_radiation","freezing_level_height","cape","lifted_index","convective_inhibition"].join(",");
  const url = `${BASE}?latitude=${lat}&longitude=${lon}&hourly=${hp}&timezone=Europe/Rome&start_date=${day}&end_date=${day}`;
  const res = await fetch(url);
  return res.ok;
}

function realisticCheck(json) {
  const issues = [];
  const temps = json.hourly.temperature_2m || [];
  const winds = json.hourly.wind_speed_10m || [];
  const clouds = json.hourly.cloud_cover || [];
  if (temps.length) {
    const maxT = Math.max(...temps.filter(t=>t!=null));
    const minT = Math.min(...temps.filter(t=>t!=null));
    if (maxT > 50) issues.push(`Temp max non realistica: ${maxT}°C`);
    if (minT < -35) issues.push(`Temp min non realistica: ${minT}°C`);
  }
  if (winds.length) {
    const maxW = Math.max(...winds.filter(w=>w!=null));
    if (maxW > 150) issues.push(`Vento max non realistico: ${maxW} km/h`);
  }
  if (clouds.length) {
    const bad = clouds.filter(c=>c!=null && (c<0||c>100));
    if (bad.length) issues.push(`Nuvolosità fuori range: ${bad.length} valori`);
  }
  return issues;
}

async function main() {
  const report = { testedAt: new Date().toISOString(), decolli: DECOLLI.length, results: [], summary: {} };
  let totalOk = 0, totalFail = 0, ventiOk = 0, windgramOk = 0;
  const allIssues = [];
  const sample = DECOLLI.slice(0, 10); // testa i primi 10 per velocità (stesso endpoint per tutti)

  const today = new Date().toISOString().split("T")[0];
  for (const d of sample) {
    try {
      const r = await checkService(d.lat, d.lon);
      const issues = realisticCheck(r.json);
      const ok = r.res.ok && r.json.hourly && r.json.daily && r.json.current;
      if (ok) totalOk++; else totalFail++;
      if (issues.length) allIssues.push(`${d.name}: ${issues.join("; ")}`);
      const venti = await checkVenti(d.lat, d.lon, today);
      if (venti) ventiOk++;
      const wg = await checkWindgram(d.lat, d.lon, today);
      if (wg) windgramOk++;
      report.results.push({ id: d.id, name: d.name, http: r.res.status, ms: r.ms, ok, hourly: r.json.hourly?.time?.length||0, daily: r.json.daily?.time?.length||0, current: !!r.json.current, issues });
      await sleep(300);
    } catch (e) {
      totalFail++;
      report.results.push({ id: d.id, name: d.name, error: String(e) });
    }
  }

  report.summary = { serviceOk: totalOk, serviceFail: totalFail, ventiOk, windgramOk, totalIssues: allIssues.length, issues: allIssues };
  console.log(JSON.stringify(report, null, 2));
}

main();