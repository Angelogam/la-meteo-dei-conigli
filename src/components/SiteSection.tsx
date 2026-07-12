"use client";

import { SiteList } from "./SiteList";
import type { HourData } from "@/types/meteo";

interface SiteSectionProps {
  selected: string;
  current: HourData | null;
  onSelect: (id: string) => void;
  weatherMap?: Record<string, HourData>;
}

export const SiteSection = ({ selected, current, onSelect, weatherMap = {} }: SiteSectionProps) => {
  return (
    <SiteList
      selected={selected}
      current={current}
      onSelect={onSelect}
      weatherMap={weatherMap}
    />
  );
};