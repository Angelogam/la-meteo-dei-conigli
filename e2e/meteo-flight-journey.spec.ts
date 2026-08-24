import { test, expect } from "@playwright/test";

test.describe("Meteo dei Conigli - Paragliding Launch Weather Journey", () => {
  test("user can inspect launch site weather, toggle forecast days, and navigate aerological tabs", async ({ page }) => {
    // 1. Visit the home page
    await page.goto("/");

    // 2. Verify main application header and branding
    const headerTitle = page.locator("h1");
    await expect(headerTitle).toContainText("Meteo dei Conigli");

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

    // 7. Verify and interact with the Hourly Table
    const hourlyRows = page.locator("table tbody tr");
    await expect(hourlyRows.first()).toBeVisible({ timeout: 10000 });
    const rowCount = await hourlyRows.count();
    expect(rowCount).toBeGreaterThan(0);

    // Select an hourly row
    await hourlyRows.nth(2).click();

    // 8. Test Tab Navigation: Meteo -> Venti -> Termiche -> Analisi
    const tabNav = page.locator("button:has-text('Meteo'), button:has-text('Venti'), button:has-text('Termiche'), button:has-text('Analisi')");
    await expect(tabNav.first()).toBeVisible();

    // Switch to Venti tab
    const ventiTab = page.locator("button:has-text('Venti')").first();
    await ventiTab.click();
    await expect(page.locator("text=Venti in quota").or(page.locator("text=Profilo verticale")).first()).toBeVisible({ timeout: 10000 });

    // Switch to Termiche tab
    const termicheTab = page.locator("button:has-text('Termiche')").first();
    await termicheTab.click();
    await expect(page.locator("text=Previsione termiche").or(page.locator("text=Dettaglio orario termiche")).first()).toBeVisible({ timeout: 10000 });

    // Switch to Analisi tab
    const analisiTab = page.locator("button:has-text('Analisi')").first();
    await analisiTab.click();
    await expect(page.locator("text=Analisi completa").or(page.locator("text=Situazione generale")).first()).toBeVisible({ timeout: 10000 });

    // Return to Meteo tab
    const meteoTab = page.locator("button:has-text('Meteo')").first();
    await meteoTab.click();

    // 9. Verify refresh / update button exists and functions
    const updateButton = page.locator("button:has-text('Aggiorna')");
    await expect(updateButton).toBeVisible();
    await updateButton.click();

    // Ensure app remains stable after reload
    await expect(page.locator(".header-decollo")).toBeVisible();
  });
});