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
  });

  test("Open-Meteo rejects missing coordinates", async ({ request }) => {
    expect((await request.get("/api/open-meteo")).status()).toBe(400);
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

  test("people API rejects negative offset", async ({ request }) => {
    expect((await request.get("/api/people?offset=-1")).status()).toBe(400);
  });

  test("people API rejects non-numeric limit", async ({ request }) => {
    expect((await request.get("/api/people?limit=abc")).status()).toBe(400);
  });

  test("people API rejects page size above maximum", async ({ request }) => {
    expect((await request.get("/api/people?limit=101")).status()).toBe(400);
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
