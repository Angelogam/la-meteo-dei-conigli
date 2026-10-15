import { test, expect } from "@playwright/test";

test.describe("Meteo dei Conigli - Paragliding Launch Weather Journey", () => {
  test("user can inspect launch site weather, toggle forecast days, and navigate aerological tabs", async ({ page }) => {
    // 1. Visit the home page
    await page.goto("/");

    // 2. Verify main application header and branding
    const brandLink = page.getByRole("link", { name: "La Meteo dei Conigli, home" });
    await expect(brandLink).toBeVisible();
    await expect(brandLink).toContainText("La Meteo dei Conigli");

    // 3. Wait for initial weather data loading to complete (main content visible)
    await expect(page.locator("h2").first()).toBeVisible({ timeout: 15000 });

    // 4. Check that the Decolli list is populated and contains sites
    const decolliList = page.locator("aside button");
    await expect(decolliList.first()).toBeVisible();
    const count = await decolliList.count();
    expect(count).toBeGreaterThan(1);

    // 5. Select a different launch site (e.g. Boves or the second site in list)
    const secondSiteButton = decolliList.nth(1);
    const secondSiteText = await secondSiteButton.innerText();
    await secondSiteButton.click();

    // Verify the site header updates with the selected site information
    await expect(page.locator(".header-decollo")).toBeVisible();

    // 6. Test 3-day forecast selection (Oggi -> Domani -> Dopodomani)
    const dayButtons = page.locator("button:has-text('Oggi'), button:has-text('Domani'), button:has-text('Dopodomani')");
    await expect(dayButtons.first()).toBeVisible();

    // Click 'Domani' (Tomorrow)
    const domaniButton = page.locator("button:has-text('Domani')").first();
    await domaniButton.click();

    // Click 'Dopodomani' (Day after tomorrow)
    const dopodomaniButton = page.locator("button:has-text('Dopodomani')").first();
    await dopodomaniButton.click();

    // Return to 'Oggi'
    const oggiButton = page.locator("button:has-text('Oggi')").first();
    await oggiButton.click();

    // 7. Verify and interact with the redesigned hourly timeline (replaces the old table)
    const timeline = page.locator(".story-hourly-timeline");
    await expect(timeline).toBeVisible({ timeout: 10000 });
    const hourButtons = timeline.locator("button[aria-label*='Seleziona le condizioni delle ore']");
    await expect(hourButtons.first()).toBeVisible();
    expect(await hourButtons.count()).toBeGreaterThan(0);
    await hourButtons.first().click();
    await expect(hourButtons.first()).toHaveAttribute("aria-pressed", "true");

    const playControl = timeline.getByRole("button", { name: /Riproduci|Pausa/ });
    await expect(playControl).toBeVisible();
    await playControl.click();
    await expect(playControl).toHaveAttribute("aria-pressed", "true");
    await playControl.click();
    await expect(playControl).toHaveAttribute("aria-pressed", "false");

    // 8. Test tab navigation using stable test IDs, not ambiguous text selectors.
    const contentRegion = page.locator('section[aria-live="polite"]');
    for (const tabId of ["venti", "termiche", "analisi", "meteo"] as const) {
      const tab = page.getByTestId(`tab-${tabId}`);
      await expect(tab).toBeVisible();
      await tab.click();
      await expect(tab).toHaveAttribute("aria-pressed", "true");
      await expect(contentRegion).toBeVisible();
      await expect(contentRegion).not.toBeEmpty();
    }

    // 9. Verify refresh / update button exists and functions
    const updateButton = page.locator("button:has-text('Aggiorna')");
    await expect(updateButton).toBeVisible();
    await updateButton.click();

    // Ensure app remains stable after reload
    await expect(page.locator(".header-decollo")).toBeVisible();
  });
});