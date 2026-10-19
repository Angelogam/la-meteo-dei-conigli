import { expect, test } from "@playwright/test";
import { installOpenMeteoMock } from "./helpers/mockOpenMeteo";

test("Venti tab keeps its own content visible while wind data loads", async ({ page }) => {
  // The shared forecast fixture succeeds; only the expensive pressure-level enrichment is rate-limited.
  await installOpenMeteoMock(page, { failSounding: true });
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto("/");
  const ventiTab = page.getByTestId("tab-venti");
  await expect(ventiTab).toBeVisible({ timeout: 30_000 });
  await ventiTab.click();

  // The selected launch should show the XC Therm map and native windgram as separate panels.
  await expect(page.getByTestId("xctherm-launch-map")).toBeVisible({ timeout: 10_000 });
  await expect(page.getByTestId("flybubble-forecast-panel")).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText("Widget specifico non ancora verificato")).toBeVisible();
  await expect(page.locator('iframe[src*="weather.flybubble.com/it/embed/15841"]')).toHaveCount(0);
  await expect(page.getByTestId("alpium-windgram-page")).toBeVisible({ timeout: 10_000 });
  await expect(page.locator(".alpium-windgram")).toBeVisible({ timeout: 10_000 });
  await expect(page.getByTestId("windgram-fallback-notice")).toBeVisible({ timeout: 10_000 });
  await expect(page.getByRole("heading", { name: /Windgram aerologico/i }).first()).toBeVisible({
    timeout: 10_000,
  });
  await expect(page.locator('iframe[src*="xctherm.com/icon"]')).toBeVisible({ timeout: 10_000 });

  const tabContent = page.locator(".flight-tab-content");
  await expect(tabContent).toBeVisible();
  await expect(tabContent).not.toBeEmpty();
  await expect(page.getByText("La scheda Venti ha incontrato un errore")).toHaveCount(0);
  expect(pageErrors, "Selecting Venti must not cause an uncaught browser error").toEqual([]);
});
