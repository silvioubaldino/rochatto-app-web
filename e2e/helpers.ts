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
        // Os campos escondidos do Select (Base UI) são só para formulário: `aria-hidden` e fora da ordem de tabulação.
        const hiddenFromUser = el.getAttribute("aria-hidden") === "true" || el.tabIndex === -1;
        return r.width > 0 && r.height > 0 && style.visibility !== "hidden" && style.display !== "none" && !hiddenFromUser;
      })
      .filter((el) => {
        // Link de linha/cartão do DataTable: o ::after cobre o cartão todo, então o alvo é o cartão.
        const stretched = getComputedStyle(el, "::after").position === "absolute" && el.offsetParent instanceof HTMLElement;
        const target = stretched ? (el.offsetParent as HTMLElement) : el;
        return target.getBoundingClientRect().height < minSize;
      })
      .map((el) => `${el.tagName.toLowerCase()}:${(el.getAttribute("aria-label") ?? el.textContent ?? "").trim().slice(0, 30)}`);
  }, min);
}
