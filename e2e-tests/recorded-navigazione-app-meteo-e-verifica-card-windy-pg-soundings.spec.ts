import { test, expect } from "@playwright/test";

test("Navigazione app meteo e verifica card Windy PG Soundings", async ({ page }) => {
  await page.goto("/");

  // Wait for initial render — use DOMContentLoaded, not networkidle (APIs keep polling)
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(1500);

  // Verify basic page structure loaded
  await expect(page.getByTestId("tab-meteo")).toBeVisible();
  await expect(page.getByTestId("tab-venti")).toBeVisible();
  await expect(page.getByTestId("tab-termiche")).toBeVisible();
  await expect(page.getByTestId("tab-analisi")).toBeVisible();

  // Click each tab — assert visibility of the tab element (active state adds glow class)
  await page.getByTestId("tab-meteo").click();
  await expect(page.getByTestId("tab-meteo")).toBeVisible();
  await page.getByTestId("tab-venti").click();
  await expect(page.getByTestId("tab-venti")).toBeVisible();
  await page.getByTestId("tab-termiche").click();
  await expect(page.getByTestId("tab-termiche")).toBeVisible();
  await page.getByTestId("tab-analisi").click();
  await expect(page.getByTestId("tab-analisi")).toBeVisible();

  // Windy Soundings Card should now be visible in the Analisi tab
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
