import * as d3 from "d3";

interface CloudBasePoint {
  hour: number;
  base: number;
}

export function drawCloudBaseCurve(
  svgElement: SVGSVGElement,
  data: CloudBasePoint[],
  width: number,
  height: number
) {
  const svg = d3.select(svgElement);
  svg.selectAll("*").remove(); // Clear previous content

  const margin = { top: 10, right: 10, bottom: 10, left: 10 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  // Scale x: ora (6-19) -> larghezza
  const x = d3.scaleLinear()
    .domain([6, 19])
    .range([0, innerWidth]);

  // Scale y: quota (0 - max base) -> altezza (invertita)
  const maxBase = d3.max(data, d => d.base) || 2500;
  const y = d3.scaleLinear()
    .domain([0, maxBase])
    .range([innerHeight, 0]);

  // Curva liscia con CatmullRom per transizioni armonic
  const line = d3.line<CloudBasePoint>()
    .x(d => x(d.hour))
    .y(d => y(d.base))
    .curve(d3.curveCatmullRom.alpha(0.5));

  // Area gialla sotto la curva (termica attiva) - RIEMPIE SOLO FINO ALLA CURVA
  const area = d3.area<CloudBasePoint>()
    .x(d => x(d.hour))
    .y0(innerHeight) // Parte dal basso (decollo)
    .y1(d => y(d.base)) // Sale fino alla base cumul
    .curve(d3.curveCatmullRom.alpha(0.5));

  // Sfondo giallo termica (fino a base cumuli)
  g.append("path")
    .datum(data)
    .attr("fill", "rgba(253, 224, 71, 0.35)")
    .attr("stroke", "none")
    .attr("d", area);

  // Linea base cumuli (arancione)
  g.append("path")
    .datum(data)
    .attr("fill", "none")
    .attr("stroke", "#f97316")
    .attr("stroke-width", 2.5)
    .attr("stroke-linecap", "round")
    .attr("d", line);

  // Pallini di riferimento
  g.selectAll(".cloud-dot")
    .data(data)
    .enter()
    .append("circle")
    .attr("cx", d => x(d.hour))
    .attr("cy", d => y(d.base))
    .attr("r", 3)
    .attr("fill", "#ea580c")
    .attr("stroke", "#fff")
    .attr("stroke-width", 1);
}

// Genera dati nuvola per una giornata tipo
export function generateCloudBaseData(
  hourlyMap: Map<number, { temperature: number; dewPoint: number }>,
  altitude: number
): CloudBasePoint[] {
  const points: CloudBasePoint[] = [];
  
  for (let hr = 6; hr <= 19; hr++) {
    const h = hourlyMap.get(hr);
    if (h && h.temperature != null && h.dewPoint != null) {
      const spread = Math.max(1, h.temperature - h.dewPoint);
      const lcl = Math.round(altitude + spread * 125);
      
      // Fattore diurn0: picco termico a 13:00
      let diurnalFactor = 0;
      if (hr >= 8 && hr <= 18) {
        const hoursFromPeak = Math.abs(hr - 13);
        if (hoursFromPeak <= 5) {
          diurnalFactor = Math.max(0, Math.cos((hoursFromPeak / 5) * (Math.PI / 2)));
        }
      }
      
      // Base nuvola: pi bassa la mattina, pi alta al picco termico
      const baseVariation = 800 * diurnalFactor;
      const cloudBase = Math.min(3500, Math.max(altitude + 400, lcl + baseVariation));
      
      points.push({ hour: hr, base: cloudBase });
    } else {
      // Valori stimati se non ci sono dati
      points.push({ hour: hr, base: altitude + 600 });
    }
  }
  
  return points;
}