import { expect, test } from "@playwright/test";

test.describe("API smoke and contract checks", () => {
  test("API root exposes metadata and routes", async ({ request }) => {
    const response = await request.get("/api");
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.service).toContain("Meteo dei Conigli");
    expect(body.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(body.endpoints).toEqual(expect.arrayContaining([
      expect.objectContaining({ method: "GET", path: "/api/health" }),
      expect.objectContaining({ method: "GET", path: "/api/openapi" }),
    ]));
  });

  test("API version stays consistent across root, health and OpenAPI", async ({ request }) => {
    const [rootResponse, healthResponse, openApiResponse] = await Promise.all([
      request.get("/api"),
      request.get("/api/health"),
      request.get("/api/openapi"),
    ]);

    expect(rootResponse.status()).toBe(200);
    expect(healthResponse.status()).toBe(200);
    expect(openApiResponse.status()).toBe(200);

    const [root, health, openApi] = await Promise.all([
      rootResponse.json(),
      healthResponse.json(),
      openApiResponse.json(),
    ]);

    expect(health.version).toBe(root.version);
    expect(openApi.info.version).toBe(root.version);
  });

  test("health reports an ISO timestamp without claiming upstream availability", async ({ request }) => {
    const response = await request.get("/api/health");
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.status).toBe("healthy");
    expect(Number.isNaN(Date.parse(body.timestamp))).toBe(false);
    expect(body.checks.upstreamProviders).toBe("not_checked");
  });

  test("OpenAPI document includes key API routes", async ({ request }) => {
    const response = await request.get("/api/openapi");
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.openapi).toBe("3.1.0");
    expect(body.paths["/open-meteo"].get).toBeTruthy();
    expect(body.paths["/windy-soundings"].get).toBeTruthy();
    expect(body.paths["/people"].post).toBeTruthy();
    expect(body.paths["/people/{id}"].get).toBeTruthy();

    const weatherParameters = body.paths["/open-meteo"].get.parameters;
    const documentedWeatherParameters = weatherParameters.map((parameter: { name: string }) => parameter.name);
    expect(documentedWeatherParameters).toEqual(expect.arrayContaining([
      "latitude", "longitude", "current", "hourly", "daily", "timezone",
      "models", "start_date", "end_date", "forecast_days", "forecast_hours",
      "temperature_unit", "wind_speed_unit", "precipitation_unit",
    ]));
    expect(body.paths["/windy-soundings"].get.responses["504"]).toBeTruthy();
  });

  test("Open-Meteo rejects missing coordinates", async ({ request }) => {
    expect((await request.get("/api/open-meteo")).status()).toBe(400);
  });

  test("Open-Meteo rejects unsupported query parameters instead of silently ignoring them", async ({ request }) => {
    const response = await request.get("/api/open-meteo?latitude=44&longitude=7&debug=true");
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.statusMessage ?? body.message).toContain("parametri non supportati");
  });

  test("Open-Meteo rejects repeated query parameters as ambiguous", async ({ request }) => {
    expect((await request.get("/api/open-meteo?latitude=44&latitude=45&longitude=7")).status()).toBe(400);
    expect((await request.get("/api/open-meteo?latitude=44&longitude=7&hourly=temperature_2m&hourly=wind_speed_10m")).status()).toBe(400);
  });

  test("Open-Meteo rejects repeated date and unit parameters", async ({ request }) => {
    const urls = [
      "/api/open-meteo?latitude=44&longitude=7&start_date=2026-10-11&start_date=2026-10-12",
      "/api/open-meteo?latitude=44&longitude=7&wind_speed_unit=kmh&wind_speed_unit=ms",
      "/api/open-meteo?latitude=44&longitude=7&forecast_days=2&forecast_days=3",
    ];

    const responses = await Promise.all(urls.map((url) => request.get(url)));
    for (const response of responses) {
      expect(response.status()).toBe(400);
    }
  });

  test("Open-Meteo rejects out-of-range latitude", async ({ request }) => {
    expect((await request.get("/api/open-meteo?latitude=91&longitude=7")).status()).toBe(400);
  });

  test("Open-Meteo rejects out-of-range longitude", async ({ request }) => {
    expect((await request.get("/api/open-meteo?latitude=44&longitude=181")).status()).toBe(400);
  });

  test("Open-Meteo rejects non-numeric coordinates", async ({ request }) => {
    expect((await request.get("/api/open-meteo?latitude=north&longitude=7")).status()).toBe(400);
  });

  test("Open-Meteo rejects oversized query parameters", async ({ request }) => {
    const oversizedHourly = "temperature_2m,".repeat(300);
    const response = await request.get(`/api/open-meteo?latitude=44&longitude=7&hourly=${encodeURIComponent(oversizedHourly)}`);
    expect(response.status()).toBe(400);
  });

  test("Open-Meteo rejects invalid forecast day ranges", async ({ request }) => {
    expect((await request.get("/api/open-meteo?latitude=44&longitude=7&forecast_days=0")).status()).toBe(400);
    expect((await request.get("/api/open-meteo?latitude=44&longitude=7&forecast_days=abc")).status()).toBe(400);
  });

  test("Open-Meteo rejects malformed and out-of-range forecast hours", async ({ request }) => {
    expect((await request.get("/api/open-meteo?latitude=44&longitude=7&forecast_hours=abc")).status()).toBe(400);
    expect((await request.get("/api/open-meteo?latitude=44&longitude=7&forecast_hours=1.5")).status()).toBe(400);
    expect((await request.get("/api/open-meteo?latitude=44&longitude=7&forecast_hours=0")).status()).toBe(400);
    expect((await request.get("/api/open-meteo?latitude=44&longitude=7&forecast_hours=385")).status()).toBe(400);
  });

  test("Open-Meteo rejects unsupported measurement units", async ({ request }) => {
    expect((await request.get("/api/open-meteo?latitude=44&longitude=7&wind_speed_unit=knots")).status()).toBe(400);
    expect((await request.get("/api/open-meteo?latitude=44&longitude=7&temperature_unit=kelvin")).status()).toBe(400);
  });

  test("Open-Meteo validates ISO dates and date range ordering", async ({ request }) => {
    expect((await request.get("/api/open-meteo?latitude=44&longitude=7&start_date=2026-02-30")).status()).toBe(400);
    expect((await request.get("/api/open-meteo?latitude=44&longitude=7&end_date=2026%2F10%2F11")).status()).toBe(400);
    expect((await request.get("/api/open-meteo?latitude=44&longitude=7&start_date=2026-10-12&end_date=2026-10-11")).status()).toBe(400);
  });

  test("Windy sounding sites have valid coordinates", async ({ request }) => {
    const response = await request.get("/api/windy-soundings?action=sites");
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(Array.isArray(body.sites)).toBe(true);
    expect(body.sites.length).toBeGreaterThan(0);
    for (const site of body.sites) {
      expect(site.name).toEqual(expect.any(String));
      expect(site.lat).toBeGreaterThanOrEqual(-90);
      expect(site.lat).toBeLessThanOrEqual(90);
      expect(site.lon).toBeGreaterThanOrEqual(-180);
      expect(site.lon).toBeLessThanOrEqual(180);
      expect(site.elevation).toEqual(expect.any(Number));
    }
  });

  test("static Windy sounding metadata is edge-cacheable", async ({ request }) => {
    const [sitesResponse, siteResponse, metadataResponse] = await Promise.all([
      request.get("/api/windy-soundings?action=sites"),
      request.get("/api/windy-soundings?site=montoso-decollo-basso"),
      request.get("/api/windy-soundings"),
    ]);

    for (const response of [sitesResponse, siteResponse, metadataResponse]) {
      expect(response.status()).toBe(200);
      expect(response.headers()["cache-control"]).toContain("s-maxage=3600");
      expect(response.headers()["cache-control"]).toContain("stale-while-revalidate=86400");
    }
  });

  test("known sounding site slug resolves despite accents and punctuation", async ({ request }) => {
    const response = await request.get("/api/windy-soundings?site=montoso-decollo-basso");
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.site.name).toContain("Montoso");
    expect(body.config.lat).toBeCloseTo(44.764372, 5);
  });

  test("unknown sounding site returns 404", async ({ request }) => {
    expect((await request.get("/api/windy-soundings?site=not-a-real-site")).status()).toBe(404);
  });

  test("Windy rejects unsupported actions and unknown query parameters", async ({ request }) => {
    expect((await request.get("/api/windy-soundings?action=invalid")).status()).toBe(400);
    expect((await request.get("/api/windy-soundings?debug=true")).status()).toBe(400);
  });

  test("Windy rejects repeated and conflicting query parameters", async ({ request }) => {
    expect((await request.get("/api/windy-soundings?action=sites&action=plugin")).status()).toBe(400);
    expect((await request.get("/api/windy-soundings?action=sites&site=montoso-decollo-basso")).status()).toBe(400);
  });

  test("people API rejects negative offset", async ({ request }) => {
    expect((await request.get("/api/people?offset=-1")).status()).toBe(400);
  });

  test("people API rejects non-numeric limit", async ({ request }) => {
    expect((await request.get("/api/people?limit=abc")).status()).toBe(400);
  });

  test("people API rejects page size above maximum", async ({ request }) => {
    expect((await request.get("/api/people?limit=101")).status()).toBe(400);
  });

  test("people API rejects unsupported list query parameters", async ({ request }) => {
    expect((await request.get("/api/people?debug=true")).status()).toBe(400);
  });

  test("person detail returns 404 for an unknown id", async ({ request }) => {
    const response = await request.get("/api/people/person-does-not-exist-api-test");
    expect(response.status()).toBe(404);
    const body = await response.json();
    expect(body.statusCode ?? body.status).toBe(404);
  });

  test("people API rejects unsupported payload fields", async ({ request }) => {
    const response = await request.post("/api/people", { data: { name: "API test", unexpected: true } });
    expect(response.status()).toBe(400);
  });

  test("people API rejects an empty JSON object", async ({ request }) => {
    const response = await request.post("/api/people", { data: {} });
    expect(response.status()).toBe(400);
  });

  test("people API rejects invalid email without creating a record", async ({ request }) => {
    const response = await request.post("/api/people", { data: { name: "API test", email: "not-an-email" } });
    expect(response.status()).toBe(400);
  });

  test("people API rejects non-string fields", async ({ request }) => {
    const response = await request.post("/api/people", { data: { name: "API test", phone: 12345 } });
    expect(response.status()).toBe(400);
  });
});

