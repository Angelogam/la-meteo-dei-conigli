import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Activity, Droplets, Gauge, Thermometer, Wind } from "lucide-react";
import type { HourData } from "@/types/meteo";

interface DayStoryboardProps {
  dayData: HourData[];
  siteName: string;
  selectedHour: number;
  onHourSelect: (hour: number) => void;
}

type TimeRange = "giornata" | "mattina" | "centrale" | "pomeriggio";

interface ChartPoint {
  label: string;
  hour: number;
  temperature: number | null;
  dewPoint: number | null;
  windSpeed: number | null;
  windGusts: number | null;
  humidity: number | null;
  precipitation: number | null;
  cloudCover: number | null;
  windDir: number | null;
  wind80m: number | null;
  wind120m: number | null;
  precipitationProbability: number | null;
  cape: number | null;
  radiation: number | null;
}

const TIME_RANGES: { id: TimeRange; label: string; start: number; end: number }[] = [
  { id: "giornata", label: "Tutta la giornata", start: 7, end: 20 },
  { id: "mattina", label: "Mattina", start: 7, end: 11 },
  { id: "centrale", label: "Ore centrali", start: 12, end: 15 },
  { id: "pomeriggio", label: "Pomeriggio", start: 16, end: 20 },
];

const fmt = (value: number | null | undefined, digits = 1) =>
  value == null || !Number.isFinite(value) ? "N/D" : value.toFixed(digits);

function rangeTemperature(
  points: ChartPoint[],
  includeTemperature: boolean,
  includeDewPoint: boolean,
): [number, number] {
  const values = points.flatMap((point) => [
    includeTemperature ? point.temperature : null,
    includeDewPoint ? point.dewPoint : null,
  ]).filter((value): value is number => value != null && Number.isFinite(value));

  if (!values.length) return [0, 10];

  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const rawSpan = rawMax - rawMin;
  // Keep a little breathing room, but never flatten a normal afternoon trend
  // against the top of an axis widened by a hidden or unrelated series.
  const padding = Math.max(0.75, rawSpan * 0.16);
  let min = Math.floor(rawMin - padding);
  let max = Math.ceil(rawMax + padding);

  // A minimum useful range keeps small temperature changes visible without
  // making the scale misleadingly dramatic.
  if (max - min < 4) {
    const centre = (rawMin + rawMax) / 2;
    min = Math.floor(centre - 2);
    max = min + 4;
  }

  return [min, max];
}

function WeatherTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ payload?: ChartPoint; name?: string; value?: number | string | null; color?: string }>;
  label?: string | number;
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload;
  if (!point) return null;

  return (
    <div className="story-chart-tooltip">
      <div className="story-chart-tooltip-title">Ore {label}:00</div>
      <div className="story-tooltip-row"><span><i className="tooltip-dot is-temperature" />Vento al suolo</span><strong>{fmt(point.windSpeed, 0)} km/h</strong></div>
      <div className="story-tooltip-row"><span><i className="tooltip-dot is-dew" />Vento a 80 m</span><strong>{fmt(point.wind80m, 0)} km/h</strong></div>
      <div className="story-tooltip-row"><span><i className="tooltip-dot is-wind" />Vento medio</span><strong>{fmt(point.windSpeed, 0)} km/h</strong></div>
      <div className="story-tooltip-row"><span><i className="tooltip-dot is-gust" />Raffiche</span><strong>{fmt(point.windGusts, 0)} km/h</strong></div>
      <div className="story-tooltip-row"><span><i className="tooltip-dot is-humidity" />Vento a 120 m</span><strong>{fmt(point.wind120m, 0)} km/h</strong></div>
      <div className="story-tooltip-row"><span><i className="tooltip-dot is-cloud" />Nuvolosità</span><strong>{fmt(point.cloudCover, 0)}%</strong></div>
      <div className="story-tooltip-row"><span><i className="tooltip-dot is-rain" />Precipitazioni</span><strong>{fmt(point.precipitation, 1)} mm/h</strong></div>
      <div className="story-tooltip-row"><span><i className="tooltip-dot is-direction" />Direzione</span><strong>{point.windDir == null ? "N/D" : Math.round(point.windDir) + "°"}</strong></div>
    </div>
  );
}

