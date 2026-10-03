import { test, expect } from "@playwright/test";

test("Navigazione app meteo e verifica card Windy PG Soundings", async ({ page }) => {
  await page.goto("/");

  // Wait for the app to be usable (main content visible)
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(2000);

  // Verify tab buttons exist
  await expect(page.getByTestId("tab-meteo")).toBeVisible();
  await expect(page.getByTestId("tab-venti")).toBeVisible();
  await expect(page.getByTestId("tab-termiche")).toBeVisible();
  await expect(page.getByTestId("tab-analisi")).toBeVisible();

  // Click each tab to verify navigation works
  await page.getByTestId("tab-meteo").click();
  await page.waitForTimeout(300);
  await page.getByTestId("tab-venti").click();
  await page.waitForTimeout(300);
  await page.getByTestId("tab-termiche").click();
  await page.waitForTimeout(300);
  await page.getByTestId("tab-analisi").click();
  await page.waitForTimeout(500);

  // Scroll to the bottom of the main content area to find the Windy card
  await page.locator("main").evaluate(el => el.scrollTop = el.scrollHeight);
  await page.waitForTimeout(300);

  // The Windy Soundings Card must be visible after scrolling
  await expect(page.getByTestId("windy-soundings-card")).toBeVisible();

  // Verify card content
  await expect(page.getByText("WINDY PG SOUNDINGS")).toBeVisible();
  await expect(page.getByTestId("windy-card-cape")).toBeVisible();
  await expect(page.getByTestId("windy-card-freezing-level")).toBeVisible();
  await expect(page.getByTestId("windy-card-wind-850")).toBeVisible();

  // Verify values
  await expect(page.getByTestId("windy-card-cape")).toContainText("120");
  await expect(page.getByTestId("windy-card-freezing-level")).toContainText("3800m");
  await expect(page.getByTestId("windy-card-wind-850")).toContainText("22");

  // Verify plugin link exists
  await expect(page.getByRole("link", { name: /Plugin originale Windy/ })).toBeVisible();
});
