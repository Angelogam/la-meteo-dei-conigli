import { test, expect } from "@playwright/test";

test("Navigazione app meteo e verifica card Windy PG Soundings", async ({ page }) => {
  await page.goto("/");

  // Wait for the app to be ready
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(2000);

  // Verify tab buttons exist
  await expect(page.getByTestId("tab-meteo")).toBeVisible();
  await expect(page.getByTestId("tab-venti")).toBeVisible();
  await expect(page.getByTestId("tab-termiche")).toBeVisible();
  await expect(page.getByTestId("tab-analisi")).toBeVisible();

  // The Windy Soundings Card should now be visible right after the tabs
  await expect(page.getByTestId("windy-soundings-card")).toBeVisible({ timeout: 10000 });

  // Verify card content
  await expect(page.getByText("WINDY PG SOUNDINGS")).toBeVisible();
  await expect(page.getByTestId("windy-card-cape")).toBeVisible();
  await expect(page.getByTestId("windy-card-freezing-level")).toBeVisible();
  await expect(page.getByTestId("windy-card-wind-850")).toBeVisible();

  // Verify values
  await expect(page.getByTestId("windy-card-cape")).toContainText("120");
  await expect(page.getByTestId("windy-card-freezing-level")).toContainText("3800");
  await expect(page.getByTestId("windy-card-wind-850")).toContainText("22");

  // Verify plugin link exists
  await expect(page.getByRole("link", { name: /Plugin originale Windy/ })).toBeVisible();

  // Click each tab to verify navigation works
  await page.getByTestId("tab-meteo").click();
  await page.waitForTimeout(200);
  await page.getByTestId("tab-venti").click();
  await page.waitForTimeout(200);
  await page.getByTestId("tab-termiche").click();
  await page.waitForTimeout(200);
  await page.getByTestId("tab-analisi").click();
  await page.waitForTimeout(300);

  // Card should still be visible
  await expect(page.getByTestId("windy-soundings-card")).toBeVisible();
});