export default function DayStoryboard({
  dayData,
  siteName,
  selectedHour,
  onHourSelect,
}: DayStoryboardProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>("giornata");
  const [showTemperature, setShowTemperature] = useState(true);
  const [showDewPoint, setShowDewPoint] = useState(false);
  const [showWind, setShowWind] = useState(true);
  const [showGusts, setShowGusts] = useState(true);

  const allPoints = useMemo<ChartPoint[]>(() => dayData
    .map((item) => {
      const date = new Date(item.time);
      const hour = date.getHours();
      return {
        label: String(hour).padStart(2, "0"),
        hour,
        temperature: item.temperature,
        dewPoint: item.dewPoint,
        windSpeed: item.windSpeed,
        windGusts: item.windGusts,
        humidity: item.humidity,
        precipitation: item.precipitation,
        cloudCover: item.cloudCover,
        windDir: item.windDir,
      wind80m: item.windSpeed80m ?? null,
      wind120m: item.windSpeed120m ?? null,
      precipitationProbability: item.precipitationProba ?? null,
      cape: item.cape ?? null,
      radiation: item.radiation ?? null,
      };
    })
    .filter((item) => item.hour >= 7 && item.hour <= 20)
    .sort((a, b) => a.hour - b.hour), [dayData]);

  const activeRange = TIME_RANGES.find((range) => range.id === timeRange) ?? TIME_RANGES[0];
  const chartData = allPoints.filter((point) => point.hour >= activeRange.start && point.hour <= activeRange.end);
  const temperatureDomain = (() => { const vals = chartData.flatMap(p => [p.windSpeed, p.wind80m, p.wind120m]).filter((v): v is number => v != null && Number.isFinite(v)); return [0, Math.max(10, Math.ceil(Math.max(0, ...vals) / 5) * 5)] as [number, number]; })();
  const windValues = chartData.flatMap((point) => [point.windSpeed, point.windGusts])
    .filter((value): value is number => value != null && Number.isFinite(value));
  const windDomain = Math.max(5, Math.ceil(Math.max(0, ...windValues) / 5) * 5);
  const maxTemperature = chartData.map((point) => point.windSpeed).filter((v): v is number => v != null && Number.isFinite(v));
  const maxWind = chartData.map((point) => point.windSpeed).filter((v): v is number => v != null && Number.isFinite(v));
  const maxGust = chartData.map((point) => point.windGusts).filter((v): v is number => v != null && Number.isFinite(v));
  const selectedPoint = chartData.find((point) => point.hour === selectedHour) ?? null;
  const hasTemperature = chartData.some((point) => point.windSpeed != null || point.wind80m != null || point.wind120m != null);
  const hasWind = chartData.some((point) => point.windSpeed != null || point.windGusts != null);

  const chooseRange = (range: typeof TIME_RANGES[number]) => {
    setTimeRange(range.id);
    const first = allPoints.find((point) => point.hour >= range.start && point.hour <= range.end);
    if (first) onHourSelect(first.hour);
  };

  const chooseChartHour = (state: { activeLabel?: string | number } | null | undefined) => {
    if (state?.activeLabel == null) return;
    const hour = Number(state.activeLabel);
    if (Number.isInteger(hour) && hour >= 0 && hour <= 23) onHourSelect(hour);
  };

  const tickInterval = chartData.length > 10 ? 1 : 0;

  return (
    <section className="storyboard-panel" aria-labelledby="storyboard-title">
      <div className="storyboard-heading">
        <div>
          <p className="storyboard-eyebrow">METEO PER IL VOLO LIBERO · ORA PER ORA</p>
          <h2 id="storyboard-title">Quando e come cambia il vento a {siteName}</h2>
          <p className="storyboard-subtitle">Confronta vento al suolo e ai primi livelli, raffiche e rotazione del vento. I dati in quota sono mostrati solo quando il modello li fornisce.</p>
        </div>
        <div className="storyboard-live-stat">
          <span className="story-live-indicator" />
          {chartData.length ? chartData.length + " ore disponibili" : "In attesa dei dati"}
        </div>
      </div>

      {!allPoints.length ? (
        <div className="storyboard-empty" role="status">
          Le previsioni orarie non sono ancora disponibili. Riprova tra poco.
        </div>
      ) : (
        <>
          <div className="storyboard-control-row">
            <div className="story-range-controls" role="group" aria-label="Intervallo temporale del grafico">
              {TIME_RANGES.map((range) => (
                <button
                  key={range.id}
                  type="button"
                  className={timeRange === range.id ? "is-active" : ""}
                  aria-pressed={timeRange === range.id}
                  onClick={() => chooseRange(range)}
                >
                  {range.label}
                </button>
              ))}
            </div>
            <div className="story-series-controls" role="group" aria-label="Mostra o nascondi serie">
              <button type="button" className={showTemperature ? "is-on temperature-toggle" : "temperature-toggle"} aria-pressed={showTemperature} onClick={() => setShowTemperature((value) => !value)}>
                <i />Suolo
              </button>
              <button type="button" className={showDewPoint ? "is-on dew-toggle" : "dew-toggle"} aria-pressed={showDewPoint} onClick={() => setShowDewPoint((value) => !value)}>
                <i />Quota 80/120 m
              </button>
              <button type="button" className={showWind ? "is-on wind-toggle" : "wind-toggle"} aria-pressed={showWind} onClick={() => setShowWind((value) => !value)}>
                <i />Vento
              </button>
              <button type="button" className={showGusts ? "is-on gust-toggle" : "gust-toggle"} aria-pressed={showGusts} onClick={() => setShowGusts((value) => !value)}>
                <i />Raffiche
              </button>
            </div>
          </div>

          <div className="story-chart-stats">
            <div className="story-chart-stat">
              <span className="story-stat-icon is-temp"><Thermometer aria-hidden="true" /></span>
              <span><small>Vento max al suolo</small><strong>{maxTemperature.length ? Math.max(...maxTemperature).toFixed(0) + " km/h" : "N/D"}</strong></span>
            </div>
            <div className="story-chart-stat">
              <span className="story-stat-icon is-wind"><Wind aria-hidden="true" /></span>
              <span><small>Vento max · intervallo</small><strong>{maxWind.length ? Math.max(...maxWind).toFixed(0) + " km/h" : "N/D"}</strong></span>
            </div>
            <div className="story-chart-stat">
              <span className="story-stat-icon is-gust"><Activity aria-hidden="true" /></span>
              <span><small>Raffica max · intervallo</small><strong>{maxGust.length ? Math.max(...maxGust).toFixed(0) + " km/h" : "N/D"}</strong></span>
            </div>
          </div>

          <div className="story-chart-grid">
            <section className="story-chart-module temperature-module" aria-labelledby="temperature-chart-title">
              <div className="story-chart-module-heading">
                <div><span className="story-module-kicker">GRADIENTE DEL VENTO</span><h3 id="temperature-chart-title">Vento al suolo e ai primi livelli</h3></div>
                <span className="story-module-unit">km/h</span>
              </div>
              {hasTemperature ? (
                <div className="story-recharts-area" role="img" aria-label="Confronto interattivo della velocità del vento al suolo, a 80 metri e a 120 metri. Seleziona un punto per cambiare l’ora del briefing.">
                  <ResponsiveContainer width="100%" height={250}>
                    <AreaChart data={chartData} syncId="weather-hours" margin={{ top: 8, right: 12, bottom: 0, left: -14 }} onClick={(state) => chooseChartHour(state)}>
                      <defs>
                        <linearGradient id="temperatureFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#fb923c" stopOpacity={0.28} />
                          <stop offset="95%" stopColor="#fb923c" stopOpacity={0.01} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid vertical={false} stroke="rgba(133,164,191,.13)" strokeDasharray="3 5" />
                      <XAxis dataKey="label" tick={{ fill: "#8ca6bd", fontSize: 11 }} tickLine={false} axisLine={{ stroke: "rgba(133,164,191,.18)" }} interval={tickInterval} />
                      <YAxis yAxisId="temperature" type="number" domain={temperatureDomain} tick={{ fill: "#8ca6bd", fontSize: 10 }} tickLine={false} axisLine={false} width={43} />
                      <Tooltip content={<WeatherTooltip />} cursor={{ stroke: "rgba(148,210,239,.4)", strokeDasharray: "4 4" }} />
                      {selectedPoint && <ReferenceLine x={selectedPoint.label} stroke="#72d9f7" strokeDasharray="4 4" strokeOpacity={0.8} yAxisId="temperature" />}
                      {showTemperature && <Area yAxisId="temperature" type="monotone" dataKey="windSpeed" name="Vento al suolo" stroke="#34d399" strokeWidth={2.5} fill="url(#temperatureFill)" connectNulls={false} activeDot={{ r: 4, fill: "#34d399" }} isAnimationActive={false} />}{showDewPoint && <Line yAxisId="temperature" type="monotone" dataKey="wind80m" name="Vento a 80 m" stroke="#38bdf8" strokeWidth={2} dot={false} connectNulls={false} isAnimationActive={false} />}{showDewPoint && <Line yAxisId="temperature" type="monotone" dataKey="wind120m" name="Vento a 120 m" stroke="#c4b5fd" strokeWidth={2} strokeDasharray="5 4" dot={false} connectNulls={false} isAnimationActive={false} />}{!showTemperature && showDewPoint && <Line yAxisId="temperature" type="monotone" dataKey="wind80m" name="Vento a 80 m" stroke="#38bdf8" strokeWidth={2} dot={false} connectNulls={false} isAnimationActive={false} />}{!showTemperature && !showDewPoint && <Line yAxisId="temperature" type="monotone" dataKey="wind120m" name="Vento a 120 m" stroke="#c4b5fd" strokeWidth={2} dot={false} connectNulls={false} isAnimationActive={false} />}
                      {showDewPoint && <Line yAxisId="temperature" type="monotone" dataKey="dewPoint" name="Punto di rugiada" stroke="#38bdf8" strokeWidth={2} strokeDasharray="5 4" dot={false} activeDot={{ r: 4, stroke: "#e0f2fe", strokeWidth: 2, fill: "#38bdf8" }} connectNulls={false} isAnimationActive={false} />}
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="storyboard-empty compact" role="status">Temperature non disponibili per l’intervallo scelto.</div>
              )}
            </section>

            <section className="story-chart-module wind-module" aria-labelledby="wind-chart-title">
              <div className="story-chart-module-heading">
                <div><span className="story-module-kicker">RAFFICHE E VARIAZIONI</span><h3 id="wind-chart-title">Vento medio contro raffiche</h3></div>
                <span className="story-module-unit">km/h</span>
              </div>
              {hasWind ? (
                <div className="story-recharts-area" role="img" aria-label="Grafico a barre interattivo di vento medio e raffiche. Seleziona un’ora per aggiornare il briefing.">
                  <ResponsiveContainer width="100%" height={170}>
                    <BarChart data={chartData} syncId="weather-hours" margin={{ top: 8, right: 12, bottom: 0, left: -14 }} barGap={3} onClick={(state) => chooseChartHour(state)}>
                      <CartesianGrid vertical={false} stroke="rgba(133,164,191,.13)" strokeDasharray="3 5" />
                      <XAxis dataKey="label" tick={{ fill: "#8ca6bd", fontSize: 11 }} tickLine={false} axisLine={{ stroke: "rgba(133,164,191,.18)" }} interval={tickInterval} />
                      <YAxis domain={[0, windDomain]} tick={{ fill: "#8ca6bd", fontSize: 10 }} tickLine={false} axisLine={false} width={43} unit="" />
                      <Tooltip content={<WeatherTooltip />} cursor={{ fill: "rgba(56,189,248,.06)" }} />
                      {selectedPoint && <ReferenceLine x={selectedPoint.label} stroke="#72d9f7" strokeDasharray="4 4" strokeOpacity={0.8} />}
                      {showWind && <Bar dataKey="windSpeed" name="Vento medio" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={18} isAnimationActive={false} />}
                      {showGusts && <Bar dataKey="windGusts" name="Raffiche" fill="#60a5fa" radius={[4, 4, 0, 0]} maxBarSize={18} isAnimationActive={false} />}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="storyboard-empty compact" role="status">Vento non disponibile per l’intervallo scelto.</div>
              )}
            </section>
          </div>

          {selectedPoint && (
            <div className="story-selected-hour" aria-live="polite">
              <div className="story-selected-hour-title"><span>ORA SELEZIONATA</span><strong>{selectedPoint.label}:00</strong></div>
              <div className="story-selected-value"><Thermometer aria-hidden="true" /><span>Vento a 80 m</span><strong>{fmt(selectedPoint.wind80m, 0)} km/h</strong></div>
              <div className="story-selected-value"><Droplets aria-hidden="true" /><span>Vento a 120 m</span><strong>{fmt(selectedPoint.wind120m, 0)} km/h</strong></div>
              <div className="story-selected-value"><Wind aria-hidden="true" /><span>Vento</span><strong>{fmt(selectedPoint.windSpeed, 0)} km/h</strong></div>
              <div className="story-selected-value"><Gauge aria-hidden="true" /><span>Direzione</span><strong>{selectedPoint.windDir == null ? "N/D" : Math.round(selectedPoint.windDir) + "°"}</strong></div>
            </div>
          )}

          <div className="story-hour-buttons" role="group" aria-label="Seleziona un’ora">
            {chartData.map((point) => (
              <button
                type="button"
                key={point.label}
                className={point.hour === selectedHour ? "active" : ""}
                aria-pressed={point.hour === selectedHour}
                aria-label={"Seleziona le condizioni delle ore " + point.label}
                onClick={() => onHourSelect(point.hour)}
              >
                <span>{point.label}</span>
                <b>{point.temperature == null ? "—" : Math.round(point.temperature) + "°"}</b>
                <small>{point.windSpeed == null ? "—" : Math.round(point.windSpeed) + " km/h"}</small>
              </button>
            ))}
          </div>

          <p className="storyboard-disclaimer">Vento a 80/120 m disponibile solo se presente nei dati del modello: non equivale al vento reale lungo tutta la traiettoria. Per scegliere il decollo confronta anche direzione rispetto all’esposizione, windgram verticale, raffiche, gradiente e bollettini locali. Nessun indicatore sostituisce la valutazione del pilota.</p>
        </>
      )}
    </section>
  );
}
