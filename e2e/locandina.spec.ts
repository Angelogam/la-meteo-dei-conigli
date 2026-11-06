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
});
