import { test, expect } from "@playwright/test";

test("Navigazione app meteo e verifica card Windy PG Soundings", async ({ page }) => {
  await page.goto("/");
  
  // Wait for page to load
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  
  // Verify basic page structure loaded
  await expect(page.locator('[data-testid="tab-meteo"]')).toBeVisible();
  await expect(page.locator('[data-testid="tab-venti"]')).toBeVisible();
  await expect(page.locator('[data-testid="tab-termiche"]')).toBeVisible();
  await expect(page.locator('[data-testid="tab-analisi"]')).toBeVisible();
  
  // Click on METEO tab
  await page.getByTestId('tab-meteo').click();
  await expect(page.getByTestId('tab-meteo')).toHaveClass(/bg-gradient-to-br/);
  
  // Click on VENTI tab
  await page.getByTestId('tab-venti').click();
  await expect(page.getByTestId('tab-venti')).toHaveClass(/bg-gradient-to-br/);
  
  // Click on TERMICHE tab
  await page.getByTestId('tab-termiche').click();
  await expect(page.getByTestId('tab-termiche')).toHaveClass(/bg-gradient-to-br/);
  
  // Click on ANALISI tab to see Windy card
  await page.getByTestId('tab-analisi').click();
  await expect(page.getByTestId('tab-analisi')).toHaveClass(/bg-gradient-to-br/);
  
  // Wait and check Windy Soundings Card
  await page.waitForTimeout(1000);
  await expect(page.getByTestId('windy-soundings-card')).toBeVisible();
  
  // Verify card content
  await expect(page.getByText('⚡ CARD WINDY PG SOUNDINGS ⚡')).toBeVisible();
  await expect(page.getByTestId('windy-card-cape')).toBeVisible();
  await expect(page.getByTestId('windy-card-freezing-level')).toBeVisible();
  await expect(page.getByTestId('windy-card-wind-850')).toBeVisible();
  
  // Verify values
  await expect(page.getByTestId('windy-card-cape')).toContainText('120');
  await expect(page.getByTestId('windy-card-freezing-level')).toContainText('3800m');
  await expect(page.getByTestId('windy-card-wind-850')).toContainText('22');
  
  // Verify plugin link exists
  await expect(page.getByRole('link', { name: /Plugin originale Windy/ })).toBeVisible();
});
