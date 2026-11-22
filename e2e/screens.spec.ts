import { expect, test } from "@playwright/test";
import { hasHorizontalScroll } from "./helpers";
import { mockApi } from "./mock-api";

test.beforeAll(async ({ baseURL }) => {
  const reachable = await fetch(baseURL ?? "http://localhost:3000", { method: "HEAD" })
    .then((r) => r.status < 500)
    .catch(() => false);
  test.skip(!reachable, "Sem servidor: `NEXT_PUBLIC_E2E=1 NEXT_PUBLIC_API_URL= npm run build && npm start`.");
});

const SCREENS: [string, string][] = [
  ["/compras", "Compras"],
  ["/compras?tab=a-comprar", "Compras"],
  ["/compras/pu1", "Compra nº 12"],
  ["/fornecedores", "Fornecedores e prestadores"],
  ["/fornecedores/f1", "Matheus RJ"],
  ["/estoque", "Estoque"],
  ["/clientes", "Clientes"],
  ["/produtos", "Produtos"],
  ["/servicos", "Serviços"],
  ["/parceiros", "Parceiros"],
  ["/contas/receber", "A receber"],
  ["/contas/pagar", "A pagar"],
  ["/contas/o1", "Conta a receber"],
  ["/movimentacoes", "Movimentações"],
];

for (const [path, title] of SCREENS) {
  test(`${path} abre sem rolagem lateral`, async ({ page }) => {
    await mockApi(page);
    await page.goto(path);
    await expect(page.getByRole("heading", { name: new RegExp(title) }).first()).toBeVisible();
    await page.waitForLoadState("networkidle");
    expect(await hasHorizontalScroll(page)).toBe(false);
  });
}
