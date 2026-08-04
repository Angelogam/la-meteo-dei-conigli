import type { HourData } from "@/types/meteo";
import { DECOLLI } from "@/data/decolli";

export const SiteList = () => {
  return (
    <div>
      {DECOLLI.map((d) => (
        <div key={d.id}>{d.name}</div>
      ))}
    </div>
  );
};