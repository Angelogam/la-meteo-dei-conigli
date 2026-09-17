import React, { useMemo, useState } from 'react';
import { Cloud, Droplets } from 'lucide-react';

// ── DATA ──────────────────────────────────────────────────────────────────────
const JSON_DATA: SiteData[] = [
  {
    id: "monte-cavallaria",
    nome: "Monte Cavallaria",
    quota_decollo: 1430,
    hours: [
      "15:00","16:00","17:00","18:00","19:00","20:00","21:00","22:00","23:00","00:00","01:00","02:00","03:00","04:00","05:00","06:00","07:00","08:00","09:00","10:00","11:00","12:00","13:00","14:00",
      "15:00","16:00","17:00","18:00","19:00","20:00","21:00","22:00","23:00","00:00","01:00","02:00","03:00","04:00","05:00","06:00","07:00","08:00","09:00","10:00","11:00","12:00","13:00","14:00",
      "15:00","16:00","17:00","18:00","19:00","20:00","21:00","22:00","23:00","00:00","01:00","02:00","03:00","04:00","05:00","06:00","07:00","08:00","09:00","10:00","11:00","12:00","13:00","14:00"
    ],
    profilo_verticale: [
      { ora: "15:00", livelli: [{ alt: 2, temp: 14.1, wind: 9.1, dir: 146 }, { alt: 50, temp: null, wind: null, dir: null }, { alt: 120, temp: 12.2, wind: 10.6, dir: 156 }, { alt: 1430, temp: 10.7, wind: 12.6, dir: 156 }], cloud: 63, precip: 0 },
      { ora: "16:00", livelli: [{ alt: 2, temp: 13.6, wind: 7.8, dir: 146 }, { alt: 50, temp: null, wind: null, dir: null }, { alt: 120, temp: 12, wind: 8.7, dir: 156 }, { alt: 1430, temp: 10.5, wind: 10.7, dir: 156 }], cloud: 67, precip: 0 },
      { ora: "17:00", livelli: [{ alt: 2, temp: 12.9, wind: 5, dir: 159 }, { alt: 50, temp: null, wind: null, dir: null }, { alt: 120, temp: 11.9, wind: 6.2, dir: 170 }, { alt: 1430, temp: 10.4, wind: 8.2, dir: 170 }], cloud: 70, precip: 0 },
      { ora: "18:00", livelli: [{ alt: 2, temp: 12.2, wind: 2.5, dir: 225 }, { alt: 50, temp: null, wind: null, dir: null }, { alt: 120, temp: 11.9, wind: 2.3, dir: 231 }, { alt: 1430, temp: 10.4, wind: 4.3, dir: 231 }], cloud: 60, precip: 0 },
      { ora: "19:00", livelli: [{ alt: 2, temp: 11.9, wind: 3.3, dir: 311 }, { alt: 50, temp: null, wind: null, dir: null }, { alt: 120, temp: 12.4, wind: 2.2, dir: 351 }, { alt: 1430, temp: 10.9, wind: 4.2, dir: 351 }], cloud: 31, precip: 0 },
      { ora: "20:00", livelli: [{ alt: 2, temp: 11.8, wind: 4.4, dir: 305 }, { alt: 50, temp: null, wind: null, dir: null }, { alt: 120, temp: 12.3, wind: 4.6, dir: 342 }, { alt: 1430, temp: 10.8, wind: 6.6, dir: 342 }], cloud: 0, precip: 0 },
      { ora: "21:00", livelli: [{ alt: 2, temp: 11.8, wind: 4.9, dir: 306 }, { alt: 50, temp: null, wind: null, dir: null }, { alt: 120, temp: 12.4, wind: 5.4, dir: 340 }, { alt: 1430, temp: 10.9, wind: 7.4, dir: 340 }], cloud: 0, precip: 0 },
      { ora: "22:00", livelli: [{ alt: 2, temp: 11.7, wind: 5.5, dir: 302 }, { alt: 50, temp: null, wind: null, dir: null }, { alt: 120, temp: 12.5, wind: 5.5, dir: 337 }, { alt: 1430, temp: 11, wind: 7.5, dir: 337 }], cloud: 2, precip: 0 },
      { ora: "23:00", livelli: [{ alt: 2, temp: 11.6, wind: 5.8, dir: 300 }, { alt: 50, temp: null, wind: null, dir: null }, { alt: 120, temp: 12.4, wind: 5.5, dir: 328 }, { alt: 1430, temp: 10.9, wind: 7.5, dir: 328 }], cloud: 1, precip: 0 },
      { ora: "00:00", livelli: [{ alt: 2, temp: 11.6, wind: 6.5, dir: 304 }, { alt: 50, temp: null, wind: null, dir: null }, { alt: 120, temp: 12.4, wind: 6.8, dir: 335 }, { alt: 1430, temp: 10.9, wind: 8.8, dir: 335 }], cloud: 0, precip: 0 },
      { ora: "01:00", livelli: [{ alt: 2, temp: 11.6, wind: 6.5, dir: 304 }, { alt: 50, temp: null, wind: null, dir: null }, { alt: 120, temp: 12.5, wind: 6.6, dir: 331 }, { alt: 1430, temp: 11, wind: 8.6, dir: 331 }], cloud: 0, precip: 0 },
      { ora: "02:00", livelli: [{ alt: 2, temp: 11.5, wind: 6.2, dir: 306 }, { alt: 50, temp: null, wind: null, dir: null }, { alt: 120, temp: 12.4, wind: 6.4, dir: 333 }, { alt: 1430, temp: 10.9, wind: 8.4, dir: 333 }], cloud: 0, precip: 0 },
      { ora: "03:00", livelli: [{ alt: 2, temp: 11.4, wind: 6.7, dir: 306 }, { alt: 50, temp: null, wind: null, dir: null }, { alt: 120, temp: 12.4, wind: 6.9, dir: 332 }, { alt: 1430, temp: 10.9, wind: 8.9, dir: 332 }], cloud: 56, precip: 0 },
      { ora: "04:00", livelli: [{ alt: 2, temp: 11.3, wind: 6.9, dir: 309 }, { alt: 50, temp: null, wind: null, dir: null }, { alt: 120, temp: 12.4, wind: 7.1, dir: 330 }, { alt: 1430, temp: 10.9, wind: 9.1, dir: 330 }], cloud: 0, precip: 0 },
      { ora: "05:00", livelli: [{ alt: 2, temp: 11.2, wind: 7.1, dir: 311 }, { alt: 50, temp: null, wind: null, dir: null }, { alt: 120, temp: 12.4, wind: 7.9, dir: 330 }, { alt: 1430, temp: 10.9, wind: 9.9, dir: 330 }], cloud: 5, precip: 0 },
      { ora: "06:00", livelli: [{ alt: 2, temp: 11.4, wind: 6.4, dir: 308 }, { alt: 50, temp: null, wind: null, dir: null }, { alt: 120, temp: 12.5, wind: 6.8, dir: 328 }, { alt: 1430, temp: 11, wind: 8.8, dir: 328 }], cloud: 2, precip: 0 },
      { ora: "07:00", livelli: [{ alt: 2, temp: 12.5, wind: 4.3, dir: 318 }, { alt: 50, temp: null, wind: null, dir: null }, { alt: 120, temp: 12.6, wind: 4.8, dir: 333 }, { alt: 1430, temp: 11.1, wind: 6.8, dir: 333 }], cloud: 5, precip: 0 },
      { ora: "08:00", livelli: [{ alt: 2, temp: 14, wind: 2.2, dir: 360 }, { alt: 50, temp: null, wind: null, dir: null }, { alt: 120, temp: 12.8, wind: 2.2, dir: 360 }, { alt: 1430, temp: 11.3, wind: 4.2, dir: 360 }], cloud: 8, precip: 0 },
      { ora: "09:00", livelli: [{ alt: 2, temp: 15.2, wind: 2.3, dir: 72 }, { alt: 50, temp: null, wind: null, dir: null }, { alt: 120, temp: 13, wind: 1.4, dir: 90 }, { alt: 1430, temp: 11.5, wind: 3.4, dir: 90 }], cloud: 11, precip: 0 },
      { ora: "10:00", livelli: [{ alt: 2, temp: 15.8, wind: 3.2, dir: 117 }, { alt: 50, temp: null, wind: null, dir: null }, { alt: 120, temp: 13.2, wind: 3.4, dir: 148 }, { alt: 1430, temp: 11.7, wind: 5.4, dir: 148 }], cloud: 38, precip: 0 },
      { ora: "11:00", livelli: [{ alt: 2, temp: 16.1, wind: 5.2, dir: 146 }, { alt: 50, temp: null, wind: null, dir: null }, { alt: 120, temp: 13.5, wind: 6, dir: 163 }, { alt: 1430, temp: 12, wind: 8, dir: 163 }], cloud: 66, precip: 0 },
      { ora: "12:00", livelli: [{ alt: 2, temp: 16.2, wind: 6.8, dir: 155 }, { alt: 50, temp: null, wind: null, dir: null }, { alt: 120, temp: 13.7, wind: 8.1, dir: 167 }, { alt: 1430, temp: 12.2, wind: 10.1, dir: 167 }], cloud: 93, precip: 0 },
      { ora: "13:00", livelli: [{ alt: 2, temp: 16.4, wind: 7.4, dir: 157 }, { alt: 50, temp: null, wind: null, dir: null }, { alt: 120, temp: 13.9, wind: 9.1, dir: 171 }, { alt: 1430, temp: 12.4, wind: 11.1, dir: 171 }], cloud: 92, precip: 0 },
      { ora: "14:00", livelli: [{ alt: 2, temp: 16.4, wind: 7.3, dir: 160 }, { alt: 50, temp: null, wind: null, dir: null }, { alt: 120, temp: 14.1, wind: 9.1, dir: 173 }, { alt: 1430, temp: 12.6, wind: 11.1, dir: 173 }], cloud: 92, precip: 0 },
      { ora: "15:00", livelli: [{ alt: 2, temp: 16.2, wind: 6, dir: 163 }, { alt: 50, temp: null, wind: null, dir: null }, { alt: 120, temp: 14.3, wind: 7.6, dir: 175 }, { alt: 1430, temp: 12.8, wind: 9.6, dir: 175 }], cloud: 91, precip: 0 },
      { ora: "16:00", livelli: [{ alt: 2, temp: 15.8, wind: 2.3, dir: 162 }, { alt: 50, temp: null, wind: null, dir: null }, { alt: 120, temp: 14.5, wind: 2.9, dir: 180 }, { alt: 1430, temp: 13, wind: 4.9, dir: 180 }], cloud: 75, precip: 0 },
      { ora: "17:00", livelli: [{ alt: 2, temp: 15.3, wind: 2.5, dir: 352 }, { alt: 50, temp: null, wind: null, dir: null }, { alt: 120, temp: 14.8, wind: 3.6, dir: 354 }, { alt: 1430, temp: 13.3, wind: 5.6, dir: 354 }], cloud: 60, precip: 0 },
      { ora: "18:00", livelli: [{ alt: 2, temp: 14.9, wind: 6.4, dir: 344 }, { alt: 50, temp: null, wind: null, dir: null }, { alt: 120, temp: 15.2, wind: 8.8, dir: 351 }, { alt: 1430, temp: 13.7, wind: 10.8, dir: 351 }], cloud: 44, precip: 0 },
      { ora: "19:00", livelli: [{ alt: 2, temp: 14.9, wind: 8.4, dir: 335 }, { alt: 50, temp: null, wind: null, dir: null }, { alt: 120, temp: 15.8, wind: 11.5, dir: 346 }, { alt: 1430, temp: 14.3, wind: 13.5, dir: 346 }], cloud: 63, precip: 0 },
      { ora: "20:00", livelli: [{ alt: 2, temp: 15, wind: 9.6, dir: 326 }, { alt: 50, temp: null, wind: null, dir: null }, { alt: 120, temp: 16.5, wind: 13, dir: 341 }, { alt: 1430, temp: 15, wind: 15, dir: 341 }], cloud: 81, precip: 0 },
      { ora: "21:00", livelli: [{ alt: 2, temp: 15.2, wind: 11, dir: 322 }, { alt: 50, temp: null, wind: null, dir: null }, { alt: 120, temp: 16.9, wind: 14.5, dir: 337 }, { alt: 1430, temp: 15.4, wind: 16.5, dir: 337 }], cloud: 100, precip: 0 },
      { ora: "22:00", livelli: [{ alt: 2, temp: 15.2, wind: 12.3, dir: 322 }, { alt: 50, temp: null, wind: null, dir: null }, { alt: 120, temp: 17, wind: 16.6, dir: 336 }, { alt: 1430, temp: 15.5, wind: 18.6, dir: 336 }], cloud: 100, precip: 0 },
      { ora: "23:00", livelli: [{ alt: 2, temp: 15.2, wind: 13.7, dir: 325 }, { alt: 50, temp: null, wind: null, dir: null }, { alt: 120, temp: 16.8, wind: 18.9, dir: 336 }, { alt: 1430, temp: 15.3, wind: 20.9, dir: 336 }], cloud: 100, precip: 0 },
      { ora: "00:00", livelli: [{ alt: 2, temp: 15.2, wind: 14.6, dir: 327 }, { alt: 50, temp: null, wind: null, dir: null }, { alt: 120, temp: 16.6, wind: 20.5, dir: 336 }, { alt: 1430, temp: 15.1, wind: 22.5, dir: 336 }], cloud: 100, precip: 0 },
      { ora: "01:00", livelli: [{ alt: 2, temp: 15.2, wind: 15.2, dir: 329 }, { alt: 50, temp: null, wind: null, dir: null }, { alt: 120, temp: 16.5, wind: 21.6, dir: 336 }, { alt: 1430, temp: 15, wind: 23.6, dir: 336 }], cloud: 100, precip: 0 },
      { ora: "02:00", livelli: [{ alt: 2, temp: 15.1, wind: 15.8, dir: 330 }, { alt: 50, temp: null, wind: null, dir: null }, { alt: 120, temp: 16.3, wind: 21.9, dir: 337 }, { alt: 1430, temp: 14.8, wind: 23.9, dir: 337 }], cloud: 100, precip: 0 },
      { ora: "03:00", livelli: [{ alt: 2, temp: 15, wind: 16.1, dir: 331 }, { alt: 50, temp: null, wind: null, dir: null }, { alt: 120, temp: 16.2, wind: 22.4, dir: 336 }, { alt: 1430, temp: 14.7, wind: 24.4, dir: 336 }], cloud: 100, precip: 0 },
      { ora: "04:00", livelli: [{ alt: 2, temp: 14.8, wind: 16.5, dir: 328 }, { alt: 50, temp: null, wind: null, dir: null }, { alt: 120, temp: 16.1, wind: 22.7, dir: 335 }, { alt: 1430, temp: 14.6, wind: 24.7, dir: 335 }], cloud: 100, precip: 0 },
      { ora: "05:00", livelli: [{ alt: 2, temp: 14.5, wind: 16.6, dir: 326 }, { alt: 50, temp: null, wind: null, dir: null }, { alt: 120, temp: 15.9, wind: 22.9, dir: 332 }, { alt: 1430, temp: 14.4, wind: 24.9, dir: 332 }], cloud: 100, precip: 0 },
      { ora: "06:00", livelli: [{ alt: 2, temp: 14.6, wind: 16.1, dir: 326 }, { alt: 50, temp: null, wind: null, dir: null }, { alt: 120, temp: 15.9, wind: 22.1, dir: 332 }, { alt: 1430, temp: 14.4, wind: 24.1, dir: 332 }], cloud: 100, precip: 0 },
      { ora: "07:00", livelli: [{ alt: 2, temp: 15.4, wind: 14.7, dir: 332 }, { alt: 50, temp: null, wind: null, dir: null }, { alt: 120, temp: 16.1, wind: 20.5, dir: 336 }, { alt: 1430, temp: 14.6, wind: 22.5, dir: 336 }], cloud: 100, precip: 0 },
      { ora: "08:00", livelli: [{ alt: 2, temp: 16.7, wind: 13.4, dir: 346 }, { alt: 50, temp: null, wind: null, dir: null }, { alt: 120, temp: 16.5, wind: 18.4, dir: 343 }, { alt: 1430, temp: 15, wind: 20.4, dir: 343 }], cloud: 100, precip: 0 },
      { ora: "09:00", livelli: [{ alt: 2, temp: 17.8, wind: 11.2, dir: 358 }, { alt: 50, temp: null, wind: null, dir: null }, { alt: 120, temp: 16.7, wind: 15.3, dir: 351 }, { alt: 1430, temp: 15.2, wind: 17.3, dir: 351 }], cloud: 100, precip: 0 },
      { ora: "10:00", livelli: [{ alt: 2, temp: 18.4, wind: 7.1, dir: 15 }, { alt: 50, temp: null, wind: null, dir: null }, { alt: 120, temp: 16.7, wind: 9.4, dir: 356 }, { alt: 1430, temp: 15.2, wind: 11.4, dir: 356 }], cloud: 96, precip: 0 },
      { ora: "11:00", livelli: [{ alt: 2, temp: 18.9, wind: 3.9, dir: 68 }, { alt: 50, temp: null, wind: null, dir: null }, { alt: 120, temp: 16.6, wind: 2.3, dir: 18 }, { alt: 1430, temp: 15.1, wind: 4.3, dir: 18 }], cloud: 92, precip: 0 },
      { ora: "12:00", livelli: [{ alt: 2, temp: 19, wind: 5.3, dir: 118 }, { alt: 50, temp: null, wind: null, dir: null }, { alt: 120, temp: 16.5, wind: 3.7, dir: 151 }, { alt: 1430, temp: 15, wind: 5.7, dir: 151 }], cloud: 88, precip: 0 },
      { ora: "13:00", livelli: [{ alt: 2, temp: 18.9, wind: 6.4, dir: 128 }, { alt: 50, temp: null, wind: null, dir: null }, { alt: 120, temp: 16.3, wind: 6, dir: 155 }, { alt: 1430, temp: 14.8, wind: 8, dir: 155 }], cloud: 65, precip: 0 },
      { ora: "14:00", livelli: [{ alt: 2, temp: 18.5, wind: 6.1, dir: 130 }, { alt: 50, temp: null, wind: null, dir: null }, { alt: 120, temp: 16.1, wind: 6, dir: 155 }, { alt: 1430, temp: 14.6, wind: 8, dir: 155 }], cloud: 42, precip: 0 },
      { ora: "15:00", livelli: [{ alt: 2, temp: 17.9, wind: 4.6, dir: 129 }, { alt: 50, temp: null, wind: null, dir: null }, { alt: 120, temp: 16, wind: 4.8, dir: 153 }, { alt: 1430, temp: 14.5, wind: 6.8, dir: 153 }], cloud: 19, precip: 0 },
      { ora: "16:00", livelli: [{ alt: 2, temp: 17.1, wind: 1.6, dir: 117 }, { alt: 50, temp: null, wind: null, dir: null }, { alt: 120, temp: 16.2, wind: 1.6, dir: 153 }, { alt: 1430, temp: 14.7, wind: 3.6, dir: 153 }], cloud: 13, precip: 0 },
      { ora: "17:00", livelli: [{ alt: 2, temp: 16.2, wind: 2.1, dir: 329 }, { alt: 50, temp: null, wind: null, dir: null }, { alt: 120, temp: 16.6, wind: 3.1, dir: 339 }, { alt: 1430, temp: 15.1, wind: 5.1, dir: 339 }], cloud: 6, precip: 0 },
      { ora: "18:00", livelli: [{ alt: 2, temp: 15.4, wind: 5.4, dir: 323 }, { alt: 50, temp: null, wind: null, dir: null }, { alt: 120, temp: 16.8, wind: 7, dir: 339 }, { alt: 1430, temp: 15.3, wind: 9, dir: 339 }], cloud: 0, precip: 0 },
      { ora: "19:00", livelli: [{ alt: 2, temp: 14.9, wind: 7.4, dir: 321 }, { alt: 50, temp: null, wind: null, dir: null }, { alt: 120, temp: 16.7, wind: 9.4, dir: 337 }, { alt: 1430, temp: 15.2, wind: 11.4, dir: 337 }], cloud: 0, precip: 0 },
      { ora: "20:00", livelli: [{ alt: 2, temp: 14.6, wind: 8.7, dir: 318 }, { alt: 50, temp: null, wind: null, dir: null }, { alt: 120, temp: 16.3, wind: 11.3, dir: 338 }, { alt: 1430, temp: 14.8, wind: 13.3, dir: 338 }], cloud: 0, precip: 0 },
      { ora: "21:00", livelli: [{ alt: 2, temp: 14.3, wind: 9.7, dir: 318 }, { alt: 50, temp: null, wind: null, dir: null }, { alt: 120, temp: 16, wind: 12.2, dir: 336 }, { alt: 1430, temp: 14.5, wind: 14.2, dir: 336 }], cloud: 0, precip: 0 },
      { ora: "22:00", livelli: [{ alt: 2, temp: 14, wind: 9.3, dir: 319 }, { alt: 50, temp: null, wind: null, dir: null }, { alt: 120, temp: 15.8, wind: 11.2, dir: 334 }, { alt: 1430, temp: 14.3, wind: 13.2, dir: 334 }], cloud: 0, precip: 0 },
      { ora: "23:00", livelli: [{ alt: 2, temp: 13.9, wind: 8.7, dir: 320 }, { alt: 50, temp: null, wind: null, dir: null }, { alt: 120, temp: 15.8, wind: 9.6, dir: 333 }, { alt: 1430, temp: 14.3, wind: 11.6, dir: 333 }], cloud: 0, precip: 0 },
      { ora: "00:00", livelli: [{ alt: 2, temp: 13.8, wind: 7.6, dir: 321 }, { alt: 50, temp: null, wind: null, dir: null }, { alt: 120, temp: 15.8, wind: 7.6, dir: 335 }, { alt: 1430, temp: 14.3, wind: 9.6, dir: 335 }], cloud: 0, precip: 0 },
      { ora: "01:00", livelli: [{ alt: 2, temp: 13.6, wind: 6, dir: 327 }, { alt: 50, temp: null, wind: null, dir: null }, { alt: 120, temp: 15.7, wind: 4, dir: 360 }, { alt: 1430, temp: 14.2, wind: 6, dir: 360 }], cloud: 0, precip: 0 },
      { ora: "02:00", livelli: [{ alt: 2, temp: 13.2, wind: 4.7, dir: 337 }, { alt: 50, temp: null, wind: null, dir: null }, { alt: 120, temp: 15.4, wind: 3.3, dir: 49 }, { alt: 1430, temp: 13.9, wind: 5.3, dir: 49 }], cloud: 0, precip: 0 },
      { ora: "03:00", livelli: [{ alt: 2, temp: 12.6, wind: 3.6, dir: 354 }, { alt: 50, temp: null, wind: null, dir: null }, { alt: 120, temp: 14.6, wind: 4.7, dir: 81 }, { alt: 1430, temp: 13.1, wind: 6.7, dir: 81 }], cloud: 0, precip: 0 },
      { ora: "04:00", livelli: [{ alt: 2, temp: 11.5, wind: 3.3, dir: 6 }, { alt: 50, temp: null, wind: null, dir: null }, { alt: 120, temp: 13, wind: 5.5, dir: 79 }, { alt: 1430, temp: 11.5, wind: 7.5, dir: 79 }], cloud: 17, precip: 0 },
      { ora: "05:00", livelli: [{ alt: 2, temp: 10.2, wind: 2.9, dir: 30 }, { alt: 50, temp: null, wind: null, dir: null }, { alt: 120, temp: 11.1, wind: 6.3, dir: 66 }, { alt: 1430, temp: 9.6, wind: 8.3, dir: 66 }], cloud: 34, precip: 0 },
      { ora: "06:00", livelli: [{ alt: 2, temp: 9.4, wind: 2.8, dir: 50 }, { alt: 50, temp: null, wind: null, dir: null }, { alt: 120, temp: 9.6, wind: 6.4, dir: 63 }, { alt: 1430, temp: 8.1, wind: 8.4, dir: 63 }], cloud: 51, precip: 0 },
      { ora: "07:00", livelli: [{ alt: 2, temp: 9.6, wind: 3.2, dir: 90 }, { alt: 50, temp: null, wind: null, dir: null }, { alt: 120, temp: 9, wind: 6.3, dir: 77 }, { alt: 1430, temp: 7.5, wind: 8.3, dir: 77 }], cloud: 67, precip: 0 },
      { ora: "08:00", livelli: [{ alt: 2, temp: 10.5, wind: 5, dir: 111 }, { alt: 50, temp: null, wind: null, dir: null }, { alt: 120, temp: 8.9, wind: 6.5, dir: 96 }, { alt: 1430, temp: 7.4, wind: 8.5, dir: 96 }], cloud: 84, precip: 0 },
      { ora: "09:00", livelli: [{ alt: 2, temp: 11.1, wind: 6.8, dir: 122 }, { alt: 50, temp: null, wind: null, dir: null }, { alt: 120, temp: 8.9, wind: 7.1, dir: 114 }, { alt: 1430, temp: 7.4, wind: 9.1, dir: 114 }], cloud: 100, precip: 0 },
      { ora: "10:00", livelli: [{ alt: 2, temp: 11.3, wind: 7.7, dir: 127 }, { alt: 50, temp: null, wind: null, dir: null }, { alt: 120, temp: 9, wind: 7.8, dir: 124 }, { alt: 1430, temp: 7.5, wind: 9.8, dir: 124 }], cloud: 98, precip: 0 },
      { ora: "11:00", livelli: [{ alt: 2, temp: 11.4, wind: 8.2, dir: 131 }, { alt: 50, temp: null, wind: null, dir: null }, { alt: 120, temp: 9.3, wind: 8.4, dir: 130 }, { alt: 1430, temp: 7.8, wind: 10.4, dir: 130 }], cloud: 96, precip: 0 },
      { ora: "12:00", livelli: [{ alt: 2, temp: 11.4, wind: 8.1, dir: 135 }, { alt: 50, temp: null, wind: null, dir: null }, { alt: 120, temp: 9.5, wind: 8.7, dir: 135 }, { alt: 1430, temp: 8, wind: 10.7, dir: 135 }], cloud: 94, precip: 0 },
      { ora: "13:00", livelli: [{ alt: 2, temp: 11.5, wind: 7.7, dir: 139 }, { alt: 50, temp: null, wind: null, dir: null }, { alt: 120, temp: 9.6, wind: 8.2, dir: 139 }, { alt: 1430, temp: 8.1, wind: 10.2, dir: 139 }], cloud: 94, precip: 0 },
      { ora: "14:00", livelli: [{ alt: 2, temp: 11.4, wind: 6.9, dir: 141 }, { alt: 50, temp: null, wind: null, dir: null }, { alt: 120, temp: 9.5, wind: 7.4, dir: 141 }, { alt: 1430, temp: 8, wind: 9.4, dir: 141 }], cloud: 95, precip: 0 },
      { ora: "15:00", livelli: [{ alt: 2, temp: 11.3, wind: 5.7, dir: 145 }, { alt: 50, temp: null, wind: null, dir: null }, { alt: 120, temp: 9.5, wind: 6.2, dir: 144 }, { alt: 1430, temp: 8, wind: 8.2, dir: 144 }], cloud: 95, precip: 0 },
      { ora: "16:00", livelli: [{ alt: 2, temp: 10.9, wind: 4.7, dir: 148 }, { alt: 50, temp: null, wind: null, dir: null }, { alt: 120, temp: 9.4, wind: 5.2, dir: 146 }, { alt: 1430, temp: 7.9, wind: 7.2, dir: 146 }], cloud: 96, precip: 0 },
      { ora: "17:00", livelli: [{ alt: 2, temp: 10.3, wind: 3.5, dir: 156 }, { alt: 50, temp: null, wind: null, dir: null }, { alt: 120, temp: 9.3, wind: 4, dir: 153 }, { alt: 1430, temp: 7.8, wind: 6, dir: 153 }], cloud: 98, precip: 0 },
      { ora: "18:00", livelli: [{ alt: 2, temp: 9.9, wind: 2.6, dir: 164 }, { alt: 50, temp: null, wind: null, dir: null }, { alt: 120, temp: 9.2, wind: 3.1, dir: 159 }, { alt: 1430, temp: 7.7, wind: 5.1, dir: 159 }], cloud: 99, precip: 0 },
      { ora: "19:00", livelli: [{ alt: 2, temp: 9.7, wind: 1.4, dir: 180 }, { alt: 50, temp: null, wind: null, dir: null }, { alt: 120, temp: 9.1, wind: 1.8, dir: 169 }, { alt: 1430, temp: 7.6, wind: 3.8, dir: 169 }], cloud: 97, precip: 0 },
      { ora: "20:00", livelli: [{ alt: 2, temp: 9.7, wind: 0.7, dir: 270 }, { alt: 50, temp: null, wind: null, dir: null }, { alt: 120, temp: 9, wind: 1.1, dir: 180 }, { alt: 1430, temp: 7.5, wind: 3.1, dir: 180 }], cloud: 96, precip: 0 },
      { ora: "21:00", livelli: [{ alt: 2, temp: 9.6, wind: 1.3, dir: 304 }, { alt: 50, temp: null, wind: null, dir: null }, { alt: 120, temp: 8.9, wind: 0.7, dir: 180 }, { alt: 1430, temp: 7.4, wind: 2.7, dir: 180 }], cloud: 94, precip: 0 },
      { ora: "22:00", livelli: [{ alt: 2, temp: 9.5, wind: 0, dir: 270 }, { alt: 50, temp: null, wind: null, dir: null }, { alt: 120, temp: 8.7, wind: 2, dir: 135 }, { alt: 1430, temp: 7.2, wind: 4, dir: 135 }], cloud: 95, precip: 0 },
      { ora: "23:00", livelli: [{ alt: 2, temp: 9.3, wind: 2.3, dir: 141 }, { alt: 50, temp: null, wind: null, dir: null }, { alt: 120, temp: 8.4, wind: 4.3, dir: 132 }, { alt: 1430, temp: 6.9, wind: 6.3, dir: 132 }], cloud: 96, precip: 0 },
      { ora: "00:00", livelli: [{ alt: 2, temp: 9.1, wind: 3.6, dir: 143 }, { alt: 50, temp: null, wind: null, dir: null }, { alt: 120, temp: 8.2, wind: 5.6, dir: 130 }, { alt: 1430, temp: 6.7, wind: 7.6, dir: 130 }], cloud: 97, precip: 0 },
      { ora: "01:00", livelli: [{ alt: 2, temp: 8.8, wind: 2.9, dir: 150 }, { alt: 50, temp: null, wind: null, dir: null }, { alt: 120, temp: 8, wind: 4.2, dir: 121 }, { alt: 1430, temp: 6.5, wind: 6.2, dir: 121 }], cloud: 92, precip: 0 },
      { ora: "02:00", livelli: [{ alt: 2, temp: 8.4, wind: 1.8, dir: 180 }, { alt: 50, temp: null, wind: null, dir: null }, { alt: 120, temp: 7.8, wind: 2.2, dir: 90 }, { alt: 1430, temp: 6.3, wind: 4.2, dir: 90 }], cloud: 87, precip: 0 },
      { ora: "03:00", livelli: [{ alt: 2, temp: 8, wind: 1.5, dir: 225 }, { alt: 50, temp: null, wind: null, dir: null }, { alt: 120, temp: 7.6, wind: 1.8, dir: 37 }, { alt: 1430, temp: 6.1, wind: 3.8, dir: 37 }], cloud: 82, precip: 0 },
      { ora: "04:00", livelli: [{ alt: 2, temp: 7.7, wind: 1.5, dir: 256 }, { alt: 50, temp: null, wind: null, dir: null }, { alt: 120, temp: 7.4, wind: 2.1, dir: 31 }, { alt: 1430, temp: 5.9, wind: 4.1, dir: 31 }], cloud: 80, precip: 0 },
      { ora: "05:00", livelli: [{ alt: 2, temp: 7.4, wind: 1.6, dir: 297 }, { alt: 50, temp: null, wind: null, dir: null }, { alt: 120, temp: 7.2, wind: 2, dir: 45 }, { alt: 1430, temp: 5.7, wind: 4, dir: 45 }], cloud: 78, precip: 0 },
      { ora: "06:00", livelli: [{ alt: 2, temp: 7.5, wind: 1.3, dir: 304 }, { alt: 50, temp: null, wind: null, dir: null }, { alt: 120, temp: 7, wind: 1.9, dir: 68 }, { alt: 1430, temp: 5.5, wind: 3.9, dir: 68 }], cloud: 76, precip: 0 },
      { ora: "07:00", livelli: [{ alt: 2, temp: 8, wind: 0.8, dir: 153 }, { alt: 50, temp: null, wind: null, dir: null }, { alt: 120, temp: 6.9, wind: 2.6, dir: 106 }, { alt: 1430, temp: 5.4, wind: 4.6, dir: 106 }], cloud: 63, precip: 0 },
      { ora: "08:00", livelli: [{ alt: 2, temp: 8.8, wind: 3.3, dir: 139 }, { alt: 50, temp: null, wind: null, dir: null }, { alt: 120, temp: 6.9, wind: 4.3, dir: 132 }, { alt: 1430, temp: 5.4, wind: 6.3, dir: 132 }], cloud: 50, precip: 0 },
      { ora: "09:00", livelli: [{ alt: 2, temp: 9.5, wind: 5.6, dir: 140 }, { alt: 50, temp: null, wind: null, dir: null }, { alt: 120, temp: 7, wind: 5.9, dir: 142 }, { alt: 1430, temp: 5.5, wind: 7.9, dir: 142 }], cloud: 37, precip: 0 },
      { ora: "10:00", livelli: [{ alt: 2, temp: 9.9, wind: 6.7, dir: 144 }, { alt: 50, temp: null, wind: null, dir: null }, { alt: 120, temp: 7.3, wind: 7, dir: 145 }, { alt: 1430, temp: 5.8, wind: 9, dir: 145 }], cloud: 51, precip: 0 },
      { ora: "11:00", livelli: [{ alt: 2, temp: 10.3, wind: 7.3, dir: 147 }, { alt: 50, temp: null, wind: null, dir: null }, { alt: 120, temp: 7.6, wind: 7.6, dir: 149 }, { alt: 1430, temp: 6.1, wind: 9.6, dir: 149 }], cloud: 64, precip: 0 },
      { ora: "12:00", livelli: [{ alt: 2, temp: 10.5, wind: 7.4, dir: 151 }, { alt: 50, temp: null, wind: null, dir: null }, { alt: 120, temp: 8, wind: 7.7, dir: 152 }, { alt: 1430, temp: 6.5, wind: 9.7, dir: 152 }], cloud: 78, precip: 0 },
      { ora: "13:00", livelli: [{ alt: 2, temp: 10.8, wind: 7.2, dir: 153 }, { alt: 50, temp: null, wind: null, dir: null }, { alt: 120, temp: 8.3, wind: 7.4, dir: 157 }, { alt: 1430, temp: 6.8, wind: 9.4, dir: 157 }], cloud: 72, precip: 0 },
      { ora: "14:00", livelli: [{ alt: 2, temp: 11, wind: 7, dir: 159 }, { alt: 50, temp: null, wind: null, dir: null }, { alt: 120, temp: 8.7, wind: 6.5, dir: 161 }, { alt: 1430, temp: 7.2, wind: 8.5, dir: 161 }], cloud: 65, precip: 0 },
      { ora: "15:00", livelli: [{ alt: 2, temp: 10.9, wind: 6, dir: 163 }, { alt: 50, temp: null, wind: null, dir: null }, { alt: 120, temp: 8.9, wind: 5.6, dir: 165 }, { alt: 1430, temp: 7.4, wind: 7.6, dir: 165 }], cloud: 59, precip: 0 },
      { ora: "16:00", livelli: [{ alt: 2, temp: 10.4, wind: 4.1, dir: 165 }, { alt: 50, temp: null, wind: null, dir: null }, { alt: 120, temp: 9, wind: 3.7, dir: 169 }, { alt: 1430, temp: 7.5, wind: 5.7, dir: 169 }], cloud: 46, precip: 0 },
      { ora: "17:00", livelli: [{ alt: 2, temp: 9.5, wind: 1.5, dir: 166 }, { alt: 50, temp: null, wind: null, dir: null }, { alt: 120, temp: 8.9, wind: 1.8, dir: 169 }, { alt: 1430, temp: 7.4, wind: 3.8, dir: 169 }], cloud: 34, precip: 0 },
      { ora: "18:00", livelli: [{ alt: 2, temp: 8.8, wind: 0, dir: 270 }, { alt: 50, temp: null, wind: null, dir: null }, { alt: 120, temp: 8.8, wind: 0.4, dir: 180 }, { alt: 1430, temp: 7.3, wind: 2.4, dir: 180 }], cloud: 21, precip: 0 },
      { ora: "19:00", livelli: [{ alt: 2, temp: 8.2, wind: 0.4, dir: 270 }, { alt: 50, temp: null, wind: null, dir: null }, { alt: 120, temp: 8.7, wind: 0.4, dir: 180 }, { alt: 1430, temp: 7.2, wind: 2.4, dir: 180 }], cloud: 26, precip: 0 },
      { ora: "20:00", livelli: [{ alt: 2, temp: 7.8, wind: 1.3, dir: 214 }, { alt: 50, temp: null, wind: null, dir: null }, { alt: 120, temp: 8.6, wind: 1.4, dir: 180 }, { alt: 1430, temp: 7.1, wind: 3.4, dir: 180 }], cloud: 31, precip: 0 },
      { ora: "21:00", livelli: [{ alt: 2, temp: 7.4, wind: 1.6, dir: 207 }, { alt: 50, temp: null, wind: null, dir: null }, { alt: 120, temp: 8.4, wind: 1.8, dir: 169 }, { alt: 1430, temp: 6.9, wind: 3.8, dir: 169 }], cloud: 36, precip: 0 },
      { ora: "22:00", livelli: [{ alt: 2, temp: 7, wind: 1.1, dir: 198 }, { alt: 50, temp: null, wind: null, dir: null }, { alt: 120, temp: 8.2, wind: 1.5, dir: 166 }, { alt: 1430, temp: 6.7, wind: 3.5, dir: 166 }], cloud: 24, precip: 0 },
      { ora: "23:00", livelli: [{ alt: 2, temp: 6.7, wind: 0, dir: 270 }, { alt: 50, temp: null, wind: null, dir: null }, { alt: 120, temp: 8, wind: 1.3, dir: 146 }, { alt: 1430, temp: 6.5, wind: 3.3, dir: 146 }], cloud: 12, precip: 0 },
    ],
    stabilita: [
      0.76,0.76,0.76,0.76,0.76,0.76,0.76,0.76,0.76,0.76,0.76,0.76,0.76,0.76,0.76,0.76,0.76,0.76,0.76,0.76,0.76,0.76,0.76,0.76,
      0.76,0.76,0.76,0.76,0.76,0.76,0.76,0.76,0.76,0.76,0.76,0.76,0.76,0.76,0.76,0.76,0.76,0.76,0.76,0.76,0.76,0.76,0.76,0.76,
      0.76,0.76,0.76,0.76,0.76,0.76,0.76,0.76,0.76,0.76,0.76,0.76,0.76,0.76,0.76,0.76,0.76,0.76,0.76,0.76,0.76,0.76,0.76,0.76,
      0.76,0.76,0.76,0.76,0.76,0.76,0.76,0.76,0.76,0.76,0.76,0.76,0.76,0.76,0.76,0.76,0.76,0.76,0.76,0.76,0.76,0.76,0.76,0.76,
      0.76,0.76,0.76,0.76,0.76,0.76,0.76,0.76,0.76,0.76,0.76,0.76,0.76,0.76,0.76,0.76,0.76,0.76,0.76,0.76,0.76,0.76,0.76,0.76
    ],
    cloud_base: 2300,
    zero_iso: 3100,
    icone: { parapendio: true, nuvole: true, pioggia: true },
    colori: { instabile: "#ff4500", stabile: "#007bff", pioggia: "#003366" }
  },
  {
    id: "andrate",
    nome: "Andrate",
    quota_decollo: 1000,
    hours: Array(24 * 25).fill("").map((_, i) => `${String(i % 24).padStart(2, "0")}:00`),
    profilo_verticale: [
      { ora: "00:00", livelli: [{ alt: 2, temp: 14.3, wind: 11.2, dir: 303 }, { alt: 50, temp: 13.9, wind: 12.2, dir: 308 }, { alt: 120, temp: 13.4, wind: 13.2, dir: 313 }, { alt: 1000, temp: 12.7, wind: 14.2, dir: 318 }], cloud: 37, precip: 0 },
      { ora: "01:00", livelli: [{ alt: 2, temp: 13.6, wind: 10.2, dir: 315 }, { alt: 50, temp: 13.2, wind: 11.2, dir: 320 }, { alt: 120, temp: 12.7, wind: 12.2, dir: 325 }, { alt: 1000, temp: 12, wind: 13.2, dir: 330 }], cloud: 0, precip: 0 },
      { ora: "02:00", livelli: [{ alt: 2, temp: 13.4, wind: 9.2, dir: 321 }, { alt: 50, temp: 13, wind: 10.2, dir: 326 }, { alt: 120, temp: 12.5, wind: 11.2, dir: 331 }, { alt: 1000, temp: 11.8, wind: 12.2, dir: 336 }], cloud: 0, precip: 0 },
      { ora: "03:00", livelli: [{ alt: 2, temp: 13.4, wind: 12.5, dir: 314 }, { alt: 50, temp: 13, wind: 13.5, dir: 319 }, { alt: 120, temp: 12.5, wind: 14.5, dir: 324 }, { alt: 1000, temp: 11.8, wind: 15.5, dir: 329 }], cloud: 1, precip: 0 },
      { ora: "04:00", livelli: [{ alt: 2, temp: 13.3, wind: 14.3, dir: 313 }, { alt: 50, temp: 12.9, wind: 15.3, dir: 318 }, { alt: 120, temp: 12.4, wind: 16.3, dir: 323 }, { alt: 1000, temp: 11.7, wind: 17.3, dir: 328 }], cloud: 0, precip: 0 },
      { ora: "05:00", livelli: [{ alt: 2, temp: 13.1, wind: 14.1, dir: 322 }, { alt: 50, temp: 12.7, wind: 15.1, dir: 327 }, { alt: 120, temp: 12.2, wind: 16.1, dir: 332 }, { alt: 1000, temp: 11.5, wind: 17.1, dir: 337 }], cloud: 0, precip: 0 },
      { ora: "06:00", livelli: [{ alt: 2, temp: 13.5, wind: 12.5, dir: 314 }, { alt: 50, temp: 13.1, wind: 13.5, dir: 319 }, { alt: 120, temp: 12.6, wind: 14.5, dir: 324 }, { alt: 1000, temp: 11.9, wind: 15.5, dir: 329 }], cloud: 0, precip: 0 },
      { ora: "07:00", livelli: [{ alt: 2, temp: 13.4, wind: 7.2, dir: 297 }, { alt: 50, temp: 13, wind: 8.2, dir: 302 }, { alt: 120, temp: 12.5, wind: 9.2, dir: 307 }, { alt: 1000, temp: 11.8, wind: 10.2, dir: 312 }], cloud: 0, precip: 0 },
      { ora: "08:00", livelli: [{ alt: 2, temp: 13.7, wind: 4.4, dir: 261 }, { alt: 50, temp: 13.3, wind: 5.4, dir: 266 }, { alt: 120, temp: 12.8, wind: 6.4, dir: 271 }, { alt: 1000, temp: 12.1, wind: 7.4, dir: 276 }], cloud: 34, precip: 0 },
      { ora: "09:00", livelli: [{ alt: 2, temp: 14.1, wind: 3.1, dir: 201 }, { alt: 50, temp: 13.7, wind: 4.1, dir: 206 }, { alt: 120, temp: 13.2, wind: 5.1, dir: 211 }, { alt: 1000, temp: 12.5, wind: 6.1, dir: 216 }], cloud: 70, precip: 0 },
      { ora: "10:00", livelli: [{ alt: 2, temp: 14.2, wind: 9.7, dir: 141 }, { alt: 50, temp: 13.8, wind: 10.7, dir: 146 }, { alt: 120, temp: 13.3, wind: 11.7, dir: 151 }, { alt: 1000, temp: 12.6, wind: 12.7, dir: 156 }], cloud: 85, precip: 0 },
      { ora: "11:00", livelli: [{ alt: 2, temp: 14.4, wind: 10.2, dir: 138 }, { alt: 50, temp: 14, wind: 11.2, dir: 143 }, { alt: 120, temp: 13.5, wind: 12.2, dir: 148 }, { alt: 1000, temp: 12.8, wind: 13.2, dir: 153 }], cloud: 99, precip: 0 },
      { ora: "12:00", livelli: [{ alt: 2, temp: 14.5, wind: 12.5, dir: 147 }, { alt: 50, temp: 14.1, wind: 13.5, dir: 152 }, { alt: 120, temp: 13.6, wind: 14.5, dir: 157 }, { alt: 1000, temp: 12.9, wind: 15.5, dir: 162 }], cloud: 96, precip: 0 },
      { ora: "13:00", livelli: [{ alt: 2, temp: 14.5, wind: 10.8, dir: 154 }, { alt: 50, temp: 14.1, wind: 11.8, dir: 159 }, { alt: 120, temp: 13.6, wind: 12.8, dir: 164 }, { alt: 1000, temp: 12.9, wind: 13.8, dir: 169 }], cloud: 86, precip: 0 },
      { ora: "14:00", livelli: [{ alt: 2, temp: 14.9, wind: 9.4, dir: 148 }, { alt: 50, temp: 14.5, wind: 10.4, dir: 153 }, { alt: 120, temp: 14, wind: 11.4, dir: 158 }, { alt: 1000, temp: 13.3, wind: 12.4, dir: 163 }], cloud: 100, precip: 0 },
      { ora: "15:00", livelli: [{ alt: 2, temp: 14.5, wind: 10.3, dir: 126 }, { alt: 50, temp: 14.1, wind: 11.3, dir: 131 }, { alt: 120, temp: 13.6, wind: 12.3, dir: 136 }, { alt: 1000, temp: 12.9, wind: 13.3, dir: 141 }], cloud: 100, precip: 0 },
      { ora: "16:00", livelli: [{ alt: 2, temp: 14.2, wind: 9.6, dir: 110 }, { alt: 50, temp: 13.8, wind: 10.6, dir: 115 }, { alt: 120, temp: 13.3, wind: 11.6, dir: 120 }, { alt: 1000, temp: 12.6, wind: 12.6, dir: 125 }], cloud: 100, precip: 0 },
      { ora: "17:00", livelli: [{ alt: 2, temp: 13.4, wind: 8.3, dir: 124 }, { alt: 50, temp: 13, wind: 9.3, dir: 129 }, { alt: 120, temp: 12.5, wind: 10.3, dir: 134 }, { alt: 1000, temp: 11.8, wind: 11.3, dir: 139 }], cloud: 100, precip: 0 },
      { ora: "18:00", livelli: [{ alt: 2, temp: 13, wind: 7.6, dir: 90 }, { alt: 50, temp: 12.6, wind: 8.6, dir: 95 }, { alt: 120, temp: 12.1, wind: 9.6, dir: 100 }, { alt: 1000, temp: 11.4, wind: 10.6, dir: 105 }], cloud: 100, precip: 0 },
      { ora: "19:00", livelli: [{ alt: 2, temp: 12.7, wind: 6.2, dir: 80 }, { alt: 50, temp: 12.3, wind: 7.2, dir: 85 }, { alt: 120, temp: 11.8, wind: 8.2, dir: 90 }, { alt: 1000, temp: 11.1, wind: 9.2, dir: 95 }], cloud: 100, precip: 0 },
      { ora: "20:00", livelli: [{ alt: 2, temp: 12.5, wind: 4.2, dir: 70 }, { alt: 50, temp: 12.1, wind: 5.2, dir: 75 }, { alt: 120, temp: 11.6, wind: 6.2, dir: 80 }, { alt: 1000, temp: 10.9, wind: 7.2, dir: 85 }], cloud: 100, precip: 0 },
      { ora: "21:00", livelli: [{ alt: 2, temp: 12.5, wind: 1.6, dir: 63 }, { alt: 50, temp: 12.1, wind: 2.6, dir: 68 }, { alt: 120, temp: 11.6, wind: 3.6, dir: 73 }, { alt: 1000, temp: 10.9, wind: 4.6, dir: 78 }], cloud: 100, precip: 0 },
      { ora: "22:00", livelli: [{ alt: 2, temp: 12.5, wind: 2.2, dir: 9 }, { alt: 50, temp: 12.1, wind: 3.2, dir: 14 }, { alt: 120, temp: 11.6, wind: 4.2, dir: 19 }, { alt: 1000, temp: 10.9, wind: 5.2, dir: 24 }], cloud: 93, precip: 0 },
      { ora: "23:00", livelli: [{ alt: 2, temp: 12.5, wind: 3.1, dir: 21 }, { alt: 50, temp: 12.1, wind: 4.1, dir: 26 }, { alt: 120, temp: 11.6, wind: 5.1, dir: 31 }, { alt: 1000, temp: 10.9, wind: 6.1, dir: 36 }], cloud: 82, precip: 0 },
      { ora: "00:00", livelli: [{ alt: 2, temp: 12.5, wind: 4.3, dir: 42 }, { alt: 50, temp: 12.1, wind: 5.3, dir: 47 }, { alt: 120, temp: 11.6, wind: 6.3, dir: 52 }, { alt: 1000, temp: 10.9, wind: 7.3, dir: 57 }], cloud: 98, precip: 0 },
      { ora: "01:00", livelli: [{ alt: 2, temp: 12.3, wind: 4.3, dir: 48 }, { alt: 50, temp: 11.9, wind: 5.3, dir: 53 }, { alt: 120, temp: 11.4, wind: 6.3, dir: 58 }, { alt: 1000, temp: 10.7, wind: 7.3, dir: 63 }], cloud: 96, precip: 0 },
      { ora: "02:00", livelli: [{ alt: 2, temp: 12, wind: 5.4, dir: 70 }, { alt: 50, temp: 11.6, wind: 6.4, dir: 75 }, { alt: 120, temp: 11.1, wind: 7.4, dir: 80 }, { alt: 1000, temp: 10.4, wind: 8.4, dir: 85 }], cloud: 100, precip: 0.2 },
      { ora: "03:00", livelli: [{ alt: 2, temp: 12.2, wind: 5.5, dir: 32 }, { alt: 50, temp: 11.8, wind: 6.5, dir: 37 }, { alt: 120, temp: 11.3, wind: 7.5, dir: 42 }, { alt: 1000, temp: 10.6, wind: 8.5, dir: 47 }], cloud: 100, precip: 0 },
      { ora: "04:00", livelli: [{ alt: 2, temp: 11.8, wind: 2.2, dir: 9 }, { alt: 50, temp: 11.4, wind: 3.2, dir: 14 }, { alt: 120, temp: 10.9, wind: 4.2, dir: 19 }, { alt: 1000, temp: 10.2, wind: 5.2, dir: 24 }], cloud: 93, precip: 0 },
      { ora: "05:00", livelli: [{ alt: 2, temp: 11.7, wind: 2.3, dir: 18 }, { alt: 50, temp: 11.3, wind: 3.3, dir: 23 }, { alt: 120, temp: 10.8, wind: 4.3, dir: 28 }, { alt: 1000, temp: 10.1, wind: 5.3, dir: 33 }], cloud: 100, precip: 0 },
      { ora: "06:00", livelli: [{ alt: 2, temp: 11.9, wind: 2.7, dir: 293 }, { alt: 50, temp: 11.5, wind: 3.7, dir: 298 }, { alt: 120, temp: 11, wind: 4.7, dir: 303 }, { alt: 1000, temp: 10.3, wind: 5.7, dir: 308 }], cloud: 100, precip: 0 },
      { ora: "07:00", livelli: [{ alt: 2, temp: 12.2, wind: 2.7, dir: 247 }, { alt: 50, temp: 11.8, wind: 3.7, dir: 252 }, { alt: 120, temp: 11.3, wind: 4.7, dir: 257 }, { alt: 1000, temp: 10.6, wind: 5.7, dir: 262 }], cloud: 100, precip: 0 },
      { ora: "08:00", livelli: [{ alt: 2, temp: 12.2, wind: 3.5, dir: 156 }, { alt: 50, temp: 11.8, wind: 4.5, dir: 161 }, { alt: 120, temp: 11.3, wind: 5.5, dir: 166 }, { alt: 1000, temp: 10.6, wind: 6.5, dir: 171 }], cloud: 98, precip: 0 },
      { ora: "09:00", livelli: [{ alt: 2, temp: 12.5, wind: 5, dir: 159 }, { alt: 50, temp: 12.1, wind: 6, dir: 164 }, { alt: 120, temp: 11.6, wind: 7, dir: 169 }, { alt: 1000, temp: 10.9, wind: 8, dir: 174 }], cloud: 100, precip: 0 },
      { ora: "10:00", livelli: [{ alt: 2, temp: 13.4, wind: 5.6, dir: 135 }, { alt: 50, temp: 13, wind: 6.6, dir: 140 }, { alt: 120, temp: 12.5, wind: 7.6, dir: 145 }, { alt: 1000, temp: 11.8, wind: 8.6, dir: 150 }], cloud: 89, precip: 0 },
      { ora: "11:00", livelli: [{ alt: 2, temp: 13.1, wind: 8.5, dir: 118 }, { alt: 50, temp: 12.7, wind: 9.5, dir: 123 }, { alt: 120, temp: 12.2, wind: 10.5, dir: 128 }, { alt: 1000, temp: 11.5, wind: 11.5, dir: 133 }], cloud: 100, precip: 0 },
      { ora: "12:00", livelli: [{ alt: 2, temp: 13.9, wind: 8.2, dir: 128 }, { alt: 50, temp: 13.5, wind: 9.2, dir: 133 }, { alt: 120, temp: 13, wind: 10.2, dir: 138 }, { alt: 1000, temp: 12.3, wind: 11.2, dir: 143 }], cloud: 100, precip: 0 },
      { ora: "13:00", livelli: [{ alt: 2, temp: 13.8, wind: 9.4, dir: 137 }, { alt: 50, temp: 13.4, wind: 10.4, dir: 142 }, { alt: 120, temp: 12.9, wind: 11.4, dir: 147 }, { alt: 1000, temp: 12.2, wind: 12.4, dir: 152 }], cloud: 100, precip: 0 },
      { ora: "14:00", livelli: [{ alt: 2, temp: 13.7, wind: 9.7, dir: 138 }, { alt: 50, temp: 13.3, wind: 10.7, dir: 143 }, { alt: 120, temp: 12.8, wind: 11.7, dir: 148 }, { alt: 1000, temp: 12.1, wind: 12.7, dir: 153 }], cloud: 100, precip: 0 },
      { ora: "15:00", livelli: [{ alt: 2, temp: 13.5, wind: 8.7, dir: 142 }, { alt: 50, temp: 13.1, wind: 9.7, dir: 147 }, { alt: 120, temp: 12.6, wind: 10.7, dir: 152 }, { alt: 1000, temp: 11.9, wind: 11.7, dir: 157 }], cloud: 94, precip: 0 },
      { ora: "16:00", livelli: [{ alt: 2, temp: 13.4, wind: 7.4, dir: 113 }, { alt: 50, temp: 13, wind: 8.4, dir: 118 }, { alt: 120, temp: 12.5, wind: 9.4, dir: 123 }, { alt: 1000, temp: 11.8, wind: 10.4, dir: 128 }], cloud: 89, precip: 0 },
      { ora: "17:00", livelli: [{ alt: 2, temp: 13, wind: 3.3, dir: 131 }, { alt: 50, temp: 12.6, wind: 4.3, dir: 136 }, { alt: 120, temp: 12.1, wind: 5.3, dir: 141 }, { alt: 1000, temp: 11.4, wind: 6.3, dir: 146 }], cloud: 68, precip: 0 },
      { ora: "18:00", livelli: [{ alt: 2, temp: 12.5, wind: 3.1, dir: 54 }, { alt: 50, temp: 12.1, wind: 4.1, dir: 59 }, { alt: 120, temp: 11.6, wind: 5.1, dir: 64 }, { alt: 1000, temp: 10.9, wind: 6.1, dir: 69 }], cloud: 34, precip: 0 },
      { ora: "19:00", livelli: [{ alt: 2, temp: 12.2, wind: 1.8, dir: 37 }, { alt: 50, temp: 11.8, wind: 2.8, dir: 42 }, { alt: 120, temp: 11.3, wind: 3.8, dir: 47 }, { alt: 1000, temp: 10.6, wind: 4.8, dir: 52 }], cloud: 36, precip: 0 },
      { ora: "20:00", livelli: [{ alt: 2, temp: 12.3, wind: 8, dir: 8 }, { alt: 50, temp: 11.9, wind: 9, dir: 13 }, { alt: 120, temp: 11.4, wind: 10, dir: 18 }, { alt: 1000, temp: 10.7, wind: 11, dir: 23 }], cloud: 15, precip: 0 },
      { ora: "21:00", livelli: [{ alt: 2, temp: 12.3, wind: 5.4, dir: 4 }, { alt: 50, temp: 11.9, wind: 6.4, dir: 9 }, { alt: 120, temp: 11.4, wind: 7.4, dir: 14 }, { alt: 1000, temp: 10.7, wind: 8.4, dir: 19 }], cloud: 29, precip: 0 },
      { ora: "22:00", livelli: [{ alt: 2, temp: 12.1, wind: 7.9, dir: 3 }, { alt: 50, temp: 11.7, wind: 8.9, dir: 8 }, { alt: 120, temp: 11.2, wind: 9.9, dir: 13 }, { alt: 1000, temp: 10.5, wind: 10.9, dir: 18 }], cloud: 32, precip: 0 },
      { ora: "23:00", livelli: [{ alt: 2, temp: 12, wind: 7.6, dir: 360 }, { alt: 50, temp: 11.6, wind: 8.6, dir: 365 }, { alt: 120, temp: 11.1, wind: 9.6, dir: 370 }, { alt: 1000, temp: 10.4, wind: 10.6, dir: 375 }], cloud: 42, precip: 0 },
      { ora: "00:00", livelli: [{ alt: 2, temp: 11.9, wind: 6.9, dir: 6 }, { alt: 50, temp: 11.5, wind: 7.9, dir: 11 }, { alt: 120, temp: 11, wind: 8.9, dir: 16 }, { alt: 1000, temp: 10.3, wind: 9.9, dir: 21 }], cloud: 34, precip: 0 },
      { ora: "01:00", livelli: [{ alt: 2, temp: 11.8, wind: 6.5, dir: 6 }, { alt: 50, temp: 11.4, wind: 7.5, dir: 11 }, { alt: 120, temp: 10.9, wind: 8.5, dir: 16 }, { alt: 1000, temp: 10.2, wind: 9.5, dir: 21 }], cloud: 43, precip: 0 },
      { ora: "02:00", livelli: [{ alt: 2, temp: 11.8, wind: 8, dir: 8 }, { alt: 50, temp: 11.4, wind: 9, dir: 13 }, { alt: 120, temp: 10.9, wind: 10, dir: 18 }, { alt: 1000, temp: 10.2, wind: 11, dir: 23 }], cloud: 57, precip: 0 },
      { ora: "03:00", livelli: [{ alt: 2, temp: 11.8, wind: 7.5, dir: 17 }, { alt: 50, temp: 11.4, wind: 8.5, dir: 22 }, { alt: 120, temp: 10.9, wind: 9.5, dir: 27 }, { alt: 1000, temp: 10.2, wind: 10.5, dir: 32 }], cloud: 100, precip: 0 },
      { ora: "04:00", livelli: [{ alt: 2, temp: 11.7, wind: 6.2, dir: 87 }, { alt: 50, temp: 11.3, wind: 7.2, dir: 92 }, { alt: 120, temp: 10.8, wind: 8.2, dir: 97 }, { alt: 1000, temp: 10.1, wind: 9.2, dir: 102 }], cloud: 96, precip: 0 },
      { ora: "05:00", livelli: [{ alt: 2, temp: 11.5, wind: 5.5, dir: 174 }, { alt: 50, temp: 11.1, wind: 6.5, dir: 179 }, { alt: 120, temp: 10.6, wind: 7.5, dir: 184 }, { alt: 1000, temp: 9.9, wind: 8.5, dir: 189 }], cloud: 46, precip: 0 },
      { ora: "06:00", livelli: [{ alt: 2, temp: 11.7, wind: 4.8, dir: 260 }, { alt: 50, temp: 11.3, wind: 5.8, dir: 265 }, { alt: 120, temp: 10.8, wind: 6.8, dir: 270 }, { alt: 1000, temp: 10.1, wind: 7.8, dir: 275 }], cloud: 43, precip: 0 },
      { ora: "07:00", livelli: [{ alt: 2, temp: 13.1, wind: 2.3, dir: 321 }, { alt: 50, temp: 12.7, wind: 3.3, dir: 326 }, { alt: 120, temp: 12.2, wind: 4.3, dir: 331 }, { alt: 1000, temp: 11.5, wind: 5.3, dir: 336 }], cloud: 32, precip: 0 },
      { ora: "08:00", livelli: [{ alt: 2, temp: 14.5, wind: 3.1, dir: 201 }, { alt: 50, temp: 14.1, wind: 4.1, dir: 206 }, { alt: 120, temp: 13.6, wind: 5.1, dir: 211 }, { alt: 1000, temp: 12.9, wind: 6.1, dir: 216 }], cloud: 46, precip: 0 },
      { ora: "09:00", livelli: [{ alt: 2, temp: 15, wind: 5.8, dir: 173 }, { alt: 50, temp: 14.6, wind: 6.8, dir: 178 }, { alt: 120, temp: 14.1, wind: 7.8, dir: 183 }, { alt: 1000, temp: 13.4, wind: 8.8, dir: 188 }], cloud: 47, precip: 0 },
      { ora: "10:00", livelli: [{ alt: 2, temp: 15.8, wind: 7.2, dir: 180 }, { alt: 50, temp: 15.4, wind: 8.2, dir: 185 }, { alt: 120, temp: 14.9, wind: 9.2, dir: 190 }, { alt: 1000, temp: 14.2, wind: 10.2, dir: 195 }], cloud: 39, precip: 0 },
      { ora: "11:00", livelli: [{ alt: 2, temp: 16, wind: 8.7, dir: 175 }, { alt: 50, temp: 15.6, wind: 9.7, dir: 180 }, { alt: 120, temp: 15.1, wind: 10.7, dir: 185 }, { alt: 1000, temp: 14.4, wind: 11.7, dir: 190 }], cloud: 53, precip: 0 },
      { ora: "12:00", livelli: [{ alt: 2, temp: 16.3, wind: 9.8, dir: 172 }, { alt: 50, temp: 15.9, wind: 10.8, dir: 177 }, { alt: 120, temp: 15.4, wind: 11.8, dir: 182 }, { alt: 1000, temp: 14.7, wind: 12.8, dir: 187 }], cloud: 93, precip: 0 },
      { ora: "13:00", livelli: [{ alt: 2, temp: 16.6, wind: 9.1, dir: 171 }, { alt: 50, temp: 16.2, wind: 10.1, dir: 176 }, { alt: 120, temp: 15.7, wind: 11.1, dir: 181 }, { alt: 1000, temp: 15, wind: 12.1, dir: 186 }], cloud: 80, precip: 0 },
      { ora: "14:00", livelli: [{ alt: 2, temp: 16.8, wind: 8.9, dir: 166 }, { alt: 50, temp: 16.4, wind: 9.9, dir: 171 }, { alt: 120, temp: 15.9, wind: 10.9, dir: 176 }, { alt: 1000, temp: 15.2, wind: 11.9, dir: 181 }], cloud: 65, precip: 0 },
      { ora: "15:00", livelli: [{ alt: 2, temp: 16.5, wind: 8.1, dir: 167 }, { alt: 50, temp: 16.1, wind: 9.1, dir: 172 }, { alt: 120, temp: 15.6, wind: 10.1, dir: 177 }, { alt: 1000, temp: 14.9, wind: 11.1, dir: 182 }], cloud: 70, precip: 0 },
      { ora: "16:00", livelli: [{ alt: 2, temp: 16.2, wind: 6.3, dir: 167 }, { alt: 50, temp: 15.8, wind: 7.3, dir: 172 }, { alt: 120, temp: 15.3, wind: 8.3, dir: 177 }, { alt: 1000, temp: 14.6, wind: 9.3, dir: 182 }], cloud: 56, precip: 0 },
      { ora: "17:00", livelli: [{ alt: 2, temp: 15.4, wind: 2.5, dir: 172 }, { alt: 50, temp: 15, wind: 3.5, dir: 177 }, { alt: 120, temp: 14.5, wind: 4.5, dir: 182 }, { alt: 1000, temp: 13.8, wind: 5.5, dir: 187 }], cloud: 35, precip: 0 },
      { ora: "18:00", livelli: [{ alt: 2, temp: 14.4, wind: 4.1, dir: 345 }, { alt: 50, temp: 14, wind: 5.1, dir: 350 }, { alt: 120, temp: 13.5, wind: 6.1, dir: 355 }, { alt: 1000, temp: 12.8, wind: 7.1, dir: 360 }], cloud: 54, precip: 0 },
      { ora: "19:00", livelli: [{ alt: 2, temp: 14.1, wind: 5.4, dir: 356 }, { alt: 50, temp: 13.7, wind: 6.4, dir: 361 }, { alt: 120, temp: 13.2, wind: 7.4, dir: 366 }, { alt: 1000, temp: 12.5, wind: 8.4, dir: 371 }], cloud: 30, precip: 0 },
      { ora: "20:00", livelli: [{ alt: 2, temp: 13.9, wind: 5.4, dir: 356 }, { alt: 50, temp: 13.5, wind: 6.4, dir: 361 }, { alt: 120, temp: 13, wind: 7.4, dir: 366 }, { alt: 1000, temp: 12.3, wind: 8.4, dir: 371 }], cloud: 9, precip: 0 },
      { ora: "21:00", livelli: [{ alt: 2, temp: 13.8, wind: 5, dir: 360 }, { alt: 50, temp: 13.4, wind: 6, dir: 365 }, { alt: 120, temp: 12.9, wind: 7, dir: 370 }, { alt: 1000, temp: 12.2, wind: 8, dir: 375 }], cloud: 0, precip: 0 },
      { ora: "22:00", livelli: [{ alt: 2, temp: 13.7, wind: 5.1, dir: 356 }, { alt: 50, temp: 13.3, wind: 6.1, dir: 361 }, { alt: 120, temp: 12.8, wind: 7.1, dir: 366 }, { alt: 1000, temp: 12.1, wind: 8.1, dir: 371 }], cloud: 4, precip: 0 },
      { ora: "23:00", livelli: [{ alt: 2, temp: 13.6, wind: 5.1, dir: 352 }, { alt: 50, temp: 13.2, wind: 6.1, dir: 357 }, { alt: 120, temp: 12.7, wind: 7.1, dir: 362 }, { alt: 1000, temp: 12, wind: 8.1, dir: 367 }], cloud: 0, precip: 0 },
    ],
    stabilita: Array(72).fill(0.76),
    cloud_base: 2300,
    zero_iso: 3100,
    icone: { parapendio: true, nuvole: true, pioggia: true },
    colori: { instabile: "#ff4500", stabile: "#007bff", pioggia: "#003366" }
  }
];

