import { expect, test } from "@playwright/test";
import { installOpenMeteoMock } from "./helpers/mockOpenMeteo";

/* La locandina (ReportAICard) vive nella sezione Analisi della homepage:
   - pulsanti del giorno (OGGI / DOMANI / DOPODOMANI) che ricalcolano la valutazione;
   - anteprima fronte/retro della locandina;
   - nessun errore React durante il cambio giorno. */
test.beforeEach(async ({ page }) => {
  await installOpenMeteoMock(page);
});

test.describe("Locandina: palette giorni e generazione", () => {
  test("i pulsanti del giorno esistono e cambiano la valutazione senza errori", async ({ page }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));

    await page.setViewportSize({ width: 1440, height: 1200 });
    await page.goto("/");

    // apri la scheda Analisi dove vive la card locandina
    await page.getByTestId("tab-analisi").click({ timeout: 30_000 });

    // i tre pulsanti del giorno
    const oggi = page.getByTestId("locandina-giorno-0");
    const domani = page.getByTestId("locandina-giorno-1");
    const dopodomani = page.getByTestId("locandina-giorno-2");
    await expect(oggi).toBeVisible({ timeout: 30_000 });
    await expect(domani).toBeVisible();
    await expect(dopodomani).toBeVisible();

    // oggi selezionato di default
    await expect(oggi).toHaveAttribute("aria-pressed", "true");
    await expect(domani).toHaveAttribute("aria-pressed", "false");

    // cambia giorno: la valutazione si aggiorna e nessun crash
    await domani.click();
    await expect(domani).toHaveAttribute("aria-pressed", "true");
    await expect(oggi).toHaveAttribute("aria-pressed", "false");
    await page.waitForTimeout(300);
    await dopodomani.click();
    await expect(dopodomani).toHaveAttribute("aria-pressed", "true");
    await page.waitForTimeout(300);
    expect(pageErrors, "Il cambio giorno non deve generare errori React").toEqual([]);

    // torna a oggi per lo stato iniziale
    await oggi.click();
    await expect(oggi).toHaveAttribute("aria-pressed", "true");
  });

  test("la card mostra i pulsanti di esportazione e il verdetto del giorno scelto", async ({ page }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));

    await page.setViewportSize({ width: 1440, height: 1200 });
    await page.goto("/");
    await page.getByTestId("tab-analisi").click({ timeout: 30_000 });

    const card = page.locator(".report-ai-card");
    await expect(card).toBeVisible({ timeout: 30_000 });
    // pulsanti download + whatsapp
    for (const label of ["JPG", "PNG", "Retro", "PDF", "WhatsApp"]) {
      await expect(card.getByRole("button", { name: label })).toBeVisible();
    }
    // verdetto visibile (GO / ATTENZIONE / NO GO)
    await expect(card.getByText(/^(GO|ATTENZIONE|NO GO)$/).first()).toBeVisible();

    // scelta dopodomani aggiorna il pannello senza rompere nulla
    await page.getByTestId("locandina-giorno-2").click();
    await page.waitForTimeout(400);
    expect(pageErrors).toEqual([]);
  });

  test("il retro della locandina usa il windgram VERO della pagina (cattura del componente)", async ({ page }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));

    await page.setViewportSize({ width: 1440, height: 1200 });
    await page.goto("/");
    await page.getByTestId("tab-analisi").click({ timeout: 30_000 });

    // l'host nascosto monta il VERO ProfessionalWindgram della scheda Venti
    const host = page.getByTestId("poster-windgram-host");
    await expect(host).toBeVisible({ timeout: 30_000 });
    const realChart = host.locator('svg[viewBox="0 0 1200 1040"]');
    await expect(realChart).toBeAttached({ timeout: 30_000 });

    // la cattura (SVG → PNG) si conclude: data-ready passa a "true"
    await expect(host).toHaveAttribute("data-ready", "true", { timeout: 45_000 });

    // il retro si scarica e contiene il grafico catturato (peso coerente con l'immagine)
    const [download] = await Promise.all([
      page.waitForEvent("download", { timeout: 90_000 }),
      page.locator(".report-ai-card button", { hasText: "Retro" }).first().click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/^locandina-.*\.jpg$/);
    const path = await download.path();
    const size = (await import("node:fs")).statSync(path!).size;
    expect(size).toBeGreaterThan(400_000);
    expect(pageErrors).toEqual([]);
  });

  test("cambiare giorno ri-arma la cattura del windgram (nuovo grafico per il nuovo giorno)", async ({ page }) => {
    test.setTimeout(120_000);
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));

    await page.setViewportSize({ width: 1440, height: 1200 });
    await page.goto("/");
    await page.getByTestId("tab-analisi").click({ timeout: 30_000 });

    const host = page.getByTestId("poster-windgram-host");
    await expect(host).toHaveAttribute("data-ready", "true", { timeout: 45_000 });

    // passando a domani la cattura si azzera e riparte per il nuovo giorno
    await page.getByTestId("locandina-giorno-1").click();
    await expect(host).toHaveAttribute("data-ready", "false", { timeout: 10_000 });
    await expect(host).toHaveAttribute("data-ready", "true", { timeout: 45_000 });
    expect(pageErrors).toEqual([]);
  });
});
