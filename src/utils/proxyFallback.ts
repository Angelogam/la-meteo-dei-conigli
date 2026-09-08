"use client";

import { getMeteoBaseUrl } from "@/config/apiConfig";

/**
 * Fetches from the proxy first; if the proxy is unavailable falls back
 * to direct Open-Meteo so the app works both with and without the Node server.
 */
export async function fetchWithProxyFallback(urlPath: string, timeoutMs = 8000): Promise<Response> {
  const baseUrl = getMeteoBaseUrl();

  // Try proxy first
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(baseUrl + "?" + urlPath, { signal: controller.signal });
    clearTimeout(timeout);
    if (res.ok) return res;
  } catch {
    // Proxy unavailable – fall through to direct
  }

  // Fallback: direct Open-Meteo
  const directUrl = `https://api.open-meteo.com/v1/forecast?${urlPath}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(directUrl, { signal: controller.signal }).finally(() => clearTimeout(timeout));
}