interface SiteData {
  id: string;
  nome: string;
  quota_decollo: number;
  hours: string[];
  profilo_verticale: Array<{
    ora: string;
    livelli: Array<{ alt: number; temp: number | null; wind: number | null; dir: number | null }>;
    cloud: number;
    precip: number;
  }>;
  stabilita: number[];
  cloud_base: number;
  zero_iso: number;
  icone: { parapendio: boolean; nuvole: boolean; pioggia: boolean };
  colori: { instabile: string; stabile: string; pioggia: string };
}

// ── HELPERS ───────────────────────────────────────────────────────────────────
function getLevelColor(stability: number, precip: number, colori: { instabile: string; stabile: string; pioggia: string }): string {
  if (precip > 0) return colori.pioggia;
  if (stability < -0.3) return colori.stabile;
  if (stability > 0.5) return colori.instabile;
  return "#f59e0b"; // neutral yellow
}

function windBarbPath(x: number, y: number, speedKmh: number, dirDeg: number): string {
  if (!speedKmh || speedKmh <= 0.5) return '';
  const knots = speedKmh * 0.539957;
  const rad = ((dirDeg - 90) * Math.PI) / 180;
  const len = 32;
  const ex = x + len * Math.cos(rad);
  const ey = y + len * Math.sin(rad);
  let d = `M${x.toFixed(1)},${y.toFixed(1)} L${ex.toFixed(1)},${ey.toFixed(1)}`;
  const r = Math.round(knots / 5) * 5;
  let pos = 1.0, rem = r;
  while (rem >= 50 && pos >= 0.22) {
    const bx = x + pos * (ex - x), by = y + pos * (ey - y);
    const fa = rad + Math.PI * 0.55;
    const fx = bx + 13 * Math.cos(fa), fy = by + 13 * Math.sin(fa);
    const fx2 = bx + 6 * Math.cos(rad), fy2 = by + 6 * Math.sin(rad);
    d += ` M${bx.toFixed(1)},${by.toFixed(1)} L${fx.toFixed(1)},${fy.toFixed(1)} L${fx2.toFixed(1)},${fy2.toFixed(1)} Z`;
    rem -= 50; pos -= 0.2;
  }
  while (rem >= 10 && pos >= 0.18) {
    const bx = x + pos * (ex - x), by = y + pos * (ey - y);
    const fa = rad + Math.PI * 0.55;
    const fx = bx + 9 * Math.cos(fa), fy = by + 9 * Math.sin(fa);
    d += ` M${bx.toFixed(1)},${by.toFixed(1)} L${fx.toFixed(1)},${fy.toFixed(1)}`;
    rem -= 10; pos -= 0.15;
  }
  if (rem >= 5 && pos >= 0.18) {
    const bx = x + pos * (ex - x), by = y + pos * (ey - y);
    const fa = rad + Math.PI * 0.55;
    const fx = bx + 6 * Math.cos(fa), fy = by + 6 * Math.sin(fa);
    d += ` M${bx.toFixed(1)},${by.toFixed(1)} L${fx.toFixed(1)},${fy.toFixed(1)}`;
  }
  return d;
}

