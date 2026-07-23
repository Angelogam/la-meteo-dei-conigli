"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchWithFallback, clusterCoords } from "./meteoFetcher";
import { parseRawResponse, type ParsedMeteoData, type CurrentParsed } from "./meteoParser";

export const meteoKeys = {
  all: ["meteo"] as const,
  forecast: (lat: number, lon: number) => ["meteo", "forecast", lat.toFixed(4), lon.toFixed(4)] as const,
  batch: (coords: string) => ["meteo", "batch", coords] as const,
} as const;

export function useMeteoForecast(lat: number, lon: number) {
  return useQuery({
    queryKey: meteoKeys.forecast(lat, lon),
    queryFn: async ({ signal }) => {
      const { raw, source } = await fetchWithFallback(lat, lon, signal);
      if (!raw) throw new Error("Nessun dato ricevuto");
      const parsed = parseRawResponse(raw);
      if (!parsed) throw new Error("Errore parsing dati");
      return { ...parsed, source };
    },
    staleTime: 5 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
    retry: 2,
    enabled: lat != null && lon != null,
  });
}

export function useMeteoBatch(decolli: Array<{ id: string; lat: number; lon: number; name: string }>) {
  const queryClient = useQueryClient();
  const clusters = clusterCoords(decolli.map(d => ({ lat: d.lat, lon: d.lon })));
  
  const clusterQueries = clusters.map((cluster, idx) => {
    return useQuery({
      queryKey: meteoKeys.batch(`cluster:${cluster.center.lat.toFixed(4)}:${cluster.center.lon.toFixed(4)}`),
      queryFn: async ({ signal }) => {
        const { raw } = await fetchWithFallback(cluster.center.lat, cluster.center.lon, signal);
        const parsed = raw ? parseRawResponse(raw) : null;
        return { cluster: idx, data: parsed, sites: cluster.sites };
      },
      staleTime: 10 * 60 * 1000,
      refetchInterval: 15 * 60 * 1000,
      retry: 1,
    });
  });

  const decolliData: Record<string, { loading: boolean; data: CurrentParsed | null }> = {};
  for (const decollo of decolli) {
    const cluster = clusters.find(c => c.sites.some(s => s.lat === decollo.lat || s.lon === decollo.lon));
    const idx = clusters.indexOf(cluster!);
    const q = clusterQueries[idx];
    const parsed = q.data?.data;
    decolliData[decollo.id] = { loading: q.isLoading, data: parsed?.current ?? null };
    if (!q.data && !q.isLoading) {
      queryClient.prefetchQuery({
        queryKey: meteoKeys.forecast(decollo.lat, decollo.lon),
        queryFn: async ({ signal }) => {
          const { raw, source } = await fetchWithFallback(decollo.lat, decollo.lon, signal);
          const parsed = raw ? parseRawResponse(raw) : null;
          return parsed ? { ...parsed, source } : null;
        },
        staleTime: 5 * 60 * 1000,
      });
    }
  }

  return { decolliData, isLoading: clusterQueries.some(q => q.isLoading), isFetching: clusterQueries.some(q => q.isFetching) };
}

export async function fetchSingleForecast(lat: number, lon: number): Promise<ParsedMeteoData | null> {
  const { raw } = await fetchWithFallback(lat, lon);
  if (!raw) return null;
  return parseRawResponse(raw);
}