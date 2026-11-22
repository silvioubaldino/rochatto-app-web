import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { hasHorizontalScroll } from "./helpers";

test.beforeAll(async ({ baseURL }) => {
  const reachable = await fetch(baseURL ?? "http://localhost:3000", { method: "HEAD" })
    .then((r) => r.status < 500)
    .catch(() => false);
  test.skip(!reachable, "Sem servidor em E2E_BASE_URL: rode `npm run build && npm start` antes do e2e.");
});

test("login: carrega, sem rolagem lateral e sem violação séria do axe", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("button").first()).toBeVisible();
  expect(await hasHorizontalScroll(page)).toBe(false);

  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag22aa"]).analyze();
  const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(serious.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
});
