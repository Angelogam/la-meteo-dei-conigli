async fetchWithFallback(lat: number, lon: number): Promise<{
    data: { hourly: MeteoHourly[]; current: MeteoCurrent; daily: MeteoDaily[]; model: string } | null;
    ok: boolean;
  }> {
    try {
      const data = await this.fetchWeather(lat, lon);
      return { data, ok: true };
    } catch (err) {
      console.error("⚠️ Errore Open-Meteo:", err);
      console.warn(`[weatherService] fetchWithFallback fallito per ${lat},${lon}:`, err);
      return { data: null, ok: false };
    }
  },