"use client";

/**
 * DEBUG TEST — Verifica che i dati reali di Open-Meteo siano corretti
 * Esegui: fetch('https://api.open-meteo.com/v1/forecast?latitude=44.2587&longitude=7.7943&hourly=temperature_2m,dewpoint_2m,wind_speed_10m,wind_direction_10m,wind_gusts_10m,precipitation,cloudcover,pressure_msl,uv_index,weathercode,soil_temperature_0_to_7cm,soil_moisture_0_to_7cm&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max&timezone=Europe/Rome&forecast_days=5')
 */

export function debugMeteoData(data: any) {
  if (!data) {
    console.error("❌ DEBUG: NESSUN DATO!");
    return false;
  }

  const errors: string[] = [];

  // 1. Verifica struttura base
  if (!data.hourly) { errors.push("Mancano dati orari"); }
  if (!data.daily) { errors.push("Mancano dati giornalieri"); }
  
  if (errors.length > 0) {
    console.error("❌ DEBUG METEO — ERRORI:", errors.join(", "));
    return false;
  }

  // 2. Verifica temperature (devono essere realistiche per il Piemonte)
  const temps = data.hourly.temperature_2m?.filter((t: any) => t != null) || [];
  if (temps.length === 0) {
    errors.push("Nessuna temperatura disponibile");
  } else {
    const minT = Math.min(...temps);
    const maxT = Math.max(...temps);
    console.log(`✅ Temperature: ${minT}°C ~ ${maxT}°C (${temps.length} valori)`);
    if (minT < -20 || maxT > 50) {
      errors.push(`Temperature non realistiche: ${minT}°C ~ ${maxT}°C`);
    }
  }

  // 3. Verifica vento
  const winds = data.hourly.wind_speed_10m?.filter((w: any) => w != null) || [];
  if (winds.length === 0) {
    errors.push("Nessun dato vento");
  } else {
    const maxWind = Math.max(...winds);
    const avgWind = winds.reduce((s: number, w: number) => s + w, 0) / winds.length;
    console.log(`✅ Vento: media ${avgWind.toFixed(1)} km/h, max ${maxWind} km/h (${winds.length} valori)`);
  }

  // 4. Verifica precipitazioni
  const precips = data.hourly.precipitation?.filter((p: any) => p != null) || [];
  if (precips.length > 0) {
    const totPrecip = precips.reduce((s: number, p: number) => s + p, 0);
    console.log(`✅ Precipitazioni totali: ${totPrecip.toFixed(1)} mm`);
  }

  // 5. Verifica giorni
  const days = data.daily.time?.length || 0;
  console.log(`✅ Giorni previsti: ${days}`);

  // 6. Verifica weather codes
  const codes = data.hourly.weathercode?.filter((c: any) => c != null) || [];
  if (codes.length > 0) {
    const uniqueCodes = [...new Set(codes)];
    console.log(`✅ Weather codes: [${uniqueCodes.join(", ")}]`);
  }

  // 7. Verifica cloud cover
  const clouds = data.hourly.cloudcover?.filter((c: any) => c != null) || [];
  if (clouds.length > 0) {
    const avgCloud = clouds.reduce((s: number, c: number) => s + c, 0) / clouds.length;
    console.log(`✅ Nuvolosità media: ${avgCloud.toFixed(0)}%`);
  }

  // 8. Verifica dew point
  const dews = data.hourly.dewpoint_2m?.filter((d: any) => d != null) || [];
  if (dews.length > 0) {
    console.log(`✅ Dew points: ${dews.length} valori`);
  }

  if (errors.length > 0) {
    console.error("❌ DEBUG METEO — ERRORI:", errors.join(", "));
    return false;
  }

  console.log("✅✅✅ DEBUG METEO — TUTTI I DATI OK!");
  return true;
}