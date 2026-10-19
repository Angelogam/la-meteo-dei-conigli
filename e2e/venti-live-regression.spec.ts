import { expect, test } from "@playwright/test";

test("Venti tab renders the dedicated Alpium-inspired windgram and thermal chart", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto("/");
  const ventiTab = page.getByTestId("tab-venti");
  await expect(ventiTab).toBeVisible({ timeout: 30_000 });
  await ventiTab.click();

  const ventiPage = page.locator(".alpium-wind-page");
  await expect(ventiPage).toBeVisible({ timeout: 10_000 });
  await expect(page.getByRole("heading", { name: "Il vento, quota per quota." })).toBeVisible();
  await expect(page.locator(".alpium-summary-card")).toHaveCount(4);
  await expect(page.locator(".alpium-windgram-panel")).toBeVisible();
  await expect(page.locator(".alpium-thermal-card")).toBeVisible();
  await expect(page.getByText("Windgram aerologico", { exact: false }).first()).toBeVisible();
  await expect(page.getByText("La scheda Venti ha incontrato un errore")).toHaveCount(0);
  expect(pageErrors, "Selecting Venti must not cause an uncaught browser error").toEqual([]);
});
