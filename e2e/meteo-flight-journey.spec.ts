import { test, expect } from "@playwright/test";
import { installOpenMeteoMock } from "./helpers/mockOpenMeteo";
import { installInstantScroll } from "./helpers/instantScroll";

// Cesium + SwiftShader in CI sono lenti: timeout generoso per singolo test.
test.setTimeout(90_000);

test.beforeEach(async ({ page }) => {
  await installOpenMeteoMock(page);
  await installInstantScroll(page);
});


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

    // 4. Check that the launch list is populated and contains sites
    const decolliList = page.locator("#flight-site-list button[role='listitem']");
    await expect(decolliList.first()).toBeVisible({ timeout: 15000 });
    const count = await decolliList.count();
    expect(count).toBeGreaterThan(1);

    // 5. Select a different launch site (the second site in list)
    const secondSiteButton = decolliList.nth(1);
    const secondSiteName = (await secondSiteButton.locator(".dxc-site-name").innerText()).trim();
    await secondSiteButton.click();

    // Verify the site header updates with the selected site information
    await expect(page.locator(".header-decollo h2")).toHaveText(secondSiteName, { timeout: 10_000 });

    // 6. Test 3-day forecast selection (Oggi -> Domani -> Dopodomani)
    const dayButtons = page.locator("button:has-text('Oggi'), button:has-text('Domani'), button:has-text('Dopodomani')");
    await expect(dayButtons.first()).toBeVisible();

    // Click 'Domani' (Tomorrow)
    const domaniButton = page.locator("button:has-text('Domani')").first();
    await domaniButton.click({ force: true });
    await expect(domaniButton).toHaveAttribute("aria-pressed", "true");

    // Click 'Dopodomani' (Day after tomorrow)
    const dopodomaniButton = page.locator("button:has-text('Dopodomani')").first();
    await dopodomaniButton.click({ force: true });
    await expect(dopodomaniButton).toHaveAttribute("aria-pressed", "true");

    // Return to 'Oggi'
    const oggiButton = page.locator("button:has-text('Oggi')").first();
    await oggiButton.click({ force: true });
    await expect(oggiButton).toHaveAttribute("aria-pressed", "true");

    // 7. Verify and interact with the Hourly Table
    const hourlyRows = page.locator("table tbody tr");
    await expect(hourlyRows.first()).toBeVisible({ timeout: 10000 });
    const rowCount = await hourlyRows.count();
    expect(rowCount).toBeGreaterThan(0);

    // Select an hourly row
    await hourlyRows.nth(2).click();

    // Click «force» dopo scroll istantaneo: lo smooth-scroll del briefing può
    // spostare i pulsanti per alcuni frame.
    const contentRegion = page.locator('section[aria-live="polite"]');
    for (const tabId of ["venti", "termiche", "analisi", "meteo"] as const) {
      const tab = page.getByTestId(`tab-${tabId}`);
      await expect(tab).toBeAttached();
      await tab.scrollIntoViewIfNeeded();
      await tab.click({ force: true });
      await expect(tab).toHaveAttribute("aria-pressed", "true");
      await expect(contentRegion).toBeVisible();
      await expect(contentRegion).not.toBeEmpty();
    }

    // 9. L'app si aggiorna da sola (nessun bottone manuale): a fine percorso
    // le sezioni chiave devono restare montate e senza errori React.
    await expect(page.locator(".header-decollo")).toBeVisible();
    await expect(page.getByTestId("alpium-windgram-page")).toBeVisible();
    // La barra mobile esiste solo sotto il breakpoint: basta che resti nel DOM.
    await expect(page.locator(".mobile-bottom-nav")).toBeAttached();
  });
});
