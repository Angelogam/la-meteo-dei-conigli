import { expect, test } from "@playwright/test";
import { installOpenMeteoMock } from "./helpers/mockOpenMeteo";
import { installInstantScroll } from "./helpers/instantScroll";

// Cesium + SwiftShader in CI sono lenti: timeout generoso per singolo test.
test.setTimeout(90_000);

test.beforeEach(async ({ page }) => {
  await installOpenMeteoMock(page);
  await installInstantScroll(page);
});


const tabIds = ["meteo", "venti", "termiche", "analisi"] as const;

test.describe("Dashboard tabs: smoke and crash regression", () => {
  test("switching between all analysis tabs never causes a React page crash", async ({ page }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));

    await page.goto("/");
    await expect(page.getByTestId("tab-meteo")).toBeVisible({ timeout: 30_000 });

    // Click «force»: lo smooth-scroll del briefing può spostare i pulsanti per
    // alcuni frame (pagina molto alta), ma ciò che specchiamo qui è il crash React.
    for (const tabId of tabIds) {
      const tab = page.getByTestId(`tab-${tabId}`);
      await tab.scrollIntoViewIfNeeded();
      await tab.click({ force: true });
      await expect(tab).toBeAttached();
      await expect(page.locator("body")).not.toBeEmpty();
      // Give React a short event-loop turn to surface asynchronous render failures.
      await page.waitForTimeout(150);
      expect(pageErrors, `Uncaught browser error after selecting tab: ${tabId}`).toEqual([]);
    }

    const ventiTabAgain = page.getByTestId("tab-venti");
    await ventiTabAgain.scrollIntoViewIfNeeded();
    await ventiTabAgain.click({ force: true });
    const ventiContent = page.locator("section[aria-live='polite']");
    await expect(ventiContent).toBeVisible();
    await expect(ventiContent).not.toBeEmpty();
    // La scheda Venti rimanda al windgram sempre visibile in alto nella pagina.
    await expect(page.locator(".launch-windgram-shortcut")).toBeVisible();
    await expect(page.getByText("La scheda Venti ha incontrato un errore")).toHaveCount(0);
    expect(pageErrors, "Venti tab must not crash the React application").toEqual([]);
  });

  test("homepage shows hero, cartine 2D/3D and the native windgram with stability masses", async ({ page }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));

    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "La Meteo dei Conigli" })).toBeVisible({ timeout: 30_000 });
    await expect(page.locator(".launch-hero")).toBeVisible({ timeout: 30_000 });
    await expect(page.locator(".flight-nav-rail")).toBeVisible();

    // Cartina dei decolli 2D e terreno 3D nella griglia principale.
    await expect(page.getByTestId("cartina-decolli")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("cartina-3d")).toBeVisible({ timeout: 30_000 });

    // Windgram nativo a tutta larghezza con masse di stabilità colorate.
    const windgramSection = page.locator(".launch-windgram-top");
    await expect(windgramSection).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("alpium-windgram-page")).toBeVisible();
    const windgram = page.locator(".alpium-windgram");
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

    // I vecchi pannelli storyboard restano rimossi dalla homepage.
    await expect(page.locator(".storyboard-panel")).toHaveCount(0);
    await expect(page.locator(".story-chart-module")).toHaveCount(0);
    await expect(page.locator(".story-selected-hour")).toHaveCount(0);
    await expect(page.locator(".story-hour-buttons")).toHaveCount(0);

    // Previsioni giornaliere con selezione del giorno (oggi/domani/dopodomani).
    await expect(page.locator(".forecast-day-card")).toHaveCount(3, { timeout: 30_000 });
    await expect(page.locator('.forecast-day-card[aria-pressed="true"]')).toHaveCount(1);
    const tomorrow = page.getByRole("button", { name: /Mostra le previsioni per domani/i });
    await tomorrow.click();
    await expect(tomorrow).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator('.forecast-day-card[aria-pressed="true"]')).toHaveCount(1);

    // Ordine DOM: previsioni prima della griglia con cartine/windgram/dashboard.
    const pageOrder = await page.locator("main").evaluate((root) => {
      const children = Array.from(root.children);
      return {
        forecast: children.findIndex((child) => child.classList.contains("forecast-section")),
        grid: children.findIndex((child) => child.classList.contains("flight-top-dashboard-grid")),
      };
    });
    expect(pageOrder.forecast, "Daily forecast must precede map, windgram and tabs").toBeGreaterThanOrEqual(0);
    expect(pageOrder.grid, "Map/windgram grid must follow the daily forecast").toBeGreaterThan(pageOrder.forecast);

    // Dentro la colonna principale: cartina 2D → cartina 3D → windgram → schede.
    const columnOrder = await page.locator(".flight-primary-column").evaluate((root) => {
      const children = Array.from(root.querySelectorAll<HTMLElement>(":scope > *"));
      const index = (selector: string) =>
        children.findIndex((child) => child.matches(selector) || !!child.querySelector(selector));
      return {
        cartina2d: index('[data-testid="cartina-decolli"]'),
        cartina3d: index('[data-testid="cartina-3d"]'),
        windgram: children.findIndex((child) => child.classList.contains("launch-windgram-top")),
        dashboard: children.findIndex((child) => child.classList.contains("dashboard-layout")),
      };
    });
    expect(columnOrder.cartina2d).toBeGreaterThanOrEqual(0);
    expect(columnOrder.cartina3d).toBeGreaterThan(columnOrder.cartina2d);
    expect(columnOrder.windgram).toBeGreaterThan(columnOrder.cartina3d);
    expect(columnOrder.dashboard).toBeGreaterThan(columnOrder.windgram);

    // La lista decolli resta nella colonna laterale.
    await expect(page.locator("#flight-site-list")).toBeVisible();
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
  await expect(page.locator(".launch-hero")).toBeVisible({ timeout: 30_000 });
  await expect(page.locator(".forecast-day-card").first()).toBeVisible({ timeout: 30_000 });

  const layout = await page.evaluate(() => {
    const selectors = [
      ".app-main",
      ".overview-section",
      ".launch-hero",
      ".flight-top-dashboard-grid",
      ".flight-primary-column",
      ".flight-launch-sidebar",
      ".launch-windgram-top",
      ".dashboard-layout",
      ".details-section",
      ".flight-tab-content",
      ".flight-hourly-section",
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

test("wide desktop keeps the launch sidebar visible and native windgram unclipped", async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 1050 });
  await page.goto("/");
  await expect(page.locator(".launch-windgram-top")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("cartina-3d")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("alpium-windgram-page")).toBeVisible({ timeout: 30_000 });
  await expect(page.locator("#flight-site-list .flight-launch-sidebar, aside#flight-site-list")).toBeVisible({ timeout: 30_000 });
  await expect(page.locator(".storyboard-panel")).toHaveCount(0);
  await expect(page.locator(".story-chart-module")).toHaveCount(0);

  const layout = await page.evaluate(() => {
    const viewport = document.documentElement.clientWidth;
    const selectors = [
      ".flight-app-body",
      ".flight-page-column",
      ".flight-top-dashboard-grid",
      ".flight-primary-column",
      "#flight-site-list",
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


test("secondary routes /termiche and /api-test render without crashing", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto("/termiche");
  await expect(page.getByRole("heading", { name: "Dove nascono le termiche, ora per ora" })).toBeVisible({ timeout: 30_000 });
  expect(pageErrors, "The Termiche page should not cause browser errors").toEqual([]);

  await page.goto("/api-test");
  await expect(page.getByRole("heading", { name: /Test API/i })).toBeVisible({ timeout: 30_000 });
  expect(pageErrors, "The API test page should not cause browser errors").toEqual([]);
});
