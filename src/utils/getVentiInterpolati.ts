"use client";

export interface QuotaVento {
  speed: number;
  dir: number;
}

export interface VentiInterpolatiPerOra {
  ora: number;
  quote: Record<number, QuotaVento>;
  gust: number;
}

export interface VentiInterpolatiData {
  giorno: string;
  lat: number;
  lon: number;
  quotaDecollo: number;
  ventoOrario: VentiInterpolatiPerOra[];
}

export async function getVentiInterpolati(lat: number, lon: number, quotaDecollo: number, day: string): Promise<VentiInterpolatiData> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=wind_speed_10m,wind_direction_10m,wind_gusts_10m,wind_speed_925hPa,wind_direction_925hPa,wind_speed_850hPa,wind_direction_850hPa,wind_speed_700hPa,wind_direction_700hPa,wind_speed_600hPa,wind_direction_600hPa&timezone=Europe/Rome&start_date=${day}&end_date=${day}`;

  const res = await fetch(url);
  const data = await res.json();

  const hours: string[] = data.hourly.time;

  // Quote reali dei livelli Open-Meteo
  const livelli = [
    { quota: quotaDecollo, speed: data.hourly.wind_speed_10m, dir: data.hourly.wind_direction_10m },
    { quota: 760, speed: data.hourly.wind_speed_925hPa, dir: data.hourly.wind_direction_925hPa },
    { quota: 1450, speed: data.hourly.wind_speed_850hPa, dir: data.hourly.wind_direction_850hPa },
    { quota: 3000, speed: data.hourly.wind_speed_700hPa, dir: data.hourly.wind_direction_700hPa },
    { quota: 4000, speed: data.hourly.wind_speed_600hPa, dir: data.hourly.wind_direction_600hPa }
  ];

  // Quote ogni 250 metri
  const quoteInterpolazione: number[] = [];
  for (let q = quotaDecollo; q <= 4000; q += 250) {
    quoteInterpolazione.push(q);
  }

  const ventoOrario: VentiInterpolatiPerOra[] = [];

  for (let i = 0; i < hours.length; i++) {
    const ora = Number(hours[i].split("T")[1].split(":")[0]);
    if (ora >= 9 && ora <= 19) {
      const quote: Record<number, QuotaVento> = {};

      quoteInterpolazione.forEach((q) => {
        // Trova i due livelli più vicini
        let lower = livelli[0];
        let upper = livelli[livelli.length - 1];

        for (let j = 0; j < livelli.length - 1; j++) {
          if (livelli[j].quota <= q && livelli[j + 1].quota >= q) {
            lower = livelli[j];
            upper = livelli[j + 1];
            break;
          }
        }

        // Interpolazione lineare
        const ratio = (q - lower.quota) / (upper.quota - lower.quota);
        const speed = lower.speed[i] + ratio * (upper.speed[i] - lower.speed[i]);
        const dir = lower.dir[i] + ratio * (upper.dir[i] - lower.dir[i]);

        quote[q] = {
          speed: Math.round(speed),
          dir: Math.round(dir)
        };
      });

      ventoOrario.push({
        ora,
        quote,
        gust: data.hourly.wind_gusts_10m[i]
      });
    }
  }

  return {
    giorno: day,
    lat,
    lon,
    quotaDecollo,
    ventoOrario
  };
}