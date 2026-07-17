import { test, expect } from "@playwright/test";

/**
 * Critical User Journey: Paragliding Weather Forecast
 *
 * Flow:
 * 1. Landing page loads with header and site list
 * 2. A default site is selected and its weather data is displayed
 * 3. User can switch between sites and see updated weather
 * 4. User can navigate through all tabs (Meteo, Venti, Windgram, Termiche, Analisi)
 * 5. User can select different days (Oggi, Domani, Dopodomani)
 *
 * This tests the core value proposition of the app.
 */

test.describe("Meteo dei Conigli — Critical User Journey", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("complete weather forecast journey: site selection, day switching, and tab navigation", async ({ page }) => {
    // ─── STEP 1: Verify the app loads correctly ───
    await expect(page.getByText("Meteo dei Conigli")).toBeVisible();
    await expect(page.getByText("Open-Meteo", { exact: false })).toBeVisible();
    await expect(page.getByText("Decolli disponibili", { exact: false })).toBeVisible();

    // ─── STEP 2: Verify a default site is selected and weather data loads ───
    const siteHeader = page.locator("h2").filter({ hasText: "Malanotte" });
    await expect(siteHeader).toBeVisible({ timeout: 15000 });

    // Check weather description appears (e.g., "sereno", "nuvoloso", etc.)
    await expect(page.getByText(/sereno|nuvoloso|pioggia|temporale|nebbia|nuvole|velatura/)).toBeVisible({ timeout: 15000 });

    // ─── STEP 3: Switch to another site and back ───
    const secondSiteButton = page.locator("button").filter({ hasText: "Colle di Tenda" });
    await expect(secondSiteButton).toBeVisible();
    await secondSiteButton.click();
    await expect(page.locator("h2").filter({ hasText: "Colle di Tenda" })).toBeVisible({ timeout: 10000 });

    // Go back
    const firstSiteButton = page.locator("button").filter({ hasText: "Malanotte" });
    await expect(firstSiteButton).toBeVisible();
    await firstSiteButton.click();
    await expect(page.locator("h2").filter({ hasText: "Malanotte" })).toBeVisible({ timeout: 10000 });

    // ─── STEP 4: Verify day selection ───
    const oggiButton = page.getByText("Oggi", { exact: true });
    const domaniButton = page.getByText("Domani", { exact: true });
    const dopodomaniButton = page.getByText("Dopodomani", { exact: true });

    await expect(oggiButton).toBeVisible();
    await expect(domaniButton).toBeVisible();
    await expect(dopodomaniButton).toBeVisible();

    await domaniButton.click();
    await oggiButton.click();

    // ─── STEP 5: Navigate through all tabs ───
    const tabs = ["Venti", "Windgram", "Termiche", "Analisi"];
    for (const tabName of tabs) {
      const tabButton = page.locator("button").filter({ hasText: new RegExp(`^${tabName}$`) });
      await expect(tabButton).toBeVisible();
      await tabButton.click();
      await page.waitForTimeout(1500);
    }

    // ─── STEP 6: Verify hourly forecast exists ───
    await expect(page.getByText("Previsioni orarie", { exact: false }).first()).toBeVisible({ timeout: 5000 });

    // ─── STEP 7: Verify the footer ───
    await expect(page.getByText("Open-Meteo", { exact: false })).toBeVisible();
  });

  test("site list displays all paragliding takeoff locations", async ({ page }) => {
    await page.goto("/");
    
    const sitesTitle = page.getByText("Decolli disponibili");
    await expect(sitesTitle).toBeVisible({ timeout: 10000 });

    const keySites = ["Malanotte", "Boves", "Colle di Tenda"];
    for (const siteName of keySites) {
      await expect(page.locator("button").filter({ hasText: siteName })).toBeVisible();
    }

    const siteCountText = await sitesTitle.textContent();
    const match = siteCountText?.match(/\d+/);
    if (match) {
      const count = parseInt(match[0], 10);
      expect(count).toBeGreaterThan(20);
    }
  });

  test("hourly forecast interaction", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(3000);

    const hourButtons = page.locator("button").filter({ hasText: /^(09|10|11|12|13|14|15|16|17|18|19):00$/ });
    const count = await hourButtons.count();
    
    if (count > 0) {
      await hourButtons.first().click();
      await page.waitForTimeout(500);
    }
  });
});