function interpolateLevel(livelli: SiteData['profilo_verticale'][number]['livelli'], alt: number) {
  const exact = livelli.find(l => l.alt === alt && l.temp !== null);
  if (exact) return exact;
  const valid = livelli.filter(l => l.temp !== null).sort((a, b) => a.alt - b.alt);
  if (valid.length < 2) {
    if (valid.length === 1) return { ...valid[0] };
    return { alt, temp: null, wind: null, dir: null } as any;
  }
  for (let i = 0; i < valid.length - 1; i++) {
    if (alt >= valid[i].alt && alt <= valid[i + 1].alt) {
      const t = (alt - valid[i].alt) / (valid[i + 1].alt - valid[i].alt);
      return {
        alt,
        temp: +(valid[i].temp! + (valid[i + 1].temp! - valid[i].temp!) * t).toFixed(2),
        wind: valid[i].wind! !== null && valid[i + 1].wind! !== null
          ? +(valid[i].wind! + (valid[i + 1].wind! - valid[i].wind!) * t).toFixed(2) : null,
        dir: valid[i].dir! !== null && valid[i + 1].dir! !== null
          ? Math.round(valid[i].dir! + (valid[i + 1].dir! - valid[i].dir!) * t) : null,
      };
    }
  }
  return valid[valid.length - 1];
}

