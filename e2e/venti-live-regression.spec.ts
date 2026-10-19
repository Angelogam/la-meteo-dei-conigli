import { expect, test } from "@playwright/test";

test("Venti tab keeps its own content visible while wind data loads", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto("/");
  const ventiTab = page.getByTestId("tab-venti");
  await expect(ventiTab).toBeVisible({ timeout: 30_000 });
  await ventiTab.click();

  // This heading is rendered by VentiInterpolatiTab before its asynchronous
  // forecast request completes. It catches a blank/crashed tab without relying
  // on a particular API response or on network timing.
  await expect(page.getByText("Venti in quota dettagliati")).toBeVisible({
    timeout: 10_000,
  });

  const tabContent = page.locator(".flight-tab-content");
  await expect(tabContent).toBeVisible();
  await expect(tabContent).not.toBeEmpty();
  await expect(page.getByText("La scheda Venti ha incontrato un errore")).toHaveCount(0);
  expect(pageErrors, "Selecting Venti must not cause an uncaught browser error").toEqual([]);
});
