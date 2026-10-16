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
    await expect(page.getByText("La scheda Venti ha incontrato un errore")).toHaveCount(0);
    expect(pageErrors, "Venti tab must not crash the React application").toEqual([]);
  });

  test("homepage briefing, forecast-day selection, and wind shortcut work", async ({ page }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));

    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Il tuo briefing di volo." })).toBeVisible({ timeout: 30_000 });
    await expect(page.locator(".launch-hero")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Scegli il decollo" })).toBeVisible();
    await expect(page.locator(".flight-nav-rail")).toBeVisible();
    await expect(page.locator(".flight-desk-main > .storyboard-panel")).toBeVisible();
    await expect(page.locator(".story-chart-module").first()).toBeVisible();
    await expect(page.locator(".flight-day-switcher")).toBeVisible();
    await expect(page.locator(".flight-day-switcher-options button")).toHaveCount(3);
    await expect(page.locator(".flight-desk-main > #windgram-section")).toBeVisible();
    const graphOrder = await page.locator(".flight-desk-main").evaluate((root) => {
      const children = Array.from(root.children);
      return {
        graph: children.findIndex((child) => child.classList.contains("storyboard-panel")),
        daySwitcher: children.findIndex((child) => child.classList.contains("flight-day-switcher")),
        windgram: children.findIndex((child) => child.id === "windgram-section"),
      };
    });
    expect(graphOrder.graph).toBeGreaterThanOrEqual(0);
    expect(graphOrder.daySwitcher).toBeGreaterThan(graphOrder.graph);
    expect(graphOrder.windgram).toBeGreaterThan(graphOrder.forecast);
    await expect(page.locator(".flight-desk-main > .storyboard-panel")).toBeVisible();
    await expect(page.locator(".story-chart-module")).toHaveCount(2);
    await expect(page.locator(".story-chart-module").first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Tutta la giornata" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Mattina" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Ore centrali" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Pomeriggio" })).toBeVisible();

    const rangeButton = page.getByRole("button", { name: "Mattina" });
    await rangeButton.click();
    await expect(rangeButton).toHaveAttribute("aria-pressed", "true");

    const seriesControls = page.getByRole("group", { name: "Mostra o nascondi serie" });
    const temperatureToggle = seriesControls.getByRole("button", { name: "Temperatura" });
    await temperatureToggle.click();
    await expect(temperatureToggle).toHaveAttribute("aria-pressed", "false");
    await temperatureToggle.click();
    await expect(temperatureToggle).toHaveAttribute("aria-pressed", "true");

    const hourButton = page.getByRole("button", { name: /Seleziona le condizioni delle ore/ }).first();
    await hourButton.click();
    await expect(hourButton).toHaveAttribute("aria-pressed", "true");

    const dashboardOrder = await page.locator(".flight-desk-main").evaluate((container) => {
      const children = Array.from(container.children);
      return {
        chart: children.findIndex((child) => child.classList.contains("storyboard-panel")),
        forecast: children.findIndex((child) => child.classList.contains("forecast-section")),
      };
    });
    expect(dashboardOrder.chart, "The hourly graph must appear before the weather cards").toBeGreaterThanOrEqual(0);
    expect(dashboardOrder.daySwitcher, "The compact day selector must follow the hourly graph").toBeGreaterThan(dashboardOrder.chart);

    const dayButtons = page.locator(".flight-day-switcher-options button");
    await expect(dayButtons).toHaveCount(3);
    await expect(page.locator('.flight-day-switcher-options button[aria-pressed="true"]')).toHaveCount(1);
    const tomorrow = dayButtons.nth(1);
    await tomorrow.click();
    await expect(tomorrow).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator('.flight-day-switcher-options button[aria-pressed="true"]')).toHaveCount(1);

    await page.getByRole("button", { name: "Esplora i venti" }).click();
    await expect(page.getByTestId("tab-venti")).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator('section[aria-live="polite"]')).not.toBeEmpty();
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
  await expect(page.locator(".flight-day-switcher-options button").first()).toBeVisible({ timeout: 30_000 });

  const layout = await page.evaluate(() => {
    const selectors = [
      ".app-main",
      ".overview-section",
      ".launch-hero",
      ".dashboard-layout",
      ".dashboard-sidebar",
      ".dashboard-content",
      ".flight-day-switcher",
      ".flight-day-switcher-options",
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

test("wide desktop keeps the right rail visible and temperature scale readable", async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 1050 });
  await page.goto("/");
  await expect(page.locator(".flight-desk-main > .storyboard-panel")).toBeVisible({ timeout: 30_000 });
  await expect(page.locator(".flight-right-rail")).toBeVisible({ timeout: 30_000 });
  const afternoonButton = page.getByRole("button", { name: "Pomeriggio" });
  if (await afternoonButton.isVisible().catch(() => false)) await afternoonButton.click();
  const dewPointToggle = page.getByRole("group", { name: "Mostra o nascondi serie" }).getByRole("button", { name: "Quota 80/120 m" });
  await expect(dewPointToggle).toHaveAttribute("aria-pressed", "false");

  const dimensions = await page.evaluate(() => {
    const viewport = document.documentElement.clientWidth;
    const selectors = [
      ".flight-app-body",
      ".flight-page-column",
      ".flight-panels-grid",
      ".flight-desk-main",
      ".flight-right-rail",
      ".flight-right-rail .flight-site-list",
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
    const ticks = Array.from(document.querySelectorAll(".temperature-module .recharts-yAxis .recharts-cartesian-axis-tick-value"))
      .map((node) => Number((node.textContent ?? "").replace(/°/g, "").trim()))
      .filter(Number.isFinite);
    return {
      viewport,
      documentWidth: document.documentElement.scrollWidth,
      rootWidth: document.getElementById("root")?.clientWidth ?? -1,
      rootScrollWidth: document.getElementById("root")?.scrollWidth ?? -1,
      boxes,
      temperatureTickSpan: ticks.length >= 2 ? Math.max(...ticks) - Math.min(...ticks) : null,
    };
  });

  expect(dimensions.documentWidth, JSON.stringify(dimensions)).toBeLessThanOrEqual(dimensions.viewport + 1);
  expect(dimensions.rootScrollWidth, JSON.stringify(dimensions)).toBeLessThanOrEqual(dimensions.rootWidth + 1);
  const clipped = dimensions.boxes.filter((box) => box.left < -1 || box.right > dimensions.viewport + 1 || box.scrollWidth > box.clientWidth + 16);
  expect(clipped, JSON.stringify(dimensions)).toEqual([]);
  expect(dimensions.temperatureTickSpan, JSON.stringify(dimensions)).not.toBeNull();
  expect(dimensions.temperatureTickSpan!, "Temperature axis should fit the visible temperature series, not hidden dew-point values").toBeLessThanOrEqual(10);

  await dewPointToggle.click();
  await expect(dewPointToggle).toHaveAttribute("aria-pressed", "true");
  await dewPointToggle.click();
  await expect(dewPointToggle).toHaveAttribute("aria-pressed", "false");

  for (const width of [1440, 1280]) {
    await page.setViewportSize({ width, height: 1050 });
    const rail = await page.locator(".flight-right-rail").boundingBox();
    const viewport = await page.evaluate(() => document.documentElement.clientWidth);
    expect(rail, `Right rail missing at ${width}px`).not.toBeNull();
    expect(rail!.x + rail!.width, `Right rail clipped at ${width}px`).toBeLessThanOrEqual(viewport + 1);
  }
});
