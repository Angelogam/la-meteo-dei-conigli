// Helper utilities to safely render comparison operators in JSX strings
export function lt(value: number, unit: string = "km/h"): string {
  return `< ${value}${unit ? " " + unit : ""}`;
}

export function gt(value: number, unit: string = "km/h"): string {
  return `> ${value}${unit ? " " + unit : ""}`;
}

export function lte(value: number, unit: string = "km/h"): string {
  return `≤ ${value}${unit ? " " + unit : ""}`;
}

export function gte(value: number, unit: string = "km/h"): string {
  return `≥ ${value}${unit ? " " + unit : ""}`;
}

export function range(start: number, end: number, unit: string = ""): string {
  if (unit) return `${start}-${end} ${unit}`;
  return `${start}-${end}`;
}