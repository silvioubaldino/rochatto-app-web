import { expect, test, type Page } from "@playwright/test";
import { hasHorizontalScroll } from "./helpers";
import { mockApi, type MockApi } from "./mock-api";

/**
 * Tarefas-ouro TO-1, TO-2, TO-3, TO-4 e TO-6 (AYD-011 §3.6) com a api simulada. Rodam em desktop,
 * iPhone (WebKit) e Pixel (Chromium) com os MESMOS passos — a única diferença permitida é onde mora
 * o gatilho (barra lateral × topo), nunca um passo a mais (UX-P13).
 */
test.beforeAll(async ({ baseURL }) => {
  const reachable = await fetch(baseURL ?? "http://localhost:3000", { method: "HEAD" })
    .then((r) => r.status < 500)
    .catch(() => false);
  test.skip(!reachable, "Sem servidor: `NEXT_PUBLIC_E2E=1 NEXT_PUBLIC_API_URL= npm run build && npm start`.");
});

let api: MockApi;
test.beforeEach(async ({ page }) => {
  api = await mockApi(page);
});

const noSideScroll = async (page: Page) => expect(await hasHorizontalScroll(page)).toBe(false);

test("TO-1 · cliente novo indicado por arquiteto pede orçamento com um produto fora do catálogo, numa tela", async ({ page }) => {
  await page.goto("/orcamentos/novo");
  const customer = page.getByRole("combobox", { name: "Cliente" });
  await customer.fill("Fulano de Tal");
  await page.getByRole("option", { name: /Criar cliente "Fulano de Tal"/ }).click();
  await page.getByRole("dialog", { name: "Novo cliente" }).getByRole("button", { name: "Criar" }).click();
  await expect(customer).toHaveValue("Fulano de Tal");

  const referrer = page.getByRole("combobox", { name: "Indicação (parceiro)" });
  await referrer.fill("Arq");
  await page.getByRole("option", { name: /Arq\. Paula/ }).click();

  const picker = page.getByRole("combobox", { name: "Adicionar produto ou serviço" });
  await picker.fill("Rock");
  await page.getByRole("option", { name: /Rock face/ }).click();
  await picker.fill("Ônix azul");
  await page.getByRole("option", { name: /Criar produto "Ônix azul"/ }).click();
  await page.getByRole("dialog", { name: "Novo produto" }).getByRole("button", { name: "Criar" }).click();

  for (const name of ["Rock face", "Ônix azul"]) {
    await page.getByRole("textbox", { name: `Quantidade de ${name}` }).fill("10");
  }
  await noSideScroll(page);
  await page.getByRole("button", { name: "Salvar orçamento" }).click();

  await expect.poll(() => api.last("POST", "/quotes")).toBeTruthy();
  const body = api.last("POST", "/quotes")?.body as { customer_id: string; referrer_id: string; items: { product_id: string }[] };
  expect(body.customer_id).toBe("c-new");
  expect(body.referrer_id).toBe("pt1");
  expect(body.items.map((i) => i.product_id)).toEqual(["p1", "p-new"]);
});