function thermalCurveValue(hour: number): number {
  // sin curve peaking at 13:00
  return Math.sin(((hour - 6) / 24) * Math.PI * 2 - Math.PI / 2) * 0.5 + 0.5;
}

// ── COMPONENT ─────────────────────────────────────────────────────────────────
export default function AlpiumVerticalChart() {
  const [siteId, setSiteId] = useState('monte-cavallaria');
  const [hour, setHour] = useState(0);

  const site = useMemo(() => JSON_DATA.find(s => s.id === siteId)!, [siteId]);
  const data = site.profilo_verticale;
  const displayHours = data.slice(0, 24);

  const levels = [2, 50, 120, site.quota_decollo];
  const maxAlt = Math.max(site.cloud_base, site.zero_iso, site.quota_decollo + 800);
  const minAlt = site.quota_decollo;
  const range = maxAlt - minAlt;

  const yOf = (alt: number) => 70 + 500 - ((alt - minAlt) / range) * 500;
  const xOf = (i: number) => 55 + (i / 23) * 790;

  const cur = data[hour];
  const stab = site.stabilita[hour] ?? 0;
  const showRain = cur.precip > 0;
  const showFog = cur.cloud > 80;
  const showClouds = cur.cloud > 5;

  const bgColors = displayHours.map((h, i) =>
    getLevelColor(site.stabilita[i] ?? 0, h.precip, site.colori)
  );

  const thermalPeakHour = 13;
  const parabolaY = (i: number) => {
    // peak at 13, opens downward, between alt ranges
    const val = thermalCurveValue(i);
    // map to altitude band: minAlt + 5% to minAlt + 40% of range
    return yOf(minAlt + 0.05 * range + val * 0.35 * range);
  };

  return (
    <div className="bg-slate-100 min-h-screen p-3 font-mono">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap gap-3 items-center justify-between mb-3">
          <div>
            <h1 className="text-lg font-bold text-slate-900">{site.nome} — Profilo Verticale</h1>
            <p className="text-slate-500 text-xs">
              Decollo {site.quota_decollo}m · Cumuli {site.cloud_base}m · 0°C {site.zero_iso}m
            </p>
          </div>
          <div className="flex gap-2">
            <select value={siteId} onChange={e => { setSiteId(e.target.value); setHour(0); }}
              className="px-2 py-1 text-sm border rounded-lg bg-white shadow-sm">
              {JSON_DATA.map(s => (
                <option key={s.id} value={s.id}>{s.nome} ({s.quota_decollo}m)</option>
              ))}
            </select>
            <select value={hour} onChange={e => setHour(+e.target.value)}
              className="px-2 py-1 text-sm border rounded-lg bg-white shadow-sm min-w-[150px]">
              {displayHours.map((h, i) => (
                <option key={i} value={i}>
                  {h.ora} · {h.cloud}% NC · Δ={site.stabilita[i]?.toFixed(2)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Chart Card */}
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
          <svg width="100%" viewBox="0 0 900 620" className="block">
            <defs>
              <linearGradient id="stabGrad" x1="0%" y1="100%" x2="0%" y2="0%">
                <stop offset="0%" stopColor="#ff4500" />
                <stop offset="30%" stopColor="#ef4444" />
                <stop offset="50%" stopColor="#f59e0b" />
                <stop offset="70%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#1e3a8a" />
              </linearGradient>
            </defs>

            {/* Stability color columns */}
            {displayHours.map((h, i) => {
              const x = xOf(i);
              const w = 790 / 23;
              const col = getLevelColor(site.stabilita[i] ?? 0, h.precip, site.colori);
              return <rect key={i} x={x} y={70} width={w} height={500} fill={col} opacity={0.15} />;
            })}

            {/* Grid lines */}
            {Array.from({ length: Math.ceil(range / 200) + 1 }, (_, k) => {
              const alt = minAlt + k * 200;
              if (alt > maxAlt) return null;
              const y = yOf(alt);
              return (
                <g key={alt}>
                  <line x1={55} y1={y} x2={845} y2={y}
                    stroke={alt === minAlt ? "#475569" : "#e2e8f0"}
                    strokeWidth={alt === minAlt ? 1.5 : 0.5}
                    strokeDasharray={alt === minAlt ? '0' : '3,3'} />
                  <text x={50} y={y + 4} textAnchor="end" fontSize="10" fill="#94a3b8">{alt}m</text>
                </g>
              );
            })}

            {/* Time axis labels */}
            {displayHours.map((h, i) => (
              <g key={i}>
                <line x1={xOf(i)} y1={70} x2={xOf(i)} y2={570} stroke="#f1f5f9" strokeWidth={0.5} />
                <text x={xOf(i)} y={590} textAnchor="middle" fontSize="9" fill="#94a3b8">{h.ora}</text>
              </g>
            ))}

            {/* Zero termico — red dashed line */}
            {site.zero_iso > minAlt && site.zero_iso < maxAlt && (() => {
              const y = yOf(site.zero_iso);
              return (
                <g>
                  <line x1={55} y1={y} x2={845} y2={y} stroke="#ef4444" strokeWidth={2} strokeDasharray="8,4" />
                  <text x={840} y={y - 6} fontSize="10" fill="#ef4444" fontWeight="bold" textAnchor="end">0°C · {site.zero_iso}m</text>
                  {Array.from({ length: 10 }, (_, i) => (
                    <text key={i} x={65 + i * 78} y={y + 14} fontSize="8" fill="#ef4444" textAnchor="middle">❄</text>
                  ))}
                </g>
              );
            })()}

            {/* Base cumulo — white line */}
            {site.cloud_base > minAlt && site.cloud_base < maxAlt && (() => {
              const y = yOf(site.cloud_base);
              return (
                <g>
                  <line x1={55} y1={y} x2={845} y2={y} stroke="#fff" strokeWidth={3} filter="drop-shadow(0 0 3px rgba(0,0,0,0.5))" />
                  <line x1={55} y1={y} x2={845} y2={y} stroke="#94a3b8" strokeWidth={1} strokeDasharray="6,4" />
                  <text x={65} y={y - 8} fontSize="10" fill="#64748b" fontWeight="bold">Base cumulo · {site.cloud_base}m</text>
                  {Array.from({ length: 12 }, (_, i) => (
                    <g key={i} transform={`translate(${70 + i * 65}, ${y - 2})`}>
                      <ellipse cx={0} cy={0} rx={10} ry={5} fill="#fff" stroke="#cbd5e1" strokeWidth={0.5} />
                      <ellipse cx={9} cy={-4} rx={7} ry={3.5} fill="#fff" stroke="#cbd5e1" strokeWidth={0.5} />
                      <ellipse cx={-8} cy={-3} rx={7} ry={3.5} fill="#fff" stroke="#cbd5e1" strokeWidth={0.5} />
                    </g>
                  ))}
                </g>
              );
            })()}

            {/* Temperature profiles — all hours (light) */}
            <g strokeWidth={1} fill="none" opacity={0.2}>
              {displayHours.map((hd, hi) => {
                const pts = levels.map(alt => {
                  const l = interpolateLevel(hd.livelli, alt);
                  if (l.temp === null) return null;
                  return `${xOf(hi)},${yOf(alt)}`;
                }).filter(Boolean).join(' ');
                return pts ? <polyline key={hi} points={pts} stroke="#475569" /> : null;
              })}
            </g>

            {/* Current hour temperature profile (bold) */}
            {(() => {
              const pts = levels.map(alt => {
                const l = interpolateLevel(cur.livelli, alt);
                if (l.temp === null) return null;
                return `${xOf(hour)},${yOf(alt)}`;
              }).filter(Boolean).join(' ');
              return pts ? <polyline points={pts} stroke="#1e293b" strokeWidth={2.5} fill="none" /> : null;
            })()}

            {/* Wind barbs for each level of current hour */}
            {levels.map(alt => {
              const l = interpolateLevel(cur.livelli, alt);
              if (!l.wind || l.wind < 0.5) return null;
              const bx = xOf(hour) + 28;
              const by = yOf(alt);
              return (
                <g key={alt}>
                  <path d={windBarbPath(bx, by, l.wind!, l.dir ?? 0)}
                    stroke="#1e293b" strokeWidth={1.5} fill="none" />
                  <text x={bx + 18} y={by - 6} fontSize="8" fill="#475569" textAnchor="start">
                    {l.wind!.toFixed(0)} km/h {l.dir ?? 0}°
                  </text>
                  <text x={bx + 18} y={by + 5} fontSize="9" fill="#1e293b" fontWeight="bold">
                    {l.temp?.toFixed(1)}°C
                  </text>
                </g>
              );
            })}

            {/* Level altitude markers on left */}
            {levels.map(alt => {
              const y = yOf(alt);
              const isDecollo = alt === site.quota_decollo;
              return (
                <g key={alt}>
                  <line x1={55} y1={y} x2={845} y2={y} stroke="#cbd5e1" strokeWidth={0.5} strokeDasharray="2,4" />
                  <text x={48} y={y + 4} textAnchor="end" fontSize="11"
                    fill={isDecollo ? '#7c3aed' : '#334155'} fontWeight={isDecollo ? 'bold' : 'normal'}>
                    {alt}m{isDecollo ? ' ★' : ''}
                  </text>
                </g>
              );
            })}

            {/* ── SINUSOIDAL THERMAL CURVE ── */}
            <polyline
              points={displayHours.map((_, i) => `${xOf(i)},${parabolaY(i)}`).join(' ')}
              fill="none" stroke="#ff6b35" strokeWidth={2.5} opacity={0.7}
            />

            {/* ── PARAGLIDER ICON ── */}
            {(() => {
              const peakIdx = 13; // 13:00
              const px = xOf(peakIdx);
              const py = parabolaY(peakIdx);
              return (
                <g transform={`translate(${px}, ${py - 50})`}>
                  {/* Shadow */}
                  <ellipse cx={0} cy={45} rx={22} ry={7} fill="#000" opacity={0.06} />
                  {/* Canopy */}
                  <path d="M0,8 Q-38,-22 0,-52 Q38,-22 0,8 Z" fill="#7c3aed" stroke="#5b21b6" strokeWidth={2.5} />
                  {/* Lines */}
                  <path d="M-20,4 L0,20 M20,4 L0,20" stroke="#5b21b6" strokeWidth={1.5} />
                  {/* Pilot */}
                  <circle cx={0} cy={8} r={6} fill="#fff" stroke="#5b21b6" strokeWidth={2} />
                  {/* Label */}
                  <text x={0} y={-62} textAnchor="middle" fontSize="13" fill="#7c3aed" fontWeight="bold">DECOLLO</text>
                </g>
              );
            })()}

            {/* ── WEATHER ICONS above paraglider ── */}
            {(() => {
              const peakIdx = 13;
              const px = xOf(peakIdx);
              const py = parabolaY(peakIdx);
              return (
                <g transform={`translate(${px}, ${py - 130})`}>
                  {showClouds && (
                    <g>
                      {Array.from({ length: Math.max(1, Math.ceil(cur.cloud / 30)) }, (_, i) => (
                        <g key={i} transform={`translate(${(i - 1) * 44}, 0)`}>
                          <ellipse cx={0} cy={0} rx={16} ry={8} fill="#e2e8f0" stroke="#94a3b8" strokeWidth={1} />
                          <ellipse cx={14} cy={-6} rx={10} ry={5} fill="#e2e8f0" stroke="#94a3b8" strokeWidth={1} />
                          <ellipse cx={-14} cy={-5} rx={10} ry={5} fill="#e2e8f0" stroke="#94a3b8" strokeWidth={1} />
                        </g>
                      ))}
                      {showFog && (
                        <>
                          {[ -14, -7, 0].map(d => (
                            <line key={d} x1={-30} y1={d} x2={30} y2={d}
                              stroke="#94a3b8" strokeWidth={1.5} opacity={0.5} />
                          ))}
                        </>
                      )}
                    </g>
                  )}
                  {showRain && (
                    <g transform="translate(0, 16)">
                      <Droplets size={22} color="#3b82f6" />
                    </g>
                  )}
                  <text x={0} y={32} textAnchor="middle" fontSize="9" fill="#64748b">
                    {cur.cloud}% nuvole {showRain ? `· ${cur.precip}mm pioggia` : ''}
                  </text>
                </g>
              );
            })()}

            {/* Info box */}
            <g transform="translate(55, 70)">
              <rect x={0} y={0} width={270} height={100} rx={6} fill="#fff" stroke="#e2e8f0" strokeWidth={1} />
              <text x={10} y={20} fontSize="12" fill="#1e293b" fontWeight="bold">{cur.ora} · {site.quota_decollo}m</text>
              <text x={10} y={40} fontSize="10" fill="#475569">
                Temp: {(interpolateLevel(cur.livelli, site.quota_decollo).temp ?? '—')}°C
              </text>
              <text x={10} y={56} fontSize="10" fill="#475569">
                Vento: {interpolateLevel(cur.livelli, site.quota_decollo).wind?.toFixed(1) ?? '—'} km/h da {(interpolateLevel(cur.livelli, site.quota_decollo).dir ?? '—')}°
              </text>
              <text x={10} y={74} fontSize="11"
                fill={stab > 0.5 ? '#ef4444' : stab < -0.3 ? '#3b82f6' : '#f59e0b'} fontWeight="bold">
                Stabilità: {stab > 0.5 ? 'INSTABILE' : stab < -0.3 ? 'STABILE' : 'NEUTRO'} ({stab.toFixed(2)}°C/100m)
              </text>
              <text x={10} y={90} fontSize="10" fill="#94a3b8">
                Nuvole: {cur.cloud}% · Precip: {cur.precip}mm
              </text>
            </g>

            {/* Axes */}
            <line x1={55} y1={70} x2={55} y2={570} stroke="#334155" strokeWidth={1.5} />
            <line x1={55} y1={570} x2={845} y2={570} stroke="#334155" strokeWidth={1.5} />
            <text x={28} y={320} textAnchor="middle" transform="rotate(-90,28,320)"
              fontSize="11" fill="#334155" fontWeight="bold">Quota (m)</text>
            <text x={450} y={612} textAnchor="middle" fontSize="11" fill="#334155" fontWeight="bold">
              Tempo (ore)
            </text>
          </svg>
        </div>

        {/* Level detail cards */}
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          {levels.map(alt => {
            const l = interpolateLevel(cur.livelli, alt);
            const isDecollo = alt === site.quota_decollo;
            return (
              <div key={alt} className="bg-white rounded-lg border border-slate-200 p-3 shadow-sm">
                <h4 className="font-bold text-sm text-slate-800 mb-1">
                  {isDecollo ? '🪂 ' : '📍 '}{alt}m {isDecollo && '(DECOLLO)'}
                </h4>
                <div className="text-xs space-y-0.5">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Temp</span>
                    <span className="font-mono font-bold">{l.temp?.toFixed(1) ?? '—'}°C</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Vento</span>
                    <span className="font-mono font-bold">{l.wind?.toFixed(1) ?? '—'} km/h</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Dir</span>
                    <span className="font-mono font-bold">{l.dir ?? '—'}°</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
