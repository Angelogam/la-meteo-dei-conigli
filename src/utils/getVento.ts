"use client";

export interface VentoOrario {
  ora: number;
  speed: number;
  dir: number;
  gust: number;
}

export interface VentoData {
  giorno: string;
  lat: number;
  lon: number;
  ventoOrario: VentoOrario[];
  ventoDecollo: number;
  ventoAtterraggio: number;
}

export async function getVento(lat: number, lon: number, day: string): Promise<VentoData> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=wind_speed_10m,wind_direction_10m,wind_gusts_10m&timezone=Europe/Rome&start_date=${day}&end_date=${day}`;

  const res = await fetch(url);
  const data = await res.json();

  const hours: string[] = data.hourly.time;
  const speeds: number[] = data.hourly.wind_speed_10m;
  const dirs: number[] = data.hourly.wind_direction_10m;
  const gusts: number[] = data.hourly.wind_gusts_10m;

  const ventoOrario: VentoOrario[] = [];

  for (let i = 0; i < hours.length; i++) {
    const ora = Number(hours[i].split("T")[1].split(":")[0]);
    if (ora >= 9 && ora <= 19) {
      ventoOrario.push({
        ora,
        speed: speeds[i],
        dir: dirs[i],
        gust: gusts[i]
      });
    }
  }

  return {
    giorno: day,
    lat,
    lon,
    ventoOrario,
    ventoDecollo: speeds[9],
    ventoAtterraggio: speeds[10]
  };
}