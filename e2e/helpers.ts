import type { Page } from "@playwright/test";

/** Rolagem lateral da PÁGINA? (UX-P13: 360 px sem rolagem lateral.) */
export async function hasHorizontalScroll(page: Page): Promise<boolean> {
  return page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
}

/** Controles interativos visíveis menores que 44 px de altura (alvo de toque — UX-P13). */
export async function smallTouchTargets(page: Page, min = 44): Promise<string[]> {
  return page.evaluate((minSize) => {
    const selector = "button, a[href], input:not([type=hidden]), select, textarea, [role=button], [role=combobox]";
    return Array.from(document.querySelectorAll<HTMLElement>(selector))
      .filter((el) => {
        const r = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        return r.width > 0 && r.height > 0 && style.visibility !== "hidden" && style.display !== "none";
      })
      .filter((el) => el.getBoundingClientRect().height < minSize)
      .map((el) => `${el.tagName.toLowerCase()}:${(el.getAttribute("aria-label") ?? el.textContent ?? "").trim().slice(0, 30)}`);
  }, min);
}
