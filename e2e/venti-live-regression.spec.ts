import { expect, test } from "@playwright/test";
import { installOpenMeteoMock } from "./helpers/mockOpenMeteo";
import { installInstantScroll } from "./helpers/instantScroll";

// Cesium + SwiftShader in CI sono lenti: timeout generoso per singolo test.
test.setTimeout(90_000);

test.beforeEach(async ({ page }) => {
  await installOpenMeteoMock(page);
  await installInstantScroll(page);
});

test("Venti tab keeps its own content visible while wind data loads", async ({ page }) => {
  // The shared forecast fixture succeeds; only the expensive pressure-level enrichment is rate-limited.
  await installOpenMeteoMock(page, { failSounding: true });
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto("/");
  const ventiTab = page.getByTestId("tab-venti");
  await expect(ventiTab).toBeVisible({ timeout: 30_000 });
  // Scroll istantaneo + click «force»: lo smooth-scroll del briefing può
  // spostare il pulsante per alcuni frame.
  await ventiTab.scrollIntoViewIfNeeded();
  await ventiTab.click({ force: true });

  // La scheda Venti mostra la card che rimanda al windgram sempre in alto.
  const shortcut = page.locator(".launch-windgram-shortcut");
  await expect(shortcut).toBeVisible({ timeout: 10_000 });
  await expect(shortcut).toContainText("windgram aerologico");

  // Il windgram nativo resta visibile e, senza i livelli di pressione,
  // mostra l'avviso di fallback invece di lasciare un pannello vuoto.
  await expect(page.getByTestId("alpium-windgram-page")).toBeVisible({ timeout: 10_000 });
  await expect(page.locator(".alpium-windgram")).toBeVisible({ timeout: 10_000 });
  await expect(page.getByTestId("windgram-fallback-notice")).toBeVisible({ timeout: 10_000 });
  await expect(page.getByRole("heading", { name: /Windgram aerologico/i }).first()).toBeVisible({
    timeout: 10_000,
  });

  // Nessuna mappa esterna obsoleta: cartina nativa 2D e terreno 3D.
  await expect(page.locator('iframe[src*="xctherm.com/icon"]')).toHaveCount(0);
  await expect(page.getByTestId("flybubble-forecast-panel")).toHaveCount(0);
  await expect(page.locator('iframe[src*="weather.flybubble.com/it/embed/15841"]')).toHaveCount(0);
  await expect(page.getByTestId("cartina-decolli")).toBeVisible({ timeout: 10_000 });

  const tabContent = page.locator(".flight-tab-content");
  await expect(tabContent).toBeVisible();
  await expect(tabContent).not.toBeEmpty();
  await expect(page.getByText("La scheda Venti ha incontrato un errore")).toHaveCount(0);
  expect(pageErrors, "Selecting Venti must not cause an uncaught browser error").toEqual([]);
});
