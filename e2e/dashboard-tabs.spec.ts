import { expect, test } from "@playwright/test";
import { installOpenMeteoMock } from "./helpers/mockOpenMeteo";
test.beforeEach(async ({ page }) => {
  await installOpenMeteoMock(page);
});


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

  test("homepage shows the launch map, windgram, and daily forecast", async ({ page }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));

    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "La Meteo dei Conigli" })).toBeVisible({ timeout: 30_000 });
    await expect(page.locator(".launch-hero")).toBeVisible();
    await expect(page.locator(".flight-launch-sidebar")).toBeVisible();
    await expect(page.locator(".flight-nav-rail")).toBeVisible();

    await expect(page.getByTestId("cartina-decolli")).toBeVisible({ timeout: 30_000 });
    const raisedTools = page.locator(".launch-windgram-top");
    await expect(raisedTools).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("alpium-windgram-page")).toBeVisible();
    /* Il report della giornata monta una copia nascosta del windgram (per il
       retro della locandina): il selettore resta scoped alla sezione visibile. */
    const windgram = page.locator("#windgram-section .alpium-windgram");
    await expect(windgram).toBeVisible();

    // The windgram must contain real SVG heatmap cells behind wind arrows/thermal curves.
    await expect(windgram).toBeVisible({ timeout: 30_000 });
    const heatmapCells = windgram.getByTestId("windgram-stability-cell");
    await expect(heatmapCells.first()).toBeVisible({ timeout: 30_000 });
    expect(await heatmapCells.count(), "Alpium-style altitude/hour background cells must render").toBeGreaterThan(100);
    const paletteCount = await heatmapCells.evaluateAll((elements) =>
      new Set(elements.map((element) => element.getAttribute("data-stability-color"))).size
    );
    expect(paletteCount, "The atmospheric background should include colored stability masses").toBeGreaterThan(1);
    await windgram.screenshot({
      path: "test-results/alpium-windgram-colored-masses.png",
      animations: "disabled",
      timeout: 30_000,
    });

    await expect(page.locator(".flight-forecast-module .forecast-day-card")).toHaveCount(3, { timeout: 30_000 });
    const pageOrder = await page.locator("main").evaluate((root) => {
      const children = Array.from(root.children);
      return {
        forecast: children.findIndex((child) => child.classList.contains("forecast-section")),
        tools: children.findIndex((child) => child.classList.contains("flight-top-dashboard-grid")),
      };
    });
    expect(pageOrder.forecast, "Forecast must precede the dashboard tools").toBeGreaterThanOrEqual(0);
    expect(pageOrder.tools, "Dashboard tools must follow the forecast").toBeGreaterThan(pageOrder.forecast);

    const forecastCards = page.locator(".forecast-day-card");
    await expect(forecastCards).toHaveCount(3, { timeout: 30_000 });
    await expect(page.locator('.forecast-day-card[aria-pressed="true"]')).toHaveCount(1);
    const tomorrow = page.getByRole("button", { name: /Mostra le previsioni per domani/i });
    await tomorrow.click();
    await expect(tomorrow).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator('.forecast-day-card[aria-pressed="true"]')).toHaveCount(1);

    await page.getByTestId("tab-venti").click();
    await expect(page.getByTestId("tab-venti")).toHaveAttribute("aria-pressed", "true");
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
  await expect(page.getByRole("heading", { name: "La Meteo dei Conigli" })).toBeVisible({ timeout: 30_000 });
  await expect(page.locator(".launch-hero")).toBeVisible({ timeout: 30_000 });
  await expect(page.locator(".flight-forecast-module .forecast-day-card").first()).toBeVisible({ timeout: 30_000 });

  const layout = await page.evaluate(() => {
    const selectors = [
      ".app-main",
      ".overview-section",
      ".launch-hero",
      ".flight-top-dashboard-grid",
      ".flight-primary-column",
      ".flight-launch-sidebar",
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

test("wide desktop keeps the right rail visible and native windgram unclipped", async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 1050 });
  await page.goto("/");
  await expect(page.locator(".launch-windgram-top")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("cartina-decolli")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("alpium-windgram-page")).toBeVisible({ timeout: 30_000 });
  await expect(page.locator(".flight-launch-sidebar")).toBeVisible({ timeout: 30_000 });

  const layout = await page.evaluate(() => {
    const viewport = document.documentElement.clientWidth;
    const selectors = [
      ".flight-app-body",
      ".flight-page-column",
      ".flight-top-dashboard-grid",
      ".flight-primary-column",
      ".flight-launch-sidebar",
      ".launch-windgram-top",
      ".alpium-windgram",
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

  expect(layout.documentWidth, JSON.stringify(layout)).toBeLessThanOrEqual(layout.viewport + 1);
  expect(layout.rootScrollWidth, JSON.stringify(layout)).toBeLessThanOrEqual(layout.rootWidth + 1);
  const clipped = layout.boxes.filter((box) =>
    box.left < -1 || box.right > layout.viewport + 1 || box.scrollWidth > box.clientWidth + 16
  );
  expect(clipped, JSON.stringify(layout)).toEqual([]);
});


test("API Mega List catalog links all source categories and its search filters locally", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/catalogo-api");
  await expect(page.getByRole("heading", { name: "API Mega List" })).toBeVisible({ timeout: 30_000 });
  await expect(page.locator(".api-mega-category")).toHaveCount(23);
  const aiCollection = page.locator(".api-mega-category").filter({ hasText: "Intelligenza artificiale" });
  await expect(aiCollection).toHaveAttribute("href", /tree\/main\/ai-apis-1555$/);

  const search = page.getByRole("textbox", { name: "Cerca una categoria" });
  await search.fill("intelligenza");
  await expect(page.locator(".api-mega-category")).toHaveCount(1);
  await expect(page.locator(".api-mega-category").filter({ hasText: "Intelligenza artificiale" })).toBeVisible();

  await search.fill("categoria-che-non-esiste");
  await expect(page.locator(".api-mega-category")).toHaveCount(0);
  await expect(page.getByText("Nessuna categoria trovata. Prova con un altro termine.")).toBeVisible();
  expect(pageErrors, "The catalog page should not cause browser errors").toEqual([]);
});
