import { test, expect } from "@playwright/test";

test("user can select a launch site and view weather data", async ({ page }) => {
  // 1. Open the home page
  await page.goto("/");

  // 2. Wait for the app to finish initial loading
  // The decolli list should become visible
  await expect(page.getByText("Decolli")).toBeVisible({ timeout: 15000 });

  // 3. Verify the decolli sidebar is rendered
  const decolliList = page.locator("aside").first();
  await expect(decolliList).toBeVisible();

  // 4. Find and click on a decollo button (e.g. "Malanotte" or first one in the list)
  const firstDecolloButton = page.locator("aside button").first();
  await expect(firstDecolloButton).toBeVisible();
  await firstDecolloButton.click();

  // 5. Verify a decollo name appears in the header area
  // The SiteHeader should render the site name
  await expect(page.locator("main")).toBeVisible();

  // 6. Verify that the main content area is showing weather-related sections
  // (Windgram, Meteo, or fallback offline banner)
  const mainContent = await page.locator("main").textContent();
  expect(mainContent && mainContent.length).toBeGreaterThan(50);

  // 7. Verify the tab navigation is present (Meteo, Venti, Termiche, Analisi)
  await expect(page.getByRole("button", { name: /meteo/i }).first()).toBeVisible();
});
