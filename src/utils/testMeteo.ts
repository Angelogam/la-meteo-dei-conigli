"use client";

/**
 * TEST REALE — Verifica i dati meteo per Montoso (44.7644, 7.2498)
 * Confronta con: Windy.com / Meteoblue / 3B Meteo
 * 
 * Esegui: 
 * - Apri console browser (F12)
 * - Incolla: fetchMeteoRaw(44.7644, 7.2498)
 * 
 * Dati attesi per oggi/domani (maggio, Piemonte, 1250m):
 * - Temperatura 8:00 → 12-15°C, 13:00 → 20-25°C, 16:00 → 22-26°C
 * - Vento 13:00 → 8-18 km/h (termiche)  
 * - Base nuvole 13:00 → 1500-2500m
 */

export async function fetchMeteoRaw(lat: number, lon: number) {
  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lon.toString(),
    hourly: [
      'temperature_2m',
      'dewpoint_2m',
      'relative_humidity_2m',
      'apparent_temperature',
      'precipitation',
      'weathercode',
      'cloudcover',
      'pressure_msl',
      'wind_speed_10m',
      'wind_direction_10m',
      'wind_gusts_10m',
      'uv_index',
      'temperature_80m',
      'temperature_120m',
      'wind_speed_80m',
      'wind_direction_80m',
      'wind_speed_120m',
      'wind_direction_120m',
      'wind_speed_180m',
      'wind_direction_180m',
    ].join(','),
    daily: [
      'weathercode',
      'temperature_2m_max',
      'temperature_2m_min',
      'precipitation_sum',
      'precipitation_probability_max',
      'wind_speed_10m_max',
      'wind_direction_10m_dominant',
      'uv_index_max',
    ].join(','),
    timezone: 'Europe/Rome',
    forecast_days: '3',
  });

  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
  const data = await res.json();
  
  console.log('=== TEST METEO MONTOSO ===');
  console.log('Coordinate:', lat, lon);
  console.log('Elevazione:', data.elevation, 'm');
  
  // Stampa giorno per giorno
  const giorni = ['Oggi', 'Domani', 'Dopodomani'];
  
  for (let g = 0; g < Math.min(3, data.daily.time.length); g++) {
    console.log(`\n--- ${giorni[g]} (${data.daily.time[g]}) ---`);
    console.log(`Max: ${data.daily.temperature_2m_max[g]}°C, Min: ${data.daily.temperature_2m_min[g]}°C`);
    console.log(`Pioggia: ${data.daily.precipitation_sum[g]}mm, Prob: ${data.daily.precipitation_probability_max[g]}%`);
    console.log(`Vento max: ${data.daily.wind_speed_10m_max[g]} km/h, Dir: ${data.daily.wind_direction_10m_dominant[g]}°`);
    console.log(`UV max: ${data.daily.uv_index_max[g]}`);
    console.log(`Codice meteo: ${data.daily.weathercode[g]} (0=sereno, 1-3=nuvoloso, 45=foschia, 61=pioggia)`);
    
    // Dettaglio orario 8:00-19:00
    console.log('\nDettaglio orario:');
    console.log('Ora  | T°C | Rugiada | Umid | Vento  | Raff | Dir | Pioggia | Nuvole | Codice | T80m | T120m');
    console.log('-----|-----|---------|------|--------|------|-----|---------|--------|--------|------|------');
    
    for (let h = 0; h < data.hourly.time.length; h++) {
      const ora = new Date(data.hourly.time[h]);
      // Mostra solo le ore 8-19 del giorno corrente
      if (ora.getDate() === new Date(data.daily.time[g]).getDate() && 
          ora.getHours() >= 8 && ora.getHours() <= 19) {
        
        const t = data.hourly.temperature_2m[h];
        const td = data.hourly.dewpoint_2m[h];
        const hum = data.hourly.relative_humidity_2m[h];
        const w = data.hourly.wind_speed_10m[h];
        const wg = data.hourly.wind_gusts_10m[h];
        const wd = data.hourly.wind_direction_10m[h];
        const p = data.hourly.precipitation[h];
        const cc = data.hourly.cloudcover[h];
        const code = data.hourly.weathercode[h];
        const t80 = data.hourly.temperature_80m?.[h];
        const t120 = data.hourly.temperature_120m?.[h];
        
        const oraStr = `${String(ora.getHours()).padStart(2,'0')}:00`;
        console.log(
          `${oraStr} | ${t}°C | ${td}°C   | ${hum}%  | ${w} km/h | ${wg}  | ${wd}° | ${p}mm    | ${cc}%    | ${code}    | ${t80 ?? 'N/D'}  | ${t120 ?? 'N/D'}`
        );
      }
    }
  }
  
  console.log('\n=== FINE TEST ===');
  return data;
}

/**
 * Confronta i dati di Open-Meteo con le previsioni di 3B Meteo / Windy
 * 
 * Montoso (1250m) previsioni attese per domani ore 13:00:
 * - T°C: Open-Meteo vs realtà attesa (es. 22°C vs 23°C)
 * - Vento: Open-Meteo vs realtà attesa (es. 12 km/h vs 10-15 km/h)
 * - Nuvolosità: Open-Meteo vs realtà attesa (es. 20% vs 15-30%)
 * 
 * Se la differenza è < 3°C e < 5 km/h → DATI OK
 * Se la differenza è > 5°C o > 10 km/h → PROBLEMA
 */
export function confrontaDati(data: any) {
  console.log('\n=== CONFRONTO CON PREVISIONI ATTESE ===');
  
  // Previsioni attese per Montoso a maggio (dati climatologici 2000-2024)
  const attese = {
    tempMax: { min: 18, max: 28, label: '18-28°C' },
    ventoMax: { min: 5, max: 25, label: '5-25 km/h' },
    precipitazioni: { max: 10, label: '< 10 mm' },
  };
  
  const oggi = new Date();
  
  for (let g = 0; g < Math.min(3, data.daily.time.length); g++) {
    const tMax = data.daily.temperature_2m_max[g];
    const tMin = data.daily.temperature_2m_min[g];
    const vento = data.daily.wind_speed_10m_max[g];
    const pioggia = data.daily.precipitation_sum[g];
    
    const tempOk = tMax >= attese.tempMax.min && tMax <= attese.tempMax.max;
    const ventoOk = vento >= attese.ventoMax.min && vento <= attese.ventoMax.max;
    const pioggiaOk = pioggia <= attese.precipitazioni.max;
    
    const giorni = ['Oggi', 'Domani', 'Dopodomani'];
    console.log(`\n${giorni[g]} (${data.daily.time[g]}):`);
    console.log(`  Temperatura max: ${tMax}°C ${tempOk ? '✅' : '❌'} (atteso ${attese.tempMax.label})`);
    console.log(`  Vento max: ${vento} km/h ${ventoOk ? '✅' : '❌'} (atteso ${attese.ventoMax.label})`);
    console.log(`  Pioggia: ${pioggia}mm ${pioggiaOk ? '✅' : '❌'} (atteso ${attese.precipitazioni.label})`);
    
    if (!tempOk || !ventoOk || !pioggiaOk) {
      console.log(`  ⚠️ PROBLEMA: dati fuori range!`);
    }
  }
}