import { expect, test } from "@playwright/test";

const tabIds = ["meteo", "venti", "termiche", "analisi"] as const;

test.describe("Dashboard tabs: smoke and crash regression", () => {
  test("switching between all analysis tabs never causes a React page crash", async ({ page }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));

    await page.goto("/");
    await expect(page.getByTestId("tab-meteo")).toBeVisible({ timeout: 30_000 });

    for (const tabId of tabIds) {
      await page.getByTestId(`tab-${tabId}`).click();
      await expect(page.getByTestId(`tab-${tabId}`)).toBeVisible();
      await expect(page.locator("body")).not.toBeEmpty();
      // Give React a short event-loop turn to surface asynchronous render failures.
      await page.waitForTimeout(150);
      expect(pageErrors, `Uncaught browser error after selecting tab: ${tabId}`).toEqual([]);
    }

    await page.getByTestId("tab-venti").click();
    const ventiContent = page.locator("section[aria-live='polite']");
    await expect(ventiContent).toBeVisible();
    await expect(ventiContent).not.toBeEmpty();

    // The external map must mount as part of the Venti tab and carry coordinates
    // for the selected API launch, not the hard-coded sample coordinates.
    const forecastWidget = page.getByTestId("launch-forecast-widget");
    await expect(forecastWidget).toBeVisible({ timeout: 10_000 });
    const mapFrame = forecastWidget.locator(".launch-xctherm-frame iframe");
    await expect(mapFrame).toBeVisible();
    const mapSrc = await mapFrame.getAttribute("src");
    expect(mapSrc).toBeTruthy();
    const mapUrl = new URL(mapSrc!);
    expect(mapUrl.origin).toBe("https://xctherm.com");
    expect(Number(mapUrl.searchParams.get("lat"))).toBeGreaterThanOrEqual(-90);
    expect(Number(mapUrl.searchParams.get("lat"))).toBeLessThanOrEqual(90);
    expect(Number(mapUrl.searchParams.get("lon"))).toBeGreaterThanOrEqual(-180);
    expect(Number(mapUrl.searchParams.get("lon"))).toBeLessThanOrEqual(180);
    expect(mapUrl.searchParams.get("lang")).toBe("it");
    await expect(page.getByText("La scheda Venti ha incontrato un errore")).toHaveCount(0);
    expect(pageErrors, "Venti tab must not crash the React application").toEqual([]);

    // Let the external map's own JS tiles render before capturing the real page.
    await expect(forecastWidget.locator(".launch-xctherm-frame")).toHaveClass(/is-ready/, { timeout: 20_000 });
    await page.waitForTimeout(6000);
    const xcthermFrame = page.frame({ url: /xctherm\.com\/icon/ });
    const frameTextLength = xcthermFrame
      ? await xcthermFrame.locator("body").innerText().then((value) => value.trim().length).catch(() => 0)
      : 0;
    // Store this in the page for the screenshot, to make the embed state reviewable.
    await forecastWidget.evaluate((node, loadedTextLength) => {
      node.setAttribute("data-xctherm-text-length", String(loadedTextLength));
    }, frameTextLength);

    // Capture the real Venti tab output from Chromium for visual review.
    await page.setViewportSize({ width: 1440, height: 1000 });
    await forecastWidget.scrollIntoViewIfNeeded();
    await page.locator(".launch-windgram-top").screenshot({
      path: "test-results/venti-widget-preview.png",
      animations: "disabled",
      timeout: 30_000,
    });
  });

  test("homepage shows the new launch widgets first and removes the old wind charts", async ({ page }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));

    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Il tuo briefing di volo." })).toBeVisible({ timeout: 30_000 });
    await expect(page.locator(".launch-hero")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Scegli il decollo" })).toBeVisible();
    await expect(page.locator(".flight-nav-rail")).toBeVisible();

    const launchWidgets = page.locator(".flight-desk-main > .launch-windgram-top");
    await expect(launchWidgets).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("launch-forecast-widget")).toBeVisible();
    await expect(page.locator(".launch-xctherm-frame iframe")).toBeVisible();

    // The legacy two-chart block, selected-hour bar and hour chips must be gone.
    await expect(page.locator(".storyboard-panel")).toHaveCount(0);
    await expect(page.locator(".story-chart-module")).toHaveCount(0);
    await expect(page.locator(".story-selected-hour")).toHaveCount(0);
    await expect(page.locator(".story-hour-buttons")).toHaveCount(0);

    await expect(page.locator(".flight-forecast-module .forecast-day-card")).toHaveCount(3, { timeout: 30_000 });
    const dashboardOrder = await page.locator(".flight-desk-main").evaluate((root) => {
      const children = Array.from(root.children);
      return {
        widgets: children.findIndex((child) => child.classList.contains("launch-windgram-top")),
        forecast: children.findIndex((child) => child.classList.contains("forecast-section")),
        details: children.findIndex((child) => child.classList.contains("details-section")),
      };
    });
    expect(dashboardOrder.widgets, "The new map and windgram should be first in the dashboard").toBeGreaterThanOrEqual(0);
    expect(dashboardOrder.forecast, "Daily forecast cards should follow the new widgets").toBeGreaterThan(dashboardOrder.widgets);
    expect(dashboardOrder.details, "Analysis tabs should follow forecast cards").toBeGreaterThan(dashboardOrder.forecast);

    const forecastCards = page.locator(".forecast-day-card");
    await expect(forecastCards).toHaveCount(3, { timeout: 30_000 });
    await expect(page.locator('.forecast-day-card[aria-pressed="true"]')).toHaveCount(1);

    const tomorrow = page.getByRole("button", { name: /Mostra le previsioni per domani/i });
    await tomorrow.click();
    await expect(tomorrow).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator('.forecast-day-card[aria-pressed="true"]')).toHaveCount(1);

    await page.getByRole("button", { name: "Esplora i venti" }).click();
    await expect(page.getByTestId("tab-venti")).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator(".launch-windgram-top")).toBeVisible();
    await expect(page.locator(".launch-windgram-shortcut")).toBeVisible();
    expect(pageErrors, "The homepage briefing must not produce browser errors").toEqual([]);
  });

  test("dashboard has no horizontal page overflow on a narrow mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto("/");
    await expect(page.getByTestId("tab-meteo")).toBeVisible({ timeout: 30_000 });

    const dimensions = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      document: document.documentElement.scrollWidth,
    }));

    expect(
      dimensions.document,
      `Horizontal overflow: document width ${dimensions.document}px exceeds viewport ${dimensions.viewport}px`,
    ).toBeLessThanOrEqual(dimensions.viewport + 1);
  });
});