test.describe("Aerologia endpoints (volabilita, termiche, venti-decollo)", () => {
  const BASE = "?latitude=44.76&longitude=7.25";

  test("volabilita returns a 1-10 index with motivations", async ({ request }) => {
    const response = await request.get(`/api/volabilita${BASE}&altitude=1300&exposure=S`);
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.data.indice).toBeGreaterThanOrEqual(1);
    expect(body.data.indice).toBeLessThanOrEqual(10);
    expect(typeof body.data.label).toBe("string");
    expect(["ottimo", "buono", "discreto", "impegnativo", "rischioso", "pericoloso"]).toContain(body.data.severity);
    expect(Array.isArray(body.data.motivi)).toBe(true);
    expect(["frontale", "diagonale", "laterale", "di_coda", "sconosciuto"]).toContain(body.data.windRelativo);
    expect(body.data.baseNubiM).toBeGreaterThan(0);
    expect(body.meta.source).toBe("open-meteo");
  });

  test("volabilita rejects missing coordinates and unknown parameters", async ({ request }) => {
    expect((await request.get("/api/volabilita")).status()).toBe(400);
    expect((await request.get("/api/volabilita?latitude=44&longitude=7&debug=true")).status()).toBe(400);
    expect((await request.get("/api/volabilita?latitude=91&longitude=7")).status()).toBe(400);
    expect((await request.get("/api/volabilita?latitude=44&latitude=45&longitude=7")).status()).toBe(400);
  });

  test("volabilita rejects invalid exposure", async ({ request }) => {
    expect((await request.get(`/api/volabilita${BASE}&exposure=XYZ`)).status()).toBe(400);
  });

  test("termiche returns hourly series with best window", async ({ request }) => {
    const response = await request.get(`/api/termiche${BASE}&altitude=1300&days=1`);
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(Array.isArray(body.data.ore)).toBe(true);
    for (const ora of body.data.ore.slice(0, 5)) {
      expect(typeof ora.rateo).toBe("number");
      expect(ora.rateo).toBeGreaterThanOrEqual(0);
      expect(ora.rateo).toBeLessThanOrEqual(4.5);
      expect(ora.top).toBeGreaterThan(ora.base);
      expect(ora.forza).toBeLessThanOrEqual(10);
    }
    expect(body.data.finestraMigliore === null || typeof body.data.finestraMigliore.rateoMs === "number").toBe(true);
  });

  test("termiche rejects out-of-range days and coordinates", async ({ request }) => {
    expect((await request.get(`/api/termiche${BASE}&days=4`)).status()).toBe(400);
    expect((await request.get(`/api/termiche${BASE}&days=0`)).status()).toBe(400);
    expect((await request.get(`/api/termiche?latitude=44&longitude=181`)).status()).toBe(400);
  });

  test("venti-decollo classifies wind relative to exposure", async ({ request }) => {
    const response = await request.get(`/api/venti-decollo${BASE}&exposure=SO`);
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(["frontale", "diagonale", "laterale", "di_coda", "sconosciuto"]).toContain(body.data.windRelativo);
    expect(["ideale", "buono", "attenzione", "sconsigliato", "pericoloso"]).toContain(body.data.classificazione);
    expect(typeof body.data.decolloConsigliato).toBe("boolean");
    expect(body.data.direzioneGradi).toBeGreaterThanOrEqual(0);
    expect(body.data.direzioneGradi).toBeLessThanOrEqual(360);
    expect(Array.isArray(body.data.motivi)).toBe(true);
  });

  test("venti-decollo rejects invalid exposure and repeated parameters", async ({ request }) => {
    expect((await request.get(`/api/venti-decollo${BASE}&exposure=NOVT`)).status()).toBe(400);
    expect((await request.get("/api/venti-decollo?latitude=44&longitude=7&exposure=S&exposure=N")).status()).toBe(400);
  });

  test("aerologia endpoints are edge-cacheable", async ({ request }) => {
    for (const path of ["/api/volabilita", "/api/termiche", "/api/venti-decollo"]) {
      const response = await request.get(`${path}${BASE}`);
      expect(response.headers()["cache-control"]).toContain("s-maxage=300");
      expect(response.headers()["cache-control"]).toContain("stale-while-revalidate=600");
    }
  });

  test("OpenAPI documents the aerologia endpoints", async ({ request }) => {
    const response = await request.get("/api/openapi");
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.paths["/volabilita"].get).toBeTruthy();
    expect(body.paths["/termiche"].get).toBeTruthy();
    expect(body.paths["/venti-decollo"].get).toBeTruthy();
  });
});
