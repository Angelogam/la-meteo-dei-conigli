import { expect, test } from "@playwright/test";

test("Venti tab keeps its own content visible while wind data loads", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto("/");
  const ventiTab = page.getByTestId("tab-venti");
  await expect(ventiTab).toBeVisible({ timeout: 30_000 });
  await ventiTab.click();

  // The native Alpium-style windgram header must render without an external map iframe.
  await expect(page.getByTestId("alpium-windgram-page")).toBeVisible({ timeout: 10_000 });
  await expect(page.getByRole("heading", { name: /Windgram aerologico/i }).first()).toBeVisible({
    timeout: 10_000,
  });
  await expect(page.locator('iframe[src*="xctherm.com"]')).toHaveCount(0);

  const tabContent = page.locator(".flight-tab-content");
  await expect(tabContent).toBeVisible();
  await expect(tabContent).not.toBeEmpty();
  await expect(page.getByText("La scheda Venti ha incontrato un errore")).toHaveCount(0);
  expect(pageErrors, "Selecting Venti must not cause an uncaught browser error").toEqual([]);
});
