import { test, expect } from "@playwright/test";

test("Navigazione app meteo e verifica card Windy PG Soundings", async ({ page }) => {
  await page.goto("/");

  // Wait for the page to load
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(1500);

  // The Windy Soundings Card should be visible as a fixed red bar at the top
  const card = page.locator('[data-testid="windy-soundings-card"]');
  await expect(card).toBeVisible({ timeout: 10000 });

  // Verify card content
  await expect(page.getByText("WINDY PG SOUNDINGS")).toBeVisible();
  await expect(page.locator('[data-testid="windy-card-cape"]')).toBeVisible();
  await expect(page.locator('[data-testid="windy-card-freezing-level"]')).toBeVisible();
  await expect(page.locator('[data-testid="windy-card-wind-850"]')).toBeVisible();

  // Verify values
  await expect(page.locator('[data-testid="windy-card-cape"]')).toContainText("120");
  await expect(page.locator('[data-testid="windy-card-freezing-level"]')).toContainText("3800");
  await expect(page.locator('[data-testid="windy-card-wind-850"]')).toContainText("22");

  // Verify plugin link exists
  await expect(page.getByRole("link", { name: /Plugin Windy/ })).toBeVisible();

  // Verify tab buttons exist and work
  await expect(page.getByTestId("tab-meteo")).toBeVisible();
  await expect(page.getByTestId("tab-venti")).toBeVisible();
  await expect(page.getByTestId("tab-termiche")).toBeVisible();
  await expect(page.getByTestId("tab-analisi")).toBeVisible();

  await page.getByTestId("tab-analisi").click();
  await page.waitForTimeout(300);
  await expect(card).toBeVisible();
});