test("TO-2 · fechar o orçamento num diálogo (sob encomenda, estoque, instalador, entrada no Pix, frete) e gerar a compra", async ({ page }) => {
  await page.goto("/orcamentos/q154");
  await page.getByRole("button", { name: "Fechar venda" }).click();
  const dialog = page.getByRole("dialog", { name: "Fechar venda" });
  await expect(dialog.getByRole("combobox", { name: "Fornecedor de Rock face" })).toHaveValue("Matheus RJ"); // C8

  await dialog.getByRole("radiogroup", { name: "Origem de Moledo" }).getByRole("radio", { name: "De estoque" }).click();
  await dialog.locator("#labor-2").fill("Nivaldo");
  await page.getByRole("option", { name: /Nivaldo/ }).click();
  await dialog.getByRole("checkbox", { name: /Recebi a entrada agora/ }).check();
  await dialog.getByRole("combobox", { name: "Forma de pagamento" }).click();
  await page.getByRole("option", { name: "Pix" }).click();
  await dialog.getByRole("button", { name: /Frete pago ou outro custo/ }).click();
  await dialog.getByRole("textbox", { name: "Valor do custo" }).fill("150");
  await dialog.getByRole("combobox", { name: "Credor do custo" }).fill("Motorista");
  await page.getByRole("option", { name: /Motorista Y/ }).click();
  await noSideScroll(page);
  await dialog.getByRole("button", { name: "Fechar venda" }).click();

  await expect.poll(() => api.last("POST", "/quotes/q154/convert")).toBeTruthy();
  const { closing } = api.last("POST", "/quotes/q154/convert")?.body as { closing: Record<string, unknown> };
  expect(closing.items).toEqual([
    { quote_item_id: "qi1", origin: "MADE_TO_ORDER", supplier_id: "f1" },
    { quote_item_id: "qi2", origin: "FROM_STOCK" },
    { quote_item_id: "qi3", labor_payee_id: "f2" },
  ]);
  expect(closing.down_payment).toMatchObject({ payment_method: "PIX" });
  expect(closing.costs).toEqual([{ kind: "FREIGHT", amount: 150, payee_id: "f3", description: null }]);

  // a venda abre já com o próximo passo
  await expect(page).toHaveURL(/\/vendas\/s1$/);
  const banner = page.getByRole("region", { name: "Próximo passo" });
  await expect(banner).toContainText("Falta comprar");
  await banner.getByRole("button", { name: "Gerar compra" }).click();
  await expect.poll(() => api.last("POST", "/purchases")).toBeTruthy();
  expect((api.last("POST", "/purchases")?.body as { supplier_id: string }).supplier_id).toBe("f1");
});

test("TO-3 · quanto o cliente me deve: ⌘K e a prévia do cliente, sem sair da tela", async ({ page }) => {
  await page.goto("/vendas");
  await page.getByRole("button", { name: /^Buscar/ }).click();
  await page.getByRole("combobox", { name: /Buscar por nome ou número/ }).fill("Alejandra");
  await page.getByRole("button", { name: /Prévia: Alejandra Souza/ }).click();
  const sheet = page.getByRole("dialog", { name: "Alejandra Souza" });
  await expect(sheet).toContainText("A receber");
  await noSideScroll(page);
});

test("TO-4 · registrar a parcela paga: Hoje → A receber vencendo → Receber", async ({ page }) => {
  await page.goto("/hoje");
  const money = page.getByRole("region", { name: "Dinheiro" });
  await money.getByRole("button", { name: /A receber/ }).click();
  await money.getByRole("button", { name: "Receber", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: /Receber — Alejandra Souza/ });
  // o diálogo atual de Receber ainda usa a escolha nativa; o SettleFlow (U5) a troca pelo Select
  await dialog.getByLabel("Forma de pagamento").selectOption("PIX");
  await dialog.getByRole("button", { name: "Receber", exact: true }).click();
  await expect.poll(() => api.last("POST", "/obligations/o1/settle")).toBeTruthy();
  expect(api.last("POST", "/obligations/o1/settle")?.body).toMatchObject({ amount: 3200, movement: { payment_method: "PIX" } });
  await expect(money).toHaveCount(0); // a pendência some quando o estado se resolve
});

test("TO-6 · o que entregar esta semana e o que está atrasado: uma tela, zero cliques de navegação", async ({ page }) => {
  await page.goto("/hoje");
  const ops = page.getByRole("region", { name: "Operação" });
  await expect(ops.getByText(/Entregas até/)).toBeVisible();
  await expect(ops.getByText("1 vencida")).toBeVisible();
  await ops.getByRole("button", { name: /Entregas/ }).click();
  await expect(ops.getByText("Atrasada")).toBeVisible();
  await expect(ops.getByRole("link", { name: "Venda nº 99 · Bruno Lima" })).toBeVisible();
  await noSideScroll(page);
});
