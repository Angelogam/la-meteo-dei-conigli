import type { Page } from "@playwright/test";

/**
 * Rende istantanei tutti gli scrollIntoView programmatici dell'app.
 *
 * Il briefing usa scrollIntoView({ behavior: "smooth" }) su una pagina molto
 * alta: nei test lo scroll liscio continua per secondi e fa fallire i check
 * di stabilità di Playwright («element is not stable»). Con behavior "auto"
 * lo scroll è immediato e i click risultano deterministici. Solo nei test.
 */
export async function installInstantScroll(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const original = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = function (arg?: boolean | ScrollIntoViewOptions) {
      const opts: ScrollIntoViewOptions =
        typeof arg === "object" && arg !== null
          ? { ...arg, behavior: "auto" }
          : { block: "start", inline: "nearest" };
      original.call(this, opts);
    };
  });
}