test("desktop briefing fits the viewport without clipping the launch or forecast panels", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Il tuo briefing di volo." })).toBeVisible({ timeout: 30_000 });
  await expect(page.locator(".launch-hero")).toBeVisible({ timeout: 30_000 });
  await expect(page.locator(".flight-forecast-module .forecast-day-card").first()).toBeVisible({ timeout: 30_000 });

  const layout = await page.evaluate(() => {
    const selectors = [
      ".app-main",
      ".overview-section",
      ".launch-hero",
      ".dashboard-layout",
      ".dashboard-sidebar",
      ".dashboard-content",
      ".forecast-section",
      ".forecast-hero",
      ".forecast-main-grid",
      ".forecast-summary-grid",
      ".flight-parameter-grid",
    ];
    const elements = selectors.flatMap((selector) => {
      const element = document.querySelector<HTMLElement>(selector);
      if (!element) return [];
      const rect = element.getBoundingClientRect();
      return [{ selector, left: Math.round(rect.left), right: Math.round(rect.right), width: Math.round(rect.width), clientWidth: element.clientWidth, scrollWidth: element.scrollWidth }];
    });
    return {
      viewport: document.documentElement.clientWidth,
      documentWidth: document.documentElement.scrollWidth,
      rootWidth: document.getElementById("root")?.clientWidth ?? -1,
      rootScrollWidth: document.getElementById("root")?.scrollWidth ?? -1,
      elements,
    };
  });

  expect(
    layout.documentWidth,
    `Horizontal document overflow: ${JSON.stringify(layout)}`,
  ).toBeLessThanOrEqual(layout.viewport + 1);
  expect(
    layout.rootScrollWidth,
    `Root children overflow their viewport: ${JSON.stringify(layout)}`,
  ).toBeLessThanOrEqual(layout.rootWidth + 1);

  const clipped = layout.elements.filter((element) => element.left < -1 || element.right > layout.viewport + 1 || element.scrollWidth > element.clientWidth + 24);
  expect(
    clipped,
    `Dashboard panels extend past their available width: ${JSON.stringify(layout)}`,
  ).toEqual([]);
});

test("wide desktop keeps the right rail visible and the raised launch widgets unclipped", async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 1050 });
  await page.goto("/");
  await expect(page.locator(".launch-windgram-top")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("launch-forecast-widget")).toBeVisible({ timeout: 30_000 });
  await expect(page.locator(".flight-right-rail")).toBeVisible({ timeout: 30_000 });
  await expect(page.locator(".storyboard-panel")).toHaveCount(0);
  await expect(page.locator(".story-chart-module")).toHaveCount(0);

  const dimensions = await page.evaluate(() => {
    const viewport = document.documentElement.clientWidth;
    const selectors = [
      ".flight-app-body",
      ".flight-page-column",
      ".flight-panels-grid",
      ".flight-desk-main",
      ".flight-right-rail",
      ".flight-right-rail .flight-site-list",
      ".launch-windgram-top",
      ".launch-forecast-widget",
      ".forecast-section",
    ];
    const boxes = selectors.flatMap((selector) => {
      const element = document.querySelector<HTMLElement>(selector);
      if (!element) return [];
      const rect = element.getBoundingClientRect();
      return [{
        selector,
        left: Math.round(rect.left),
        right: Math.round(rect.right),
        width: Math.round(rect.width),
        scrollWidth: element.scrollWidth,
        clientWidth: element.clientWidth,
      }];
    });
    return {
      viewport,
      documentWidth: document.documentElement.scrollWidth,
      rootWidth: document.getElementById("root")?.clientWidth ?? -1,
      rootScrollWidth: document.getElementById("root")?.scrollWidth ?? -1,
      boxes,
    };
  });

  expect(dimensions.documentWidth, JSON.stringify(dimensions)).toBeLessThanOrEqual(dimensions.viewport + 1);
  expect(dimensions.rootScrollWidth, JSON.stringify(dimensions)).toBeLessThanOrEqual(dimensions.rootWidth + 1);
  const clipped = dimensions.boxes.filter((box) => box.left < -1 || box.right > dimensions.viewport + 1 || box.scrollWidth > box.clientWidth + 16);
  expect(clipped, JSON.stringify(dimensions)).toEqual([]);
});
